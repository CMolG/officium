package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A project's standing Definition of Done (JAVA-1446): a short checklist its owner sets, which an agent answers in its
 * finishing comment when it moves a card out of its work phase into Review, Deploy or Done. The table after the
 * {@code Definition of done:} line has one row per item, answered by the item's leading number: {@code met} passes,
 * {@code not applicable} passes with a reason, {@code not met} is work left. The last row of an item wins across the
 * run's comments. The board checks the rows are there; the reviewer checks they are true. An empty list is no
 * standing checklist: the gate is off for every project that has not set one. A person is never gated.
 */
public final class DefinitionOfDone {

    public static final int MAX_ITEM_LENGTH = 200;
    public static final int TOKEN_QUOTA = WorkRuleTokens.TOKEN_QUOTA;
    public static final String INVALID = "definition_of_done_invalid";
    public static final String OVER_QUOTA = "work_rules_over_quota";

    static final String LABEL = "Definition of done:";

    private static final Pattern LABEL_LINE = Pattern.compile(
            "(?m)^\\s*(?:[-*]\\s+)?\\**Definition of done\\**:\\**.*$");
    private static final Pattern ORDINAL = Pattern.compile("^#?(\\d{1,3})(?:[.)]|\\s|$)");
    private static final Set<String> VERDICTS = Set.of("met", "not applicable", "not met");
    private static final String NOT_APPLICABLE = "not applicable";
    private static final String NOT_MET = "not met";

    /** One row of the table: the item it answers, its verdict normalized, and its reason or evidence cell. */
    private record Row(int number, String verdict, String note) {
    }

    private DefinitionOfDone() {
    }

    /**
     * The items as stored: trimmed, none blank, too long or repeated (ignoring case), and within the token quota
     * together (JAVA-1778).
     */
    public static List<String> valid(List<String> items) {
        Set<String> seen = new HashSet<>();
        List<String> trimmed = new ArrayList<>();
        for (String item : items) {
            String text = item == null ? "" : item.strip();
            if (text.isEmpty()) {
                throw OfficiumException.badRequest(INVALID, "each item of the definition of done is written");
            }
            if (text.length() > MAX_ITEM_LENGTH) {
                throw OfficiumException.badRequest(INVALID,
                        "each item of the definition of done is at most " + MAX_ITEM_LENGTH + " characters");
            }
            if (!seen.add(text.toLowerCase(Locale.ROOT))) {
                throw OfficiumException.badRequest(INVALID, "no two items of the definition of done are the same");
            }
            trimmed.add(text);
        }
        int total = WorkRuleTokens.total(trimmed);
        if (total > TOKEN_QUOTA) {
            throw OfficiumException.badRequest(OVER_QUOTA, "The work rules take " + total
                    + " tokens; the project's quota is " + TOKEN_QUOTA + ". Shorten them by "
                    + (total - TOKEN_QUOTA) + " tokens.");
        }
        return List.copyOf(trimmed);
    }

    /**
     * Refuses an agent's finish of an {@code ai} card out of its work phase into Review, Deploy or Done unless this
     * run's comments answer every item. {@code commentsThisRun} is read only when the gate applies.
     */
    public static void require(ActorKind actor, Card card, Status to, List<String> items,
            Supplier<List<CardComment>> commentsThisRun) {
        if (items.isEmpty() || card.category() == Category.EPIC || !CategoryContracts.gated(actor, card.executor())
                || CategoryContracts.RUN_ENDED.contains(card.status()) || !CategoryContracts.RUN_ENDED.contains(to)) {
            return;
        }
        Map<Integer, Row> answers = new HashMap<>();
        for (CardComment comment : commentsThisRun.get()) {
            for (Row row : rows(comment.text())) {
                answers.put(row.number(), row);
            }
        }
        List<String> missing = new ArrayList<>();
        List<String> notMet = new ArrayList<>();
        List<String> noReason = new ArrayList<>();
        for (int number = 1; number <= items.size(); number++) {
            String named = number + ". " + items.get(number - 1);
            Row row = answers.get(number);
            if (row == null) {
                missing.add(named);
            } else if (NOT_MET.equals(row.verdict())) {
                notMet.add(named);
            } else if (NOT_APPLICABLE.equals(row.verdict()) && row.note().isBlank()) {
                noReason.add(named);
            }
        }
        if (missing.isEmpty() && notMet.isEmpty() && noReason.isEmpty()) {
            return;
        }
        throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET,
                refusal(to, missing, notMet, noReason));
    }

    private static String refusal(Status to, List<String> missing, List<String> notMet, List<String> noReason) {
        List<String> parts = new ArrayList<>();
        if (!missing.isEmpty()) {
            parts.add("no row answers " + String.join(", ", missing));
        }
        if (!notMet.isEmpty()) {
            parts.add("marked not met, which is work left: " + String.join(", ", notMet));
        }
        if (!noReason.isEmpty()) {
            parts.add("not applicable with no reason: " + String.join(", ", noReason));
        }
        return "definition of done, exit: " + String.join("; ", parts) + ". Comment on the card (cards.comment) a "
                + "line `" + LABEL + "` then a table `| item | met / not applicable | evidence or reason |`, one row "
                + "per item by its number, then move it to " + to.wire() + " again. The board checks the rows are "
                + "there; the reviewer checks they are true.";
    }

    /** The rows after the {@code Definition of done:} line: the consecutive pipe lines whose first cell has a number. */
    private static List<Row> rows(String comment) {
        List<Row> rows = new ArrayList<>();
        Matcher label = LABEL_LINE.matcher(comment);
        if (!label.find()) {
            return rows;
        }
        List<String> lines = comment.substring(label.end()).lines().dropWhile(String::isBlank)
                .takeWhile(line -> line.trim().startsWith("|")).toList();
        for (String line : lines) {
            String[] cells = line.trim().split("\\|", -1);
            if (cells.length < 3) {
                continue;
            }
            Matcher ordinal = ORDINAL.matcher(plain(cells[1]));
            String verdict = plain(cells[2]);
            if (ordinal.find() && VERDICTS.contains(verdict)) {
                String note = cells.length > 3 ? cells[3].trim() : "";
                rows.add(new Row(Integer.parseInt(ordinal.group(1)), verdict, note));
            }
        }
        return rows;
    }

    /** A cell without bold or code marks, trimmed and lower case, the form the verdicts are compared in. */
    private static String plain(String cell) {
        return cell.replace("*", "").replace("`", "").trim().toLowerCase(Locale.ROOT);
    }
}
