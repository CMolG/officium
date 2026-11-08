package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.github.GithubRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** The repositories the Officium GitHub App is installed on, which project each one feeds, the
 *  deliveries already applied (JAVA-375), and which accounts may choose each one (JAVA-397). */
public interface GithubRepositoryRepository {

    /** Records the installation, keeping the project an earlier install was connected to. */
    void saveInstalled(String repo, long installationId, Instant at);

    void removeInstalled(String repo);

    Optional<GithubRepository> find(String repo);

    /** Every installed repository, connected or not, by name. */
    List<GithubRepository> listInstalled();

    /** {@code false} when the repository is not installed or already feeds another project. */
    boolean connect(String repo, UUID projectId, Instant at);

    /** {@code false} when the repository didn't feed that project. */
    boolean disconnect(String repo, UUID projectId);

    boolean deliverySeen(String deliveryId);

    /** Remembers an applied delivery, forgetting those older than {@code forgetBefore}. */
    void recordDelivery(String deliveryId, String event, Instant at, Instant forgetBefore);

    // ── grants: which installed repositories an account may choose (JAVA-397) ──────────────────

    /** The account's grants become exactly {@code repos} (repository → installation id); every
     *  repository must already be installed. */
    void replaceGrants(UUID accountId, Map<String, Long> repos, Instant at);

    /** The repositories the account holds a grant for, granted at or after {@code since}. */
    Set<String> grantedRepos(UUID accountId, Instant since);

    /** Stores a state for {@code accountId}'s authorization of {@code projectId}, forgetting expired ones. */
    void saveState(String stateHash, UUID accountId, UUID projectId, Instant expiresAt, Instant now);

    /** Deletes the state, so it is used once, and answers who it was issued to. */
    Optional<IssuedState> consumeState(String stateHash);

    record IssuedState(UUID accountId, UUID projectId, Instant expiresAt) {
    }
}
