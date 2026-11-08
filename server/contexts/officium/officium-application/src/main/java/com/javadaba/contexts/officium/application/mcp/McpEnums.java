package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.ProjectColor;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** The enum schemas the operation table shares, derived from the domain enums so a new value can't be missing. */
final class McpEnums {

    private McpEnums() {
    }

    /** Derived from the enums, like {@code meta.states}: a status or category added to the domain
     *  can't be missing from the schema an agent is validated against. */
    static Map<String, Object> statusEnum() {
        return McpSchemas.stringEnum(wires(Status.values(), Status::wire).toArray(String[]::new));
    }
    static Map<String, Object> categoryEnum() {
        return McpSchemas.stringEnum(wires(Category.values(), Category::wire).toArray(String[]::new));
    }
    static Map<String, Object> signalEnum() {
        return McpSchemas.stringEnum(wires(Signal.values(), Signal::wire).toArray(String[]::new));
    }
    static Map<String, Object> reviewReturnEnum() {
        return McpSchemas.stringEnum(
                wires(ReviewReturnReason.values(), ReviewReturnReason::wire).toArray(String[]::new));
    }

    static Map<String, Object> rejectionEnum() {
        return McpSchemas.stringEnum(wires(RejectionReason.values(), RejectionReason::wire).toArray(String[]::new));
    }
    static Map<String, Object> subtypeEnum() {
        return McpSchemas.stringEnum(wires(SpikeSubtype.values(), SpikeSubtype::wire).toArray(String[]::new));
    }
    static <E> List<String> wires(E[] values, Function<E, String> toWire) {
        return Arrays.stream(values).map(toWire).toList();
    }
    static Map<String, Object> priorityEnum() {
        return McpSchemas.stringEnum("superHigh", "high", "medium", "low", "superLow");
    }
    static Map<String, Object> runStateEnum() {
        return McpSchemas.stringEnum("idle", "running", "completed", "failed");
    }
    static Map<String, Object> executorEnum() {
        return McpSchemas.stringEnum("ai", "human");
    }
    static Map<String, Object> projectColorEnum() {
        return McpSchemas.stringEnum(wires(ProjectColor.values(), ProjectColor::wire).toArray(String[]::new));
    }
}
