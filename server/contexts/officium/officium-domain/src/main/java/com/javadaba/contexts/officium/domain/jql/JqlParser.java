package com.javadaba.contexts.officium.domain.jql;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * OQL's parser -- the Java twin of {@code jql.ts}'s {@code parseJql} (contract JDB-270): same
 * grammar, same fields, same functions, same default sort, and the SAME error wording, so a
 * person who has learned the search box's query language does not learn a second one when an
 * agent runs the identical query over MCP or the REST search takes it over the wire. Ported by
 * hand rather than shared some other way, because the two runtimes disagree on very little
 * (string/regex semantics, and how a date parses) and Java has no JS engine of its own to run the
 * original in.
 *
 * <p>Where {@code jql.ts} returns a {@code JqlResult} the caller has to check, this throws {@link
 * JqlInvalidException} on any problem -- an empty query is still valid and matches every card.
 */
public final class JqlParser {

    private final String input;
    private final List<JqlToken> tokens;
    private int pos;

    private JqlParser(String input, List<JqlToken> tokens) {
        this.input = input;
        this.tokens = tokens;
    }

    public static JqlQuery parse(String input) {
        List<JqlToken> tokens = JqlLexer.tokenize(input);
        return new JqlParser(input, tokens).parseQuery();
    }

    private JqlToken peek() {
        return pos < tokens.size() ? tokens.get(pos) : null;
    }

    private JqlToken tokenAt(int index) {
        return index >= 0 && index < tokens.size() ? tokens.get(index) : null;
    }

    private int endAt() {
        JqlToken t = peek();
        return t != null ? t.start() : input.length();
    }

    private static String describe(JqlToken t) {
        return t != null ? "'" + t.value() + "'" : "the end of the query";
    }

    private static boolean isKeyword(JqlToken t, String word) {
        return t != null && t.kind() == JqlTokenKind.WORD && t.value().toLowerCase(Locale.ROOT).equals(word);
    }

    private JqlQuery parseQuery() {
        JqlNode where = null;
        if (!tokens.isEmpty() && !isKeyword(peek(), "order")) {
            where = orExpr();
        }
        List<JqlOrder> order = List.of();
        if (isKeyword(peek(), "order")) {
            order = orderBy();
        }
        if (pos < tokens.size()) {
            throw new JqlInvalidException("Expecting AND, OR or ORDER BY but got " + describe(peek()) + ".",
                    tokens.get(pos).start());
        }
        return new JqlQuery(where, order);
    }

    private JqlNode orExpr() {
        List<JqlNode> items = new ArrayList<>();
        items.add(andExpr());
        while (isKeyword(peek(), "or")) {
            pos++;
            items.add(andExpr());
        }
        return items.size() == 1 ? items.get(0) : new JqlNode.Or(items);
    }

    private JqlNode andExpr() {
        List<JqlNode> items = new ArrayList<>();
        items.add(notExpr());
        while (isKeyword(peek(), "and")) {
            pos++;
            items.add(notExpr());
        }
        return items.size() == 1 ? items.get(0) : new JqlNode.And(items);
    }

    private JqlNode notExpr() {
        if (isKeyword(peek(), "not")) {
            pos++;
            return new JqlNode.Not(notExpr());
        }
        if (peek() != null && peek().kind() == JqlTokenKind.LPAREN) {
            pos++;
            JqlNode inner = orExpr();
            if (peek() == null || peek().kind() != JqlTokenKind.RPAREN) {
                throw new JqlInvalidException("Expecting ')' but got " + describe(peek()) + ".", endAt());
            }
            pos++;
            return inner;
        }
        return clause();
    }

    private JqlField field() {
        JqlToken t = peek();
        if (t == null || (t.kind() != JqlTokenKind.WORD && t.kind() != JqlTokenKind.STRING)
                || JqlKeywords.isKeyword(t.value())) {
            throw new JqlInvalidException("Expecting a field name but got " + describe(t) + ".", endAt());
        }
        JqlField def = JqlFields.byName(JqlWords.norm(t.value()));
        if (def == null) {
            throw new JqlInvalidException("Field '" + t.value() + "' does not exist. Try " + JqlFields.hint() + "…",
                    t.start());
        }
        pos++;
        return def;
    }

