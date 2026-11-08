package com.javadaba.platform.image;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.awt.image.IndexColorModel;

/**
 * Wu's colour quantizer over a 4-D histogram (RGB at 5 bits, alpha at 4): cumulative moments, then
 * greedy box cuts that maximize between-box variance. Dimension-generic, so alpha is just a
 * fourth axis; an opaque image collapses it to one cell.
 */
final class WuQuantizer {

    private static final int RGB_SIZE = 33;
    private static final int A_SIZE = 17;

    private final int[] size;
    private final int[] stride = new int[4];
    private final long[] wt;
    private final long[][] mom; // r, g, b, a
    private final double[] m2;

    private record Box(int[] lo, int[] hi, double variance) {
    }

    private WuQuantizer(boolean alpha) {
        size = new int[]{RGB_SIZE, RGB_SIZE, RGB_SIZE, alpha ? A_SIZE : 2};
        stride[3] = 1;
        for (int d = 2; d >= 0; d--)
            stride[d] = stride[d + 1] * size[d + 1];
        int cells = stride[0] * size[0];
        wt = new long[cells];
        mom = new long[4][cells];
        m2 = new double[cells];
    }

    /** At most {@code colors} colours; the result is an indexed image, alpha kept in its palette. */
    static BufferedImage quantize(BufferedImage argb, int colors, boolean alpha) {
        return new WuQuantizer(alpha).run(argb, colors, alpha);
    }

    private int cell(int p, boolean alpha) {
        int r = ((p >> 16) & 0xFF) >> 3;
        int g = ((p >> 8) & 0xFF) >> 3;
        int b = (p & 0xFF) >> 3;
        int a = alpha ? (p >>> 24) >> 4 : 0;
        return (r + 1) * stride[0] + (g + 1) * stride[1] + (b + 1) * stride[2] + (a + 1);
    }

    private BufferedImage run(BufferedImage argb, int colors, boolean alpha) {
        int[] px = Pixels.data(argb);
        for (int p : px) {
            int c = cell(p, alpha);
            int r = (p >> 16) & 0xFF;
            int g = (p >> 8) & 0xFF;
            int b = p & 0xFF;
            int a = alpha ? p >>> 24 : 255;
            wt[c]++;
            mom[0][c] += r;
            mom[1][c] += g;
            mom[2][c] += b;
            mom[3][c] += a;
            m2[c] += r * r + g * g + b * b + a * a;
        }
        cumulate();
        java.util.List<Box> boxes = new java.util.ArrayList<>();
        boxes.add(box(new int[4], new int[]{32, 32, 32, size[3] - 1}));
        while (boxes.size() < colors) {
            int best = -1;
            for (int i = 0; i < boxes.size(); i++) {
                if (boxes.get(i).variance() > 0
                        && (best < 0 || boxes.get(i).variance() > boxes.get(best).variance())) {
                    best = i;
                }
            }
            if (best < 0)
                break;
            Box[] halves = cut(boxes.get(best));
            if (halves == null) {
                boxes.set(best, new Box(boxes.get(best).lo(), boxes.get(best).hi(), 0));
                continue;
            }
            boxes.set(best, halves[0]);
            boxes.add(halves[1]);
        }
        return paint(argb, boxes, alpha);
    }

    private void cumulate() {
        long[][] all = {wt, mom[0], mom[1], mom[2], mom[3]};
        for (int d = 0; d < 4; d++) {
            for (int i = 0; i < wt.length; i++) {
                if ((i / stride[d]) % size[d] == 0)
                    continue;
                for (long[] a : all)
                    a[i] += a[i - stride[d]];
                m2[i] += m2[i - stride[d]];
            }
        }
    }

