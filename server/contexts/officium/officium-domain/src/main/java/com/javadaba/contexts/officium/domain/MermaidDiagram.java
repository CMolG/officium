package com.javadaba.contexts.officium.domain;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * What {@link DocLint} needs to know about one Mermaid block (JAVA-781): its kind, whether it carries
 * its accessible title and description, and how many nodes it draws. Counting nodes is a reading of
 * the five kinds the page schema allows, not a Mermaid parser: it recognizes the ids the schema's own
 * examples use, and a construct it does not know adds nothing rather than a false node.
 */
record MermaidDiagram(String kind, boolean hasAccTitle, boolean hasAccDescr, int nodes) {

    private static final Pattern ACC_TITLE = Pattern.compile("^\\s*accTitle\\s*:");
    private static final Pattern ACC_DESCR = Pattern.compile("^\\s*accDescr\\s*[:{]");
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][\\w]*");
    private static final Pattern QUOTED = Pattern.compile("\"[^\"]*\"");
    private static final Pattern EDGE_LABEL = Pattern.compile("\\|[^|]*\\|");
    private static final Pattern INLINE_EDGE_TEXT = Pattern.compile("--\\s+[^->]+?\\s+-->|-\\.\\s+[^.]+?\\s+\\.->");
    private static final Pattern SHAPE = Pattern.compile("\\[[^\\[\\]]*]|\\([^()]*\\)|\\{[^{}]*}");
    private static final Pattern CLASS_REF = Pattern.compile(":::\\w+");
    private static final Pattern SEQUENCE_DECLARATION = Pattern.compile("^\\s*(?:participant|actor)\\s+(\\S+)");
    private static final Pattern SEQUENCE_MESSAGE = Pattern.compile(
            "^\\s*(\\w+)\\s*(?:<<)?-{1,2}(?:>>|>|x|\\))[+-]?\\s*(\\w+)\\s*:");
    private static final Pattern ER_RELATION = Pattern.compile("^\\s*([\\w-]+)\\s+\\S*(?:--|\\.\\.)\\S*\\s+([\\w-]+)");
    private static final Pattern BLOCK_OPEN = Pattern.compile("^\\s*(?:class\\s+)?([\\w-]+)\\s*\\{\\s*$");
    private static final Pattern CLASS_DECLARATION = Pattern.compile("^\\s*class\\s+(\\w+)");
    private static final Pattern CLASS_RELATION = Pattern.compile(
            "^\\s*(\\w+)\\s*(?:\"[^\"]*\"\\s*)?(?:<\\|--|\\*--|o--|-->|--\\*|--o|--\\|>|\\.\\.>|<\\.\\.|\\.\\.\\|>|<\\|\\.\\.|--|\\.\\.)"
                    + "\\s*(?:\"[^\"]*\"\\s*)?(\\w+)");
    /** Lines that configure the diagram or annotate it, and draw no node. */
    private static final Set<String> NOT_NODES = Set.of("accTitle", "accDescr", "direction", "style", "classDef",
            "class",
            "click", "linkStyle", "subgraph", "end", "note", "%%");
    private static final Set<String> KEYWORDS = Set.of("as", "state", "end", "TB", "TD", "LR", "RL", "BT", "direction");

    static MermaidDiagram of(List<String> lines) {
        String kind = "";
        boolean title = false;
        boolean descr = false;
        for (String line : lines) {
            if (kind.isEmpty() && !line.isBlank() && !line.strip().startsWith("%%")) {
                kind = line.strip().split("\\s+")[0];
            }
            title |= ACC_TITLE.matcher(line).find();
            descr |= ACC_DESCR.matcher(line).find();
        }
        Set<String> nodes = switch (kind) {
            case "sequenceDiagram" -> sequenceNodes(lines);
            case "erDiagram", "classDiagram" -> blockNodes(lines, kind.equals("classDiagram"));
            default -> graphNodes(lines, kind);
        };
        return new MermaidDiagram(kind, title, descr, nodes.size());
    }

    private static Set<String> sequenceNodes(List<String> lines) {
        Set<String> nodes = new LinkedHashSet<>();
        for (String line : lines) {
            Matcher declared = SEQUENCE_DECLARATION.matcher(line);
            if (declared.find()) {
                nodes.add(declared.group(1));
                continue;
            }
            Matcher message = SEQUENCE_MESSAGE.matcher(line);
            if (message.find()) {
                nodes.add(message.group(1));
                nodes.add(message.group(2));
            }
        }
        return nodes;
    }

    /** erDiagram and classDiagram: entities or classes, whose bodies between braces are attributes. */
    private static Set<String> blockNodes(List<String> lines, boolean classes) {
        Set<String> nodes = new LinkedHashSet<>();
        boolean inBody = false;
        for (String line : lines.subList(1, lines.size())) {
            if (inBody) {
                inBody = !line.strip().equals("}");
                continue;
            }
            Matcher block = BLOCK_OPEN.matcher(line);
            if (block.find()) {
                nodes.add(block.group(1));
                inBody = true;
                continue;
            }
            if (classes) {
                Matcher declared = CLASS_DECLARATION.matcher(line);
                Matcher relation = CLASS_RELATION.matcher(line);
                if (declared.find()) {
                    nodes.add(declared.group(1));
                } else if (relation.find()) {
                    nodes.add(relation.group(1));
                    nodes.add(relation.group(2));
                }
            } else {
                Matcher relation = ER_RELATION.matcher(line);
                if (relation.find()) {
                    nodes.add(relation.group(1));
                    nodes.add(relation.group(2));
                }
            }
        }
        return nodes;
    }

    /** flowchart and stateDiagram-v2: every id left once labels, shapes and edges are taken out. */
    private static Set<String> graphNodes(List<String> lines, String kind) {
        Set<String> nodes = new LinkedHashSet<>();
        boolean states = kind.startsWith("stateDiagram");
        boolean header = true;
        for (String line : lines) {
            String stripped = line.strip();
            if (stripped.isEmpty()) {
                continue;
            }
            if (header) {
                header = false;
                continue;
            }
            String first = stripped.split("[\\s:]+")[0];
            if (NOT_NODES.contains(first) || stripped.startsWith("%%") || stripped.equals("}")) {
                continue;
            }
            String text = QUOTED.matcher(stripped).replaceAll("");
            text = EDGE_LABEL.matcher(text).replaceAll("");
            text = INLINE_EDGE_TEXT.matcher(text).replaceAll("-->");
            if (states) {
                int colon = text.indexOf(':');
                text = colon < 0 ? text : text.substring(0, colon);
            }
            String previous;
            do {
                previous = text;
                text = SHAPE.matcher(text).replaceAll("");
            } while (!text.equals(previous));
            text = CLASS_REF.matcher(text).replaceAll("");
            Matcher id = IDENTIFIER.matcher(text);
            while (id.find()) {
                if (!KEYWORDS.contains(id.group())) {
                    nodes.add(id.group());
                }
            }
        }
        return nodes;
    }
}
