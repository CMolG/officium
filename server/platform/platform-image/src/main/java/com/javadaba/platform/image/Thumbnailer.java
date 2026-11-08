package com.javadaba.platform.image;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;

/** Fits a decoded image into a box, never upscaling; one decode feeds this and the reducer. */
public final class Thumbnailer {

    private static final float THUMBNAIL_QUALITY = 0.82f;
    private static final float PREVIEW_QUALITY = 0.3f;

    private Thumbnailer() {
    }

    public static BufferedImage fit(BufferedImage image, int maxWidth, int maxHeight) {
        int w = image.getWidth();
        int h = image.getHeight();
        double scale = Math.min(1.0, Math.min((double) maxWidth / w, (double) maxHeight / h));
        if (scale >= 1.0)
            return image;
        int tw = Math.max(1, (int) Math.round(w * scale));
        int th = Math.max(1, (int) Math.round(h * scale));
        BufferedImage cur = Pixels.toArgb(image);
        while (cur.getWidth() / 2 >= tw && cur.getHeight() / 2 >= th) {
            cur = resize(cur, cur.getWidth() / 2, cur.getHeight() / 2);
        }
        return resize(cur, tw, th);
    }

    /** A JPEG thumbnail whose longest side is {@code longestSide}; alpha goes over white. */
    public static byte[] jpeg(BufferedImage image, int longestSide) {
        return Codecs.jpeg(Pixels.toArgb(fit(image, longestSide, longestSide)), THUMBNAIL_QUALITY);
    }

    /**
     * A JPEG a few hundred bytes long whose longest side is {@code longestSide}: not a picture to look at but
     * a blur to hold the picture's place and colors until the real one arrives. Alpha goes over white.
     */
    public static byte[] tinyJpeg(BufferedImage image, int longestSide) {
        return Codecs.jpeg(Pixels.toArgb(fit(image, longestSide, longestSide)), PREVIEW_QUALITY);
    }

    private static BufferedImage resize(BufferedImage src, int w, int h) {
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(src, 0, 0, w, h, null);
        g.dispose();
        return out;
    }
}
