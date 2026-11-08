package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * What the documentation did about one change that reached main (JAVA-132, contract §8.8): nothing
 * yet, someone read it and nothing needed changing, or pages were updated for it.
 */
public enum DocsStatus {
    PENDING("pending"), REVIEWED("reviewed"), UPDATED("updated");

    private final String wire;

    DocsStatus(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static DocsStatus fromWire(String value) {
        return Arrays.stream(values())
                .filter(status -> status.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("invalid_docs_status",
                        "\"" + value + "\" is not a docs status: use pending, reviewed or updated"));
    }
}
