package com.javadaba.platform.image;

/**
 * What to store. {@code quality} is the JPEG quality 0..1 of a re-encode, 1.0 for a lossless PNG,
 * 0 for a quantized one, and NaN for a cleaned original. {@code ssim} is 1.0 when nothing was
 * re-encoded. For a cleaned original the size is the stored one: its Orientation still applies.
 */
public record ReducedImage(
        byte[] bytes, ImageFormat format, int width, int height, double ssim, double quality, Kind kind) {

    public enum Kind {
        REENCODED, CLEANED_ORIGINAL
    }
}
