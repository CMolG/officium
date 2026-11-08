package com.javadaba.contexts.officium.application;

/**
 * The description of a wall ({@code cards.requestHuman}), rendered from its four blocks. Moved out of
 * {@code CardService}, which is at its size ceiling (card://JAVA-1525).
 */
final class WallBody {

    private WallBody() {
    }

    static String render(CardService.RequestHuman request) {
        StringBuilder body = new StringBuilder();
        body.append("## Why this needs you\n").append(orEmpty(request.why())).append("\n\n");
        body.append("## Steps\n").append(orEmpty(request.steps())).append("\n\n");
        body.append("## Done when\n").append(orEmpty(request.doneWhen())).append("\n\n");
        body.append("## Unblocks\n");
        if (request.unblocks() == null || request.unblocks().isEmpty()) {
            body.append("(none)");
        } else {
            for (String key : request.unblocks()) {
                body.append("- ").append(key).append('\n');
            }
        }
        return body.toString();
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }
}
