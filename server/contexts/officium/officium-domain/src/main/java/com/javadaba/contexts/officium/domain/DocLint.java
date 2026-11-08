package com.javadaba.contexts.officium.domain;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Checks a documentation page against the mechanical half of Officium's page schema (JAVA-781,
 * {@code docs.schema}): what a pattern can see, line by line. What needs a reader (one idea per
 * sentence, a lead that says what the reader gets, copyable literals) stays in the schema's
 * checklist.
 *
 * <p>Findings warn, they never reject: an imported or dated page is saved whatever it says, and the
 * findings travel next to it. Each one names its rule, so an agent can tell which part of the schema
 * a line breaks, and the 1-based line of the body it is on.
 */
public final class DocLint {

    public record Finding(String rule, int line, String message) {
    }

    static final Set<String> TYPES = Set.of("tutorial", "how-to", "reference", "explanation");
    static final Set<String> STATUSES = Set.of("draft", "beta", "stable", "deprecated");
    static final Set<String> LEVELS = Set.of("beginner", "intermediate", "advanced");
    static final Set<String> AUDIENCES = Set.of("developer", "admin", "end-user");
    static final Set<String> CODE_LANGUAGES = Set.of("bash", "powershell", "console", "text", "json", "yaml", "toml",
            "properties", "xml", "http", "sql", "ts", "tsx", "js", "java", "python", "dockerfile", "diff", "mermaid");
    static final List<String> REQUIRED_FIELDS = List.of("title", "description", "type", "status", "audience",
            "last_updated");
    static final int MAX_CODE_LINES = 30;
    static final int MAX_DIAGRAM_NODES = 12;
    static final int MAX_TABLE_COLUMNS = 6;

    private static final Pattern FIELD = Pattern.compile("^([A-Za-z_][\\w-]*):\\s*(.*)$");
    private static final Pattern FIELD_ITEM = Pattern.compile("^\\s*-\\s*(.*)$");
    private static final Pattern FENCE = Pattern.compile("^(\\s*)(`{3,}|~{3,})\\s*([^`\\s]*).*$");
    private static final Pattern HEADING = Pattern.compile("^ {0,3}(#{1,6})(?:\\s+(.*?))?\\s*#*\\s*$");
    private static final Pattern NOTICE = Pattern.compile("^\\s*>\\s*\\[!(\\w+)]");
    private static final Pattern LIST_ITEM = Pattern.compile("^(\\s*)(?:[-*+]|\\d+[.)])\\s+\\S");
    private static final Pattern TABLE_DELIMITER = Pattern
            .compile("^\\s*\\|?\\s*:?-+:?\\s*(\\|\\s*:?-+:?\\s*)*\\|?\\s*$");
    private static final Pattern INLINE_CODE = Pattern.compile("(`+)[^`]*?\\1");
    private static final Pattern HTML_TAG = Pattern.compile("</?([A-Za-z][A-Za-z0-9-]*)(?:\\s[^<>]*)?/?>");
    private static final Set<String> ALLOWED_HTML = Set.of("kbd", "details", "summary");

    private DocLint() {
    }

    public static List<Finding> lint(String body) {
        return new Run(body == null ? "" : body).findings();
    }

    /** One pass over one page: the state a line-by-line reading carries. */
    private static final class Run {

        private final String[] lines;
        private final List<Finding> findings = new ArrayList<>();
        private final Map<String, Object> fields = new LinkedHashMap<>();
        private final Map<String, Integer> fieldLines = new LinkedHashMap<>();
        private final Deque<OpenList> lists = new ArrayDeque<>();
        private int bodyStart;
        private String type;
        private String status;

        private String h1Text;
        private int h1Line;
        private int h1Count;
        private int previousLevel;
        private boolean awaitingLead;
        private boolean noticeBeforeFirstH2;
        private boolean seenH2;
        private DocSections.Section currentSection;
        private int highestSectionIndex = -1;
        private String highestSectionHeading;
        private final List<DocLintPurpose.Heading> headers = new ArrayList<>();
        private final Map<String, Integer> sectionsSeen = new LinkedHashMap<>();
        private int noticesInSection;
        private boolean noticeOpen;
        private boolean previousBlockNotice;

        Run(String body) {
            this.lines = body.replace("\r\n", "\n").split("\n", -1);
        }

