package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ActivityEntry;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class ActivityService {

    private final ActivityRepository activity;
    private final ProjectAccessGuard guard;

    @Inject
    public ActivityService(ActivityRepository activity, ProjectAccessGuard guard) {
        this.activity = activity;
        this.guard = guard;
    }

    public Page<ActivityView> list(UUID accountId, UUID projectId, UUID cardId, String cursor, int limit) {
        guard.requireAtLeast(projectId, accountId, Role.VIEWER);
        Page<ActivityEntry> page = activity.list(projectId, cardId, cursor, limit <= 0 ? 50 : limit);
        return new Page<>(page.items().stream().map(ActivityView::of).toList(), page.nextCursor());
    }
}
