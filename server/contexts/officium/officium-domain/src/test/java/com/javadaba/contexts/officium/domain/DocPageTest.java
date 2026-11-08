package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-130: what a page path may be, and what an edit keeps. */
class DocPageTest {

    @Test
    void surroundingSlashesAndUpperCaseCannotNameAnotherPageSoTheyAreForgiven() {
        assertThat(DocPage.normalizePath(" /Procedures/Deploy/ ")).isEqualTo("procedures/deploy");
        assertThat(DocPage.normalizePath("runbooks/db-restore-2")).isEqualTo("runbooks/db-restore-2");
    }

    @Test
    void anythingElseIsRefusedRatherThanRewritten() {
        for (String bad : new String[]{"", "  ", "/", "a//b", "a/../b", "deploy notes", "a_b", "-a", "a-",
                "a--b", "été", "a/b/c/d/e/f/g/h/i", "x".repeat(DocPage.MAX_PATH_LENGTH + 1)}) {
            assertThatThrownBy(() -> DocPage.normalizePath(bad)).as(bad)
                    .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                        assertThat(ex.httpStatus()).isEqualTo(400);
                        assertThat(ex.code()).isIn("path_required", "invalid_doc_path");
                    });
        }
        assertThat(DocPage.normalizePath("a/b/c/d/e/f/g/h")).as("eight segments is the limit").isNotEmpty();
    }

    @Test
    void anEditKeepsWhatItWasNotGivenAndBumpsTheVersion() {
        Actor person = Actor.person(UUID.randomUUID(), "Ana");
        Actor agent = Actor.agent(UUID.randomUUID(), "Claude");
        DocPage page = DocPage.created(UUID.randomUUID(), "procedures/deploy", " Deploy ", "Old", person,
                Instant.EPOCH);

        DocPage edited = page.edited(null, "New", agent, Instant.EPOCH.plusSeconds(1));

        assertThat(page.title()).isEqualTo("Deploy");
        assertThat(edited.title()).isEqualTo("Deploy");
        assertThat(edited.body()).isEqualTo("New");
        assertThat(edited.version()).isEqualTo(2);
        assertThat(edited.createdBy()).isEqualTo(person);
        assertThat(edited.updatedBy()).isEqualTo(agent);
        assertThatThrownBy(() -> page.edited(" ", null, agent, Instant.EPOCH))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("title_required"));
    }

    @Test
    void aTemplateStaysOneThroughAnEditAndATrip() {
        Actor person = Actor.person(UUID.randomUUID(), "Ana");
        DocPage template = DocPage.created(UUID.randomUUID(), "meetings/notes-template", "Notes {date}", "", person,
                Instant.EPOCH, false, true);

        DocPage edited = template.edited(null, "## Agenda", person, Instant.EPOCH.plusSeconds(1));

        assertThat(template.template()).isTrue();
        assertThat(template.lifecycle().published()).isTrue();
        assertThat(edited.template()).isTrue();
        assertThat(edited.withLifecycle(edited.lifecycle().trash(person, Instant.EPOCH)).template()).isTrue();
        assertThat(DocPage.created(UUID.randomUUID(), "a", "A", "", person, Instant.EPOCH).template()).isFalse();
        assertThat(DocPage.reservedFor(DocPage.TEMPLATES_PATH)).isEqualTo("the templates");
    }
}
