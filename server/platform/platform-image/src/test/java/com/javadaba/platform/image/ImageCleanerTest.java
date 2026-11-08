package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class ImageCleanerTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(5_000_000);
    private final ImageCleaner cleaner = new ImageCleaner(LIMITS);

    static IntStream orientations() {
        return IntStream.rangeClosed(1, 8);
    }

    /** Where the pixel at (x, y) of the stored 4x2 image must land, per EXIF orientation. */
    private static int[] expectedPosition(int o, int x, int y) {
        int w = 4;
        int h = 2;
        return switch (o) {
            case 2 -> new int[]{w - 1 - x, y};
            case 3 -> new int[]{w - 1 - x, h - 1 - y};
            case 4 -> new int[]{x, h - 1 - y};
            case 5 -> new int[]{y, x};
            case 6 -> new int[]{h - 1 - y, x};
            case 7 -> new int[]{h - 1 - y, w - 1 - x};
            case 8 -> new int[]{y, w - 1 - x};
            default -> new int[]{x, y};
        };
    }

    @ParameterizedTest
    @MethodSource("orientations")
    void allEightOrientationsComeOutUprightInBothByteOrders(int o) {
        BufferedImage marked = Fixtures.marked();
        byte[] plain = Fixtures.encode(marked, "png");
        for (boolean little : new boolean[]{false, true}) {
            byte[] chunk = pngExif(plain, o, little);
            BufferedImage out = cleaner.decodeUpright(chunk);
            for (int y = 0; y < 2; y++) {
                for (int x = 0; x < 4; x++) {
                    int[] at = expectedPosition(o, x, y);
                    assertThat(out.getRGB(at[0], at[1]) & 0xFFFFFF).isEqualTo(marked.getRGB(x, y) & 0xFFFFFF);
                }
            }
        }
    }

    /** A PNG with an eXIf chunk before IDAT. */
    private static byte[] pngExif(byte[] png, int orientation, boolean little) {
        byte[] tiff = little
                ? new byte[]{'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0,
                        (byte) orientation, 0, 0, 0, 0, 0, 0, 0}
                : ExifOrientation.minimalTiff(orientation);
        var chunks = PngChunks.parse(png);
        int idat = chunks.stream().filter(c -> c.type().equals("IDAT")).findFirst().orElseThrow().start();
        java.io.ByteArrayOutputStream body = new java.io.ByteArrayOutputStream();
        body.writeBytes("eXIf".getBytes(StandardCharsets.ISO_8859_1));
        body.writeBytes(tiff);
        var crc = new java.util.zip.CRC32();
        crc.update(body.toByteArray());
        int c = (int) crc.getValue();
        return Fixtures.cat(
                java.util.Arrays.copyOf(png, idat),
                new byte[]{0, 0, 0, (byte) tiff.length},
                body.toByteArray(),
                new byte[]{(byte) (c >> 24), (byte) (c >> 16), (byte) (c >> 8), (byte) c},
                java.util.Arrays.copyOfRange(png, idat, png.length));
    }

    private static boolean contains(byte[] hay, String needle) {
        byte[] n = needle.getBytes(StandardCharsets.ISO_8859_1);
        outer : for (int i = 0; i + n.length <= hay.length; i++) {
            for (int j = 0; j < n.length; j++)
                if (hay[i + j] != n[j])
                    continue outer;
            return true;
        }
        return false;
    }

    private static List<Integer> markers(byte[] jpeg) {
        return JpegSegments.parse(jpeg).stream().map(JpegSegments.Segment::marker).toList();
    }

    @Test
    void cleanedJpegKeepsOnlyTheWhitelistAndNoCoordinate() {
        byte[] base = Fixtures.encode(Fixtures.photo(64, 48, 5), "jpg");
        byte[] dirty = Fixtures.jpegWith(
                base,
                Fixtures.exif(6, false, "GPSLatitude=48.8584 GPSLongitude=2.2945 MakerNote Canon"),
                Fixtures.app(0xE1,
                        "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta GPSLat=48.8584/>"
                                .getBytes(StandardCharsets.ISO_8859_1)),
                Fixtures.app(0xED, "Photoshop 3.0\0IPTC secret".getBytes(StandardCharsets.ISO_8859_1)),
                Fixtures.app(0xFE, "a comment with 48.8584".getBytes(StandardCharsets.ISO_8859_1)),
                Fixtures.app(0xE2, "MPF\0trailing".getBytes(StandardCharsets.ISO_8859_1)));
        byte[] withTrailer = Fixtures.cat(dirty,
                "ftypmp42 trailing motion video 48.8584".getBytes(StandardCharsets.ISO_8859_1));

        byte[] clean = cleaner.cleanOriginal(withTrailer);

        assertThat(contains(clean, "48.8584")).isFalse();
        assertThat(contains(clean, "Canon")).isFalse();
        assertThat(contains(clean, "xmpmeta")).isFalse();
        assertThat(contains(clean, "ftyp")).isFalse();
        assertThat(markers(clean)).doesNotContain(0xED, 0xFE);
        // a lone Orientation survives, so the fallback still displays upright
        assertThat(ImageProbe.probe(clean, LIMITS).orientation()).isEqualTo(6);
        assertThat(clean.length).isLessThan(withTrailer.length);
        // pixels identical
        BufferedImage a = Pixels.decode(withTrailer);
        BufferedImage b = Pixels.decode(clean);
        for (int y = 0; y < a.getHeight(); y++)
            for (int x = 0; x < a.getWidth(); x++)
                assertThat(b.getRGB(x, y)).isEqualTo(a.getRGB(x, y));
    }

    @Test
    void cleanedJpegWithoutOrientationHasNoExifAtAll() {
        byte[] base = Fixtures.encode(Fixtures.photo(32, 32, 5), "jpg");
        byte[] clean = cleaner.cleanOriginal(Fixtures.jpegWith(base, Fixtures.exif(1, false, "GPS 1.234")));
        assertThat(markers(clean)).doesNotContain(0xE1);
    }

    @Test
    void cleanedPngKeepsOnlyImageAndColourChunks() {
        byte[] png = Fixtures.encode(Fixtures.screenshot(40, 30), "png");
        var chunks = PngChunks.parse(png);
        int iend = chunks.get(chunks.size() - 1).start();
        byte[] text = chunk("tEXt", "Comment\0GPS 48.8584");
        byte[] itxt = chunk("iTXt", "XML:com.adobe.xmp\0\0\0\0\0GPS 48.8584");
        byte[] dirty = Fixtures.cat(java.util.Arrays.copyOf(png, iend), text, itxt,
                java.util.Arrays.copyOfRange(png, iend, png.length),
                "trailing 48.8584".getBytes(StandardCharsets.ISO_8859_1));

        byte[] clean = cleaner.cleanOriginal(dirty);

        assertThat(contains(clean, "48.8584")).isFalse();
        assertThat(PngChunks.parse(clean).stream().map(PngChunks.Chunk::type))
                .allMatch(t -> List.of("IHDR", "PLTE", "tRNS", "IDAT", "IEND", "gAMA", "cHRM", "sRGB", "iCCP")
                        .contains(t));
        BufferedImage a = Pixels.decode(dirty);
        BufferedImage b = Pixels.decode(clean);
        assertThat(b.getRGB(5, 5)).isEqualTo(a.getRGB(5, 5));
    }

    private static byte[] chunk(String type, String data) {
        byte[] d = data.getBytes(StandardCharsets.ISO_8859_1);
        byte[] body = Fixtures.cat(type.getBytes(StandardCharsets.ISO_8859_1), d);
        var crc = new java.util.zip.CRC32();
        crc.update(body);
        int c = (int) crc.getValue();
        return Fixtures.cat(new byte[]{0, 0, 0, (byte) d.length}, body,
                new byte[]{(byte) (c >> 24), (byte) (c >> 16), (byte) (c >> 8), (byte) c});
    }
}
