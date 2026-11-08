package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.InvitationMailer;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/** Officium Local sends no email. */
@ApplicationScoped
public class LocalInvitationMailer implements InvitationMailer {

    @Override
    public Outcome toProject(AccountDirectory.Found inviter, AccountDirectory.Found invitee, UUID projectId,
            String projectName, Role role) {
        return Outcome.NOT_CONFIGURED;
    }

    @Override
    public Outcome toTeam(AccountDirectory.Found inviter, AccountDirectory.Found invitee, UUID teamId,
            String teamName, List<Access> access) {
        return Outcome.NOT_CONFIGURED;
    }
}