    private JqlOp operator(JqlField def) {
        JqlToken t = peek();
        int at = endAt();
        JqlOp op = null;
        if (t != null && t.kind() == JqlTokenKind.OP) {
            op = JqlOp.fromSymbol(t.value());
            pos++;
        } else if (isKeyword(t, "in")) {
            op = JqlOp.IN;
            pos++;
        } else if (isKeyword(t, "is")) {
            pos++;
            op = JqlOp.IS;
            if (isKeyword(peek(), "not")) {
                pos++;
                op = JqlOp.IS_NOT;
            }
        } else if (isKeyword(t, "not") && isKeyword(tokenAt(pos + 1), "in")) {
            op = JqlOp.NOT_IN;
            pos += 2;
        }
        if (op == null) {
            throw new JqlInvalidException("Expecting an operator after '" + def.canonicalName() + "' but got "
                    + describe(t) + ".", at);
        }
        if (!def.ops().contains(op)) {
            throw new JqlInvalidException("The operator '" + op.symbol() + "' is not supported by the '"
                    + def.canonicalName() + "' field.", at);
        }
        return op;
    }

    private JqlValue value(JqlField def) {
        JqlToken t = peek();
        if (t == null || (t.kind() != JqlTokenKind.WORD && t.kind() != JqlTokenKind.STRING)) {
            throw new JqlInvalidException("Expecting a value but got " + describe(t) + ".", endAt());
        }
        pos++;
        if (t.kind() == JqlTokenKind.WORD && peek() != null && peek().kind() == JqlTokenKind.LPAREN) {
            JqlFunction fn = JqlFunctions.byName(t.value().toLowerCase(Locale.ROOT));
            if (fn == null) {
                throw new JqlInvalidException("Unknown function '" + t.value() + "()'.", t.start());
            }
            pos++;
            if (peek() == null || peek().kind() != JqlTokenKind.RPAREN) {
                throw new JqlInvalidException("Expecting ')' but got " + describe(peek()) + ".", endAt());
            }
            pos++;
            boolean fnAllowed = fn == JqlFunction.CURRENT_USER
                    ? def.kind() == JqlFieldKind.NAME
                    : def.kind() == JqlFieldKind.DATE;
            if (!fnAllowed) {
                throw new JqlInvalidException("The function '" + t.value() + "()' is not supported by the '"
                        + def.canonicalName() + "' field.", t.start());
            }
            return new JqlValue(t.value(), fn, false);
        }
        JqlValue v = new JqlValue(t.value());
        String problem = JqlValues.invalid(def, v);
        if (problem != null) {
            throw new JqlInvalidException(problem, t.start());
        }
        return v;
    }

    private JqlNode clause() {
        JqlField def = field();
        JqlOp op = operator(def);
        if (op == JqlOp.IS || op == JqlOp.IS_NOT) {
            JqlToken t = peek();
            if (!isKeyword(t, "empty") && !isKeyword(t, "null")) {
                throw new JqlInvalidException("Expecting EMPTY after '" + op.symbol() + "' but got " + describe(t)
                        + ".", endAt());
            }
            pos++;
            return new JqlNode.Clause(def.id(), op, List.of(JqlValue.emptyKeyword()));
        }
        if (op == JqlOp.IN || op == JqlOp.NOT_IN) {
            if (peek() == null || peek().kind() != JqlTokenKind.LPAREN) {
                throw new JqlInvalidException("Expecting '(' after '" + op.symbol() + "' but got "
                        + describe(peek()) + ".", endAt());
            }
            pos++;
            List<JqlValue> values = new ArrayList<>();
            values.add(value(def));
            while (peek() != null && peek().kind() == JqlTokenKind.COMMA) {
                pos++;
                values.add(value(def));
            }
            if (peek() == null || peek().kind() != JqlTokenKind.RPAREN) {
                throw new JqlInvalidException("Expecting ',' or ')' but got " + describe(peek()) + ".", endAt());
            }
            pos++;
            return new JqlNode.Clause(def.id(), op, values);
        }
        return new JqlNode.Clause(def.id(), op, List.of(value(def)));
    }

    private List<JqlOrder> orderBy() {
        pos++; // ORDER
        if (!isKeyword(peek(), "by")) {
            throw new JqlInvalidException("Expecting 'by' after 'order' but got " + describe(peek()) + ".",
                    endAt());
        }
        pos++;
        List<JqlOrder> order = new ArrayList<>();
        do {
            if (!order.isEmpty()) {
                pos++; // ","
            }
            JqlField def = field();
            if (!def.sortable()) {
                throw new JqlInvalidException("The field '" + def.canonicalName() + "' cannot be sorted by.",
                        tokens.get(pos - 1).start());
            }
            JqlOrder.Dir dir = def.kind() == JqlFieldKind.DATE ? JqlOrder.Dir.DESC : JqlOrder.Dir.ASC;
            if (isKeyword(peek(), "asc") || isKeyword(peek(), "desc")) {
                dir = peek().value().toLowerCase(Locale.ROOT).equals("asc") ? JqlOrder.Dir.ASC : JqlOrder.Dir.DESC;
                pos++;
            }
            order.add(new JqlOrder(def.id(), dir));
        } while (peek() != null && peek().kind() == JqlTokenKind.COMMA);
        return order;
    }
}
