package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.InvitationMailer;
import com.javadaba.contexts.officium.domain.ports.InvitationMailer.Outcome;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.logging.Logger;

/**
 * Sends the invitation email after a membership is stored (JAVA-1781). The send is last and
 * never undoes the membership: a failure, a throttle or an exception is written to the project's
 * activity as {@code member.invite_mail_failed}, with no address in it, and nothing reaches the
 * response.
 */
@ApplicationScoped
public class InvitationDelivery {

    static final String FAILED_ACTIVITY = "member.invite_mail_failed";

    private static final Logger LOG = Logger.getLogger(InvitationDelivery.class.getName());

    private final InvitationMailer mailer;
    private final ActivityPublisher activity;

    @Inject
    public InvitationDelivery(InvitationMailer mailer, ActivityPublisher activity) {
        this.mailer = mailer;
        this.activity = activity;
    }

    public void toProject(Actor actor, AccountDirectory.Found inviter, AccountDirectory.Found invitee,
            Project project, Role role, Instant at) {
        Outcome outcome = deliver(() -> mailer.toProject(inviter, invitee, project.id(), project.name(), role));
        recordFailure(actor, List.of(project.id()), outcome, invitee.accountId(), at);
    }

    public void toTeam(Actor actor, AccountDirectory.Found inviter, AccountDirectory.Found invitee, UUID teamId,
            String teamName, List<InvitationMailer.Access> access, Instant at) {
        Outcome outcome = deliver(() -> mailer.toTeam(inviter, invitee, teamId, teamName, access));
        recordFailure(actor, access.stream().map(InvitationMailer.Access::projectId).toList(), outcome,
                invitee.accountId(), at);
    }

    private Outcome deliver(Supplier<Outcome> send) {
        try {
            return send.get();
        } catch (RuntimeException ex) {
            LOG.warning(() -> "Invitation mail failed with " + ex.getClass().getSimpleName());
            return Outcome.FAILED;
        }
    }

    private void recordFailure(Actor actor, List<UUID> projectIds, Outcome outcome, UUID inviteeId, Instant at) {
        if (outcome == Outcome.SENT || outcome == Outcome.NOT_CONFIGURED) {
            return;
        }
        LOG.warning(() -> "Invitation mail " + outcome + " for account " + inviteeId + " on " + projectIds.size()
                + " project(s)");
        try {
            for (UUID projectId : projectIds) {
                activity.record(projectId, null, null, actor, FAILED_ACTIVITY, summary(outcome), at);
            }
        } catch (RuntimeException ex) {
            LOG.warning(() -> "Invitation failure not recorded: " + ex.getClass().getSimpleName());
        }
    }

    static String summary(Outcome outcome) {
        return outcome == Outcome.THROTTLED
                ? "Invitation email not sent: too many invitations to this person today"
                : "Invitation email not sent: delivery failed";
    }
}