    /** Inclusion-exclusion over the box's 16 corners; lo is exclusive, hi inclusive. */
    private double volume(Object arr, int[] lo, int[] hi) {
        double sum = 0;
        for (int mask = 0; mask < 16; mask++) {
            int idx = 0;
            int sign = 1;
            for (int d = 0; d < 4; d++) {
                boolean top = (mask & (1 << d)) != 0;
                idx += (top ? hi[d] : lo[d]) * stride[d];
                if (!top)
                    sign = -sign;
            }
            sum += sign * (arr instanceof long[] l ? l[idx] : ((double[]) arr)[idx]);
        }
        return sum;
    }

    private Box box(int[] lo, int[] hi) {
        double w = volume(wt, lo, hi);
        double sq = 0;
        for (long[] m : mom) {
            double v = volume(m, lo, hi);
            sq += v * v;
        }
        double variance = w == 0 ? 0 : volume(m2, lo, hi) - sq / w;
        return new Box(lo, hi, variance);
    }

    private Box[] cut(Box b) {
        double bestScore = -1;
        int bestAxis = -1;
        int bestAt = -1;
        double totalW = volume(wt, b.lo(), b.hi());
        for (int d = 0; d < 4; d++) {
            for (int p = b.lo()[d] + 1; p < b.hi()[d]; p++) {
                int[] lowHi = b.hi().clone();
                lowHi[d] = p;
                int[] upLo = b.lo().clone();
                upLo[d] = p;
                double lw = volume(wt, b.lo(), lowHi);
                double uw = totalW - lw;
                if (lw == 0 || uw == 0)
                    continue;
                double score = 0;
                for (long[] m : mom) {
                    double l = volume(m, b.lo(), lowHi);
                    double u = volume(m, upLo, b.hi());
                    score += l * l / lw + u * u / uw;
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestAxis = d;
                    bestAt = p;
                }
            }
        }
        if (bestAxis < 0)
            return null;
        int[] lowHi = b.hi().clone();
        lowHi[bestAxis] = bestAt;
        int[] upLo = b.lo().clone();
        upLo[bestAxis] = bestAt;
        return new Box[]{box(b.lo(), lowHi), box(upLo, b.hi())};
    }

    private BufferedImage paint(BufferedImage argb, java.util.List<Box> boxes, boolean alpha) {
        int n = boxes.size();
        byte[] r = new byte[n];
        byte[] g = new byte[n];
        byte[] bl = new byte[n];
        byte[] a = new byte[n];
        byte[] tag = new byte[wt.length];
        for (int i = 0; i < n; i++) {
            Box b = boxes.get(i);
            double w = volume(wt, b.lo(), b.hi());
            if (w > 0) {
                r[i] = (byte) Math.round(volume(mom[0], b.lo(), b.hi()) / w);
                g[i] = (byte) Math.round(volume(mom[1], b.lo(), b.hi()) / w);
                bl[i] = (byte) Math.round(volume(mom[2], b.lo(), b.hi()) / w);
                a[i] = (byte) Math.round(volume(mom[3], b.lo(), b.hi()) / w);
            }
            for (int x = b.lo()[0] + 1; x <= b.hi()[0]; x++)
                for (int y = b.lo()[1] + 1; y <= b.hi()[1]; y++)
                    for (int z = b.lo()[2] + 1; z <= b.hi()[2]; z++)
                        for (int t = b.lo()[3] + 1; t <= b.hi()[3]; t++) {
                            tag[x * stride[0] + y * stride[1] + z * stride[2] + t] = (byte) i;
                        }
        }
        IndexColorModel icm = alpha ? new IndexColorModel(8, n, r, g, bl, a) : new IndexColorModel(8, n, r, g, bl);
        BufferedImage out = new BufferedImage(argb.getWidth(), argb.getHeight(), BufferedImage.TYPE_BYTE_INDEXED, icm);
        byte[] idx = ((DataBufferByte) out.getRaster().getDataBuffer()).getData();
        int[] px = Pixels.data(argb);
        for (int i = 0; i < px.length; i++)
            idx[i] = tag[cell(px[i], alpha)];
        return out;
    }
}
