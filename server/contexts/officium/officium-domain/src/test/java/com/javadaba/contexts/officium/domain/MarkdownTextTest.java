package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MarkdownTextTest {

    @Test
    void theBoardReadsTheTextOfARequestHumanCardNotItsMarkdown() {
        String body = "## Why this needs you\nNeeds **console access** to create the node pool.\n\n"
                + "## Steps\n1. Create the pool\n2. See [the runbook](https://javadaba.com/docs)\n\n"
                + "## Done when\n- [ ] `kubectl get nodes` shows three\n- [x] Backup taken";

        assertThat(MarkdownText.plain(body))
                .isEqualTo("Why this needs you Needs console access to create the node pool. "
                        + "Steps Create the pool See the runbook Done when kubectl get nodes shows three Backup taken");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "> quoted line                         | quoted line",
            "***bold italic*** and ~~gone~~          | bold italic and gone",
            "keep snake_case_names and 2*3*4         | keep snake_case_names and 2*3*4",
            "![logo](x.png) <https://javadaba.com>   | logo https://javadaba.com",
            "escaped \\*stars\\* stay                | escaped *stars* stay",
            "- [~] partly done                       | partly done",
    })
    void stripsSyntaxWithoutEatingWhatIsText(String markdown, String plain) {
        assertThat(MarkdownText.plain(markdown)).isEqualTo(plain);
    }

    @Test
    void aTableKeepsItsCellsAndLosesItsRules() {
        assertThat(MarkdownText.plain("| Env | Nodes |\n| --- | --- |\n| staging | 3 |"))
                .isEqualTo("Env Nodes staging 3");
    }

    @Test
    void theExcerptCutsAtAWordAndSaysItWasCut() {
        String excerpt = MarkdownText.excerpt("word ".repeat(60), 160);

        assertThat(excerpt).endsWith("word…").hasSizeLessThanOrEqualTo(161);
        assertThat(MarkdownText.excerpt("short", 160)).isEqualTo("short");
        assertThat(MarkdownText.excerpt(null, 160)).isEmpty();
    }
}
