"use client";

import { Button, Note } from "@javadaba/ui";

import { ExecutionModeSetting } from "./ExecutionModeSetting";
import { WorkRulesItems } from "./WorkRulesItems";
import { QUOTA_STATE_ID, WorkRulesQuota } from "./WorkRulesQuota";
import { MAX_ITEM_LENGTH, useWorkRules } from "./use-work-rules";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "../configuration/ConfigPage";
import { ConfigSection } from "../configuration/ConfigSection";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { ConfigLoading } from "../configuration/ConfigLoading";

/**
 * The standing Definition of Done (JAVA-1446): the items every agent answers in the comment it writes when it finishes a
 * card. The owner edits the list; everyone else reads it. Above it, how agents pick their work (the execution mode).
 */
export function WorkRulesView({ projectId }: { projectId: string }) {
  const state = useWorkRules(projectId);
  const { project, items, loadError, isOwner, problem, problemShown, valid, unchanged, saving, saved, saveError, save, retry } =
    state;
  const { configuration } = useCopy();
  const copy = configuration.workRules;
  const problemText =
    problem === null
      ? null
      : problem.kind === "empty"
        ? copy.problemEmpty(problem.index + 1)
        : problem.kind === "long"
          ? copy.problemLong(problem.index + 1, MAX_ITEM_LENGTH)
          : copy.problemRepeat(problem.index + 1, problem.other + 1);

  return (
    <ConfigPage
      title={configuration.sections["work-rules"]}
      lede="How agents pick their work on this project, and what they check before they finish."
    >
      {project && <ExecutionModeSetting projectId={projectId} isOwner={isOwner} />}

      {loadError && !items && <ConfigLoadError title={copy.loadError} detail={loadError} retryLabel={copy.tryAgain} onRetry={retry} />}
      {!items && !loadError && <ConfigLoading label={copy.loading} />}

      {items && (
        <ConfigSection title="Rules" label={configuration.sections["work-rules"]} hint={copy.lede}>
          {items.length === 0 && <Note tone="neutral">{isOwner ? copy.emptyState : copy.emptyStateReader}</Note>}

          <WorkRulesQuota rules={items.length} total={state.total} quota={state.quota} over={state.over} />

          <WorkRulesItems
            items={items}
            isOwner={isOwner}
            invalidIndex={problemShown && problem ? problem.index : null}
            tokens={state.tokens}
            setItem={state.setItem}
            blurItem={state.blurItem}
            addItem={state.addItem}
            removeItem={state.removeItem}
          />

          {!isOwner && <Note tone="neutral">{copy.readOnly}</Note>}
          {isOwner && problemText && (
            <Note tone={problemShown ? "danger" : "neutral"} role={problemShown ? "alert" : undefined}>
              {problemText}
            </Note>
          )}
          {saveError && <Note tone="danger">{saveError}</Note>}
          {saved && <Note tone="success" role="status">{copy.saved}</Note>}

          {isOwner && (
            <div>
              <Button
                type="button"
                register="ui"
                className="min-h-11"
                disabled={saving || !valid || unchanged}
                aria-describedby={QUOTA_STATE_ID}
                onClick={() => void save()}
              >
                {saving ? copy.saving : copy.save}
              </Button>
            </div>
          )}
        </ConfigSection>
      )}
    </ConfigPage>
  );
}
