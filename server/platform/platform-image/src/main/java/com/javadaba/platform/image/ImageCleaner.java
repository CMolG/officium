package com.javadaba.platform.image;

import java.awt.image.BufferedImage;

/** Two ways to a clean image: decode it upright in sRGB, or rewrite the original's whitelist. */
public final class ImageCleaner {

    private final ImageLimits limits;

    public ImageCleaner(ImageLimits limits) {
        this.limits = limits;
    }

    /** Orientation applied, sRGB, as INT_ARGB. The source's metadata is gone with the decode. */
    public BufferedImage decodeUpright(byte[] bytes) {
        ImageInfo info = ImageProbe.probe(bytes, limits);
        BufferedImage argb = Pixels.toArgb(Pixels.decode(bytes));
        if (info.width() != argb.getWidth() || info.height() != argb.getHeight()) {
            throw ImageRefusedException.malformed("header and image disagree");
        }
        if (info.format() == ImageFormat.PNG) {
            var profile = PngProfile.source(bytes, PngChunks.parse(bytes));
            if (profile != null) {
                try {
                    PngProfile.toSrgb(argb, profile);
                } catch (RuntimeException e) {
                    throw ImageRefusedException.malformed("colour profile cannot convert");
                }
            }
        }
        return Orientation.apply(argb, info.orientation());
    }

    /** The original with only its image, its colour profile and a lone Orientation kept. */
    public byte[] cleanOriginal(byte[] bytes) {
        ImageInfo info = ImageProbe.probe(bytes, limits);
        return info.format() == ImageFormat.JPEG
                ? CleanOriginal.jpeg(bytes, info.orientation())
                : CleanOriginal.png(bytes, info.orientation());
    }
}
