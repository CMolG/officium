package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.regex.Pattern;

/**
 * How a project's agents execute its cards (card://JAVA-1878, epic JAVA-1868). {@link Mode#CARD}, the default, is how
 * every project worked before: each card is handed out and worked on its own. {@link Mode#EPIC} makes an open epic the
 * unit of the action and review phases: it is handed out once, and {@code implementerRole} works its cards as ordered
 * checkpoints in one session, so the repository is read once and the prompt prefix stays the same throughout.
 */
public record ExecutionMode(Mode mode, String implementerRole) {

    public static final String DEFAULT_IMPLEMENTER = "core-implementer";

    // Before CARD: the constructor reads them while the class initializes.
    private static final Pattern ROLE_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final int ROLE_ID_MAX = 64;

    /** What a project that never chose one runs under. */
    public static final ExecutionMode CARD = new ExecutionMode(Mode.CARD, DEFAULT_IMPLEMENTER);

    public ExecutionMode {
        mode = mode == null ? Mode.CARD : mode;
        implementerRole = implementerRole == null || implementerRole.isBlank()
                ? DEFAULT_IMPLEMENTER
                : implementerRole.strip();
        if (implementerRole.length() > ROLE_ID_MAX || !ROLE_ID.matcher(implementerRole).matches()) {
            throw new InvalidException("implementerRole", "implementerRole is a Fluxor role id: kebab-case, at most "
                    + ROLE_ID_MAX + " characters.");
        }
    }

    public boolean epic() {
        return mode == Mode.EPIC;
    }

    /** The mode a client sends: {@code mode} is {@code card} or {@code epic}, a blank role takes the default. */
    public static ExecutionMode of(String mode, String implementerRole) {
        if (mode == null || mode.isBlank()) {
            throw new InvalidException("mode", "mode is card or epic.");
        }
        return new ExecutionMode(Mode.fromWire(mode.strip()), implementerRole);
    }

    public enum Mode {
        CARD("card"), EPIC("epic");

        private final String wire;

        Mode(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        public static Mode fromWire(String wire) {
            return Arrays.stream(values()).filter(mode -> mode.wire.equals(wire)).findFirst()
                    .orElseThrow(() -> new InvalidException("mode", "mode is card or epic."));
        }
    }

    /** {@code 422 execution_mode_invalid}; {@code field} names the setting that broke. */
    public static final class InvalidException extends OfficiumException {

        private final String field;

        InvalidException(String field, String message) {
            super("execution_mode_invalid", message, 422);
            this.field = field;
        }

        public String field() {
            return field;
        }
    }
}
