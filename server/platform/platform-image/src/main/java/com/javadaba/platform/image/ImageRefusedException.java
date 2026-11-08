package com.javadaba.platform.image;

/** An image refused with a typed reason; the words shown to a person are the consumer's. */
public final class ImageRefusedException extends RuntimeException {

    public enum Reason {
        TOO_MANY_BYTES, TOO_MANY_PIXELS, UNSUPPORTED_FORMAT, MALFORMED
    }

    private final Reason reason;
    private final String detail;

    public ImageRefusedException(Reason reason, String detail) {
        super(reason + (detail == null ? "" : ": " + detail));
        this.reason = reason;
        this.detail = detail;
    }

    public Reason reason() {
        return reason;
    }

    /** For UNSUPPORTED_FORMAT, the detected format (HEIF, AVIF, WEBP, GIF, APNG, TIFF, OTHER). */
    public String detail() {
        return detail;
    }

    static ImageRefusedException malformed(String why) {
        return new ImageRefusedException(Reason.MALFORMED, why);
    }
}
