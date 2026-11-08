package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.EpicCheckpoints;

import java.util.List;
import java.util.Map;

/**
 * An epic handed out as one unit (card://JAVA-1874, epic JAVA-1868): the phase it is worked in, the roles, run and mods
 * of the epic row in that phase, and its checkpoints in order. The run is the same for every checkpoint, so the session
 * that starts on it never relaunches mid-epic. {@code next} is the checkpoint an action sweep works now, null in review
 * or once none is left.
 */
public record SweepView(String phase, List<String> eligibleRoles, Map<String, String> runConfig,
        Map<String, Map<String, String>> runConfigs, Map<String, List<String>> mods,
        List<CheckpointView> checkpoints, EpicCheckpoints.Progress progress, String next) {
}
