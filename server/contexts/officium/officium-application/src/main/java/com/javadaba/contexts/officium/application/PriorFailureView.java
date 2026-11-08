package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.PriorFailureService.Answer;
import com.javadaba.contexts.officium.domain.PriorFailureSettings;
import com.javadaba.contexts.officium.domain.PriorFailures;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * The JSON of the prior-failure answer and of the settings (card://JAVA-1803), one shape for the MCP operation and the
 * REST twin: the answer as the agent reads it, nearest neighbours first.
 */
public final class PriorFailureView {

    private PriorFailureView() {
    }

    public static Map<String, Object> settingsView(PriorFailureSettings settings) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("windowDays", settings.windowDays());
        view.put("maxCards", settings.maxCards());
        view.put("maxFindings", settings.maxFindings());
        view.put("recurrenceThreshold", settings.recurrenceThreshold());
        return view;
    }

    /** The settings as the owner's setter answers them: the prior-failure keys, and the profile bar (card://JAVA-1804). */
    public static Map<String, Object> settingsView(QualitySettingsService.Effective effective) {
        Map<String, Object> view = settingsView(effective.priorFailures());
        view.put("profileRecommendations", Map.of("raiseAt", effective.profileRecommendations().raiseAt()));
        return view;
    }

    public static Map<String, Object> view(Answer answer) {
        PriorFailures failures = answer.failures();
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("card", answer.card());
        view.put("settings", settingsView(answer.settings()));
        view.put("customSettings", answer.customSettings());
        view.put("window", Map.of("from", answer.from().toString(), "to", answer.to().toString()));
        view.put("items", failures.items().stream().map(PriorFailureView::item).toList());
        view.put("recurring", failures.recurring().stream().map(PriorFailureView::recurring).toList());
        view.put("truncated", Map.of("cards", failures.droppedCards(), "findings", failures.droppedFindings(),
                "window", answer.windowTruncated()));
        return view;
    }

    private static Map<String, Object> item(PriorFailures.Item item) {
        PriorFailures.Failure failure = item.failure();
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("type", failure.kind() == PriorFailures.Failure.Kind.SEND_BACK ? "sendBack" : "escapedDefect");
        view.put("bases", item.bases().stream().map(basis -> basis.name().toLowerCase(Locale.ROOT)).toList());
        view.put("card", failure.cardKey());
        view.put("title", failure.title());
        view.put("category", failure.category() == null ? null : failure.category().wire());
        view.put("at", failure.at().toString());
        view.put("from", failure.from());
        view.put("to", failure.to());
        view.put("role", failure.role());
        view.put("reasons", failure.reasons().stream().map(reason -> reason.wire()).toList());
        view.put("ruleViolations", failure.ruleViolations().stream().map(rule -> rule.id()).toList());
        view.put("paths", item.paths());
        view.put("quote", failure.quote());
        return view;
    }

    private static Map<String, Object> recurring(PriorFailures.Recurring recurring) {
        return Map.of("reason", recurring.reason().wire(),
                "area", Map.of("kind", recurring.area().kind(), "value", recurring.area().value()),
                "count", recurring.count(), "cards", recurring.cards());
    }
}
