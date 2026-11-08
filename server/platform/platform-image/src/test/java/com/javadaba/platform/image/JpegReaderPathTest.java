package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.color.ColorSpace;
import java.awt.color.ICC_Profile;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

/** The JPEG half of orientation and colour: the real reader, not only the PNG paths. */
class JpegReaderPathTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(5_000_000);

    static IntStream orientations() {
        return IntStream.rangeClosed(1, 8);
    }

    private static List<Integer> markers(byte[] jpeg) {
        return JpegSegments.parse(jpeg).stream().map(JpegSegments.Segment::marker).toList();
    }

    private static byte[] iccApp2(ICC_Profile profile) {
        byte[] head = "ICC_PROFILE\0".getBytes(StandardCharsets.ISO_8859_1);
        return Fixtures.app(0xE2, Fixtures.cat(head, new byte[]{1, 1}, profile.getData()));
    }

    /** A photo big enough that JPEG chroma loss stays small next to a swap of two pixels' positions. */
    @ParameterizedTest
    @MethodSource("orientations")
    void jpegExifOrientationIsAppliedThroughTheRealReader(int o) {
        BufferedImage flat = Fixtures.photo(48, 32, 7);
        byte[] base = Fixtures.encode(flat, "jpg");
        for (boolean little : new boolean[]{false, true}) {
            byte[] tagged = Fixtures.jpegWith(base, Fixtures.exif(o, little, ""));
            BufferedImage out = new ImageCleaner(LIMITS).decodeUpright(tagged);
            boolean swaps = o >= 5;
            assertThat(out.getWidth()).isEqualTo(swaps ? 32 : 48);
            assertThat(out.getHeight()).isEqualTo(swaps ? 48 : 32);
            BufferedImage plain = new ImageCleaner(LIMITS).decodeUpright(base);
            // the upright result is the stored pixels moved, never changed: compare a corner sample
            int x = 5;
            int y = 3;
            int[] at = switch (o) {
                case 2 -> new int[]{47 - x, y};
                case 3 -> new int[]{47 - x, 31 - y};
                case 4 -> new int[]{x, 31 - y};
                case 5 -> new int[]{y, x};
                case 6 -> new int[]{31 - y, x};
                case 7 -> new int[]{31 - y, 47 - x};
                case 8 -> new int[]{y, 47 - x};
                default -> new int[]{x, y};
            };
            assertThat(out.getRGB(at[0], at[1])).isEqualTo(plain.getRGB(x, y));
        }
    }

    @Test
    void anIccTaggedJpegIsConvertedOnceReEncodedWithoutProfileAndTheFallbackKeepsIt() {
        ICC_Profile linear = ICC_Profile.getInstance(ColorSpace.CS_LINEAR_RGB);
        byte[] base = Fixtures.encode(Fixtures.photo(64, 48, 11), "jpg");
        byte[] tagged = Fixtures.jpegWith(base, iccApp2(linear));

        // decoded once to sRGB: it differs from the untagged pixels
        BufferedImage raw = new ImageCleaner(LIMITS).decodeUpright(base);
        BufferedImage converted = new ImageCleaner(LIMITS).decodeUpright(tagged);
        long diff = 0;
        for (int y = 0; y < 48; y++)
            for (int x = 0; x < 64; x++)
                diff += Math.abs(((converted.getRGB(x, y) >> 8) & 0xFF) - ((raw.getRGB(x, y) >> 8) & 0xFF));
        assertThat(diff / (64.0 * 48)).isGreaterThan(5.0);

        assertThat(markers(new ImageCleaner(LIMITS).cleanOriginal(tagged))).contains(0xE2);

        ReducedImage out = new ImageReducer(LIMITS).reduce(tagged);
        if (out.kind() == ReducedImage.Kind.REENCODED) {
            assertThat(markers(out.bytes())).doesNotContain(0xE2);
        } else {
            assertThat(markers(out.bytes())).contains(0xE2);
        }
    }
}
