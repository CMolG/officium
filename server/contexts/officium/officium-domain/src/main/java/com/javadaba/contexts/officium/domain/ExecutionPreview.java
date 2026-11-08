package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * What switching a project to an execution mode does to its open cards (card://JAVA-1878): a read of the cards as they
 * are, because the switch rewrites none of them. In {@code epic} mode every open card belongs to exactly one unit, its
 * open epic or itself (an epic of one checkpoint); {@code epics} says how each epic would be swept, and
 * {@code workflows} which card workflows name an action role the implementer replaces (their mods stay).
 */
public record ExecutionPreview(String mode, int openCards, int inEpics, int standalone, List<EpicUnit> epics,
        List<RetiredRole> workflows) {

    /** One open epic as a unit: its checkpoints, how many are completed and how many a sweep can work now. */
    public record EpicUnit(String key, String title, int checkpoints, int completed, int sweepable) {
    }

    /** A card workflow whose action role retires under the implementer; its mods keep applying. */
    public record RetiredRole(String key, String role, List<String> mods) {
    }

    public static ExecutionPreview of(ExecutionMode mode, List<Card> project, List<CardLink> blocksEdges) {
        List<Card> live = project.stream().filter(card -> !card.deleted()).toList();
        Map<String, List<Card>> byEpic = EpicChildren.byEpic(live);
        Set<String> openEpics = live.stream()
                .filter(card -> card.category() == Category.EPIC && !card.status().closed())
                .map(Card::key).collect(Collectors.toSet());
        List<Card> open = live.stream()
                .filter(card -> card.category() != Category.EPIC && !card.status().closed()).toList();
        Set<String> inOpenEpic = byEpic.entrySet().stream().filter(entry -> openEpics.contains(entry.getKey()))
                .flatMap(entry -> entry.getValue().stream()).map(Card::key).collect(Collectors.toSet());
        int inEpics = (int) open.stream().filter(card -> inOpenEpic.contains(card.key())).count();
        List<EpicUnit> epics = new ArrayList<>();
        live.stream().filter(card -> openEpics.contains(card.key()))
                .sorted(Comparator.comparingInt(Card::number)).forEach(epic -> {
                    List<EpicCheckpoints.Checkpoint> checkpoints = EpicCheckpoints.of(
                            byEpic.getOrDefault(epic.key(), List.of()), live, blocksEdges);
                    if (checkpoints.stream().anyMatch(c -> !c.card().status().closed())) {
                        epics.add(new EpicUnit(epic.key(), epic.title(), checkpoints.size(),
                                EpicCheckpoints.progress(checkpoints).completed(),
                                (int) checkpoints.stream().filter(EpicCheckpoints.Checkpoint::sweepable).count()));
                    }
                });
        // A card is listed under the workflow that governs it: its epic's part, when that is written (JAVA-1885).
        Function<Card, GoverningWorkflow> governing = GoverningWorkflow.over(live);
        List<RetiredRole> workflows = !mode.epic()
                ? List.of()
                : open.stream()
                        .flatMap(card -> Stream.ofNullable(governing.apply(card).workflow())
                                .flatMap(workflow -> workflow.pick(Phase.ACTION).stream())
                                .filter(pick -> !pick.role().equals(mode.implementerRole()))
                                .map(pick -> new RetiredRole(card.key(), pick.role(), pick.mods())))
                        .toList();
        return new ExecutionPreview(mode.mode().wire(), open.size(), inEpics, open.size() - inEpics,
                List.copyOf(epics), workflows);
    }
}
