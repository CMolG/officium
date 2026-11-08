package com.javadaba.platform.image;

import java.awt.image.BufferedImage;

/**
 * ADR 0023's path: re-encode in the same format and keep the result only if its mean luma SSIM
 * is at least the threshold and it is smaller than the cleaned original, else the cleaned
 * original. A stored image is never larger than its input.
 */
public final class ImageReducer {

    /** ADR 0023's proposed value; the real-photo calibration run is still owed (JAVA-1236). */
    public static final double DEFAULT_THRESHOLD = 0.985;

    private static final float JPEG_LOW = 0.40f;
    private static final float JPEG_HIGH = 0.95f;
    private static final int JPEG_STEPS = 6;

    private record Candidate(byte[] bytes, double ssim, double quality) {
    }

    private final ImageLimits limits;
    private final ImageCleaner cleaner;
    private final double threshold;

    public ImageReducer(ImageLimits limits) {
        this(limits, DEFAULT_THRESHOLD);
    }

    public ImageReducer(ImageLimits limits, double threshold) {
        this.limits = limits;
        this.cleaner = new ImageCleaner(limits);
        this.threshold = threshold;
    }

    /** For a stored original (a phone photo, a screenshot). */
    public ReducedImage reduce(byte[] original) {
        ImageInfo info = ImageProbe.probe(original, limits);
        byte[] cleaned = cleaner.cleanOriginal(original);
        BufferedImage image = cleaner.decodeUpright(original);
        Candidate best = search(image, info.format());
        if (best != null && best.bytes().length < cleaned.length) {
            return new ReducedImage(
                    best.bytes(), info.format(), image.getWidth(), image.getHeight(), best.ssim(),
                    best.quality(), ReducedImage.Kind.REENCODED);
        }
        return new ReducedImage(
                cleaned, info.format(), info.width(), info.height(), 1.0, Double.NaN,
                ReducedImage.Kind.CLEANED_ORIGINAL);
    }

    /**
     * For a raster that is already a product (a resized image): the same gate against that image.
     * Nothing to fall back to, so when no candidate passes it is written at the highest quality.
     */
    public ReducedImage encode(BufferedImage image, ImageFormat format) {
        BufferedImage argb = format == ImageFormat.JPEG
                ? Pixels.toArgb(Pixels.rgbOverWhite(Pixels.toArgb(image)))
                : image.getType() == BufferedImage.TYPE_INT_ARGB ? image : Pixels.toArgb(image);
        Candidate best = search(argb, format);
        if (best == null) {
            best = format == ImageFormat.JPEG
                    ? bestEffortJpeg(argb)
                    : new Candidate(Codecs.png(argb), 1.0, 1.0);
        }
        return new ReducedImage(
                best.bytes(), format, argb.getWidth(), argb.getHeight(), best.ssim(), best.quality(),
                ReducedImage.Kind.REENCODED);
    }

    private static Candidate bestEffortJpeg(BufferedImage argb) {
        byte[] bytes = Codecs.jpeg(argb, JPEG_HIGH);
        return new Candidate(
                bytes, Ssim.of(argb).score(Pixels.toArgb(Pixels.decode(bytes))), JPEG_HIGH);
    }

    private Candidate search(BufferedImage image, ImageFormat format) {
        Ssim reference = Ssim.of(image);
        return format == ImageFormat.JPEG ? jpeg(image, reference) : png(image, reference);
    }

    private Candidate jpeg(BufferedImage image, Ssim reference) {
        float lo = JPEG_LOW;
        float hi = JPEG_HIGH;
        Candidate best = null;
        for (int i = 0; i < JPEG_STEPS; i++) {
            float mid = (lo + hi) / 2;
            Candidate c = tryJpeg(image, reference, mid);
            if (c != null) {
                best = c;
                hi = mid;
            } else {
                lo = mid;
            }
        }
        return best != null ? best : tryJpeg(image, reference, JPEG_HIGH);
    }

    private Candidate tryJpeg(BufferedImage image, Ssim reference, float quality) {
        byte[] bytes = Codecs.jpeg(image, quality);
        double score = reference.score(Pixels.toArgb(Pixels.decode(bytes)));
        return score >= threshold ? new Candidate(bytes, score, quality) : null;
    }

    private Candidate png(BufferedImage image, Ssim reference) {
        Candidate best = new Candidate(Codecs.png(image), 1.0, 1.0);
        boolean alpha = Pixels.hasAlpha(image);
        byte[] quantized = Codecs.writePng(WuQuantizer.quantize(image, 256, alpha));
        if (quantized.length < best.bytes().length) {
            double score = reference.score(Pixels.toArgb(Pixels.decode(quantized)));
            if (score >= threshold)
                best = new Candidate(quantized, score, 0);
        }
        return best;
    }
}
