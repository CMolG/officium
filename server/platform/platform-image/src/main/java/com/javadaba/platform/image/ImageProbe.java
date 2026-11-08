package com.javadaba.platform.image;

import java.nio.charset.StandardCharsets;
import java.util.List;

/** Reads an image's header and refuses before a single pixel is allocated. */
public final class ImageProbe {

    /**
     * The peak of {@code reduce}, not just the decode: upright ARGB, the reference SSIM planes, a
     * candidate's decode, its ARGB copy and its SSIM. Measured at about 44 B/px on a 12 MP JPEG
     * (JAVA-1236 review); 9.5 B/px is the decode alone.
     */
    private static final long HEAP_BYTES_PER_PIXEL_X2 = 96;

    private ImageProbe() {
    }

    public static ImageInfo probe(byte[] b, ImageLimits limits) {
        if (b == null || b.length < 12)
            throw ImageRefusedException.malformed("empty or too short");
        if (b.length > limits.maxBytes()) {
            throw new ImageRefusedException(
                    ImageRefusedException.Reason.TOO_MANY_BYTES, b.length + " bytes");
        }
        ImageFormat format = detect(b);
        int w;
        int h;
        int orientation = 1;
        if (format == ImageFormat.JPEG) {
            int[] dims = null;
            for (JpegSegments.Segment s : JpegSegments.parse(b)) {
                if (JpegSegments.isSof(s.marker()) && dims == null && s.end() - s.start() >= 11) {
                    int d = s.dataStart();
                    dims = new int[]{u16(b, d + 3), u16(b, d + 1)};
                } else if (s.marker() == 0xE1 && s.startsWith(b, "Exif\0\0")) {
                    orientation = ExifOrientation.fromTiff(b, s.dataStart() + 6, s.end());
                }
            }
            if (dims == null)
                throw ImageRefusedException.malformed("no frame header");
            w = dims[0];
            h = dims[1];
        } else {
            List<PngChunks.Chunk> chunks = PngChunks.parse(b);
            PngChunks.Chunk ihdr = chunks.get(0);
            if (!ihdr.type().equals("IHDR") || ihdr.length() < 13) {
                throw ImageRefusedException.malformed("no IHDR");
            }
            w = PngChunks.u32(b, ihdr.dataStart());
            h = PngChunks.u32(b, ihdr.dataStart() + 4);
            for (PngChunks.Chunk c : chunks) {
                if (c.type().equals("eXIf")) {
                    orientation = ExifOrientation.fromTiff(b, c.dataStart(), c.dataStart() + c.length());
                }
            }
        }
        if (w <= 0 || h <= 0)
            throw ImageRefusedException.malformed("zero size");
        long pixels = (long) w * h;
        if (pixels > limits.maxPixels()) {
            throw new ImageRefusedException(ImageRefusedException.Reason.TOO_MANY_PIXELS, w + "x" + h);
        }
        return new ImageInfo(format, w, h, orientation, pixels * HEAP_BYTES_PER_PIXEL_X2 / 2);
    }

    private static ImageFormat detect(byte[] b) {
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return ImageFormat.JPEG;
        }
        if (PngChunks.hasSignature(b)) {
            for (PngChunks.Chunk c : PngChunks.parse(b)) {
                if (c.type().equals("acTL"))
                    throw unsupported("APNG");
                if (c.type().equals("IDAT"))
                    break;
            }
            return ImageFormat.PNG;
        }
        if (ascii(b, 0, "GIF8"))
            throw unsupported("GIF");
        if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP"))
            throw unsupported("WEBP");
        if (ascii(b, 4, "ftyp")) {
            String brand = new String(b, 8, 4, StandardCharsets.ISO_8859_1);
            if (brand.startsWith("avi"))
                throw unsupported("AVIF");
            if (brand.startsWith("hei")
                    || brand.startsWith("hev")
                    || brand.equals("mif1")
                    || brand.equals("msf1")) {
                throw unsupported("HEIF");
            }
            throw unsupported("OTHER");
        }
        if (ascii(b, 0, "II*\0") || ascii(b, 0, "MM\0*"))
            throw unsupported("TIFF");
        throw unsupported("OTHER");
    }

    private static ImageRefusedException unsupported(String what) {
        return new ImageRefusedException(ImageRefusedException.Reason.UNSUPPORTED_FORMAT, what);
    }

    private static boolean ascii(byte[] b, int off, String s) {
        if (b.length < off + s.length())
            return false;
        for (int i = 0; i < s.length(); i++)
            if (b[off + i] != (byte) s.charAt(i))
                return false;
        return true;
    }

    private static int u16(byte[] b, int i) {
        return ((b[i] & 0xFF) << 8) | (b[i + 1] & 0xFF);
    }
}
