package com.javadaba.platform.image;

import java.awt.image.BufferedImage;

/** Applies the eight EXIF orientations to an ARGB raster. */
final class Orientation {

    private Orientation() {
    }

    static BufferedImage apply(BufferedImage src, int orientation) {
        if (orientation < 2 || orientation > 8)
            return src;
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swap = orientation >= 5;
        BufferedImage out = new BufferedImage(swap ? h : w, swap ? w : h, BufferedImage.TYPE_INT_ARGB);
        int[] in = Pixels.data(src);
        int[] o = Pixels.data(out);
        int ow = out.getWidth();
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int nx;
                int ny;
                switch (orientation) {
                    case 2 -> {
                        nx = w - 1 - x;
                        ny = y;
                    }
                    case 3 -> {
                        nx = w - 1 - x;
                        ny = h - 1 - y;
                    }
                    case 4 -> {
                        nx = x;
                        ny = h - 1 - y;
                    }
                    case 5 -> {
                        nx = y;
                        ny = x;
                    }
                    case 6 -> {
                        nx = h - 1 - y;
                        ny = x;
                    }
                    case 7 -> {
                        nx = h - 1 - y;
                        ny = w - 1 - x;
                    }
                    default -> {
                        nx = y;
                        ny = w - 1 - x;
                    }
                }
                o[ny * ow + nx] = in[y * w + x];
            }
        }
        return out;
    }
}
