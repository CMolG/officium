package com.javadaba.platform.image;

import java.util.ArrayList;
import java.util.List;

/** Splits a JPEG into its marker segments, stopping at the primary image's EOI. */
final class JpegSegments {

    /** [start, end) is every byte of the segment; for SOS, header plus entropy-coded data. */
    record Segment(int marker, int start, int end) {
        int dataStart() {
            return start + 4;
        }

        boolean startsWith(byte[] b, String prefix) {
            int n = prefix.length();
            if (end - dataStart() < n)
                return false;
            for (int i = 0; i < n; i++)
                if (b[dataStart() + i] != (byte) prefix.charAt(i))
                    return false;
            return true;
        }
    }

    private JpegSegments() {
    }

    static List<Segment> parse(byte[] b) {
        List<Segment> out = new ArrayList<>();
        if (b.length < 4 || (b[0] & 0xFF) != 0xFF || (b[1] & 0xFF) != 0xD8) {
            throw ImageRefusedException.malformed("not a JPEG");
        }
        out.add(new Segment(0xD8, 0, 2));
        int i = 2;
        while (true) {
            while (i < b.length && (b[i] & 0xFF) != 0xFF)
                i++;
            while (i < b.length && (b[i] & 0xFF) == 0xFF)
                i++;
            if (i >= b.length)
                throw ImageRefusedException.malformed("no EOI");
            int m = b[i] & 0xFF;
            int start = i - 1;
            i++;
            if (m == 0xD9) {
                out.add(new Segment(m, start, i));
                return out;
            }
            if (m == 0x01 || (m >= 0xD0 && m <= 0xD7) || m == 0x00)
                continue;
            if (i + 2 > b.length)
                throw ImageRefusedException.malformed("truncated segment");
            int len = ((b[i] & 0xFF) << 8) | (b[i + 1] & 0xFF);
            int end = i + len;
            if (len < 2 || end > b.length)
                throw ImageRefusedException.malformed("bad segment length");
            i = end;
            if (m == 0xDA) {
                while (i + 1 < b.length) {
                    if ((b[i] & 0xFF) != 0xFF) {
                        i++;
                        continue;
                    }
                    int n = b[i + 1] & 0xFF;
                    if (n == 0 || (n >= 0xD0 && n <= 0xD7))
                        i += 2;
                    else if (n == 0xFF)
                        i++;
                    else
                        break;
                }
                end = i;
            }
            out.add(new Segment(m, start, end));
        }
    }

    static boolean isSof(int m) {
        return m >= 0xC0 && m <= 0xCF && m != 0xC4 && m != 0xC8 && m != 0xCC;
    }
}
