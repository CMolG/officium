package com.javadaba.platform.image;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Splits a PNG into chunks. CRCs are not checked: the decoder does that. */
final class PngChunks {

    record Chunk(String type, int start, int dataStart, int length) {
        int end() {
            return dataStart + length + 4;
        }
    }

    static final byte[] SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};

    private PngChunks() {
    }

    static boolean hasSignature(byte[] b) {
        if (b.length < 8)
            return false;
        for (int i = 0; i < 8; i++)
            if (b[i] != SIGNATURE[i])
                return false;
        return true;
    }

    static List<Chunk> parse(byte[] b) {
        if (!hasSignature(b))
            throw ImageRefusedException.malformed("not a PNG");
        List<Chunk> out = new ArrayList<>();
        int i = 8;
        while (i + 12 <= b.length) {
            long len = u32(b, i) & 0xFFFFFFFFL;
            if (len > b.length - i - 12)
                throw ImageRefusedException.malformed("truncated chunk");
            String type = new String(b, i + 4, 4, StandardCharsets.ISO_8859_1);
            Chunk c = new Chunk(type, i, i + 8, (int) len);
            out.add(c);
            i = c.end();
            if (type.equals("IEND"))
                return out;
        }
        throw ImageRefusedException.malformed("no IEND");
    }

    static int u32(byte[] b, int i) {
        return ((b[i] & 0xFF) << 24) | ((b[i + 1] & 0xFF) << 16) | ((b[i + 2] & 0xFF) << 8)
                | (b[i + 3] & 0xFF);
    }
}
