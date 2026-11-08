package com.javadaba.contexts.officium.application.backlog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The frontmatter YAML subset of {@code backlog.py} (JDB-235): {@code key: scalar}, inline
 * {@code [a, b]} lists and block lists, with its scalar-quoting rules, read and written byte for
 * byte as {@code backlog.py} does. Split out of {@link BacklogMarkdown}, which owns the file's body
 * and the card's keys (card://JAVA-1415).
 */
final class BacklogFrontmatter {

    private static final Pattern LIST_ITEM_RE = Pattern.compile("^[ \\t]+-[ \\t]+(.*)$");
    private static final Pattern KV_RE = Pattern.compile("^([A-Za-z_][A-Za-z0-9_]*):[ \\t]*(.*)$");
    private static final Pattern INT_RE = Pattern.compile("-?\\d+");
    private static final Pattern FLOAT_RE = Pattern.compile("-?\\d+\\.\\d+");
    private static final Pattern NUMERIC_RE = Pattern.compile("-?\\d+(\\.\\d+)?");

    private BacklogFrontmatter() {
    }

    static Map<String, Object> parse(String text) {
        Map<String, Object> data = new LinkedHashMap<>();
        List<String> currentList = null;
        String[] lines = text.split("\n", -1);
        for (int lineNo = 0; lineNo < lines.length; lineNo++) {
            String line = lines[lineNo];
            if (line.strip().isEmpty() || line.stripLeading().startsWith("#")) {
                continue;
            }
            Matcher item = LIST_ITEM_RE.matcher(line);
            if (item.matches()) {
                if (currentList == null) {
                    throw new BacklogMarkdown.BacklogFormatException(
                            "frontmatter line " + (lineNo + 1) + ": list item outside a key");
                }
                currentList.add(unquote(item.group(1)));
                continue;
            }
            Matcher kv = KV_RE.matcher(line);
            if (!kv.matches()) {
                throw new BacklogMarkdown.BacklogFormatException(
                        "frontmatter line " + (lineNo + 1) + ": unsupported YAML");
            }
            String key = kv.group(1);
            String rest = kv.group(2).strip();
            if (rest.isEmpty()) {
                currentList = new ArrayList<>();
                data.put(key, currentList);
            } else if (rest.startsWith("[") && rest.endsWith("]")) {
                String inner = rest.substring(1, rest.length() - 1).strip();
                List<String> inline = new ArrayList<>();
                if (!inner.isEmpty()) {
                    for (String part : inner.split(",")) {
                        if (!part.strip().isEmpty()) {
                            inline.add(unquote(part));
                        }
                    }
                }
                data.put(key, inline);
                currentList = null;
            } else {
                data.put(key, coerce(rest));
                currentList = null;
            }
        }
        return data;
    }

    private static String unquote(String raw) {
        raw = raw.strip();
        if (raw.length() >= 2 && raw.charAt(0) == raw.charAt(raw.length() - 1)
                && (raw.charAt(0) == '\'' || raw.charAt(0) == '"')) {
            String inner = raw.substring(1, raw.length() - 1);
            return raw.charAt(0) == '"'
                    ? inner.replace("\\\"", "\"").replace("\\\\", "\\")
                    : inner.replace("''", "'");
        }
        return raw;
    }

    private static Object coerce(String raw) {
        String val = unquote(raw);
        if (INT_RE.matcher(val).matches()) {
            try {
                return Integer.parseInt(val);
            } catch (NumberFormatException ex) {
                return Long.parseLong(val);
            }
        }
        if (FLOAT_RE.matcher(val).matches()) {
            return Double.parseDouble(val);
        }
        if (val.equals("true") || val.equals("false")) {
            return Boolean.parseBoolean(val);
        }
        if (val.equals("null") || val.equals("~") || val.isEmpty()) {
            return null;
        }
        return val;
    }

    /** {@code fields} in {@code keyOrder}; a key not in it is not written. */
    static String emit(Map<String, Object> fields, List<String> keyOrder) {
        StringBuilder out = new StringBuilder();
        boolean first = true;
        for (String key : keyOrder) {
            if (!fields.containsKey(key)) {
                continue;
            }
            if (!first) {
                out.append('\n');
            }
            first = false;
            Object value = fields.get(key);
            if (value instanceof List<?> list) {
                out.append(key).append(':');
                for (Object item : list) {
                    out.append("\n  - ").append(emitScalar(item));
                }
            } else {
                out.append(key).append(": ").append(emitScalar(value));
            }
        }
        return out.toString();
    }

    private static String emitScalar(Object value) {
        if (value instanceof Boolean b) {
            return b ? "true" : "false";
        }
        if (value instanceof Number n) {
            return n instanceof Double || n instanceof Float ? String.valueOf(n) : String.valueOf(n.longValue());
        }
        String s = String.valueOf(value);
        boolean needsQuotes = s.isEmpty()
                || !s.equals(s.strip())
                || (!s.isEmpty() && "-?:,[]{}#&*!|>'\"%@`".indexOf(s.charAt(0)) >= 0)
                || s.contains(": ")
                || s.endsWith(":")
                || NUMERIC_RE.matcher(s).matches()
                || List.of("true", "false", "null", "~", "yes", "no", "on", "off").contains(s);
        if (!needsQuotes) {
            return s;
        }
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
