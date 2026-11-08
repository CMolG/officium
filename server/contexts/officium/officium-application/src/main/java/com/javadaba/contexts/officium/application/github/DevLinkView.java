package com.javadaba.contexts.officium.application.github;

import com.javadaba.contexts.officium.domain.github.DevLink;

import java.time.Instant;

/** Wire shape of {@link DevLink} (contract §8.10): one entry of a card's {@code development}. */
public record DevLinkView(String kind, String repo, String ref, String url, String title, String author, String state,
        Instant createdAt, Instant updatedAt) {

    public static DevLinkView of(DevLink link) {
        return new DevLinkView(link.kind().wire(), link.repo(), link.ref(), link.url(), link.title(), link.author(),
                link.state().wire(), link.createdAt(), link.updatedAt());
    }
}
