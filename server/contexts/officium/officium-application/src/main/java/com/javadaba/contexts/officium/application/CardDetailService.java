package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.github.DevLinkView;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.DevLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;

/** One card's full detail ({@link CardDetailView}), composed ONCE for both REST and MCP (contract
 *  §1.1). It is its own bean, not a {@link CardService} method, because the per-card services it
 *  reads already depend on {@code CardService}: putting it there would close a cycle. */
@ApplicationScoped
public class CardDetailService {

    private final CardService cards;
    private final CardCommentService comments;
    private final CardTimeService time;
    private final CardAttachmentService attachments;
    private final DevLinkRepository development;
    private final CardFormService forms;
    private final EpicSweeps sweeps;

    @Inject
    public CardDetailService(CardService cards, CardCommentService comments, CardTimeService time,
            CardAttachmentService attachments, DevLinkRepository development, CardFormService forms,
            EpicSweeps sweeps) {
        this.cards = cards;
        this.comments = comments;
        this.time = time;
        this.attachments = attachments;
        this.development = development;
        this.forms = forms;
        this.sweeps = sweeps;
    }

    public CardDetailView get(UUID accountId, UUID projectId, String keyOrId) {
        CardView view = cards.get(accountId, projectId, keyOrId);
        List<TimeEntryView> timeViews = time.list(accountId, projectId, keyOrId).stream()
                .map(e -> TimeEntryView.of(e, view.key()))
                .toList();
        List<AttachmentView> attachmentViews = attachments.list(accountId, projectId, keyOrId).stream()
                .map(AttachmentView::of)
                .toList();
        List<DevLinkView> developmentViews = development.listByCard(view.id()).stream().map(DevLinkView::of).toList();
        List<Status> children = cards.epicChildren(projectId, view);
        List<CheckpointView> checkpoints = sweeps.checkpoints(projectId, view);
        return new CardDetailView(view, comments.list(accountId, projectId, keyOrId), timeViews, attachmentViews,
                developmentViews, children == null ? null : children.size(),
                children == null ? null : (int) children.stream().filter(s -> !s.closed()).count(),
                forms.find(accountId, projectId, keyOrId).orElse(null), checkpoints);
    }
}
