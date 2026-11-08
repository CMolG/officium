package com.javadaba.platform.image;

/**
 * What a caller accepts. The pixel cap can be lowered but never raised past {@link #MAX_PIXELS}:
 * a 100 MP image needs about 950 MB of heap to decode (JAVA-1235) and several times that to
 * reduce; {@link ImageInfo#estimatedHeapBytes()} covers the reduce.
 */
public record ImageLimits(long maxBytes, long maxPixels) {

    public static final long MAX_PIXELS = 100_000_000L;

    public ImageLimits {
        if (maxBytes <= 0 || maxPixels <= 0) {
            throw new IllegalArgumentException("limits must be positive");
        }
        maxPixels = Math.min(maxPixels, MAX_PIXELS);
    }

    public static ImageLimits ofBytes(long maxBytes) {
        return new ImageLimits(maxBytes, MAX_PIXELS);
    }
}