        List<Finding> findings() {
            frontmatter();
            body();
            findings.addAll(DocLintPurpose.check(lines, headers, h1Count > 0 ? h1Line : 0, type));
            frontmatterAgainstBody();
            findings.sort(Comparator.comparingInt(Finding::line).thenComparing(Finding::rule));
            return List.copyOf(findings);
        }

        private void add(String rule, int index, String message) {
            findings.add(new Finding(rule, index + 1, message));
        }

        // ── Frontmatter ──

        private void frontmatter() {
            if (lines.length == 0 || !lines[0].strip().equals("---")) {
                add("frontmatter.missing", 0, "The page has no frontmatter: it opens with a YAML block between two "
                        + "`---` lines carrying title, description, type, status, audience and last_updated");
                return;
            }
            int close = -1;
            for (int i = 1; i < lines.length; i++) {
                if (lines[i].strip().equals("---")) {
                    close = i;
                    break;
                }
            }
            if (close < 0) {
                add("frontmatter.missing", 0, "The frontmatter is never closed: end it with a `---` line");
                return;
            }
            bodyStart = close + 1;
            String listKey = null;
            for (int i = 1; i < close; i++) {
                String line = lines[i];
                if (line.isBlank() || line.strip().startsWith("#")) {
                    continue;
                }
                Matcher item = FIELD_ITEM.matcher(line);
                if (listKey != null && item.find()) {
                    listOf(listKey).add(unquote(item.group(1)));
                    continue;
                }
                Matcher field = FIELD.matcher(line);
                if (!field.find()) {
                    continue;
                }
                String key = field.group(1);
                String value = field.group(2).strip();
                fieldLines.put(key, i);
                if (value.isEmpty()) {
                    fields.put(key, new ArrayList<String>());
                    listKey = key;
                } else if (value.startsWith("[")) {
                    add("frontmatter.list", i, "`" + key + "` is written inline: write it as a YAML list, one "
                            + "element per line");
                    List<String> items = new ArrayList<>();
                    for (String part : value.replaceAll("^\\[|]$", "").split(",")) {
                        if (!part.isBlank()) {
                            items.add(unquote(part.strip()));
                        }
                    }
                    fields.put(key, items);
                    listKey = null;
                } else {
                    fields.put(key, unquote(value));
                    listKey = null;
                }
            }
            checkFields();
        }

        @SuppressWarnings("unchecked")
        private List<String> listOf(String key) {
            return (List<String>) fields.get(key);
        }

        private void checkFields() {
            for (String required : REQUIRED_FIELDS) {
                if (!fields.containsKey(required)) {
                    add("frontmatter.required", 0, "The frontmatter has no `" + required + "`: the six required "
                            + "fields are " + String.join(", ", REQUIRED_FIELDS));
                }
            }
            type = scalarIn("type", TYPES);
            status = scalarIn("status", STATUSES);
            scalarIn("level", LEVELS);
            scalarIn("title", null);
            String description = scalarIn("description", null);
            if (description != null) {
                int length = description.codePointCount(0, description.length());
                if (length < 120 || length > 160) {
                    add("frontmatter.description-length", fieldLines.get("description"),
                            "`description` is " + length + " characters: it takes 120 to 160");
                }
            }
            String date = scalarIn("last_updated", null);
            if (date != null) {
                try {
                    if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) {
                        throw new DateTimeParseException("shape", date, 0);
                    }
                    LocalDate.parse(date);
                } catch (DateTimeParseException ex) {
                    add("frontmatter.date", fieldLines.get("last_updated"),
                            "`last_updated` is `" + date + "`: write the date as YYYY-MM-DD");
                }
            }
            List<String> audience = listIn("audience", 1, 3);
            if (audience != null) {
                for (String value : audience) {
                    if (!AUDIENCES.contains(value)) {
                        add("frontmatter.enum", fieldLines.get("audience"), "`audience` has `" + value
                                + "`: it takes " + String.join(", ", sorted(AUDIENCES)));
                    }
                }
            }
            listIn("tags", 1, 6);
            listIn("related", 0, 5);
        }

