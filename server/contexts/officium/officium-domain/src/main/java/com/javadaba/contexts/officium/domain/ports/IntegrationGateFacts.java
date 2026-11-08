package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation;

import java.util.List;
import java.util.UUID;

/** The cheap reads the integration gate needs (JAVA-1820): a query each, whatever the size of the project. */
public interface IntegrationGateFacts {

    /**
     * Open agent cards of the active sprint with a blocker in Deploy that waits on a merge, best priority first. A
     * Deploy card waits on a merge while it has an open link to a branch (JAVA-1880): its commits are on a branch
     * whose pull request has not merged.
     */
    List<IntegrationGateEvaluation.Held> held(UUID projectId);

    /** Keys of the project's Deploy cards that wait on a merge, in card order. */
    List<String> deployKeys(UUID projectId);

    /** The gate's wall cards (client key {@code integration-gate:*}) that are not done or rejected. */
    List<OpenWall> openWalls(UUID projectId);

    record OpenWall(UUID id, String key, String clientKey, int version) {
    }
}
