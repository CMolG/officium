package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.List;

/**
 * What each {@link Category} means (JAVA-293): a one-line {@code hint} for a picker and a Markdown
 * {@code description} that says which cards belong in it and the rules that come with it. The one
 * source for the MCP ({@code meta.states}), the REST {@code /meta} and the board, whose copy in
 * {@code packages/apps/officium/src/lib/backlog/category-guide.json} is pinned to this file by
 * {@code scripts/test/officium-category-guide.test.mjs}. An agent reads it before creating or
 * classifying a card, so a category is chosen from its definition instead of from its name.
 *
 * <p>The switch has no default on purpose: a category added to the enum does not compile until it
 * says what it means. The texts are the first draft the user reviews; JAVA-328 to JAVA-342 grow
 * each one into its category's full contract.
 */
public record CategoryGuide(Category category, String hint, String description) {

    public CategoryGuide {
        description = description.strip();
    }

    public static List<CategoryGuide> all() {
        return Arrays.stream(Category.values()).map(CategoryGuide::of).toList();
    }

    /**
     * The classifier's tie-break (JAVA-373, the user's category spec in JAVA-293): when a card fits
     * several categories, the first one in this list wins. {@code epic} is not in it: a card is an
     * epic because it groups others, never because its wording matches.
     */
    public static List<Category> classifierPrecedence() {
        return List.of(Category.HOTFIX, Category.SECURITY, Category.REGRESSION, Category.BUG, Category.SPIKE,
                Category.ROUTINE, Category.FEATURE, Category.USER_STORY, Category.ENHANCEMENT,
                Category.INFRASTRUCTURE, Category.REFACTOR, Category.TECHNICAL_DEBT, Category.TESTING,
                Category.DOCUMENTATION);
    }

