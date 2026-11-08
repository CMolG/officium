package com.javadaba.platform.image;

import java.awt.color.ColorSpace;
import java.awt.color.ICC_ColorSpace;
import java.awt.color.ICC_Profile;
import java.awt.image.BufferedImage;
import java.awt.image.ColorConvertOp;
import java.awt.image.ComponentColorModel;
import java.awt.image.DataBuffer;
import java.awt.image.DataBufferByte;
import java.awt.image.Raster;
import java.awt.Transparency;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.List;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

/**
 * The JDK's PNG reader ignores iCCP (JDK 25 probe, JAVA-1236), so a tagged PNG is converted to
 * sRGB here, once. The JPEG reader already does it on decode.
 */
final class PngProfile {

    private static final int MAX_PROFILE_BYTES = 4 << 20;

    private PngProfile() {
    }

    /** The RGB profile to convert from, or null when untagged, tagged sRGB, or not RGB. */
    static ICC_Profile source(byte[] png, List<PngChunks.Chunk> chunks) {
        PngChunks.Chunk iccp = null;
        for (PngChunks.Chunk c : chunks) {
            if (c.type().equals("sRGB"))
                return null;
            if (c.type().equals("iCCP"))
                iccp = c;
        }
        if (iccp == null)
            return null;
        try {
            int p = iccp.dataStart();
            int end = p + iccp.length();
            while (p < end && png[p] != 0)
                p++;
            if (end - p < 3)
                throw ImageRefusedException.malformed("iCCP chunk too short");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Inflater inf = new Inflater();
            try {
                inf.setInput(png, p + 2, end - p - 2);
                byte[] buf = new byte[8192];
                while (!inf.finished()) {
                    int n = inf.inflate(buf);
                    if (n == 0 && (inf.needsInput() || inf.needsDictionary()))
                        break;
                    out.write(buf, 0, n);
                    if (out.size() > MAX_PROFILE_BYTES)
                        return null;
                }
            } finally {
                inf.end();
            }
            ICC_Profile profile = ICC_Profile.getInstance(out.toByteArray());
            if (profile.getNumComponents() != 3 || profile.getColorSpaceType() != ColorSpace.TYPE_RGB) {
                return null;
            }
            byte[] srgb = ICC_Profile.getInstance(ColorSpace.CS_sRGB).getData();
            return Arrays.equals(profile.getData(), srgb) ? null : profile;
        } catch (ImageRefusedException e) {
            throw e;
        } catch (DataFormatException | IllegalArgumentException e) {
            return null;
        } catch (RuntimeException e) {
            throw ImageRefusedException.malformed("bad iCCP chunk");
        }
    }

    /** Converts the colour channels of an ARGB raster from {@code profile} to sRGB, alpha kept. */
    static void toSrgb(BufferedImage argb, ICC_Profile profile) {
        int w = argb.getWidth();
        int h = argb.getHeight();
        int[] px = Pixels.data(argb);
        var cm = new ComponentColorModel(
                new ICC_ColorSpace(profile), false, false, Transparency.OPAQUE, DataBuffer.TYPE_BYTE);
        Raster raster = Raster.createInterleavedRaster(DataBuffer.TYPE_BYTE, w, h, 3, null);
        byte[] rgb = ((DataBufferByte) raster.getDataBuffer()).getData();
        for (int i = 0; i < px.length; i++) {
            rgb[3 * i] = (byte) (px[i] >> 16);
            rgb[3 * i + 1] = (byte) (px[i] >> 8);
            rgb[3 * i + 2] = (byte) px[i];
        }
        BufferedImage src = new BufferedImage(cm, (java.awt.image.WritableRaster) raster, false, null);
        BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        new ColorConvertOp(null).filter(src, dst);
        int[] d = Pixels.data(dst);
        for (int i = 0; i < px.length; i++)
            px[i] = (px[i] & 0xFF000000) | (d[i] & 0xFFFFFF);
    }
}
