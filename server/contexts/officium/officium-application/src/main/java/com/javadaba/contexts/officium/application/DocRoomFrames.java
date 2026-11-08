package com.javadaba.contexts.officium.application;

import java.nio.ByteBuffer;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The wire shapes of a documentation room (JAVA-803, ADR 0024): control frames are JSON text built
 * from a map, data frames are binary {@code [kind u8][seq u32][payload]}. The relay never reads a
 * payload, so there is no Yjs here.
 */
public final class DocRoomFrames {

    public static final int UPDATE = 0;
    public static final int SNAPSHOT = 1;
    public static final int AWARENESS = 2;
    public static final int HEADER = 5;

    private DocRoomFrames() {
    }

    /** One frame for one connection: a control map, or a data frame when {@code data} is set. */
    public record Out(String to, Map<String, Object> control, byte[] data) {

        public boolean closes() {
            return control != null && Boolean.TRUE.equals(control.get("close"));
        }
    }

    /** A data frame as received: its kind, the sequence the client names, and the bytes. */
    public record Data(int kind, long seq, byte[] payload) {
    }

    public static Out control(String to, String type, Object... pairs) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", type);
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            map.put((String) pairs[i], pairs[i + 1]);
        }
        return new Out(to, map, null);
    }

    public static Out data(String to, int kind, long seq, byte[] payload) {
        return new Out(to, null, encode(kind, seq, payload));
    }

    public static byte[] encode(int kind, long seq, byte[] payload) {
        return ByteBuffer.allocate(HEADER + payload.length).put((byte) kind).putInt((int) seq).put(payload).array();
    }

    /** @return the frame, or null when it is too short or of an unknown kind. */
    public static Data decode(byte[] frame) {
        if (frame.length < HEADER || frame[0] < UPDATE || frame[0] > AWARENESS) {
            return null;
        }
        ByteBuffer buffer = ByteBuffer.wrap(frame);
        int kind = buffer.get();
        long seq = buffer.getInt() & 0xFFFFFFFFL;
        byte[] payload = new byte[frame.length - HEADER];
        buffer.get(payload);
        return new Data(kind, seq, payload);
    }
}
