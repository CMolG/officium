package com.javadaba.platform.image;

import java.nio.charset.StandardCharsets;

/** Names a file's image format from its magic bytes, never from what the sender declared. */
public final class ImageSniff {

    public enum Kind {
        JPEG, PNG, GIF, WEBP, APNG, AVIF, HEIF, TIFF, NOT_AN_IMAGE
    }

    private ImageSniff() {
    }

    public static Kind sniff(byte[] b) {
        if (b == null || b.length < 12)
            return Kind.NOT_AN_IMAGE;
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF)
            return Kind.JPEG;
        if (PngChunks.hasSignature(b))
            return isApng(b) ? Kind.APNG : Kind.PNG;
        if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a"))
            return Kind.GIF;
        if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP"))
            return Kind.WEBP;
        if (ascii(b, 4, "ftyp")) {
            String brand = new String(b, 8, 4, StandardCharsets.ISO_8859_1);
            if (brand.startsWith("avi"))
                return Kind.AVIF;
            if (brand.startsWith("hei") || brand.startsWith("hev") || brand.equals("mif1") || brand.equals("msf1"))
                return Kind.HEIF;
            return Kind.NOT_AN_IMAGE;
        }
        if (ascii(b, 0, "II*\0") || ascii(b, 0, "MM\0*"))
            return Kind.TIFF;
        return Kind.NOT_AN_IMAGE;
    }

    private static boolean isApng(byte[] b) {
        try {
            for (PngChunks.Chunk c : PngChunks.parse(b)) {
                if (c.type().equals("acTL"))
                    return true;
                if (c.type().equals("IDAT"))
                    return false;
            }
        } catch (ImageRefusedException e) {
            return false;
        }
        return false;
    }

    static boolean ascii(byte[] b, int off, String s) {
        if (b.length < off + s.length())
            return false;
        for (int i = 0; i < s.length(); i++)
            if (b[off + i] != (byte) s.charAt(i))
                return false;
        return true;
    }
}
