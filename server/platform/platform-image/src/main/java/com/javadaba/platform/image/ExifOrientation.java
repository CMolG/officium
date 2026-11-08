package com.javadaba.platform.image;

/** Reads IFD0's Orientation tag from a TIFF block, both byte orders. 1 when anything is off. */
final class ExifOrientation {

    private ExifOrientation() {
    }

    static int fromTiff(byte[] b, int off, int end) {
        try {
            if (end - off < 14)
                return 1;
            boolean be;
            if (b[off] == 'M' && b[off + 1] == 'M')
                be = true;
            else if (b[off] == 'I' && b[off + 1] == 'I')
                be = false;
            else
                return 1;
            if (u16(b, off + 2, be) != 42)
                return 1;
            long ifd = u32(b, off + 4, be);
            long p = off + ifd;
            if (ifd < 8 || p + 2 > end)
                return 1;
            int count = u16(b, (int) p, be);
            for (int i = 0; i < count; i++) {
                long e = p + 2 + 12L * i;
                if (e + 12 > end)
                    return 1;
                if (u16(b, (int) e, be) == 0x0112 && u16(b, (int) e + 2, be) == 3) {
                    int v = u16(b, (int) e + 8, be);
                    return v >= 1 && v <= 8 ? v : 1;
                }
            }
        } catch (RuntimeException e) {
            return 1;
        }
        return 1;
    }

    /** A TIFF block holding only Orientation, big endian. */
    static byte[] minimalTiff(int orientation) {
        return new byte[]{
                'M', 'M', 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, (byte) orientation, 0, 0,
                0, 0, 0, 0
        };
    }

    private static int u16(byte[] b, int i, boolean be) {
        int x = b[i] & 0xFF;
        int y = b[i + 1] & 0xFF;
        return be ? (x << 8) | y : (y << 8) | x;
    }

    private static long u32(byte[] b, int i, boolean be) {
        long hi = u16(b, i, be);
        long lo = u16(b, i + 2, be);
        return be ? (hi << 16) | lo : (lo << 16) | hi;
    }
}
