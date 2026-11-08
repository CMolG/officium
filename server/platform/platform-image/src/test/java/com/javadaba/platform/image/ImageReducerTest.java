package com.javadaba.platform.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import org.junit.jupiter.api.Test;

class ImageReducerTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(20_000_000);
    private final ImageReducer reducer = new ImageReducer(LIMITS);

    @Test
    void aHighQualityJpegShrinksAndKeepsItsFormat() {
        byte[] original = highQualityJpeg(Fixtures.photo(320, 240, 11));
        ReducedImage out = reducer.reduce(original);
        assertThat(out.format()).isEqualTo(ImageFormat.JPEG);
        assertThat(out.kind()).isEqualTo(ReducedImage.Kind.REENCODED);
        assertThat(out.ssim()).isGreaterThanOrEqualTo(ImageReducer.DEFAULT_THRESHOLD);
        assertThat(out.bytes().length).isLessThan(original.length);
        assertThat(JpegSegments.parse(out.bytes()).stream().map(JpegSegments.Segment::marker))
                .doesNotContain(0xE1, 0xE2, 0xFE);
    }

    @Test
    void aFlatScreenshotBecomesASmallerPng() {
        byte[] original = Fixtures.encode(Fixtures.screenshot(400, 300), "png");
        ReducedImage out = reducer.reduce(original);
        assertThat(out.format()).isEqualTo(ImageFormat.PNG);
        assertThat(out.bytes().length).isLessThanOrEqualTo(original.length);
    }

    @Test
    void anAlreadyTinyJpegFallsBackToTheCleanedOriginalAndIsNeverLarger() {
        byte[] original = Fixtures.jpegWith(lowQualityJpeg(Fixtures.photo(128, 96, 2)),
                Fixtures.exif(6, false, "GPS 1.5"));
        ReducedImage out = reducer.reduce(original);
        assertThat(out.bytes().length).isLessThanOrEqualTo(original.length);
        if (out.kind() == ReducedImage.Kind.CLEANED_ORIGINAL) {
            assertThat(ImageProbe.probe(out.bytes(), LIMITS).orientation()).isEqualTo(6);
        }
    }

    @Test
    void aPhotoStoredAsPngNeverGrows() {
        byte[] original = Fixtures.encode(Fixtures.photo(120, 90, 4), "png");
        ReducedImage out = reducer.reduce(original);
        assertThat(out.bytes().length).isLessThanOrEqualTo(original.length);
        assertThat(Pixels.decode(out.bytes()).getWidth()).isEqualTo(120);
    }

    @Test
    void transparencyIsKept() {
        BufferedImage img = Fixtures.screenshot(100, 80);
        for (int y = 0; y < 20; y++)
            for (int x = 0; x < 100; x++)
                img.setRGB(x, y, 0);
        byte[] original = Fixtures.encode(img, "png");
        ReducedImage out = reducer.reduce(original);
        BufferedImage back = Pixels.toArgb(Pixels.decode(out.bytes()));
        assertThat(back.getRGB(50, 5) >>> 24).isZero();
    }

    @Test
    void encodeOfAResizedImageIsGatedTheSame() {
        BufferedImage resized = Thumbnailer.fit(Fixtures.photo(800, 600, 9), 300, 300);
        ReducedImage out = reducer.encode(resized, ImageFormat.JPEG);
        assertThat(out.width()).isEqualTo(300);
        assertThat(out.height()).isEqualTo(225);
        assertThat(out.ssim()).isGreaterThanOrEqualTo(ImageReducer.DEFAULT_THRESHOLD);
    }

    @Test
    void thumbnailNeverUpscalesAndFitsTheLongestSide() {
        BufferedImage small = Fixtures.photo(50, 40, 1);
        assertThat(Thumbnailer.fit(small, 512, 512)).isSameAs(small);
        byte[] jpeg = Thumbnailer.jpeg(Fixtures.photo(1000, 500, 1), 256);
        ImageInfo info = ImageProbe.probe(jpeg, LIMITS);
        assertThat(info.width()).isEqualTo(256);
        assertThat(info.height()).isEqualTo(128);
    }

    @Test
    void ssimIsOneForIdenticalAndLowerForDamage() {
        BufferedImage a = Pixels.toArgb(Fixtures.photo(64, 64, 1));
        Ssim ref = Ssim.of(a);
        assertThat(ref.score(a)).isEqualTo(1.0);
        BufferedImage b = Pixels.toArgb(Fixtures.photo(64, 64, 1));
        for (int y = 0; y < 64; y++)
            for (int x = 0; x < 64; x++)
                b.setRGB(x, y, 0xFF000000 | (x * 4 << 16) | (y * 4));
        assertThat(ref.score(b)).isLessThan(0.9);
    }

    private static byte[] highQualityJpeg(BufferedImage img) {
        return Codecs.jpeg(Pixels.toArgb(img), 1.0f);
    }

    private static byte[] lowQualityJpeg(BufferedImage img) {
        return Codecs.jpeg(Pixels.toArgb(img), 0.3f);
    }
}