        /** The field's value when it is a scalar, checked against {@code allowed} when there is one. */
        private String scalarIn(String key, Set<String> allowed) {
            Object value = fields.get(key);
            if (value == null) {
                return null;
            }
            if (!(value instanceof String text)) {
                add("frontmatter.list", fieldLines.get(key), "`" + key + "` is a single value, not a list");
                return null;
            }
            if (allowed != null && !allowed.contains(text)) {
                add("frontmatter.enum", fieldLines.get(key), "`" + key + "` is `" + text + "`: it takes "
                        + String.join(", ", sorted(allowed)));
                return null;
            }
            return text;
        }

        private List<String> listIn(String key, int min, int max) {
            Object value = fields.get(key);
            if (value == null) {
                return null;
            }
            if (!(value instanceof List<?>)) {
                add("frontmatter.list", fieldLines.get(key), "`" + key + "` is a list: write it as a YAML list, "
                        + "one element per line");
                return null;
            }
            List<String> items = listOf(key);
            if (items.size() < min || items.size() > max) {
                add("frontmatter.list-size", fieldLines.get(key), "`" + key + "` has " + items.size()
                        + " elements: it takes " + min + " to " + max);
            }
            return items;
        }

        private void frontmatterAgainstBody() {
            Object title = fields.get("title");
            if (title instanceof String text && h1Text != null && !text.equals(h1Text)) {
                add("frontmatter.title-h1", h1Line, "The H1 says \"" + h1Text + "\" and the frontmatter's `title` \""
                        + text + "\": they are the same text");
            }
        }

        // ── Body ──

        private void body() {
            int i = bodyStart;
            while (i < lines.length) {
                String line = lines[i];
                Matcher fence = FENCE.matcher(line);
                if (fence.matches()) {
                    endListsUnlessInside(fence.group(1).length(), i);
                    blockLine(false);
                    i = fencedBlock(i, fence.group(2), fence.group(3));
                    continue;
                }
                if (line.isBlank()) {
                    if (noticeOpen) {
                        noticeOpen = false;
                        previousBlockNotice = true;
                    }
                    i++;
                    continue;
                }
                Matcher heading = HEADING.matcher(line);
                if (heading.matches()) {
                    endAllLists();
                    heading(i, heading.group(1).length(), heading.group(2) == null ? "" : heading.group(2).strip());
                    inline(i);
                    i++;
                    continue;
                }
                if (awaitingLead) {
                    awaitingLead = false;
                    if (!isParagraph(line)) {
                        add("section.lead", i, "The H1 is followed by a lead paragraph: 1 to 3 sentences saying what "
                                + "the page is, for whom, and what they get");
                    }
                }
                if (NOTICE.matcher(line).find()) {
                    endAllLists();
                    notice(i);
                    inline(i);
                    i++;
                    continue;
                }
                if (line.stripLeading().startsWith(">") && noticeOpen) {
                    inline(i);
                    i++;
                    continue;
                }
                blockLine(false);
                if (isTableStart(i)) {
                    endAllLists();
                    table(i);
                    while (i < lines.length && lines[i].stripLeading().startsWith("|")) {
                        inline(i);
                        i++;
                    }
                    continue;
                }
                list(i, line);
                inline(i);
                i++;
            }
            endAllLists();
            if (previousLevel == 0) {
                add("heading.single-h1", bodyStart, "The page has no H1: its title is its one H1");
            }
            if (awaitingLead) {
                add("section.lead", h1Line, "The H1 is followed by a lead paragraph: 1 to 3 sentences saying what the "
                        + "page is, for whom, and what they get");
            }
            if (!seenH2) {
                statusNoticeCheck();
            }
            requiredSections();
        }

        /** Any line that is not a notice nor blank ends whatever notice ran before it. */
        private void blockLine(boolean notice) {
            noticeOpen = notice;
            previousBlockNotice = false;
        }

        private int fencedBlock(int open, String marker, String language) {
            List<String> content = new ArrayList<>();
            int i = open + 1;
            Pattern close = Pattern.compile("^\\s*" + Pattern.quote(String.valueOf(marker.charAt(0))) + "{"
                    + marker.length() + ",}\\s*$");
            while (i < lines.length && !close.matcher(lines[i]).matches()) {
                content.add(lines[i]);
                i++;
            }
            if (awaitingLead) {
                awaitingLead = false;
                add("section.lead", open, "The H1 is followed by a lead paragraph, not a code block");
            }
            String lang = language.toLowerCase(Locale.ROOT);
            if (lang.isEmpty()) {
                add("code.language", open, "The code block has no language: name one on its fence (`text` for no "
                        + "highlighting)");
            } else if (!CODE_LANGUAGES.contains(lang)) {
                add("code.language", open, "`" + language + "` is not a language the schema allows: "
                        + String.join(", ", sorted(CODE_LANGUAGES)));
            }
            if (lang.equals("mermaid")) {
                diagram(open, content);
            } else if (content.size() > MAX_CODE_LINES) {
                add("code.length", open, "The code block has " + content.size() + " lines: show the relevant "
                        + MAX_CODE_LINES + " at most, mark what is left out with `// …`, and link the full file");
            }
            return Math.min(i + 1, lines.length);
        }

