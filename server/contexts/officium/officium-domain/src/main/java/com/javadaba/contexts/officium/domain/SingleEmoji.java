package com.javadaba.contexts.officium.domain;

import java.text.BreakIterator;
import java.util.regex.Pattern;

/** Whether a string is exactly one emoji: one grapheme, at least one emoji code point, no ASCII letter or digit. */
public final class SingleEmoji {

    public static final int MAX_LENGTH = 40;

    /** A digit, # or * followed by the variation selector and the combining keycap, such as 1\uFE0F\u20E3. */
    private static final Pattern KEYCAP = Pattern.compile("[0-9#*]\\uFE0F?\\u20E3");

    private SingleEmoji() {
    }

    public static boolean is(String value) {
        if (value == null || value.isEmpty() || value.length() > MAX_LENGTH) {
            return false;
        }
        if (KEYCAP.matcher(value).matches()) {
            return true;
        }
        BreakIterator graphemes = BreakIterator.getCharacterInstance();
        graphemes.setText(value);
        graphemes.next();
        return graphemes.next() == BreakIterator.DONE && value.codePoints().anyMatch(Character::isEmoji)
                && value.codePoints().noneMatch(c -> c < 128 && Character.isLetterOrDigit(c));
    }
}
