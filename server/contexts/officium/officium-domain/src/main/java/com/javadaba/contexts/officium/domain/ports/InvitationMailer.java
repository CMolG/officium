package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Role;

import java.util.List;
import java.util.UUID;

/**
 * Tells an invitee that they were given access to a project or a team (JAVA-1781). Implemented in
 * {@code apps/app-api} over the mail context, so this context never learns the mail stack.
 *
 * <p>Never throws: every failure is an {@link Outcome}, so the membership a send follows is never
 * undone by it.
 */
public interface InvitationMailer {

    Outcome toProject(AccountDirectory.Found inviter, AccountDirectory.Found invitee, UUID projectId,
            String projectName, Role role);

    Outcome toTeam(AccountDirectory.Found inviter, AccountDirectory.Found invitee, UUID teamId, String teamName,
            List<Access> access);

    /** One project a team grants, and the role it grants there. */
    record Access(UUID projectId, String projectName, Role role) {
    }

    enum Outcome {
        SENT, NOT_CONFIGURED, THROTTLED, FAILED
    }
}
