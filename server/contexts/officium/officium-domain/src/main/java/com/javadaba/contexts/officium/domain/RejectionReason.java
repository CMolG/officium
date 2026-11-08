package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Why a card was rejected (card://JAVA-1415): a closed list, so rejections can be counted by reason
 * and the board learns where it fails. Three of them name another card: the original a duplicate
 * repeats, the card that superseded it, or the card it should have been a step of.
 */
public enum RejectionReason {
    NOT_NEEDED("not-needed", "Not needed", "Nobody needs the outcome any more, or nobody ever did.", false), DUPLICATE(
            "duplicate", "Duplicate", "Another card already asks for the same thing: name it.",
            true), SUPERSEDED("superseded", "Superseded", "Another card replaced this one: name it.",
                    true), WRONG_SPLIT("wrong-split", "Wrong split",
                            "It should have been a step of another card: name it.", true), INFEASIBLE("infeasible",
                                    "Infeasible", "It cannot be done as asked: a spike, a limit or a cost proved it.",
                                    false), OTHER("other", "Other", "None of these: the note says what was wrong.",
                                            false);

    private final String wire;
    private final String label;
    private final String hint;
    private final boolean namesCard;

    RejectionReason(String wire, String label, String hint, boolean namesCard) {
        this.wire = wire;
        this.label = label;
        this.hint = hint;
        this.namesCard = namesCard;
    }

    public String wire() {
        return wire;
    }

    public String label() {
        return label;
    }

    public String hint() {
        return hint;
    }

    /** Whether a rejection for this reason must name the card it points to. */
    public boolean namesCard() {
        return namesCard;
    }

    public static RejectionReason fromWire(String value) {
        return Arrays.stream(values())
                .filter(r -> r.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("rejection_reason_invalid",
                        "Unknown rejection reason: " + value + ". One of: " + wires()));
    }

    static String wires() {
        return Arrays.stream(values()).map(RejectionReason::wire).collect(Collectors.joining(", "));
    }
}
