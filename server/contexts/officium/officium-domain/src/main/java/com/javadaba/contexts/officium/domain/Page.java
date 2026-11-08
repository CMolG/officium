package com.javadaba.contexts.officium.domain;

import java.util.List;

/** Cursor page, shared shape for cards and activity (contract §2). */
public record Page<T>(List<T> items, String nextCursor) {
}
