package com.javadaba.platform.image;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Random;
import javax.imageio.ImageIO;

/** Images built in memory; nothing here is committed as a binary. */
final class Fixtures {

    private Fixtures() {
    }

    /** A photo-like gradient with noise and shapes, so a JPEG has something to compress. */
    static BufferedImage photo(int w, int h, long seed) {
        Random rnd = new Random(seed);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int r = clamp(x * 255 / w + rnd.nextInt(3));
                int g = clamp(y * 255 / h + rnd.nextInt(3));
                int b = clamp(128 + (int) (60 * Math.sin(x / 9.0) * Math.cos(y / 7.0)) + rnd.nextInt(3));
                img.setRGB(x, y, (r << 16) | (g << 8) | b);
            }
        }
        return img;
    }

    /** A flat UI-like screenshot: few colours, hard edges. */
    static BufferedImage screenshot(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, w, h);
        g.setColor(new Color(30, 90, 200));
        g.fillRect(10, 10, w / 2, 30);
        g.setColor(new Color(240, 240, 240));
        g.fillRect(10, 60, w - 20, h / 2);
        g.setColor(Color.DARK_GRAY);
        g.drawString("Hello world", 20, 30);
        g.dispose();
        return img;
    }

    static byte[] encode(BufferedImage img, String format) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, format, out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    /** An asymmetric 4x2 image whose pixels identify their position. */
    static BufferedImage marked() {
        BufferedImage img = new BufferedImage(4, 2, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < 2; y++)
            for (int x = 0; x < 4; x++)
                img.setRGB(x, y, (x * 60 << 16) | (y * 120 << 8) | 17);
        return img;
    }

    /** Inserts APP segments right after SOI. */
    static byte[] jpegWith(byte[] jpeg, byte[]... segments) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        for (byte[] s : segments)
            out.writeBytes(s);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    static byte[] app(int marker, byte[] payload) {
        int len = payload.length + 2;
        byte[] s = new byte[payload.length + 4];
        s[0] = (byte) 0xFF;
        s[1] = (byte) marker;
        s[2] = (byte) (len >> 8);
        s[3] = (byte) len;
        System.arraycopy(payload, 0, s, 4, payload.length);
        return s;
    }

    static byte[] cat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] p : parts)
            out.writeBytes(p);
        return out.toByteArray();
    }

    /** Exif APP1 with the given orientation, GPS-looking text and an IFD1-ish tail. */
    static byte[] exif(int orientation, boolean littleEndian, String secret) {
        byte[] tiff = ExifOrientation.minimalTiff(orientation);
        if (littleEndian) {
            tiff = new byte[]{'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0,
                    (byte) orientation, 0, 0, 0, 0, 0, 0, 0};
        }
        return app(0xE1, cat("Exif\0\0".getBytes(java.nio.charset.StandardCharsets.ISO_8859_1), tiff,
                secret.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1)));
    }

    private static int clamp(int v) {
        return Math.max(0, Math.min(255, v));
    }
}
