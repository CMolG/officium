package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.color.ColorSpace;
import java.awt.color.ICC_Profile;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import org.junit.jupiter.api.Test;

class ColourTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(5_000_000);

    private static byte[] withIccp(byte[] png, ICC_Profile profile) {
        ByteArrayOutputStream z = new ByteArrayOutputStream();
        z.writeBytes(new byte[]{'p', 'r', 'o', 'f', 0, 0});
        Deflater d = new Deflater();
        d.setInput(profile.getData());
        d.finish();
        byte[] buf = new byte[65536];
        while (!d.finished())
            z.write(buf, 0, d.deflate(buf));
        byte[] body = Fixtures.cat("iCCP".getBytes(), z.toByteArray());
        CRC32 crc = new CRC32();
        crc.update(body);
        int c = (int) crc.getValue();
        int len = body.length - 4;
        byte[] chunk = Fixtures.cat(new byte[]{(byte) (len >> 24), (byte) (len >> 16), (byte) (len >> 8), (byte) len},
                body, new byte[]{(byte) (c >> 24), (byte) (c >> 16), (byte) (c >> 8), (byte) c});
        int idat = PngChunks.parse(png).stream().filter(x -> x.type().equals("IDAT")).findFirst().orElseThrow().start();
        return Fixtures.cat(java.util.Arrays.copyOf(png, idat), chunk,
                java.util.Arrays.copyOfRange(png, idat, png.length));
    }

    @Test
    void aTaggedPngIsConvertedToSrgbExactlyOnce() {
        ICC_Profile linear = ICC_Profile.getInstance(ColorSpace.CS_LINEAR_RGB);
        BufferedImage raw = Fixtures.photo(40, 40, 3);
        byte[] tagged = withIccp(Fixtures.encode(raw, "png"), linear);

        BufferedImage out = new ImageCleaner(LIMITS).decodeUpright(tagged);

        BufferedImage once = new BufferedImage(40, 40, BufferedImage.TYPE_INT_RGB);
        new java.awt.image.ColorConvertOp(new java.awt.color.ICC_ColorSpace(linear),
                ColorSpace.getInstance(ColorSpace.CS_sRGB), null)
                .filter(rawAsLinear(raw, linear), once);
        int diffOnce = 0;
        int diffRaw = 0;
        for (int y = 0; y < 40; y++) {
            for (int x = 0; x < 40; x++) {
                diffOnce += Math.abs(((out.getRGB(x, y) >> 8) & 0xFF) - ((once.getRGB(x, y) >> 8) & 0xFF));
                diffRaw += Math.abs(((out.getRGB(x, y) >> 8) & 0xFF) - ((raw.getRGB(x, y) >> 8) & 0xFF));
            }
        }
        assertThat(diffOnce / 1600.0).isLessThan(2.0);
        assertThat(diffRaw / 1600.0).isGreaterThan(5.0); // it did change from the raw values
    }

    @Test
    void aReEncodeCarriesNoProfileAndTheFallbackKeepsIt() {
        ICC_Profile linear = ICC_Profile.getInstance(ColorSpace.CS_LINEAR_RGB);
        byte[] tagged = withIccp(Fixtures.encode(Fixtures.screenshot(60, 40), "png"), linear);

        byte[] cleaned = new ImageCleaner(LIMITS).cleanOriginal(tagged);
        assertThat(PngChunks.parse(cleaned).stream().map(PngChunks.Chunk::type)).contains("iCCP");

        ReducedImage out = new ImageReducer(LIMITS).reduce(tagged);
        if (out.kind() == ReducedImage.Kind.REENCODED) {
            assertThat(PngChunks.parse(out.bytes()).stream().map(PngChunks.Chunk::type)).doesNotContain("iCCP");
        } else {
            assertThat(PngChunks.parse(out.bytes()).stream().map(PngChunks.Chunk::type)).contains("iCCP");
        }
    }

    private static byte[] withRawIccp(byte[] png, byte[] data) {
        byte[] body = Fixtures.cat("iCCP".getBytes(), data);
        CRC32 crc = new CRC32();
        crc.update(body);
        int c = (int) crc.getValue();
        int len = data.length;
        byte[] chunk = Fixtures.cat(new byte[]{(byte) (len >> 24), (byte) (len >> 16), (byte) (len >> 8), (byte) len},
                body, new byte[]{(byte) (c >> 24), (byte) (c >> 16), (byte) (c >> 8), (byte) c});
        int idat = PngChunks.parse(png).stream().filter(x -> x.type().equals("IDAT")).findFirst().orElseThrow().start();
        return Fixtures.cat(java.util.Arrays.copyOf(png, idat), chunk,
                java.util.Arrays.copyOfRange(png, idat, png.length));
    }

    @Test
    void aMalformedIccpIsRefusedAsMalformedNeverAnUntypedException() {
        byte[] png = Fixtures.encode(Fixtures.photo(40, 40, 3), "png");
        for (byte[] data : new byte[][]{new byte[0], "noterminator".getBytes(), {'p', 0}, {'p', 0, 0}}) {
            byte[] bad = withRawIccp(png, data);
            assertThatThrownBy(() -> new ImageCleaner(LIMITS).decodeUpright(bad))
                    .isInstanceOf(ImageRefusedException.class);
            assertThatThrownBy(() -> new ImageReducer(LIMITS).reduce(bad))
                    .isInstanceOf(ImageRefusedException.class);
        }
    }

    @Test
    void aTransparentRasterEncodedAsJpegIsScoredOverWhite() {
        BufferedImage img = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < 64; y++)
            for (int x = 0; x < 64; x++)
                img.setRGB(x, y, x < 32 ? 0x00000000 : 0xFF3366CC);
        ReducedImage out = new ImageReducer(LIMITS).encode(img, ImageFormat.JPEG);
        assertThat(out.ssim()).isGreaterThanOrEqualTo(ImageReducer.DEFAULT_THRESHOLD);
    }

    private static BufferedImage rawAsLinear(BufferedImage rgb, ICC_Profile profile) {
        var cm = new java.awt.image.ComponentColorModel(new java.awt.color.ICC_ColorSpace(profile), false, false,
                java.awt.Transparency.OPAQUE, java.awt.image.DataBuffer.TYPE_BYTE);
        var raster = java.awt.image.Raster.createInterleavedRaster(java.awt.image.DataBuffer.TYPE_BYTE, 40, 40, 3,
                null);
        byte[] d = ((java.awt.image.DataBufferByte) raster.getDataBuffer()).getData();
        for (int y = 0; y < 40; y++) {
            for (int x = 0; x < 40; x++) {
                int p = rgb.getRGB(x, y);
                d[3 * (y * 40 + x)] = (byte) (p >> 16);
                d[3 * (y * 40 + x) + 1] = (byte) (p >> 8);
                d[3 * (y * 40 + x) + 2] = (byte) p;
            }
        }
        return new BufferedImage(cm, (java.awt.image.WritableRaster) raster, false, null);
    }
}
