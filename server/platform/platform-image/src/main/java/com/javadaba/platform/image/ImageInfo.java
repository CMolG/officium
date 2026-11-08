package com.javadaba.platform.image;

/** What the header says, read before any pixel is allocated. */
public record ImageInfo(
        ImageFormat format, int width, int height, int orientation, long estimatedHeapBytes) {
}
