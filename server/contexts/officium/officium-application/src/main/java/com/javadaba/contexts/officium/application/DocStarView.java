package com.javadaba.contexts.officium.application;

/**
 * One starred page or collection as the sidebar draws it (JAVA-799, contract §8.21). {@code path} is
 * where it sits now, so it follows a move; {@code page} is null for a collection with no overview page.
 */
public record DocStarView(String kind, String path, String name, String icon, String iconColor, int position,
        DocPageView.Summary page) {
}
