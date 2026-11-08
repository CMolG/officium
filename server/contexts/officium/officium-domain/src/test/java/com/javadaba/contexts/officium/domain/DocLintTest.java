package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-781: the page schema's mechanical rules, one broken page per rule. */
class DocLintTest {

    /** A how-to page that follows the schema: every required section, and one of each block it allows. */
    static final String CLEAN = """
            ---
            title: "Set up sign-in with Google"
            description: "Connect your app to Google OAuth 2.0 so users sign in with their Google account in under ten minutes, from keys to the first login."
            type: how-to
            status: stable
            audience:
              - developer
            last_updated: 2026-10-02
            tags:
              - auth
            related:
              - ./manage-sessions.md
            ---

            # Set up sign-in with Google

            Connect your app to Google so users sign in with their Google account. You end with a working login.

            ## Prerequisites

            - Java `21` or later.
            - A Google Cloud account with the **Owner** role.

            ## Overview

            The sign-in goes through three parts:

            ```mermaid
            flowchart LR
              accTitle: Sign-in parts
              accDescr: The backend exchanges the code with Google.
              app["App"] --> google["Google"] --> api["Backend"]
            ```

            The token never reaches the browser.

            ## Steps

            ### 1. Create the client

            Create an OAuth client for the app. Run:

            ```bash
            gcloud auth login
            ```

            > [!TIP]
            > Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.

            ### 2. Configure the app

            Add this to `application.yaml`:

            ```yaml
            # application.yaml
            google:
              client-id: <CLIENT_ID>
            ```

            Replace `<CLIENT_ID>` with the client's id.

            ## Check the result

            Run:

            ```bash
            curl -i localhost:8080/login
            ```

            You should see:

            ```text
            HTTP/1.1 302 Found
            ```

            ## Reference

            ### Settings

            | Name | Type | Required | Default | Description |
            | --- | --- | --- | --- | --- |
            | `client-id` | `string` | Yes | — | The OAuth client. |

            ## Troubleshooting

            ### `redirect_uri_mismatch`

            **Cause:** the redirect URI differs.

            **Solution:** add it in the console.

            <details>
            <summary>Why it happens</summary>

            Google compares the URI byte for byte.

            </details>

            ## Next steps

            - [Manage sessions](./manage-sessions.md) — how long a session lasts.
            """;