        private void diagram(int open, List<String> content) {
            MermaidDiagram diagram = MermaidDiagram.of(content);
            if (!diagram.hasAccTitle() || !diagram.hasAccDescr()) {
                add("mermaid.accessibility", open, "The diagram has no " + (diagram.hasAccTitle()
                        ? "`accDescr`"
                        : diagram.hasAccDescr() ? "`accTitle`" : "`accTitle` or `accDescr`")
                        + ": screen readers read them, so every diagram carries both");
            }
            if (diagram.nodes() > MAX_DIAGRAM_NODES) {
                add("mermaid.nodes", open, "The diagram has " + diagram.nodes() + " nodes: " + MAX_DIAGRAM_NODES
                        + " at most, so split it in two or go up one level of abstraction");
            }
        }

        private void heading(int i, int level, String text) {
            blockLine(false);
            noticesInSection = 0;
            if (awaitingLead) {
                awaitingLead = false;
                add("section.lead", i, "The H1 is followed by a lead paragraph before any heading");
            }
            if (level == 1) {
                h1Count++;
                if (h1Count == 1) {
                    h1Text = text;
                    h1Line = i;
                    awaitingLead = true;
                } else {
                    add("heading.single-h1", i, "A second H1: a page has exactly one, its title");
                }
            } else if (h1Count == 0 && previousLevel == 0) {
                add("heading.single-h1", i, "The first heading is not the H1: the page opens with its title");
            }
            if (previousLevel > 0 && level > previousLevel + 1) {
                add("heading.skipped-level", i, "An H" + level + " right after an H" + previousLevel
                        + ": no heading level is skipped");
            }
            previousLevel = level;
            if (level == 2) {
                if (!seenH2) {
                    statusNoticeCheck();
                }
                seenH2 = true;
                headers.add(new DocLintPurpose.Heading(i, text));
                section(i, text);
            }
        }

        private void section(int i, String text) {
            String key = DocSections.keyOf(text);
            currentSection = DocSections.find(key);
            if (currentSection == null) {
                return;
            }
            int index = DocSections.ALL.indexOf(currentSection);
            if (sectionsSeen.containsKey(key)) {
                add("section.order", i, "\"" + currentSection.heading() + "\" appears twice: a section comes once");
            } else if (index < highestSectionIndex) {
                add("section.order", i, "\"" + currentSection.heading() + "\" comes before \"" + highestSectionHeading
                        + "\" in the schema's order");
            }
            sectionsSeen.putIfAbsent(key, i);
            if (index > highestSectionIndex) {
                highestSectionIndex = index;
                highestSectionHeading = currentSection.heading();
            }
            if (type != null && currentSection.need(type) == 'X') {
                add("section.not-for-type", i, "Pages of type `" + type + "` have no \"" + currentSection.heading()
                        + "\" section: leave it out");
            }
        }

        private void statusNoticeCheck() {
            if (h1Count > 0 && status != null && !status.equals("stable") && !noticeBeforeFirstH2) {
                add("section.status-notice", h1Line, "The page's status is `" + status + "`: a notice after the "
                        + "lead says what that implies and what to use instead");
            }
        }

        private void requiredSections() {
            if (type == null || h1Count == 0) {
                return;
            }
            for (DocSections.Section section : DocSections.ALL) {
                if (section.need(type) == 'R' && !sectionsSeen.containsKey(section.key())) {
                    add("section.required", h1Line, "Pages of type `" + type + "` need a \"" + section.heading()
                            + "\" section");
                }
            }
        }

