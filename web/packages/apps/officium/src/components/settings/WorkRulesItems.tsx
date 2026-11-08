"use client";

import { Button, Text, Textarea } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";

/** The rows of the standing checklist: the owner writes them, everyone else reads them (JAVA-1446). */
export function WorkRulesItems({
  items,
  isOwner,
  invalidIndex,
  tokens,
  setItem,
  blurItem,
  addItem,
  removeItem,
}: {
  items: string[];
  isOwner: boolean;
  invalidIndex: number | null;
  tokens: number[];
  setItem: (index: number, value: string) => void;
  blurItem: (index: number) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
}) {
  const { configuration } = useCopy();
  const copy = configuration.workRules;

  return (
    <>
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex flex-row flex-wrap items-start gap-2">
            <Text className="w-6 shrink-0 pt-2 text-right font-mono text-sm text-[color:var(--jd-muted)]">{index + 1}.</Text>
            {isOwner ? (
              <>
                <Textarea
                  aria-label={`${copy.itemLabel} ${index + 1}`}
                  aria-describedby={`work-rule-tokens-${index}`}
                  aria-invalid={invalidIndex === index || undefined}
                  value={item}
                  rows={2}
                  maxLength={200}
                  className="min-h-11 min-w-[12rem] flex-1 resize-none [field-sizing:content]"
                  onChange={(e) => setItem(index, e.target.value)}
                  onBlur={() => blurItem(index)}
                />
                <Text
                  id={`work-rule-tokens-${index}`}
                  className="w-28 shrink-0 pt-2 text-right font-mono text-xs text-[color:var(--jd-muted)]"
                >
                  {`${item.length} / 200 · ${copy.ruleTokens(tokens[index] ?? 0)}`}
                </Text>
                <Button
                  type="button"
                  register="ui"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  aria-label={`${copy.removeItem} ${index + 1}`}
                  onClick={() => removeItem(index)}
                >
                  {copy.removeItem}
                </Button>
              </>
            ) : (
              <Text className="min-w-0 flex-1 pt-2 text-sm">{item}</Text>
            )}
          </li>
        ))}
      </ol>

      {isOwner && (
        <div className="flex flex-row flex-wrap items-center gap-3">
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={addItem}>
            {copy.addItem}
          </Button>
        </div>
      )}
    </>
  );
}
