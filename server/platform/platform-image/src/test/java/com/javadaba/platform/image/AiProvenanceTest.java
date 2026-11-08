package com.javadaba.platform.image;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Random;
import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiProvenanceTest {

    private static final ImageLimits LIMITS = ImageLimits.ofBytes(20L * 1024 * 1024);

    private static byte[] png(int width, int height, boolean noisy) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setPaint(new java.awt.GradientPaint(0, 0, Color.ORANGE, width, height, Color.BLUE));
        g.fillRect(0, 0, width, height);
        g.dispose();
        if (noisy) {
            Random random = new Random(7);
            for (int i = 0; i < width * height / 2; i++) {
                image.setRGB(random.nextInt(width), random.nextInt(height), random.nextInt(0xFFFFFF));
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    @DisplayName("a generated PNG comes back as a JPEG that says it was made by a model")
    void marksAGeneratedPicture() throws Exception {
        ReducedImage result = AiProvenance.asMarkedJpeg(png(1312, 736, false), LIMITS, 400 * 1024);

        assertThat(result.format()).isEqualTo(ImageFormat.JPEG);
        assertThat(result.width()).isEqualTo(1312);
        assertThat(result.height()).isEqualTo(736);
        assertThat(AiProvenance.isMarked(result.bytes())).isTrue();
        // The marked file is still a picture any decoder reads.
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(result.bytes()))).isNotNull();
        assertThat(ImageProbe.probe(result.bytes(), LIMITS).width()).isEqualTo(1312);
    }

    @Test
    @DisplayName("an unmarked JPEG is not reported as marked, and marking twice adds one segment")
    void markingIsIdempotent() throws Exception {
        byte[] plain = Codecs.jpeg(Pixels.toArgb(Pixels.decode(png(64, 36, false))), 0.8f);

        byte[] once = AiProvenance.mark(plain);

        assertThat(AiProvenance.isMarked(plain)).isFalse();
        assertThat(AiProvenance.isMarked(once)).isTrue();
        assertThat(AiProvenance.mark(once)).isEqualTo(once);
    }

    @Test
    @DisplayName("the quality steps down until the file fits the byte cap")
    void respectsTheByteCap() throws Exception {
        byte[] noisy = png(1312, 736, true);
        int roomy = AiProvenance.asMarkedJpeg(noisy, LIMITS, Integer.MAX_VALUE).bytes().length;

        int capped = AiProvenance.asMarkedJpeg(noisy, LIMITS, roomy / 2).bytes().length;

        assertThat(capped).isLessThan(roomy);
    }

    @Test
    @DisplayName("bytes that are not a JPEG or PNG are refused")
    void refusesGarbage() {
        assertThatThrownBy(() -> AiProvenance.asMarkedJpeg("not an image at all".getBytes(), LIMITS, 1000))
                .isInstanceOf(ImageRefusedException.class);
    }
}
