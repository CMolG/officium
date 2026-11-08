package com.javadaba.contexts.officium.domain;

import com.javadaba.contexts.officium.domain.DocSnippet.Part;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DocSnippetTest {

    private static final String START = String.valueOf(DocSnippet.START);
    private static final String STOP = String.valueOf(DocSnippet.STOP);

    @Test
    void markedTextSplitsIntoPartsAndMarkupStaysPlainText() {
        String marked = "run <b>" + START + "deploy" + STOP + "</b> and " + START + "ship" + STOP;

        assertThat(DocSnippet.fromMarked(marked)).containsExactly(new Part("run <b>", false),
                new Part("deploy", true), new Part("</b> and ", false), new Part("ship", true));
    }

    @Test
    void anUnclosedMarkRunsToTheEndAndAnEmptyTextHasNoParts() {
        assertThat(DocSnippet.fromMarked("a " + START + "b")).containsExactly(new Part("a ", false),
                new Part("b", true));
        assertThat(DocSnippet.fromMarked(null)).isEmpty();
        assertThat(DocSnippet.fromMarked(" ")).isEmpty();
    }

    @Test
    void aWindowMarksTheFirstOccurrenceIgnoringCase() {
        assertThat(DocSnippet.window("calls DocService.upsert twice, DOCSERVICE.UPSERT", "docservice.upsert"))
                .containsExactly(new Part("calls ", false), new Part("DocService.upsert", true),
                        new Part(" twice, DOCSERVICE.UPSERT", false));
    }

    @Test
    void aWindowWithoutTheTextIsOnePlainPart() {
        assertThat(DocSnippet.window("only the title matched", "nowhere"))
                .isEqualTo(List.of(new Part("only the title matched", false)));
    }
}