    @Test
    void a_page_that_follows_the_schema_has_no_findings() {
        assertThat(DocLint.lint(CLEAN)).isEmpty();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("brokenPages")
    void each_rule_names_the_line_that_breaks_it(String rule, String page, int line) {
        assertThat(DocLint.lint(page))
                .as("findings of the page breaking %s", rule)
                .extracting(DocLint.Finding::rule, DocLint.Finding::line)
                .contains(org.assertj.core.groups.Tuple.tuple(rule, line));
    }

    static Stream<Arguments> brokenPages() {
        return Stream.of(
                broken("frontmatter.missing", CLEAN.substring(CLEAN.indexOf("# Set up")), 1),
                broken("frontmatter.required", CLEAN.replace("last_updated: 2026-10-02\n", ""), 1),
                broken("frontmatter.enum", CLEAN.replace("type: how-to", "type: guide"), 4),
                broken("frontmatter.enum", CLEAN.replace("  - developer", "  - architect"), 6),
                broken("frontmatter.list", CLEAN.replace("audience:\n  - developer", "audience: developer"), 6),
                broken("frontmatter.list", CLEAN.replace("tags:\n  - auth", "tags: [auth]"), 9),
                broken("frontmatter.list-size",
                        CLEAN.replace("  - auth", "  - a\n  - b\n  - c\n  - d\n  - e\n  - f\n  - g"),
                        9),
                broken("frontmatter.title-h1", CLEAN.replace("# Set up sign-in with Google", "# Set up Google sign-in"),
                        15),
                broken("frontmatter.description-length",
                        CLEAN.replaceFirst("description: \"[^\"]*\"", "description: \"Too short.\""), 3),
                broken("frontmatter.date", CLEAN.replace("2026-10-02", "2026-13-40"), 8),
                broken("heading.single-h1", CLEAN + "\n# Another title\n\nA second page in this one.\n", 103),
                broken("heading.skipped-level", CLEAN.replace("### Settings", "#### Settings"), 78),
                broken("section.lead", CLEAN.replace("Connect your app to Google so users sign in with their Google "
                        + "account. You end with a working login.\n\n", ""), 17),
                broken("section.status-notice", CLEAN.replace("status: stable", "status: beta"), 15),
                broken("section.order",
                        CLEAN.replace("## Steps\n", "## FAQ\n\n### Does it work?\n\nYes.\n\n## Steps\n"),
                        43),
                broken("section.required", CLEAN.replace("## Troubleshooting", "## Problems"), 15),
                broken("section.not-for-type",
                        CLEAN + "\n## Changelog\n\n| Date | Version | Change |\n| --- | --- | --- |\n"
                                + "| 2026-10-02 | `1.0` | Added the page. |\n",
                        103),
                broken("code.language", CLEAN.replace("```bash\ngcloud", "```\ngcloud"), 43),
                broken("code.language", CLEAN.replace("```bash\ngcloud", "```shell\ngcloud"), 43),
                broken("code.length", CLEAN.replace("gcloud auth login\n", lines("echo step", 31)), 43),
                broken("mermaid.accessibility",
                        CLEAN.replace("  accDescr: The backend exchanges the code with Google.\n", ""), 28),
                broken("mermaid.nodes", CLEAN.replace("app[\"App\"] --> google[\"Google\"] --> api[\"Backend\"]",
                        IntStream.rangeClosed(1, 12).mapToObj(n -> "n" + n + " --> n" + (n + 1))
                                .collect(Collectors.joining("\n  "))),
                        28),
                broken("format.underline", CLEAN.replace("a working login.", "a <u>working</u> login."), 17),
                broken("format.strikethrough", CLEAN.replace("a working login.", "a ~~broken~~ working login."), 17),
                broken("html.forbidden", CLEAN.replace("a working login.", "a <span>working</span> login."), 17),
                broken("html.forbidden", CLEAN.replace("a working login.", "a working login. <!-- draft -->"), 17),
                broken("list.size", CLEAN.replace("- Java `21` or later.\n", lines("- Java `21` or later.", 7)), 21),
                broken("list.size", CLEAN.replace("**Cause:** the redirect URI differs.",
                        "**Cause:** the redirect URI differs.\n\n- One cause alone."), 90),
                broken("table.columns", CLEAN.replace("| Name | Type | Required | Default | Description |\n"
                        + "| --- | --- | --- | --- | --- |\n| `client-id` | `string` | Yes | — | The OAuth client. |",
                        "| Name | Type | Required | Default | Since | Scope | Description |\n"
                                + "| --- | --- | --- | --- | --- | --- | --- |\n"
                                + "| `client-id` | `string` | Yes | — | `1.0` | app | The OAuth client. |"),
                        80),
                broken("notice.per-section", CLEAN.replace("> Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.\n",
                        "> Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.\n\nThen wait.\n\n> [!NOTE]\n> It takes a minute.\n"),
                        52),
                broken("notice.adjacent", CLEAN.replace("> Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.\n",
                        "> Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.\n\n> [!NOTE]\n> It takes a minute.\n"), 50));
    }

    @Test
    void a_reference_page_has_its_own_required_sections() {
        String reference = CLEAN.replace("type: how-to", "type: reference");
        assertThat(rules(reference)).contains("section.not-for-type", "section.required");
        assertThat(DocLint.lint(reference)).extracting(DocLint.Finding::message)
                .contains("Pages of type `reference` need a \"Examples\" section",
                        "Pages of type `reference` have no \"Steps\" section: leave it out");
    }

    @Test
    void literals_in_inline_code_or_a_code_block_are_not_html() {
        String page = CLEAN.replace("a working login.", "a working login with `<span>` and `~~`.");
        assertThat(DocLint.lint(page)).isEmpty();
    }

    @Test
    void an_empty_body_says_what_it_lacks_rather_than_failing() {
        assertThat(rules("")).containsExactlyInAnyOrder("frontmatter.missing", "heading.single-h1");
        assertThat(rules(null)).containsExactlyInAnyOrder("frontmatter.missing", "heading.single-h1");
    }

    @Test
    void the_schemas_own_diagrams_count_their_nodes() {
        assertThat(MermaidDiagram.of(List.of("flowchart TD",
                "  accTitle: Choosing an inline format",
                "  accDescr: A technical literal is always code.",
                "  start((\"A fragment of text\")) --> literal{\"Does the user type or see it literally?\"}",
                "  literal -->|yes| code[\"Inline code\"]",
                "  literal -->|no| key{\"Is it a keyboard key?\"}",
                "  key -->|yes| kbd[\"kbd\"]",
                "  key -->|no| ui{\"A UI element?\"}",
                "  ui -->|yes| bold[\"Bold\"]",
                "  ui -->|no| title{\"The title of an external work?\"}",
                "  title -->|yes| italic[\"Italic\"]",
                "  title -->|no| plain[\"Plain text\"]")))
                .isEqualTo(new MermaidDiagram("flowchart", true, true, 10));
        assertThat(MermaidDiagram.of(List.of("sequenceDiagram",
                "  actor User", "  participant App", "  participant Google", "  participant API as Backend",
                "  User->>App: Clicks \"Sign in with Google\"", "  App->>Google: Redirects with client_id",
                "  Google-->>App: Authorization code", "  API-->>App: Session created")).nodes())
                .isEqualTo(4);
        assertThat(MermaidDiagram.of(List.of("stateDiagram-v2", "  [*] --> Draft", "  Draft --> Sent : send()",
                "  Sent --> Paid : pay", "  Paid --> [*]")).nodes()).isEqualTo(3);
        assertThat(MermaidDiagram.of(List.of("erDiagram", "  CUSTOMER ||--o{ ORDER : places",
                "  ORDER ||--|{ LINE : contains", "  CUSTOMER {", "    string name", "  }")).nodes()).isEqualTo(3);
        assertThat(MermaidDiagram.of(List.of("classDiagram", "  class Service", "  Service <|-- OrderService",
                "  class OrderService {", "    +place()", "  }")).nodes()).isEqualTo(2);
    }

    private static Arguments broken(String rule, String page, int line) {
        return Arguments.of(rule, page, line);
    }

    private static String lines(String line, int count) {
        return (line + "\n").repeat(count);
    }

    private static List<String> rules(String page) {
        return DocLint.lint(page).stream().map(DocLint.Finding::rule).distinct().toList();
    }
}
