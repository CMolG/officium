package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Which versions of a page are kept (JAVA-794, design §4): the heaviest version ever, which never
 * expires, and the two latest previous ones, which do after the project's window. Pure: the write
 * hands it what is kept plus the version retiring, and applies what comes back.
 *
 * <p>"Heaviest ever" is derived from what is kept, so deleting it moves the flag to the next
 * heaviest. Ties go to the lower version, so the current version (the newest) is the heaviest only
 * by being strictly heavier, and then no revision is flagged. A window of 0 keeps only the heaviest.
 */
public final class DocHistoryPolicy {

    public static final int RECENT_KEPT = 2;

    private DocHistoryPolicy() {
    }

    public static Outcome apply(List<DocRevision> kept, DocRevision retiring, long currentWeight, int historyDays,
            Instant now) {
        List<DocRevision> candidates = Stream.concat(kept.stream(), Stream.ofNullable(retiring)).toList();
        DocRevision heaviest = candidates.stream()
                .max(Comparator.comparingLong(DocRevision::weightBytes)
                        .thenComparing(Comparator.comparingInt(DocRevision::version).reversed()))
                .filter(top -> top.weightBytes() >= currentWeight)
                .orElse(null);
        List<DocRevision> recent = candidates.stream()
                .sorted(Comparator.comparingInt(DocRevision::version).reversed())
                .limit(RECENT_KEPT).toList();
        Instant cutoff = now.minus(Duration.ofDays(historyDays));
        List<DocRevision> keep = new ArrayList<>();
        List<DocRevision> drop = new ArrayList<>();
        for (DocRevision candidate : candidates) {
            boolean isHeaviest = heaviest != null && candidate.id().equals(heaviest.id());
            boolean live = historyDays > 0 && recent.stream().anyMatch(r -> r.id().equals(candidate.id()))
                    && !candidate.retiredAt().isBefore(cutoff);
            if (isHeaviest || live) {
                keep.add(candidate.withHeaviest(isHeaviest));
            } else {
                drop.add(candidate);
            }
        }
        keep.sort(Comparator.comparingInt(DocRevision::version).reversed());
        return new Outcome(List.copyOf(keep), List.copyOf(drop));
    }

    /** What to keep (flags set) and what to delete; the retiring version is in one of the two. */
    public record Outcome(List<DocRevision> kept, List<DocRevision> dropped) {
    }
}
