"use client";

import { Button, Note, Text } from "@javadaba/ui";

import { FormLanguageAdd } from "./FormLanguageAdd";
import { FormLanguageChips } from "./FormLanguageChips";
import { useFormLanguages } from "./use-form-languages";
import { MAX_FORM_LANGUAGES, SUGGESTED_FORM_LANGUAGES } from "../../lib/backlog/form-languages";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "../configuration/ConfigPage";
import { ConfigSection } from "../configuration/ConfigSection";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { ConfigLoading } from "../configuration/ConfigLoading";

/**
 * The languages every form on a human card of this project is written in (JAVA-1082). Only the owner changes them;
 * everyone else reads them, with the reason. Forms already on a card keep the languages they were written in.
 */
export function FormLanguagesView({ projectId }: { projectId: string }) {
  const f = useFormLanguages(projectId);
  const { configuration } = useCopy();
  const addable = SUGGESTED_FORM_LANGUAGES.filter((code) => !f.draft.includes(code));

  return (
    <ConfigPage title={configuration.sections["form-languages"]} lede="Which languages this project's forms accept.">
      {f.loadError && !f.project && <ConfigLoadError title="Couldn't load the form languages" detail={f.loadError} onRetry={f.retry} />}
      {!f.project && !f.loadError && <ConfigLoading label="Loading the form languages" rows={2} />}

      {f.project && (
        <ConfigSection
          title="Languages"
          label="Languages of the forms"
          note={`${f.draft.length} of ${MAX_FORM_LANGUAGES}`}
          hint="The languages every form on a human card of this project is written in. A form missing any of them is refused, naming the question and the language. Forms already on a card stay as they are."
        >
          {f.draft.length === 0 ? (
            <Note tone="neutral">
              No languages set: any form is accepted, in one language.
            </Note>
          ) : (
            <FormLanguageChips codes={f.draft} isOwner={f.isOwner} onRemove={f.remove} />
          )}

          {!f.isOwner && <Note tone="neutral">Only the project&apos;s owner changes this.</Note>}

          {f.isOwner && (
            <FormLanguageAdd
              input={f.input}
              setInput={f.setInput}
              inputError={f.inputError}
              full={f.full}
              addable={addable}
              onAdd={f.add}
            />
          )}

          {f.conflict && (
            <Note tone="warning">
              <span className="flex flex-row flex-wrap items-center gap-3">
                <span><strong>Changed elsewhere.</strong> This project changed elsewhere. Reload to see the latest.</span>
                <Button type="button" register="ui" variant="outline" size="sm" onClick={f.retry}>
                  Reload
                </Button>
              </span>
            </Note>
          )}
          {f.saveError && <Note tone="danger">{f.saveError}</Note>}
          {f.saved && <Note tone="success" role="status">Saved.</Note>}

          {f.isOwner && (
            <div className="flex flex-col gap-2">
              <div>
                <Button type="button" register="ui" className="min-h-11" disabled={f.saving || f.unchanged} onClick={() => void f.save()}>
                  {f.saving ? "Saving…" : "Save"}
                </Button>
              </div>
              {f.unchanged && (
                <Text as="p" className="text-xs text-[color:var(--jd-muted)]">
                  Nothing to save: the list is the one on the project.
                </Text>
              )}
            </div>
          )}
        </ConfigSection>
      )}
    </ConfigPage>
  );
}
