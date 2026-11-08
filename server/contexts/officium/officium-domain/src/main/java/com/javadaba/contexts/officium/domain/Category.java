package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * What kind of work a card is (user request, 2026-09-23, JAVA-28), in the four groups the user
 * defined them in. Optional on the card: one created before this existed, or by someone who did
 * not say, has none -- and that is the truth about it until someone classifies it. The wire value
 * lives here; the label and the icon each one is drawn with live in the board
 * ({@code category-config.ts}).
 */
public enum Category {
    // Product and user value
    EPIC("epic"), FEATURE("feature"), USER_STORY("userStory"), ENHANCEMENT("enhancement"),
    // Corrective and stability
    BUG("bug"), HOTFIX("hotfix"), REGRESSION("regression"),
    // Technical and platform
    REFACTOR("refactor"), TECHNICAL_DEBT("technicalDebt"), INFRASTRUCTURE("infrastructure"), SECURITY("security"),
    // Research and quality
    SPIKE("spike"), TESTING("testing"), ROUTINE("routine"), DOCUMENTATION("documentation");

    private final String wire;

    Category(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    /** A value a caller sent: an unknown one is their mistake, answered {@code 400 invalid_category}. */
    public static Category fromWire(String value) {
        return Arrays.stream(values())
                .filter(c -> c.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("invalid_category", "Unknown category: " + value
                        + ". One of: " + String.join(", ", Arrays.stream(values()).map(Category::wire).toList())));
    }
}
