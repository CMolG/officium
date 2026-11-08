package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Page;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

/** Cursor paging over a list already sorted: the cursor is an offset, the same scheme as
 *  {@code InMemoryCardSearch}. Shared by the OQL path and the role filter ({@link CardRoleSearch}). */
final class OffsetPaging {

    private OffsetPaging() {
    }

    static <T> Page<T> window(List<T> sorted, String cursor, int limit) {
        int offset = decodeOffset(cursor);
        List<T> window = sorted.stream().skip(offset).limit((long) limit + 1).toList();
        boolean hasMore = window.size() > limit;
        List<T> items = hasMore ? window.subList(0, limit) : window;
        return new Page<>(items, hasMore ? encodeOffset(offset + limit) : null);
    }

    private static int decodeOffset(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static String encodeOffset(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }
}
