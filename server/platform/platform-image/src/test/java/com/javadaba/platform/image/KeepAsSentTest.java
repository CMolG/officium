package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class KeepAsSentTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(1_000_000);

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.ISO_8859_1);
    }

    private static byte[] gif(int w, int h, boolean withMetadata) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(ascii("GIF89a"));
        o.writeBytes(new byte[]{(byte) w, (byte) (w >> 8), (byte) h, (byte) (h >> 8), (byte) 0x80, 0, 0});
        o.writeBytes(new byte[]{0, 0, 0, (byte) 255, (byte) 255, (byte) 255});
        o.writeBytes(new byte[]{0x21, (byte) 0xFF, 11});
        o.writeBytes(ascii("NETSCAPE2.0"));
        o.writeBytes(new byte[]{3, 1, 0, 0, 0});
        if (withMetadata) {
            o.writeBytes(new byte[]{0x21, (byte) 0xFE, 6});
            o.writeBytes(ascii("SECRET"));
            o.write(0);
            o.writeBytes(new byte[]{0x21, (byte) 0xFF, 11});
            o.writeBytes(ascii("XMP DataXMP"));
            o.writeBytes(new byte[]{2, 'g', 'p', 0});
        }
        o.writeBytes(new byte[]{0x21, (byte) 0xF9, 4, 0, 10, 0, 0, 0});
        o.writeBytes(new byte[]{0x2C, 0, 0, 0, 0, (byte) w, (byte) (w >> 8), (byte) h, (byte) (h >> 8), 0});
        o.writeBytes(new byte[]{2, 2, 0x44, 0x01, 0});
        o.write(0x3B);
        o.writeBytes(ascii("TRAILING-SECRET"));
        return o.toByteArray();
    }

    private static byte[] le32(int v) {
        return new byte[]{(byte) v, (byte) (v >> 8), (byte) (v >> 16), (byte) (v >> 24)};
    }

    private static byte[] chunk(String type, byte[] data) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(ascii(type));
        o.writeBytes(le32(data.length));
        o.writeBytes(data);
        if (data.length % 2 != 0)
            o.write(0);
        return o.toByteArray();
    }

    private static byte[] webp(int w, int h, boolean withMetadata) {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.writeBytes(ascii("WEBP"));
        byte[] vp8x = new byte[10];
        vp8x[0] = (byte) (withMetadata ? 0x1E : 0x12);
        vp8x[4] = (byte) (w - 1);
        vp8x[5] = (byte) ((w - 1) >> 8);
        vp8x[7] = (byte) (h - 1);
        vp8x[8] = (byte) ((h - 1) >> 8);
        body.writeBytes(chunk("VP8X", vp8x));
        body.writeBytes(chunk("ANIM", new byte[6]));
        body.writeBytes(chunk("ANMF", new byte[16]));
        if (withMetadata) {
            body.writeBytes(chunk("EXIF", ascii("GPS-SECRET")));
            body.writeBytes(chunk("XMP ", ascii("<x:xmpmeta>SECRET")));
        }
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.writeBytes(ascii("RIFF"));
        o.writeBytes(le32(body.size()));
        o.writeBytes(body.toByteArray());
        return o.toByteArray();
    }

    private static boolean contains(byte[] b, String s) {
        return new String(b, StandardCharsets.ISO_8859_1).contains(s);
    }

    @Test
    void sniffsFromMagicBytes() {
        assertThat(ImageSniff.sniff(gif(4, 4, false))).isEqualTo(ImageSniff.Kind.GIF);
        assertThat(ImageSniff.sniff(webp(4, 4, false))).isEqualTo(ImageSniff.Kind.WEBP);
        assertThat(ImageSniff.sniff(Fixtures.encode(Fixtures.photo(8, 8, 1), "png"))).isEqualTo(ImageSniff.Kind.PNG);
        assertThat(ImageSniff.sniff(ascii("<svg xmlns='http://www.w3.org/2000/svg'/>"))).isEqualTo(
                ImageSniff.Kind.NOT_AN_IMAGE);
    }

    @Test
    void gifLosesCommentsAndOddApplicationsButKeepsItsLoopAndTrailer() {
        byte[] out = KeepAsSent.strip(gif(4, 4, true), ImageSniff.Kind.GIF, LIMITS);
        assertThat(contains(out, "SECRET")).isFalse();
        assertThat(contains(out, "XMP Data")).isFalse();
        assertThat(contains(out, "NETSCAPE2.0")).isTrue();
        assertThat(out[out.length - 1]).isEqualTo((byte) 0x3B);
        assertThat(out).isEqualTo(KeepAsSent.strip(gif(4, 4, false), ImageSniff.Kind.GIF, LIMITS));
    }

    @Test
    void webpLosesExifAndXmpAndTheirFlagsButKeepsItsAnimation() {
        byte[] out = KeepAsSent.strip(webp(4, 4, true), ImageSniff.Kind.WEBP, LIMITS);
        assertThat(contains(out, "SECRET")).isFalse();
        assertThat(contains(out, "EXIF")).isFalse();
        assertThat(contains(out, "ANMF")).isTrue();
        assertThat(out[20] & 0x0C).isZero();
        assertThat(out[20] & 0x02).isNotZero();
        assertThat(out).isEqualTo(KeepAsSent.strip(webp(4, 4, false), ImageSniff.Kind.WEBP, LIMITS));
        int riffSize = (out[4] & 0xFF) | ((out[5] & 0xFF) << 8) | ((out[6] & 0xFF) << 16) | ((out[7] & 0xFF) << 24);
        assertThat(riffSize + 8).isEqualTo(out.length);
    }

    @Test
    void thePixelCapComesFromTheHeader() {
        ImageLimits small = new ImageLimits(1_000_000, 100);
        assertThatThrownBy(() -> KeepAsSent.strip(gif(20, 20, false), ImageSniff.Kind.GIF, small))
                .isInstanceOfSatisfying(ImageRefusedException.class,
                        e -> assertThat(e.reason()).isEqualTo(ImageRefusedException.Reason.TOO_MANY_PIXELS));
        assertThatThrownBy(() -> KeepAsSent.strip(webp(20, 20, false), ImageSniff.Kind.WEBP, small))
                .isInstanceOfSatisfying(ImageRefusedException.class,
                        e -> assertThat(e.reason()).isEqualTo(ImageRefusedException.Reason.TOO_MANY_PIXELS));
    }

    @Test
    void aTruncatedFileIsMalformedNotACrash() {
        byte[] g = gif(4, 4, false);
        byte[] cut = java.util.Arrays.copyOf(g, g.length - 20);
        assertThatThrownBy(() -> KeepAsSent.strip(cut, ImageSniff.Kind.GIF, LIMITS))
                .isInstanceOfSatisfying(ImageRefusedException.class,
                        e -> assertThat(e.reason()).isEqualTo(ImageRefusedException.Reason.MALFORMED));
    }
}
