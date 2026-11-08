package com.javadaba.platform.image;

import java.awt.image.BufferedImage;

/**
 * Mean structural similarity of a candidate against a reference, on luma (BT.601) over white,
 * 8x8 uniform windows at stride 4 (the window JAVA-1235 calibrated). With transparency, the
 * alpha plane is scored the same way and the lower of the two wins.
 */
final class Ssim {

    private static final int WINDOW = 8;
    private static final int STRIDE = 4;
    private static final double C1 = Math.pow(0.01 * 255, 2);
    private static final double C2 = Math.pow(0.03 * 255, 2);

    private final int width;
    private final int height;
    private final float[] luma;
    private final float[] alpha;

    private Ssim(int width, int height, float[] luma, float[] alpha) {
        this.width = width;
        this.height = height;
        this.luma = luma;
        this.alpha = alpha;
    }

    static Ssim of(BufferedImage argb) {
        int w = argb.getWidth();
        int h = argb.getHeight();
        int[] px = Pixels.data(argb);
        float[] y = new float[px.length];
        float[] a = null;
        for (int i = 0; i < px.length; i++) {
            int p = px[i];
            float al = (p >>> 24) / 255f;
            float l = 0.299f * ((p >> 16) & 0xFF) + 0.587f * ((p >> 8) & 0xFF) + 0.114f * (p & 0xFF);
            y[i] = l * al + 255f * (1 - al);
            if ((p >>> 24) != 255) {
                if (a == null)
                    a = new float[px.length];
            }
        }
        if (a != null)
            for (int i = 0; i < px.length; i++)
                a[i] = px[i] >>> 24;
        return new Ssim(w, h, y, a);
    }

    /** 1.0 for identical, 0 when the sizes differ. */
    double score(BufferedImage candidate) {
        if (candidate.getWidth() != width || candidate.getHeight() != height)
            return 0;
        Ssim c = of(candidate);
        double s = mean(luma, c.luma);
        if (alpha != null || c.alpha != null) {
            float[] ra = alpha != null ? alpha : filled(255f);
            float[] ca = c.alpha != null ? c.alpha : filled(255f);
            s = Math.min(s, mean(ra, ca));
        }
        return s;
    }

    private float[] filled(float v) {
        float[] f = new float[width * height];
        java.util.Arrays.fill(f, v);
        return f;
    }

    private double mean(float[] x, float[] y) {
        int win = Math.min(WINDOW, Math.min(width, height));
        int stride = Math.min(STRIDE, win);
        double total = 0;
        long n = 0;
        double count = (double) win * win;
        for (int oy = 0; oy + win <= height; oy += stride) {
            for (int ox = 0; ox + win <= width; ox += stride) {
                double sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
                for (int j = 0; j < win; j++) {
                    int row = (oy + j) * width + ox;
                    for (int i = 0; i < win; i++) {
                        double a = x[row + i];
                        double b = y[row + i];
                        sx += a;
                        sy += b;
                        sxx += a * a;
                        syy += b * b;
                        sxy += a * b;
                    }
                }
                double mx = sx / count;
                double my = sy / count;
                double vx = sxx / count - mx * mx;
                double vy = syy / count - my * my;
                double cov = sxy / count - mx * my;
                total += ((2 * mx * my + C1) * (2 * cov + C2)) / ((mx * mx + my * my + C1) * (vx + vy + C2));
                n++;
            }
        }
        return n == 0 ? 1 : total / n;
    }
}
