package com.javadaba.platform.image;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.plugins.jpeg.JPEGImageWriteParam;
import javax.imageio.stream.MemoryCacheImageOutputStream;

/** Writers: JPEG with optimized Huffman tables, PNG through ImageIO. No metadata is attached. */
final class Codecs {

    private Codecs() {
    }

    /** An RGB or ARGB raster; transparency is composited over white. */
    static byte[] jpeg(BufferedImage image, float quality) {
        BufferedImage rgb = image.getType() == BufferedImage.TYPE_INT_RGB ? image : Pixels.rgbOverWhite(image);
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        JPEGImageWriteParam param = (JPEGImageWriteParam) writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);
        param.setOptimizeHuffmanTables(true);
        return write(writer, new IIOImage(rgb, null, null), param);
    }

    /** Lossless. An opaque raster is written as RGB, which is smaller than ARGB. */
    static byte[] png(BufferedImage image) {
        BufferedImage src = Pixels.hasAlpha(image) ? image : rgb(image);
        return writePng(src);
    }

    static byte[] writePng(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("png").next();
        return write(writer, new IIOImage(image, null, null), writer.getDefaultWriteParam());
    }

    private static BufferedImage rgb(BufferedImage argb) {
        BufferedImage out = new BufferedImage(argb.getWidth(), argb.getHeight(), BufferedImage.TYPE_INT_RGB);
        int[] s = Pixels.data(argb);
        int[] d = ((java.awt.image.DataBufferInt) out.getRaster().getDataBuffer()).getData();
        for (int i = 0; i < s.length; i++)
            d[i] = s[i] & 0xFFFFFF;
        return out;
    }

    private static byte[] write(ImageWriter writer, IIOImage image, ImageWriteParam param) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (var out = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(out);
            writer.write(null, image, param);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
