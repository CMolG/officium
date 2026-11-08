package com.javadaba.platform.image;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;

/**
 * GIF and WebP are stored as sent (animation survives), with only a whitelist of their structure
 * kept: whatever carries a comment, EXIF or XMP is dropped by never having been named. The pixel
 * cap is read from the header, like {@link ImageProbe}'s, before anything else.
 */
public final class KeepAsSent {

    private static final Set<String> WEBP_KEEP = Set.of("VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP");

    private KeepAsSent() {
    }

    /** {@code kind} must be GIF or WEBP. */
    public static byte[] strip(byte[] b, ImageSniff.Kind kind, ImageLimits limits) {
        if (b.length > limits.maxBytes()) {
            throw new ImageRefusedException(ImageRefusedException.Reason.TOO_MANY_BYTES, b.length + " bytes");
        }
        try {
            return kind == ImageSniff.Kind.GIF ? gif(b, limits) : webp(b, limits);
        } catch (IndexOutOfBoundsException e) {
            throw ImageRefusedException.malformed("truncated");
        }
    }

    private static void checkPixels(long w, long h, ImageLimits limits) {
        if (w <= 0 || h <= 0)
            throw ImageRefusedException.malformed("zero size");
        if (w * h > limits.maxPixels())
            throw new ImageRefusedException(ImageRefusedException.Reason.TOO_MANY_PIXELS, w + "x" + h);
    }

    private static int le16(byte[] b, int i) {
        return (b[i] & 0xFF) | ((b[i + 1] & 0xFF) << 8);
    }

    private static long le32(byte[] b, int i) {
        return (le16(b, i) | ((long) le16(b, i + 2) << 16)) & 0xFFFFFFFFL;
    }

    private static int le24(byte[] b, int i) {
        return le16(b, i) | ((b[i + 2] & 0xFF) << 16);
    }

    private static int skipSubBlocks(byte[] b, int p) {
        while (true) {
            int n = b[p++] & 0xFF;
            if (n == 0)
                return p;
            p += n;
            if (p > b.length)
                throw ImageRefusedException.malformed("truncated");
        }
    }

    private static byte[] gif(byte[] b, ImageLimits limits) {
        checkPixels(le16(b, 6), le16(b, 8), limits);
        int packed = b[10] & 0xFF;
        int p = 13 + ((packed & 0x80) != 0 ? 3 << ((packed & 7) + 1) : 0);
        ByteArrayOutputStream out = new ByteArrayOutputStream(b.length);
        out.write(b, 0, p);
        while (true) {
            int start = p;
            int intro = b[p++] & 0xFF;
            if (intro == 0x3B) {
                out.write(0x3B);
                return out.toByteArray();
            } else if (intro == 0x2C) {
                int lp = b[p + 8] & 0xFF;
                p += 9 + ((lp & 0x80) != 0 ? 3 << ((lp & 7) + 1) : 0) + 1;
                p = skipSubBlocks(b, p);
                out.write(b, start, p - start);
            } else if (intro == 0x21) {
                int label = b[p++] & 0xFF;
                boolean keep = label == 0xF9 || label == 0x01 || (label == 0xFF && keptApp(b, p));
                p = skipSubBlocks(b, p);
                if (keep)
                    out.write(b, start, p - start);
            } else {
                throw ImageRefusedException.malformed("unknown GIF block");
            }
        }
    }

    private static boolean keptApp(byte[] b, int p) {
        return (b[p] & 0xFF) == 11
                && (ImageSniff.ascii(b, p + 1, "NETSCAPE2.0") || ImageSniff.ascii(b, p + 1, "ANIMEXTS1.0"));
    }

    private static byte[] webp(byte[] b, ImageLimits limits) {
        ByteArrayOutputStream body = new ByteArrayOutputStream(b.length);
        long riff = Math.min(le32(b, 4) + 8, b.length);
        int p = 12;
        boolean sized = false;
        while (p + 8 <= riff) {
            String type = new String(b, p, 4, StandardCharsets.ISO_8859_1);
            long len = le32(b, p + 4);
            long end = p + 8 + len + (len & 1);
            if (p + 8 + len > riff)
                throw ImageRefusedException.malformed("chunk past the end");
            if (WEBP_KEEP.contains(type)) {
                int dataAt = p + 8;
                if (type.equals("VP8X")) {
                    checkPixels(le24(b, dataAt + 4) + 1L, le24(b, dataAt + 7) + 1L, limits);
                    sized = true;
                } else if (!sized && type.equals("VP8L")) {
                    long bits = le32(b, dataAt + 1);
                    checkPixels((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1, limits);
                    sized = true;
                } else if (!sized && type.equals("VP8 ")) {
                    checkPixels(le16(b, dataAt + 6) & 0x3FFF, le16(b, dataAt + 8) & 0x3FFF, limits);
                    sized = true;
                }
                int stop = (int) Math.min(end, riff);
                byte[] chunk = Arrays.copyOfRange(b, p, stop);
                if (type.equals("VP8X"))
                    chunk[8] &= (byte) ~0x0C;
                body.writeBytes(chunk);
                if (chunk.length % 2 != 0)
                    body.write(0);
            }
            p = (int) end;
        }
        if (!sized)
            throw ImageRefusedException.malformed("no image data");
        int size = body.size() + 4;
        ByteArrayOutputStream out = new ByteArrayOutputStream(body.size() + 12);
        out.writeBytes(new byte[]{'R', 'I', 'F', 'F', (byte) size, (byte) (size >> 8), (byte) (size >> 16),
                (byte) (size >> 24), 'W', 'E', 'B', 'P'});
        out.writeBytes(body.toByteArray());
        return out.toByteArray();
    }
}