    public static CategoryGuide of(Category category) {
        return switch (category) {
            case EPIC -> new CategoryGuide(category, "A large goal split into smaller cards", """
                    A container for work aimed at a business goal. It is not executed: it breaks down into child cards
                    of any category, and its status derives from theirs.

                    **Signals.** A business goal · several independent deliveries · does not fit in one card.

                    **Excludes.** Work that fits in a single card is not an epic: it takes that work's own category.

                    **Entry contract.**
                    - The goal, and the metric that says it was reached.
                    - Its children exist, and each one carries its category.

                    **Exit contract.**
                    - Every child is closed.
                    - The goal is verified end to end, not only child by child.

                    **Behavior.**
                    - It never goes through Action: it moves forward as its children do.
                    - It is worked only through its children, never directly.
                    - With no children it can only be refined, until its cards exist.
                    - It groups other cards and doesn't show up in sprints: its cards do.
                    - Its children carry its badge: their `epic` field holds the epic's label or its key.
                    """);
            case FEATURE -> new CategoryGuide(category, "A capability the platform doesn't have yet",
                    """
                            A new capability the product did not have, functional or technical, that needs no user narrative:
                            an integration, an endpoint, an engine. Something could not be done before and can be after it ships.

                            **Signals.** A new capability · an integration · a new API · a new module.

                            **Excludes.**
                            - An increment written from one kind of user's point of view is a user story.
                            - Making something that exists faster, clearer or fuller is an enhancement.

                            **Entry contract.**
                            - Its scope and limits are defined: what it does, and what it leaves out.
                            - Its technical design is approved.
                            - Acceptance criteria, including how anyone can see it working.
                            - A test strategy.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - Every acceptance criterion is met.
                            - The new tests that prove it are green.
                            - The capability is documented, and the documentation it makes stale is updated with it.

                            **Behavior.**
                            - Its scope does not grow without going back to Refine.
                            """);
            case USER_STORY -> new CategoryGuide(category, "As a [role], I want [action] so that [benefit]",
                    """
                            A vertical increment with visible value for one kind of user, written as a story: as a [role], I want
                            [action] so that [benefit]. It describes the need, not the solution.

                            **Signals.** An identified kind of user · value they can observe · a usage flow.

                            **Excludes.**
                            - A capability with no user narrative is a feature.
                            - Making something that exists faster, clearer or fuller is an enhancement.

                            **Entry contract.**
                            - The story is written: who, what, and why.
                            - Verifiable acceptance criteria, written as what that user can observe.
                            - If there is UI, its flow and its states are designed.
                            - It is small enough to deliver on its own; one that is not is split, or becomes an epic.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - Every acceptance criterion is met.
                            - If there is UI, its empty, loading, error and success states are implemented.

                            **Behavior.**
                            - It is delivered end to end, not layer by layer: the user can walk the story when it ships.
                            """);
            case ENHANCEMENT -> new CategoryGuide(category,
                    "Something that works, made faster, clearer or fuller",
                    """
                            An improvement to something that already exists and works: faster, clearer, fuller or with
                            more options. Nothing is broken.

                            **Signals.** Existing functionality · "it would be better if" · an optimization.

                            **Excludes.**
                            - Behavior that is wrong is a bug, or a regression if it worked until a recent change.
                            - A capability that doesn't exist yet is a feature.

                            **Entry contract.**
                            - The current state and the desired state are described.
                            - If it is about performance, the metric that shows the improvement, measured before.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. Only when it corrects an earlier card's delivery: `Caused by:` names that card.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The improvement is measured or demonstrated, the way the entry contract said.
                            - What worked before keeps working, and the tests prove it.

                            **Behavior.**
                            - Existing public contracts are not broken: an API, a wire field, a URL or a stored format
                              keeps its shape.
                            """);
            case BUG -> new CategoryGuide(category, "Behaves differently from what was expected",
                    """
                            Behavior that does not match what was specified or expected, with no evidence that it ever
                            worked.

                            **Signals.** A wrong result · an error · "it doesn't do what it should".

                            **Excludes.**
                            - It worked in an earlier version, until a recent change: that is a regression.
                            - Production is stopped by it and it has to be fixed now: that is a hotfix.

                            **Entry contract.**
                            - The steps that reproduce it.
                            - The expected result and the actual result.
                            - Its severity and impact: who it affects, and how badly.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. `Caused by: <KEY>` (or `legacy`), `Escaped in:`, `Quality dimension:`, `Violated rules:`.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - A test that reproduces the failure, seen red before the fix and green after it.
                            - The fix is applied.

                            **Behavior.**
                            - The cause is fixed, not the symptom.
                            - Its scope does not grow: anything else found on the way is a card of its own.
                            """);
            case HOTFIX -> new CategoryGuide(category, "An urgent fix in production that cannot wait",
                    """
                            An urgent fix in production, outside the normal cycle. A category of its own, not a mode of bug: it
                            goes first, ahead of the rest of the sprint.

                            **Signals.** Production affected · critical severity · cannot wait for the next release.

                            **Excludes.** A defect with no urgency in production is not a hotfix: it is a bug, or a regression if
                            it worked until a recent change.

                            **Entry contract.**
                            - Its impact in production is confirmed, not assumed.
                            - The affected version: what production runs.
                            - A minimal reproduction.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. `Caused by: <KEY>` (or `legacy`), `Escaped in:`, `Quality dimension:`, `Violated rules:`.

                            **Exit contract.**
                            - The branch is cut from what production runs: its release tag, or `main` where `main` is what
                              deploys.
                            - A minimal diff: the smallest change that restores service, deployed and verified in production.
                            - A follow-up card exists, as a bug or a regression, for the root cause and the test that pins it.

                            **Behavior.**
                            - Its refine is express: only the entry contract, nothing more, before the fix starts.
                            - No refactoring and no scope growth: the full repair is the follow-up card.
                            """);
            case REGRESSION -> new CategoryGuide(category, "Something that worked, broken by a recent change",
                    """
                            Something that worked in an identifiable earlier version and stopped working after a change.

                            **Signals.** "It used to work" · "since the last release" · a test or a version that proved it
                            worked.

                            **Excludes.**
                            - A defect with no known good version is a bug.
                            - A failure that stops production and has to be fixed now is a hotfix.

                            **Entry contract.**
                            - The good version and the bad version are identified: the last one where it worked, the first
                              one where it doesn't.
                            - The steps that reproduce it.
                            - Its impact: who it affects, and how badly.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. `Caused by: <KEY>` (or `legacy`), `Escaped in:`, `Quality dimension:`, `Violated rules:`.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The change that caused it is located: its commit or its PR.
                            - The fix is applied.
                            - A test pins the behavior that was lost, so it can't break the same way again.

                            **Behavior.**
                            - Its scope does not grow: anything else found on the way is a card of its own.
                            - If the cause reveals debt, that debt is a separate technicalDebt card, not part of this fix.
                            """);
            case REFACTOR -> new CategoryGuide(category, "Same behavior, better internal structure",
                    """
                            A change to the code's internal structure with no change in its observable behavior.

                            **Signals.** Readability · coupling · duplication · preparing the ground for another change.

                            **Excludes.**
                            - A recorded deficiency whose payback needs dependencies, data or infrastructure updated is
                              technicalDebt.

                            **Entry contract.**
                            - Why it is restructured, and the structure it ends in.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. Only when it corrects an earlier card's delivery: `Caused by:` names that card.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The existing tests are green, and none of them was modified to get there.
                            - No public contract changed: the API, the wire formats and the exported types are the same.

                            **Behavior.**
                            - Observable behavior does not change: a behavior change found on the way is a card of its own.
                            - The existing tests are not modified: they are the proof that behavior stayed identical.
                            """);
            case TECHNICAL_DEBT -> new CategoryGuide(category,
                    "Paying off a known deficiency: a workaround, an old dependency, a latent risk",
                    """
                            Work that directly pays off a known deficiency, recorded with what it costs and what triggers
                            it. Several technicalDebt cards are grouped under a debt epic.

                            **Signals.** A workaround · an outdated or unsupported dependency · "this slows us down" · a known
                            latent risk.

                            **Excludes.**
                            - Reorganizing code with no recorded deficiency is a refactor.
                            - An exploitable vulnerability is security.

                            **Entry contract.**
                            - What it slows down, or the risk it carries.
                            - The cost of not paying it.
                            - Its lineage: the card that caused it, the phase that let it through, the quality dimension that failed and
                              the rules it broke. Only when it corrects an earlier card's delivery: `Caused by:` names that card.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The deficiency is removed, and what depended on it still works.
                            - The workaround is retired: none of it is left behind.
                            - The tests are adapted, where the payback needed it.
                            - No functional change.

                            **Behavior.**
                            - It is executed directly: once the entry contract is met, the payback starts, with no design
                              card in front of it.
                            - It may touch dependencies, data or infrastructure.
                            - It may not change functional behavior: a behavior change found on the way is a card of its
                              own.
                            """);
            case INFRASTRUCTURE -> new CategoryGuide(category,
                    "Environments, CI/CD, networking, containers, IaC and observability",
                    """
                            Changes to environments, CI/CD, networking, containers, infrastructure as code or
                            observability that do not touch product logic.

                            **Signals.** A pipeline · a deployment · an environment · a container · the
                            network · monitoring.

                            **Excludes.**
                            - A vulnerability or hardening is security.
                            - A change to product logic takes that logic's own category.

                            **Entry contract.**
                            - The target topology: what runs where once it is done.
                            - Its impact on cost and capacity.
                            - The rollback plan: how the change is undone.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The infrastructure is applied as code, and proven by running it (a runnable probe comes
                              before any design), not only by reading it.
                            - The change's observability is active: a metric, a log or an alert shows it working.

                            **Behavior.**
                            - Every change is reproducible from the repository.
                            - Nothing is done by hand without a runbook.
                            """);
            case SECURITY -> new CategoryGuide(category,
                    "Vulnerabilities, hardening, secrets, permissions and compliance",
                    """
                            A vulnerability, hardening, secrets management, permissions or compliance.

                            **Signals.** A CVE · data exposure · excessive permissions · secrets in plain text · a
                            regulatory requirement.

                            **Excludes.** A hole already exploited, or one that production cannot wait on, is a hotfix.

                            **Entry contract.**
                            - The threat or the requirement, described: who could do what, and to whom.
                            - The affected surface.
                            - Its severity.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The vulnerability is closed, or the control is applied.
                            - Verification that the vector is no longer exploitable: a test that proves the hole is
                              closed.

                            **Behavior.**
                            - Its visibility is restricted until it is deployed: exploit details stay out of public text.
                            - Within its priority, it goes ahead of every other category except hotfix; a higher
                              priority still comes first.
                            """);
            case SPIKE -> new CategoryGuide(category, "Time-boxed research whose deliverable is knowledge",
                    """
                            Time-boxed research whose deliverable is knowledge (a report, a recommendation or a throwaway
                            proof of concept), never production code. Two subtypes: `technical`, and `ux-ui` for research
                            about the interface and the people who use it.

                            **Signals.** Uncertainty · "we don't know whether" · comparing options · validating a
                            hypothesis.

                            **Excludes.** Work whose deliverable reaches production belongs to that work's own category.

                            **Entry contract.**
                            - A concrete question.
                            - A time box.
                            - A success criterion: the answer that closes the question.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - An answer with its evidence, written on the card.
                            - An actionable recommendation.
                            - The derived cards are created: the work it recommends becomes new cards.

                            **Behavior.**
                            - A proof of concept's code is never promoted to production: building it for real is a new
                              card.
                            - When the time box runs out, whatever exists is delivered.
                            """);
            case TESTING -> new CategoryGuide(category, "Tests, fixtures or test environments, no production code",
                    """
                            Adding or improving tests, fixtures or test environments without changing production code: work
                            whose deliverable is verification, whether a test plan, an automated suite or a load test.

                            **Signals.** Coverage · a fragile test · a missing e2e · test data.

                            **Excludes.** A test written to fix a failure belongs to that fix: a bug, or a regression if it
                            worked before.

                            **Entry contract.**
                            - What gets covered, and why, and what is left out.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The tests are green and deterministic, the same result on every run, in the project's gate:
                              CI, or the local attestation where CI does not run the tests.

                            **Behavior.**
                            - Production code is not modified: a change the product needs is a card of its own.
                            - It is validated in that gate and never deployed to production.
                            - A red it finds is fixed in the test when the test is behind the code; when the product is
                              broken, it becomes a bug or regression card of its own. It is never left unexplained.
                            - An epic's test card (tag `epic-test`) runs the full suite once, after the epic's other cards.
                            """);
            case ROUTINE -> new CategoryGuide(category,
                    "A recurring task run from a runbook: upkeep, renewals, cleanup",
                    """
                            A recurring, predictable task guided by a runbook: dependencies, certificates, secrets, backups,
                            cleanups. It does not go through Refine: the runbook is its refinement.

                            **Signals.** Periodicity · an existing runbook · maintenance.

                            **Excludes.** A recurring task with no runbook is not routine yet: its runbook is written first,
                            as a documentation card.

                            **Entry contract.**
                            - The runbook it follows, referenced.

                            **Exit contract.**
                            - The runbook is executed.
                            - Evidence of the execution: the output, the log or the check that shows it ran.

                            **Behavior.**
                            - It skips Refine.
                            - It follows the runbook strictly, and a new step found on the way is written into the runbook.
                            - When it has to deviate from the runbook, or turns out to change behavior, the matching card is
                              opened: a bug, a regression or an enhancement, whatever the deviation is.
                            """);
            case DOCUMENTATION -> new CategoryGuide(category,
                    "ADRs, API references, runbooks and guides, checked against the code",
                    """
                            Technical or functional documentation that people or agents rely on: ADRs, API references,
                            runbooks, guides. It is checked against the real code.

                            **Signals.** An ADR · an API reference · a runbook · a guide · onboarding.

                            **Excludes.** A code comment tied to another card belongs to that card.

                            **Entry contract.**
                            - Who it is for, and what it is for.
                            - Its workflow is set, then its plan: the plan opens `Base: <control branch | main | branch name>` and is written under the workflow's refine role.

                            **Exit contract.**
                            - The content is verified against the real code, never against another document.

                            **Behavior.**
                            - It documents what the code does, not what it was meant to do.
                            - What changed is fixed, and what no longer exists is deleted, not only added to.
                            """);
        };
    }
}
