package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1591: a card's own workflow is validated against the card, phase by phase, all problems at once. */
class CardWorkflowTest {

    private static final RoleMatrix MATRIX = RoleMatrix.defaults();
    private static final String ACTION_ROLE = MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of()).get(0);

    @Test
    void aValidDocumentIsAcceptedAndReadBackAsItWasWritten() {
        Map<String, Object> wire = wire(Map.of("action", pick(ACTION_ROLE, List.of())));

        CardWorkflow workflow = validate(wire, ModRules.none(), Category.FEATURE, List.of());

        assertThat(workflow.pick(Phase.ACTION)).contains(new CardWorkflow.Pick(ACTION_ROLE, List.of()));
        assertThat(workflow.pick(Phase.REVIEW)).isEmpty();
        assertThat(CardWorkflow.readStored(workflow.wire())).isEqualTo(workflow);
    }

    @Test
    void aRoleThatIsNotEligibleInThePhaseNamesThePhaseAndTheEligibleRoles() {
        Map<String, Object> wire = wire(Map.of("action", pick("ghost-role", List.of())));

        assertThatThrownBy(() -> validate(wire, ModRules.none(), Category.FEATURE, List.of()))
                .hasMessageContaining("action: ghost-role is not eligible in action for this card; eligible: "
                        + String.join(", ", MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of())));
    }

    @Test
    void aModThatExcludesAnotherIsRefusedNotSilentlyDropped() {
        ModRules rules = new ModRules(Map.of(), Map.of("alpha", Set.of("beta")));
        Map<String, Object> wire = wire(Map.of("action", pick(ACTION_ROLE, List.of("alpha", "beta"))));

        assertThatThrownBy(() -> validate(wire, rules, Category.FEATURE, List.of()))
                .isInstanceOf(OfficiumException.class)
                .hasMessageContaining("action: Mod beta dropped for role " + ACTION_ROLE);
    }

    @Test
    void aModThatExcludesTheRolesRequiredModIsRefusedToo() {
        ModRules rules = new ModRules(Map.of(ACTION_ROLE, List.of("gamma")), Map.of("gamma", Set.of("beta")));
        Map<String, Object> wire = wire(Map.of("action", pick(ACTION_ROLE, List.of("beta"))));

        assertThatThrownBy(() -> validate(wire, rules, Category.FEATURE, List.of()))
                .hasMessageContaining("action: Mod beta dropped for role " + ACTION_ROLE);
    }

    @Test
    void aPhaseWithAnEmptyCellSaysNoRoleIsEligibleThere() {
        Map<String, Object> wire = wire(Map.of("action", pick(ACTION_ROLE, List.of())));

        assertThatThrownBy(() -> CardWorkflow.validate(wire, MATRIX, ModRules.none(), Category.EPIC, null, List.of()))
                .hasMessageContaining("action: " + ACTION_ROLE + " is not eligible in action for this card; eligible: "
                        + "none (set the card's category first)");
    }

    @Test
    void everyProblemIsReportedInOneAnswer() {
        Map<String, Object> wire = Map.of("version", 2, "phases", Map.of(
                "qa", pick(ACTION_ROLE, List.of()),
                "review", pick("ghost-role", List.of())));

        assertThatThrownBy(() -> validate(wire, ModRules.none(), Category.FEATURE, List.of()))
                .hasMessageContaining("document: version must be 1")
                .hasMessageContaining("qa: unknown phase")
                .hasMessageContaining("review: ghost-role is not eligible");
    }

    @Test
    void idsAndModCountsAreCheckedBeforeEligibility() {
        Map<String, Object> wire = wire(Map.of(
                "action", pick("Bad Role", List.of()),
                "ready", pick("delivery-analyst", List.of("a-mod"))));
        List<String> tooManyMods = IntStream.range(0, 21).mapToObj(i -> "mod-" + i).toList();
        Map<String, Object> over = wire(Map.of("action", pick(ACTION_ROLE, tooManyMods)));

        assertThatThrownBy(() -> validate(wire, ModRules.none(), Category.FEATURE, List.of()))
                .hasMessageContaining("action: a role is a kebab-case id");
        assertThatThrownBy(() -> validate(over, ModRules.none(), Category.FEATURE, List.of()))
                .hasMessageContaining("action: mods are at most 20");
    }

    @Test
    void aCardWithNoCategoryHasNoEligibleRoleToNameYet() {
        Map<String, Object> wire = wire(Map.of("action", pick(ACTION_ROLE, List.of())));

        assertThatThrownBy(() -> validate(wire, ModRules.none(), null, List.of()))
                .hasMessageContaining("set the card's category first");
    }

    @Test
    void theSchemaNamesEveryPhaseTheValidatorKnows() {
        Map<String, Object> phases = (Map<String, Object>) ((Map<String, Object>) CardWorkflow.schema()
                .get("properties")).get("phases");

        assertThat(((Map<String, Object>) phases.get("properties")).keySet())
                .containsExactlyElementsOf(Arrays.stream(Phase.values()).map(Phase::wire).toList());
    }

    @Test
    void anEpicsCardsPartIsReadBackAndEachRowIsAWorkflowOfItsOwn() {
        Map<String, Object> wire = Map.of("version", CardWorkflow.VERSION, "phases", Map.of(), "cards", Map.of(
                "feature", Map.of("refine", pick("software-architect", List.of())),
                "spike/ux-ui", Map.of("action", pick("ux-researcher", List.of()))));

        CardWorkflow workflow = CardWorkflow.validate(wire, MATRIX, ModRules.none(), Category.EPIC, null, List.of());

        assertThat(workflow.part("feature")).contains(new CardWorkflow(Map.of(Phase.REFINE,
                new CardWorkflow.Pick("software-architect", List.of()))));
        assertThat(workflow.part("spike/ux-ui").flatMap(part -> part.pick(Phase.ACTION)))
                .contains(new CardWorkflow.Pick("ux-researcher", List.of()));
        assertThat(workflow.part("bug")).isEmpty();
        assertThat(CardWorkflow.readStored(workflow.wire())).isEqualTo(workflow);
    }

    @Test
    void aPartIsCheckedAgainstItsRowWithNoSignalsSoItFitsEveryCardOfTheRow() {
        Map<String, Object> wire = Map.of("version", CardWorkflow.VERSION, "phases", Map.of(), "cards", Map.of(
                "feature", Map.of("review", pick("security-reviewer", List.of())),
                "chore", Map.of()));

        assertThatThrownBy(() -> CardWorkflow.validate(wire, MATRIX, ModRules.none(), Category.EPIC, null, List.of()))
                .hasMessageContaining("cards.feature.review: security-reviewer is not eligible in review for a feature"
                        + " card; eligible: "
                        + String.join(", ", MATRIX.eligible(Category.FEATURE, null, Status.REVIEW, List.of())))
                .hasMessageContaining("cards.chore: unknown row");
    }

    @Test
    void onlyAnEpicsWorkflowHasACardsPart() {
        Map<String, Object> wire = Map.of("version", CardWorkflow.VERSION, "phases", Map.of(),
                "cards", Map.of("feature", Map.of()));

        assertThatThrownBy(() -> validate(wire, ModRules.none(), Category.FEATURE, List.of()))
                .hasMessageContaining("cards: only an epic's workflow has a part for its cards");
    }

    @Test
    void theSchemaNamesEveryRowAnEpicsCardsPartMayHave() {
        Map<String, Object> cards = (Map<String, Object>) ((Map<String, Object>) CardWorkflow.schema()
                .get("properties")).get("cards");

        assertThat(((Map<String, Object>) cards.get("properties")).keySet())
                .containsExactlyElementsOf(CardWorkflow.partRows())
                .contains("feature", "spike/ux-ui")
                .doesNotContain("epic");
    }

    private static CardWorkflow validate(Map<String, Object> wire, ModRules rules, Category category,
            List<Signal> signals) {
        return CardWorkflow.validate(wire, MATRIX, rules, category, null, signals);
    }

    private static Map<String, Object> wire(Map<String, Object> phases) {
        return Map.of("version", CardWorkflow.VERSION, "phases", phases);
    }

    private static Map<String, Object> pick(String role, List<String> mods) {
        return Map.of("role", role, "mods", mods);
    }
}
