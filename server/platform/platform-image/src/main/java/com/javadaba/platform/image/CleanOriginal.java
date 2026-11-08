package com.javadaba.platform.image;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Set;
import java.util.zip.CRC32;

/**
 * Rewrites an original keeping only a whitelist: the image, its colour profile and, when it is
 * not 1, a lone Orientation tag. Whatever nobody listed (GPS, XMP, IPTC, maker notes, comments,
 * thumbnails, trailing data) is dropped by never having been named. Pixels decode identical.
 */
final class CleanOriginal {

    private static final Set<String> PNG_KEEP = Set.of("IHDR", "PLTE", "tRNS", "IDAT", "IEND", "gAMA", "cHRM", "sRGB",
            "iCCP");

    private CleanOriginal() {
    }

    static byte[] jpeg(byte[] b, int orientation) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(b.length);
        List<JpegSegments.Segment> segments = JpegSegments.parse(b);
        out.write(0xFF);
        out.write(0xD8);
        for (JpegSegments.Segment s : segments) {
            if (s.marker() == 0xE0 && s.startsWith(b, "JFIF\0"))
                copy(out, b, s);
        }
        if (orientation != 1) {
            byte[] tiff = ExifOrientation.minimalTiff(orientation);
            int len = 2 + 6 + tiff.length;
            out.write(0xFF);
            out.write(0xE1);
            out.write(len >> 8);
            out.write(len & 0xFF);
            out.writeBytes(new byte[]{'E', 'x', 'i', 'f', 0, 0});
            out.writeBytes(tiff);
        }
        for (JpegSegments.Segment s : segments) {
            int m = s.marker();
            boolean keep = JpegSegments.isSof(m)
                    || m == 0xC4 || m == 0xDB || m == 0xDD || m == 0xDA || m == 0xCC || m == 0xDC
                    || (m == 0xEE && s.startsWith(b, "Adobe"))
                    || (m == 0xE2 && s.startsWith(b, "ICC_PROFILE\0"))
                    || m == 0xD9;
            if (keep)
                copy(out, b, s);
        }
        return out.toByteArray();
    }

    static byte[] png(byte[] b, int orientation) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(b.length);
        out.writeBytes(PngChunks.SIGNATURE);
        boolean exifWritten = orientation == 1;
        for (PngChunks.Chunk c : PngChunks.parse(b)) {
            if (!exifWritten && c.type().equals("IDAT")) {
                writeChunk(out, "eXIf", ExifOrientation.minimalTiff(orientation));
                exifWritten = true;
            }
            if (PNG_KEEP.contains(c.type()))
                out.write(b, c.start(), c.end() - c.start());
        }
        return out.toByteArray();
    }

    private static void copy(ByteArrayOutputStream out, byte[] b, JpegSegments.Segment s) {
        out.write(b, s.start(), s.end() - s.start());
    }

    private static void writeChunk(ByteArrayOutputStream out, String type, byte[] data) {
        out.writeBytes(int32(data.length));
        byte[] body = new byte[4 + data.length];
        for (int i = 0; i < 4; i++)
            body[i] = (byte) type.charAt(i);
        System.arraycopy(data, 0, body, 4, data.length);
        out.writeBytes(body);
        CRC32 crc = new CRC32();
        crc.update(body);
        out.writeBytes(int32((int) crc.getValue()));
    }

    private static byte[] int32(int v) {
        return new byte[]{(byte) (v >> 24), (byte) (v >> 16), (byte) (v >> 8), (byte) v};
    }
}
