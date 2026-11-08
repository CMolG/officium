package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

public enum TimeSource {
    /** Logged by whoever typed it ({@code cards.logTime}, the web). */
    MANUAL("manual"),
    /** Imputed from an agent's run when it ended (JAVA-50, contract §8.4). */
    AGENT_RUN("agentRun"),
    /** Imputed from the whole agent session its harness reported, with tokens and model (JAVA-245,
     *  contract §8.4). Supersedes the run-imputed time it overlaps. */
    AGENT_SESSION("agentSession");

    private final String wire;

    TimeSource(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static TimeSource fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown time source: " + value));
    }
}
