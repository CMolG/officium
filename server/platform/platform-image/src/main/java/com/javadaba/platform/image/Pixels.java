package com.javadaba.platform.image;

import java.awt.AlphaComposite;
import java.awt.Graphics2D;
import java.awt.color.ColorSpace;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.awt.image.IndexColorModel;
import java.awt.image.Raster;
import java.io.ByteArrayInputStream;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;

/** Decoding to a plain ARGB raster, and the small pixel helpers the codecs share. */
final class Pixels {

    private Pixels() {
    }

    /** Decodes with ImageIO in memory (no disk cache, no global setter). Any failure is MALFORMED. */
    static BufferedImage decode(byte[] bytes) {
        try (var in = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext())
                throw ImageRefusedException.malformed("no decoder");
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (ImageRefusedException e) {
            throw e;
        } catch (Exception | StackOverflowError e) {
            throw ImageRefusedException.malformed("cannot decode: " + e.getClass().getSimpleName());
        }
    }

    /** Copies to INT_ARGB. Gray is expanded from its samples: Java2D would darken CS_GRAY. */
    static BufferedImage toArgb(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        boolean gray = src.getColorModel().getColorSpace().getType() == ColorSpace.TYPE_GRAY
                && !(src.getColorModel() instanceof IndexColorModel);
        if (!gray) {
            Graphics2D g = out.createGraphics();
            g.setComposite(AlphaComposite.Src);
            g.drawImage(src, 0, 0, null);
            g.dispose();
            return out;
        }
        Raster r = src.getRaster();
        int max = (1 << src.getColorModel().getComponentSize(0)) - 1;
        boolean alpha = r.getNumBands() > 1;
        int[] data = data(out);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int v = r.getSample(x, y, 0) * 255 / max;
                int a = alpha ? r.getSample(x, y, 1) * 255 / max : 255;
                data[y * w + x] = (a << 24) | (v << 16) | (v << 8) | v;
            }
        }
        return out;
    }

    static int[] data(BufferedImage argb) {
        return ((DataBufferInt) argb.getRaster().getDataBuffer()).getData();
    }

    static boolean hasAlpha(BufferedImage argb) {
        for (int p : data(argb))
            if ((p >>> 24) != 255)
                return true;
        return false;
    }

    /** INT_RGB copy, transparency composited over white. */
    static BufferedImage rgbOverWhite(BufferedImage argb) {
        BufferedImage out = new BufferedImage(argb.getWidth(), argb.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, out.getWidth(), out.getHeight());
        g.drawImage(argb, 0, 0, null);
        g.dispose();
        return out;
    }
}
