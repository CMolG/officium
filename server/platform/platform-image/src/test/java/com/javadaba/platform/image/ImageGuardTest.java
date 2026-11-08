package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.util.Random;
import org.junit.jupiter.api.Test;

class ImageGuardTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(5_000_000);

    private static ImageRefusedException.Reason reasonOf(byte[] bytes) {
        try {
            ImageProbe.probe(bytes, LIMITS);
        } catch (ImageRefusedException e) {
            return e.reason();
        }
        return null;
    }

    private static byte[] header(String ascii, int pad) {
        byte[] b = new byte[pad];
        byte[] a = ascii.getBytes(StandardCharsets.ISO_8859_1);
        System.arraycopy(a, 0, b, 0, a.length);
        return b;
    }

    @Test
    void refusesOverTheCallersByteCapBeforeAnythingElse() {
        byte[] jpeg = Fixtures.encode(Fixtures.photo(64, 64, 1), "jpg");
        assertThatThrownBy(() -> ImageProbe.probe(jpeg, ImageLimits.ofBytes(100)))
                .isInstanceOfSatisfying(
                        ImageRefusedException.class,
                        e -> assertThat(e.reason()).isEqualTo(ImageRefusedException.Reason.TOO_MANY_BYTES));
    }

    @Test
    void refusesHugeDeclaredSizesWithoutAllocatingThem() {
        var threads = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long before = threads.getThreadAllocatedBytes(Thread.currentThread().threadId());
        byte[] png = Fixtures.encode(Fixtures.photo(8, 8, 1), "png");
        // IHDR width/height live at offset 16 and 20
        int big = 20_000;
        for (int i = 0; i < 4; i++) {
            png[16 + i] = (byte) (big >> (24 - 8 * i));
            png[20 + i] = (byte) (big >> (24 - 8 * i));
        }
        assertThat(reasonOf(png)).isEqualTo(ImageRefusedException.Reason.TOO_MANY_PIXELS);

        byte[] jpeg = Fixtures.encode(Fixtures.photo(16, 16, 1), "jpg");
        for (int i = 0; i < jpeg.length - 9; i++) {
            if ((jpeg[i] & 0xFF) == 0xFF && (jpeg[i + 1] & 0xFF) == 0xC0) {
                jpeg[i + 5] = (byte) (big >> 8);
                jpeg[i + 6] = (byte) big;
                jpeg[i + 7] = (byte) (big >> 8);
                jpeg[i + 8] = (byte) big;
            }
        }
        assertThat(reasonOf(jpeg)).isEqualTo(ImageRefusedException.Reason.TOO_MANY_PIXELS);
        long used = threads.getThreadAllocatedBytes(Thread.currentThread().threadId()) - before;
        assertThat(used).isLessThan(16L << 20);
    }

    @Test
    void refusesUnsupportedFormatsByMagicBytes() {
        assertThat(reasonOf(header("GIF89a", 64))).isEqualTo(ImageRefusedException.Reason.UNSUPPORTED_FORMAT);
        byte[] webp = header("RIFF", 64);
        System.arraycopy("WEBP".getBytes(StandardCharsets.ISO_8859_1), 0, webp, 8, 4);
        assertThat(reasonOf(webp)).isEqualTo(ImageRefusedException.Reason.UNSUPPORTED_FORMAT);
        for (String brand : new String[]{"heic", "mif1", "avif"}) {
            byte[] b = header("", 64);
            System.arraycopy("ftyp".getBytes(StandardCharsets.ISO_8859_1), 0, b, 4, 4);
            System.arraycopy(brand.getBytes(StandardCharsets.ISO_8859_1), 0, b, 8, 4);
            assertThatThrownBy(() -> ImageProbe.probe(b, LIMITS))
                    .isInstanceOfSatisfying(
                            ImageRefusedException.class,
                            e -> assertThat(e.detail()).isEqualTo(brand.equals("avif") ? "AVIF" : "HEIF"));
        }
    }

    @Test
    void refusesAnimatedPng() {
        byte[] png = Fixtures.encode(Fixtures.photo(8, 8, 1), "png");
        // splice an acTL chunk (type only matters) right after IHDR (8 + 25 bytes)
        byte[] actl = {0, 0, 0, 8, 'a', 'c', 'T', 'L', 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0};
        byte[] animated = Fixtures.cat(java.util.Arrays.copyOf(png, 33), actl,
                java.util.Arrays.copyOfRange(png, 33, png.length));
        assertThatThrownBy(() -> ImageProbe.probe(animated, LIMITS))
                .isInstanceOfSatisfying(
                        ImageRefusedException.class, e -> assertThat(e.detail()).isEqualTo("APNG"));
    }

    @Test
    void refusesEmptyAndTruncatedInput() {
        assertThat(reasonOf(new byte[0])).isEqualTo(ImageRefusedException.Reason.MALFORMED);
        byte[] jpeg = Fixtures.encode(Fixtures.photo(64, 64, 1), "jpg");
        assertThat(reasonOf(java.util.Arrays.copyOf(jpeg, jpeg.length / 2)))
                .isEqualTo(ImageRefusedException.Reason.MALFORMED);
        byte[] png = Fixtures.encode(Fixtures.photo(64, 64, 1), "png");
        assertThat(reasonOf(java.util.Arrays.copyOf(png, png.length / 2)))
                .isEqualTo(ImageRefusedException.Reason.MALFORMED);
    }

    @Test
    void byteFlipFuzzOnlySucceedsOrRefuses() {
        ImageReducer reducer = new ImageReducer(LIMITS);
        Random rnd = new Random(7);
        byte[][] seeds = {
                Fixtures.encode(Fixtures.photo(48, 48, 3), "jpg"),
                Fixtures.encode(Fixtures.screenshot(48, 48), "png")
        };
        for (byte[] seed : seeds) {
            for (int round = 0; round < 60; round++) {
                byte[] mutated = seed.clone();
                for (int k = 0; k < 3; k++)
                    mutated[rnd.nextInt(mutated.length)] ^= (byte) (1 + rnd.nextInt(255));
                try {
                    reducer.reduce(mutated);
                } catch (ImageRefusedException expected) {
                    // a typed refusal is the other allowed outcome
                }
            }
        }
    }
}
