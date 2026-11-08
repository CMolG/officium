package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-793: every transition of a page's life and the guards on them, with no store. */
class DocLifecycleTest {

    private static final Instant T0 = Instant.parse("2026-10-13T10:00:00Z");
    private static final Instant T1 = T0.plus(Duration.ofHours(1));

    private final UUID author = UUID.randomUUID();
    private final Actor creator = Actor.person(author, "Author");
    private final Actor other = Actor.person(UUID.randomUUID(), "Other");

    @Test
    void anUnpublishedDraftIsVisibleOnlyToItsCreatorUntilItIsPublished() {
        DocLifecycle draft = DocLifecycle.unpublishedDraft();

        assertThat(draft.published()).isFalse();
        assertThat(draft.visibleTo(author, creator)).isTrue();
        assertThat(draft.visibleTo(other.accountId(), creator)).isFalse();

        DocLifecycle published = draft.publish(T1);
        assertThat(published.publishedAt()).isEqualTo(T1);
        assertThat(published.visibleTo(other.accountId(), creator)).isTrue();
        assertThat(published.publish(T1.plusSeconds(5)).publishedAt()).as("publishing twice keeps the first time")
                .isEqualTo(T1);
    }

    @Test
    void onlyAPublishedPageCanBeArchivedAndUnarchivingKeepsItPublished() {
        assertThatThrownBy(() -> DocLifecycle.unpublishedDraft().archive(other, T1))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("doc_unpublished");
                    assertThat(ex.httpStatus()).isEqualTo(409);
                });

        DocLifecycle archived = DocLifecycle.publishedAt(T0).archive(other, T1);
        assertThat(archived.archived()).isTrue();
        assertThat(archived.archivedBy()).isEqualTo(other);
        assertThat(archived.archive(creator, T1.plusSeconds(5))).as("archiving twice changes nothing")
                .isEqualTo(archived);

        DocLifecycle back = archived.unarchive();
        assertThat(back.archived()).isFalse();
        assertThat(back.archivedBy()).isNull();
        assertThat(back.publishedAt()).isEqualTo(T0);
    }

    @Test
    void aTrashedPageIsPurgedThirtyDaysAfterItsDeletionAndRestoreBringsItBackAsItWas() {
        DocLifecycle archived = DocLifecycle.publishedAt(T0).archive(creator, T0.plusSeconds(1));

        DocLifecycle trashed = archived.trash(other, T1);
        assertThat(trashed.trashed()).isTrue();
        assertThat(trashed.deletedBy()).isEqualTo(other);
        assertThat(trashed.purgeAfter()).isEqualTo(T1.plus(Duration.ofDays(30)));

        DocLifecycle restored = trashed.restore();
        assertThat(restored.trashed()).isFalse();
        assertThat(restored.purgeAfter()).isNull();
        assertThat(restored.archived()).as("a page restored from the trash is as archived as it was").isTrue();
    }

    @Test
    void aTrashedUnpublishedDraftStaysItsCreators() {
        DocLifecycle trashed = DocLifecycle.unpublishedDraft().trash(creator, T1);

        assertThat(trashed.visibleTo(author, creator)).isTrue();
        assertThat(trashed.visibleTo(other.accountId(), creator)).isFalse();
    }

    @Test
    void aPageCreatedAsADraftIsUnpublishedAndAnyOtherPageIsPublishedAtItsCreation() {
        DocPage draft = DocPage.created(UUID.randomUUID(), "a", "A", "", creator, T0, true);
        DocPage page = DocPage.created(UUID.randomUUID(), "a", "A", "", creator, T0);

        assertThat(draft.lifecycle().published()).isFalse();
        assertThat(draft.visibleTo(other.accountId())).isFalse();
        assertThat(page.lifecycle().publishedAt()).isEqualTo(T0);
        assertThat(page.edited("B", null, other, T1).lifecycle()).as("an edit leaves the life alone")
                .isEqualTo(page.lifecycle());
    }

    @Test
    void theWebSectionsOfTheLifecycleArePathsNoPageMayTake() {
        for (String path : new String[]{"documentation/unpublished", "documentation/archive", "documentation/trash",
                "documentation/changelog", "documentation/test-history"}) {
            assertThat(DocPage.reservedFor(path)).as(path).isNotNull();
        }
        assertThat(DocPage.reservedFor("documentation/other")).isNull();
    }
}
