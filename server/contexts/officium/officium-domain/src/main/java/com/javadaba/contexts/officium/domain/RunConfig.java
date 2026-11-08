package com.javadaba.contexts.officium.domain;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The model and effort an agent works a card with (JAVA-915). The model is the id {@code claude --model} takes
 * ({@code claude-opus-5-5}); any well-formed id is accepted, so a new model needs no deploy.
 */
public record RunConfig(String model, Effort effort) {

    private static final Pattern MODEL = Pattern.compile("^[a-z0-9]+([.-][a-z0-9]+)*$");
    private static final int MAX_MODEL = 64;

    public RunConfig {
        if (model == null || model.length() > MAX_MODEL || !MODEL.matcher(model).matches()) {
            throw OfficiumException.badRequest("invalid_role_matrix",
                    "A model is a lower-case id such as \"claude-sonnet-5-5\", not: " + model);
        }
        if (effort == null) {
            throw OfficiumException.badRequest("invalid_role_matrix", "A model needs its effort");
        }
    }

    public static RunConfig of(String model, String effort) {
        return new RunConfig(model, Effort.fromWire(effort));
    }

    /** Read from a wire object {@code {model, effort}}; anything else is {@code 400 invalid_role_matrix}. */
    static RunConfig fromWire(Object wire) {
        if (!(wire instanceof Map<?, ?> fields)) {
            throw OfficiumException.badRequest("invalid_role_matrix", "A run config is {model, effort}");
        }
        return of(text(fields.get("model")), text(fields.get("effort")));
    }

    private static String text(Object value) {
        return value instanceof String s ? s : null;
    }

    public Map<String, String> toWire() {
        Map<String, String> wire = new LinkedHashMap<>();
        wire.put("model", model);
        wire.put("effort", effort.wire());
        return wire;
    }
}
