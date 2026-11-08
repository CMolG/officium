package com.javadaba.platform.image;

import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Turns a picture an AI model made into a JPEG that says so (EU AI Act Art. 50(2): machine-readable
 * marking). The marker is XMP's IPTC {@code DigitalSourceType = trainedAlgorithmicMedia}, in an APP1
 * segment right after the JFIF header.
 *
 * <p>{@link Codecs} attaches no metadata on purpose (that is what makes a stored image clean), so
 * the marker is added here, after the encode, and nowhere else.</p>
 */
public final class AiProvenance {

    public static final String DIGITAL_SOURCE_TYPE = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

    /** The packet's begin attribute carries U+FEFF; spelled as a number so no invisible character sits in the source. */
    private static final String BYTE_ORDER_MARK = String.valueOf((char) 0xFEFF);
    private static final String XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";
    private static final String XMP_PACKET = "<?xpacket begin=\"" + BYTE_ORDER_MARK
            + "\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>"
            + "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\"><rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">"
            + "<rdf:Description rdf:about=\"\" xmlns:Iptc4xmpExt=\"http://iptc.org/std/Iptc4xmpExt/2008-02-12/\""
            + " Iptc4xmpExt:DigitalSourceType=\"" + DIGITAL_SOURCE_TYPE + "\"/>"
            + "</rdf:RDF></x:xmpmeta><?xpacket end=\"w\"?>";
    private static final float[] QUALITY_LADDER = {0.85f, 0.75f, 0.65f, 0.55f, 0.45f, 0.35f};

    private AiProvenance() {
    }

    /**
     * Re-encodes a generated PNG or JPEG as a JPEG of at most {@code maxBytes} (the highest quality
     * of a fixed ladder that fits, else the lowest) and marks it. Alpha goes over white.
     *
     * @throws ImageRefusedException when the input is not a readable JPEG or PNG within {@code limits}
     */
    public static ReducedImage asMarkedJpeg(byte[] generated, ImageLimits limits, int maxBytes) {
        ImageProbe.probe(generated, limits);
        BufferedImage image = Pixels.toArgb(Pixels.decode(generated));
        byte[] best = null;
        for (float quality : QUALITY_LADDER) {
            best = Codecs.jpeg(image, quality);
            if (best.length <= maxBytes) {
                break;
            }
        }
        byte[] marked = mark(best);
        return new ReducedImage(marked, ImageFormat.JPEG, image.getWidth(), image.getHeight(), 1.0,
                Double.NaN, ReducedImage.Kind.REENCODED);
    }

    /** The JPEG with the marker added after its leading APP0, unless it already carries one. */
    public static byte[] mark(byte[] jpeg) {
        if (isMarked(jpeg)) {
            return jpeg;
        }
        List<JpegSegments.Segment> segments = JpegSegments.parse(jpeg);
        int at = segments.size() > 1 && segments.get(1).marker() == 0xE0 ? segments.get(1).end() : 2;
        byte[] payload = (XMP_HEADER + XMP_PACKET).getBytes(StandardCharsets.UTF_8);
        int length = payload.length + 2;
        byte[] out = new byte[jpeg.length + payload.length + 4];
        System.arraycopy(jpeg, 0, out, 0, at);
        out[at] = (byte) 0xFF;
        out[at + 1] = (byte) 0xE1;
        out[at + 2] = (byte) (length >> 8);
        out[at + 3] = (byte) length;
        System.arraycopy(payload, 0, out, at + 4, payload.length);
        System.arraycopy(jpeg, at, out, at + 4 + payload.length, jpeg.length - at);
        return out;
    }

    /** Whether the JPEG carries the marker in an XMP segment (not just anywhere in its bytes). */
    public static boolean isMarked(byte[] jpeg) {
        for (JpegSegments.Segment segment : JpegSegments.parse(jpeg)) {
            if (segment.marker() == 0xE1 && segment.startsWith(jpeg, XMP_HEADER)) {
                String xmp = new String(jpeg, segment.dataStart(), segment.end() - segment.dataStart(),
                        StandardCharsets.UTF_8);
                if (xmp.contains(DIGITAL_SOURCE_TYPE)) {
                    return true;
                }
            }
        }
        return false;
    }
}
