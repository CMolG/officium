package com.javadaba.contexts.officium.domain.jql;

import java.util.ArrayList;
import java.util.List;

/** The Java twin of {@code jql.ts}'s {@code tokenize}. Throws {@link JqlInvalidException} with
 *  the exact same wording on an unclosed quote or an invalid character, instead of returning a
 *  result the parser has to check -- Java has exceptions where the TypeScript file has a
 *  {@code { tokens, error? }} pair. */
final class JqlLexer {

    private static final String[] OPERATORS = {"!=", ">=", "<=", "!~", "=", ">", "<", "~"};

    private JqlLexer() {
    }

    static List<JqlToken> tokenize(String input) {
        List<JqlToken> tokens = new ArrayList<>();
        int i = 0;
        int length = input.length();
        while (i < length) {
            char ch = input.charAt(i);
            if (Character.isWhitespace(ch)) {
                i++;
                continue;
            }
            if (ch == '"' || ch == '\'') {
                int start = i;
                StringBuilder value = new StringBuilder();
                i++;
                while (i < length && input.charAt(i) != ch) {
                    if (input.charAt(i) == '\\' && i + 1 < length) {
                        i++;
                    }
                    value.append(input.charAt(i));
                    i++;
                }
                if (i >= length) {
                    throw new JqlInvalidException("The quoted string is not closed.", start);
                }
                i++;
                tokens.add(new JqlToken(JqlTokenKind.STRING, value.toString(), start, i));
                continue;
            }
            if (ch == '(') {
                tokens.add(new JqlToken(JqlTokenKind.LPAREN, "(", i, i + 1));
                i++;
                continue;
            }
            if (ch == ')') {
                tokens.add(new JqlToken(JqlTokenKind.RPAREN, ")", i, i + 1));
                i++;
                continue;
            }
            if (ch == ',') {
                tokens.add(new JqlToken(JqlTokenKind.COMMA, ",", i, i + 1));
                i++;
                continue;
            }
            String op = matchOperator(input, i);
            if (op != null) {
                tokens.add(new JqlToken(JqlTokenKind.OP, op, i, i + op.length()));
                i += op.length();
                continue;
            }
            if (isWordChar(ch)) {
                int start = i;
                while (i < length && isWordChar(input.charAt(i))) {
                    i++;
                }
                tokens.add(new JqlToken(JqlTokenKind.WORD, input.substring(start, i), start, i));
                continue;
            }
            throw new JqlInvalidException("The character '" + ch + "' is not valid here.", i);
        }
        return tokens;
    }

    private static String matchOperator(String input, int at) {
        for (String op : OPERATORS) {
            if (input.startsWith(op, at)) {
                return op;
            }
        }
        return null;
    }

    /** Same class as {@code jql.ts}'s {@code WORD} regex: letters, digits, and
     *  {@code _-.:/@+} -- wide enough for a key ({@code OFF-12}), a URL-ish tag, or an epic name
     *  with no spaces. */
    private static boolean isWordChar(char ch) {
        return Character.isLetterOrDigit(ch) || "_-.:/@+".indexOf(ch) >= 0;
    }
}