        private void notice(int i) {
            if (noticeOpen || previousBlockNotice) {
                add("notice.adjacent", i, "Two notices in a row: put the content between them, or merge them");
            }
            noticesInSection++;
            if (noticesInSection == 2) {
                add("notice.per-section", i, "A second notice in this section: one per section at most");
            }
            if (!seenH2 && h1Count > 0) {
                noticeBeforeFirstH2 = true;
            }
            noticeOpen = true;
            previousBlockNotice = false;
        }

        private boolean isParagraph(String line) {
            String text = line.stripLeading();
            return !text.startsWith(">") && !text.startsWith("|") && !text.startsWith("<")
                    && !LIST_ITEM.matcher(line).find();
        }

        private boolean isTableStart(int i) {
            return lines[i].stripLeading().startsWith("|") && i + 1 < lines.length
                    && TABLE_DELIMITER.matcher(lines[i + 1]).matches() && lines[i + 1].contains("-");
        }

        private void table(int i) {
            String header = INLINE_CODE.matcher(lines[i].strip()).replaceAll("code");
            header = header.replaceAll("^\\||\\|$", "");
            int columns = header.split("(?<!\\\\)\\|", -1).length;
            if (columns > MAX_TABLE_COLUMNS) {
                add("table.columns", i, "The table has " + columns + " columns: " + MAX_TABLE_COLUMNS
                        + " at most, so split it or move an attribute to prose");
            }
        }

        // ── Lists ──

        private record OpenList(int indent, int startLine, int[] items, DocSections.Section section) {
        }

        private void list(int i, String line) {
            Matcher item = LIST_ITEM.matcher(line);
            int indent = line.length() - line.stripLeading().length();
            if (item.find()) {
                while (!lists.isEmpty() && lists.peek().indent() > indent) {
                    endList(lists.pop());
                }
                if (!lists.isEmpty() && lists.peek().indent() == indent) {
                    lists.peek().items()[0]++;
                } else {
                    lists.push(new OpenList(indent, i, new int[]{1}, lists.isEmpty() ? currentSection : null));
                }
                return;
            }
            endListsUnlessInside(indent, i);
        }

        /** A line indented under the innermost list's items continues it; anything else ends them. */
        private void endListsUnlessInside(int indent, int i) {
            while (!lists.isEmpty() && indent <= lists.peek().indent()) {
                endList(lists.pop());
            }
        }

        private void endAllLists() {
            while (!lists.isEmpty()) {
                endList(lists.pop());
            }
        }

        private void endList(OpenList list) {
            int min = list.section() == null ? 2 : list.section().minItems();
            int max = list.section() == null ? 7 : list.section().maxItems();
            int count = list.items()[0];
            if (count < min || count > max) {
                add("list.size", list.startLine(), "The list has " + count + " item" + (count == 1 ? "" : "s")
                        + ": " + (count < min ? "with one, write a sentence" : "use a table or subsections")
                        + " (" + min + " to " + max + " here)");
            }
        }

        // ── Inline ──

        private void inline(int i) {
            String text = DocLintImages.checked(INLINE_CODE.matcher(lines[i]).replaceAll(""), i, this::add);
            if (text.contains("~~")) {
                add("format.strikethrough", i, "Strikethrough: delete what is obsolete, or mark it with a "
                        + "`[!WARNING]` notice");
            }
            if (text.contains("<!--")) {
                add("html.forbidden", i, "An HTML comment: the only HTML a page takes is `<kbd>`, `<details>` and "
                        + "`<summary>`");
            }
            boolean underline = false;
            boolean other = false;
            Matcher tag = HTML_TAG.matcher(text);
            while (tag.find()) {
                String name = tag.group(1).toLowerCase(Locale.ROOT);
                underline |= name.equals("u");
                other |= !name.equals("u") && !ALLOWED_HTML.contains(name);
            }
            if (underline) {
                add("format.underline", i, "Underline: readers take it for a link, so no page uses it");
            }
            if (other) {
                add("html.forbidden", i, "HTML other than `<kbd>`, `<details>` and `<summary>`: write it as Markdown, "
                        + "or put a literal in inline code");
            }
        }
    }

    private static String unquote(String value) {
        String text = value.strip();
        if (text.length() >= 2 && (text.startsWith("\"") && text.endsWith("\"")
                || text.startsWith("'") && text.endsWith("'"))) {
            return text.substring(1, text.length() - 1);
        }
        return text;
    }

    private static List<String> sorted(Set<String> values) {
        return values.stream().sorted().toList();
    }
}
