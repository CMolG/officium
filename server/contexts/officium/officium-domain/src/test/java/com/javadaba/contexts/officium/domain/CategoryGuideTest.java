package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-293: every category says what it means, so an agent classifies a card by its definition. */
class CategoryGuideTest {

    @ParameterizedTest
    @EnumSource(Category.class)
    void everyCategoryHasAOneLineHintAndADescription(Category category) {
        CategoryGuide guide = CategoryGuide.of(category);
        assertThat(guide.category()).isEqualTo(category);
        assertThat(guide.hint()).isNotBlank().doesNotContain("\n");
        assertThat(guide.description()).isNotBlank().isEqualTo(guide.description().strip());
    }

    @Test
    void theGuideFollowsTheCategoriesOrder() {
        assertThat(CategoryGuide.all()).extracting(CategoryGuide::category).containsExactly(Category.values());
    }

    @Test
    void thePrecedenceRanksEveryCategoryButTheEpicOnce() {
        assertThat(CategoryGuide.classifierPrecedence())
                .doesNotHaveDuplicates()
                .doesNotContain(Category.EPIC)
                .hasSize(Category.values().length - 1)
                .startsWith(Category.HOTFIX, Category.SECURITY, Category.REGRESSION, Category.BUG);
    }

    @Test
    void theEpicStatesItsFourRules() {
        String epic = CategoryGuide.of(Category.EPIC).description();
        assertThat(epic)
                .contains("doesn't show up in sprints")
                .contains("children carry its badge")
                .contains("worked only through its children")
                .contains("With no children it can only be refined");
    }

