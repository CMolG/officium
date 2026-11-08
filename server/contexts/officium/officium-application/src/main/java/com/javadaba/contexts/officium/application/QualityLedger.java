package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ports.EscapedDefectRepository;
import com.javadaba.contexts.officium.domain.ports.PhaseRunRepository;
import com.javadaba.contexts.officium.domain.ports.ReviewOutcomeRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

/**
 * The logs that say how good a card's delivery was and who ran it: its escaped defects (card://JAVA-1525), its
 * review exits (card://JAVA-1526) and its phase runs (card://JAVA-1527). One injection point for the card writes and views that keep and read them, so a new log
 * does not widen every constructor in between.
 */
@Singleton
public class QualityLedger {

    private final EscapedDefectRepository escapedDefects;
    private final ReviewOutcomeRepository reviewOutcomes;
    private final PhaseRunRepository phaseRuns;

    @Inject
    public QualityLedger(EscapedDefectRepository escapedDefects, ReviewOutcomeRepository reviewOutcomes,
            PhaseRunRepository phaseRuns) {
        this.escapedDefects = escapedDefects;
        this.reviewOutcomes = reviewOutcomes;
        this.phaseRuns = phaseRuns;
    }

    public EscapedDefectRepository escapedDefects() {
        return escapedDefects;
    }

    public ReviewOutcomeRepository reviewOutcomes() {
        return reviewOutcomes;
    }

    public PhaseRunRepository phaseRuns() {
        return phaseRuns;
    }
}
