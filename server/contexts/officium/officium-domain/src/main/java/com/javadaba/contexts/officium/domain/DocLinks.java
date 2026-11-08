package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The pages a documentation page points at (JAVA-792, contract §8.20), read from its text: the
 * server twin of the web's {@code bodyPagePath} and {@code relatedPagePath}. A reference is a
 * {@code doc://<path>} anywhere outside a fenced block (inline code included, since that is how
 * pages cite), a Markdown link to a relative {@code .md}, or a frontmatter {@code related} entry.
 * Anchors, {@code §…} and {@code .md} are dropped, and a placeholder like {@code doc://<path>} is
 * not a reference.
 */
public final class DocLinks {

    /** A page the text points at, and the 1-based line of the first mention. */
    public record Ref(String path, int line) {
    }

    private static final Pattern DOC_REF = Pattern
            .compile("doc://([a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)");
    private static final Pattern MD_LINK = Pattern.compile("\\]\\(([^)\\s]+)\\)");
    private static final Pattern FENCE = Pattern.compile("^\\s*(`{3,}|~{3,})");
    private static final Pattern RELATED_ITEM = Pattern.compile("^\\s*-\\s*(.*)$");
    private static final Pattern SCHEME = Pattern.compile("^[a-z][a-z0-9+.-]*:", Pattern.CASE_INSENSITIVE);

    private DocLinks() {
    }

    public static List<Ref> extract(String pagePath, String body) {
        String[] lines = (body == null ? "" : body).replace("\r\n", "\n").split("\n", -1);
        Map<String, Integer> found = new LinkedHashMap<>();
        int start = 0;
        if (lines.length > 0 && lines[0].strip().equals("---")) {
            int close = frontmatterEnd(lines);
            if (close > 0) {
                related(pagePath, lines, close, found);
                start = close + 1;
            }
        }
        String fence = null;
        for (int i = start; i < lines.length; i++) {
            Matcher marker = FENCE.matcher(lines[i]);
            if (marker.find()) {
                String run = marker.group(1);
                if (fence == null) {
                    fence = run;
                } else if (run.charAt(0) == fence.charAt(0) && run.length() >= fence.length()) {
                    fence = null;
                }
                continue;
            }
            if (fence == null) {
                scan(pagePath, lines[i], i + 1, found);
            }
        }
        List<Ref> refs = new ArrayList<>();
        found.forEach((path, line) -> refs.add(new Ref(path, line)));
        return refs;
    }

    /** The path a relative or {@code doc://} target names, or {@code null} when it names no page. */
    static String pagePath(String fromPage, String target) {
        String clean = target.replaceAll("#.*$", "");
        if (clean.startsWith("doc://")) {
            return valid(clean.substring("doc://".length()).replaceAll("\\.md$", ""));
        }
        if (SCHEME.matcher(clean).find() || clean.startsWith("/") || !clean.endsWith(".md")) {
            return null;
        }
        List<String> parts = new ArrayList<>(List.of(fromPage.split("/")));
        parts.remove(parts.size() - 1);
        for (String segment : clean.replaceAll("\\.md$", "").split("/")) {
            if (segment.equals(".") || segment.isEmpty()) {
                continue;
            }
            if (segment.equals("..")) {
                if (!parts.isEmpty()) {
                    parts.remove(parts.size() - 1);
                }
            } else {
                parts.add(segment);
            }
        }
        return parts.isEmpty() ? null : valid(String.join("/", parts));
    }

    private static void scan(String pagePath, String line, int number, Map<String, Integer> found) {
        Matcher doc = DOC_REF.matcher(line);
        while (doc.find()) {
            add(pagePath, doc.group(1), number, found);
        }
        Matcher link = MD_LINK.matcher(line);
        while (link.find()) {
            String target = link.group(1);
            if (!target.startsWith("doc://")) {
                add(pagePath, pagePath(pagePath, target), number, found);
            }
        }
    }

    private static void related(String pagePath, String[] lines, int close, Map<String, Integer> found) {
        boolean inRelated = false;
        for (int i = 1; i < close; i++) {
            String line = lines[i];
            if (line.matches("^related:\\s*(\\[.*])?\\s*$")) {
                inRelated = true;
                inline(pagePath, line, i + 1, found);
            } else if (inRelated) {
                Matcher item = RELATED_ITEM.matcher(line);
                if (item.find()) {
                    add(pagePath, relatedPath(pagePath, unquote(item.group(1))), i + 1, found);
                } else if (!line.isBlank()) {
                    inRelated = false;
                }
            }
        }
    }

    private static void inline(String pagePath, String line, int number, Map<String, Integer> found) {
        int open = line.indexOf('[');
        if (open < 0) {
            return;
        }
        for (String part : line.substring(open + 1).replaceAll("]\\s*$", "").split(",")) {
            if (!part.isBlank()) {
                add(pagePath, relatedPath(pagePath, unquote(part.strip())), number, found);
            }
        }
    }

    private static String relatedPath(String pagePath, String entry) {
        if (entry.startsWith("doc://")) {
            return pagePath(pagePath, entry);
        }
        if (SCHEME.matcher(entry).find() || entry.startsWith("/")) {
            return null;
        }
        return pagePath(pagePath, entry.endsWith(".md") ? entry : entry + ".md");
    }

    private static int frontmatterEnd(String[] lines) {
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].strip().equals("---")) {
                return i;
            }
        }
        return -1;
    }

    private static void add(String pagePath, String path, int line, Map<String, Integer> found) {
        String valid = path == null ? null : valid(path);
        if (valid != null && !valid.equals(pagePath)) {
            found.putIfAbsent(valid, line);
        }
    }

    private static String valid(String path) {
        try {
            return DocPage.normalizePath(path);
        } catch (OfficiumException e) {
            return null;
        }
    }

    private static String unquote(String value) {
        String stripped = value.strip();
        if (stripped.length() >= 2 && (stripped.startsWith("\"") && stripped.endsWith("\"")
                || stripped.startsWith("'") && stripped.endsWith("'"))) {
            return stripped.substring(1, stripped.length() - 1);
        }
        return stripped;
    }
}