    /** JAVA-328: the epic's text is its full contract, in the sections JAVA-329..342 follow. */
    @Test
    void theEpicCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.EPIC).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("its status derives from theirs")
                .contains("It never goes through Action");
    }

    /** JAVA-329: the feature's text is its full contract, in the epic's section order. */
    @Test
    void theFeatureCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.FEATURE).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("needs no user narrative")
                .contains("is a user story")
                .contains("Its technical design is approved")
                .contains("does not grow without going back to Refine");
    }

    /** JAVA-330: the user story's text is its full contract, in the epic's section order. */
    @Test
    void theUserStoryCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.USER_STORY).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("as a [role], I want")
                .contains("with no user narrative is a feature")
                .contains("its flow and its states are designed")
                .contains("empty, loading, error and success states")
                .contains("end to end, not layer by layer");
    }

    /** JAVA-331: the enhancement's text is its full contract, in the epic's section order. */
    @Test
    void theEnhancementCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.ENHANCEMENT).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("Nothing is broken")
                .contains("a regression if it worked until a recent change")
                .contains("The current state and the desired state are described")
                .contains("The improvement is measured or demonstrated")
                .contains("Existing public contracts are not broken");
    }

    /** JAVA-332: the bug's text is its full contract, in the epic's section order. */
    @Test
    void theBugCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.BUG).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("with no evidence that it ever")
                .contains("that is a regression")
                .contains("that is a hotfix")
                .contains("The steps that reproduce it")
                .contains("Its severity and impact")
                .contains("seen red before the fix and green after it")
                .contains("The cause is fixed, not the symptom")
                .contains("Its scope does not grow");
    }

    /** JAVA-333: the hotfix's text is its full contract, in the epic's section order. */
    @Test
    void theHotfixCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.HOTFIX).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("A category of its own, not a mode of bug")
                .contains("it is a bug, or a regression")
                .contains("Its impact in production is confirmed")
                .contains("A minimal reproduction")
                .contains("its release tag, or `main` where `main` is what")
                .contains("deployed and verified in production")
                .contains("A follow-up card exists, as a bug or a regression")
                .contains("Its refine is express")
                .contains("No refactoring and no scope growth");
    }

    /** JAVA-334: the regression's text is its full contract, in the epic's section order. */
    @Test
    void theRegressionCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.REGRESSION).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("in an identifiable earlier version")
                .contains("no known good version is a bug")
                .contains("is a hotfix")
                .contains("The good version and the bad version are identified")
                .contains("The steps that reproduce it")
                .contains("Its impact")
                .contains("its commit or its PR")
                .contains("A test pins the behavior that was lost")
                .contains("Its scope does not grow")
                .contains("a separate technicalDebt card");
    }

    /** JAVA-335: the refactor's text is its full contract, in the epic's section order. */
    @Test
    void theRefactorCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.REFACTOR).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("no change in its observable behavior")
                .contains("preparing the ground for another change")
                .contains("is\n  technicalDebt")
                .contains("the structure it ends in")
                .contains("none of them was modified")
                .contains("No public contract changed")
                .contains("Observable behavior does not change")
                .contains("The existing tests are not modified");
    }

    /** JAVA-336: the technicalDebt's text is its full contract, in the epic's section order. */
    @Test
    void theTechnicalDebtCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.TECHNICAL_DEBT).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("directly pays off a known deficiency")
                .contains("grouped under a debt epic")
                .contains("an outdated or unsupported dependency")
                .contains("no recorded deficiency is a refactor")
                .contains("An exploitable vulnerability is security")
                .contains("The cost of not paying it")
                .contains("The workaround is retired")
                .contains("No functional change")
                .contains("It is executed directly")
                .contains("It may touch dependencies, data or infrastructure")
                .contains("It may not change functional behavior");
    }

    /** JAVA-337: the infrastructure's text is its full contract, in the epic's section order. */
    @Test
    void theInfrastructureCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.INFRASTRUCTURE).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("do not touch product logic")
                .contains("A vulnerability or hardening is security")
                .contains("takes that logic's own category")
                .contains("The target topology")
                .contains("Its impact on cost and capacity")
                .contains("The rollback plan")
                .contains("applied as code, and proven by running it")
                .contains("observability is active")
                .contains("reproducible from the repository")
                .contains("Nothing is done by hand without a runbook");
    }

    /** JAVA-338: the security's text is its full contract, in the epic's section order. */
    @Test
    void theSecurityCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.SECURITY).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("secrets management, permissions or compliance")
                .contains("A hole already exploited")
                .contains("is a hotfix")
                .contains("who could do what, and to whom")
                .contains("The affected surface")
                .contains("Its severity")
                .contains("the control is applied")
                .contains("the vector is no longer exploitable")
                .contains("restricted until it is deployed")
                .contains("exploit details stay out of public text")
                .contains("Within its priority, it goes ahead of every other category except hotfix");
    }

    /** JAVA-339: the spike's text is its full contract, subtypes included, in the epic's section order. */
    @Test
    void theSpikeCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.SPIKE).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("whose deliverable is knowledge")
                .contains("never production code")
                .contains("Two subtypes: `technical`, and `ux-ui`")
                .contains("\"we don't know whether\"")
                .contains("belongs to that work's own category")
                .contains("A concrete question")
                .contains("A time box")
                .contains("A success criterion")
                .contains("An answer with its evidence")
                .contains("An actionable recommendation")
                .contains("The derived cards are created")
                .contains("never promoted to production")
                .contains("When the time box runs out, whatever exists is delivered");
    }

    /** JAVA-340: the testing text is its full contract, in the epic's section order. */
    @Test
    void theTestingCategoryCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.TESTING).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("without changing production code")
                .contains("a fragile test · a missing e2e · test data")
                .contains("A test written to fix a failure belongs to that fix: a bug, or a regression")
                .contains("What gets covered, and why")
                .contains("green and deterministic")
                .contains("the local attestation where CI does not run the tests")
                .contains("Production code is not modified")
                .contains("never deployed to production")
                .contains("it becomes a bug or regression card of its own")
                .contains("An epic's test card (tag `epic-test`)");
    }

    /** JAVA-341: the routine text is its full contract, in the epic's section order. */
    @Test
    void theRoutineCategoryCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.ROUTINE).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("A recurring, predictable task guided by a runbook")
                .contains("Periodicity · an existing runbook · maintenance")
                .contains("A recurring task with no runbook is not routine yet")
                .contains("The runbook it follows, referenced")
                .contains("The runbook is executed")
                .contains("Evidence of the execution")
                .contains("It skips Refine")
                .contains("It follows the runbook strictly")
                .contains("When it has to deviate from the runbook");
    }

    /** JAVA-342: the documentation text is its full contract, in the epic's section order. */
    @Test
    void theDocumentationCategoryCarriesItsFullContract() {
        assertThat(CategoryGuide.of(Category.DOCUMENTATION).description())
                .containsSubsequence("**Signals.**", "**Excludes.**", "**Entry contract.**", "**Exit contract.**",
                        "**Behavior.**")
                .contains("ADRs, API references,\nrunbooks, guides")
                .contains("An ADR · an API reference · a runbook · a guide · onboarding")
                .contains("A code comment tied to another card belongs to that card")
                .contains("Who it is for, and what it is for")
                .contains("verified against the real code, never against another document")
                .contains("It documents what the code does, not what it was meant to do")
                .contains("what no longer exists is deleted");
    }
}
