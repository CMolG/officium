"use client";

import { Button, FieldError, Input, Label, Note, Select, Text } from "@javadaba/ui";

import { PRIORITY_CONFIG } from "../../../lib/backlog/status-config";
import type { Priority } from "../../../lib/backlog/types";
import type { GateRules } from "../../../lib/configuration/integration-gate";
import { useProjectOwner } from "../../../lib/configuration/use-project-owner";
import { useCopy } from "../../../lib/i18n/use-copy";
import { ConfigPage } from "../ConfigPage";
import { ConfigSection } from "../ConfigSection";
import { ConfigLoadError } from "../ConfigLoadError";
import { ConfigLoading } from "../ConfigLoading";
import { GateRuleRow } from "./GateRuleRow";
import { GateStatus } from "./GateStatus";
import { useIntegrationGate } from "./use-integration-gate";

const PRIORITIES = (Object.keys(PRIORITY_CONFIG) as Priority[]).map((value) => ({ value, label: PRIORITY_CONFIG[value].label }));

/**
 * Configuration, Integration gate (JAVA-1820, Cfg-Rules): three rules that decide whether agents may integrate, the
 * gate's live state with its reasons, and Save. A rule switched off keeps its value, greyed. The owner edits; every
 * member reads. The rules are the server's three (held by Deploy, cards waiting in Deploy, nothing else to hand out).
 */
export function IntegrationGateView({ projectId }: { projectId: string }) {
  const { isOwner } = useProjectOwner(projectId);
  const g = useIntegrationGate(projectId);
  const { configuration } = useCopy();
  const t = configuration.integrationGate;
  const d = g.draft;
  const set = (patch: Partial<GateRules>) => d && g.edit({ ...d, ...patch });

  return (
    <ConfigPage title={configuration.sections["integration-gate"]} lede={t.lede}>
      {g.loadError && !g.settings && <ConfigLoadError title={t.loadFailed} detail={g.loadError} onRetry={g.retry} />}
      {!g.settings && !g.loadError && <ConfigLoading label={t.loading} />}
      {g.settings && d && (
        <>
          <GateStatus projectId={projectId} rules={g.settings.rules} />
          <ConfigSection title={t.rulesTitle} hint={t.rulesHint}>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <GateRuleRow
                n={1}
                title={t.rules.heldByDeploy.title}
                help={t.rules.heldByDeploy.help}
                on={d.heldByDeploy.enabled}
                disabled={!isOwner}
                onChange={(on) => set({ heldByDeploy: { ...d.heldByDeploy, enabled: on } })}
              >
                <Select
                  aria-label={t.priorityLabel}
                  disabled={!isOwner || !d.heldByDeploy.enabled}
                  value={d.heldByDeploy.minPriority}
                  onChange={(value) => set({ heldByDeploy: { ...d.heldByDeploy, minPriority: value as Priority } })}
                  options={PRIORITIES}
                  className="min-h-11 max-w-60"
                />
              </GateRuleRow>
              <GateRuleRow
                n={2}
                title={t.rules.deployQueue.title}
                help={t.rules.deployQueue.help}
                on={d.deployQueue.enabled}
                disabled={!isOwner}
                onChange={(on) => set({ deployQueue: { ...d.deployQueue, enabled: on } })}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gate-queue-max" className="sr-only">
                    {t.rules.deployQueue.title}
                  </Label>
                  <div className="flex flex-row items-center gap-2">
                    <Input
                      id="gate-queue-max"
                      type="number"
                      min={1}
                      max={500}
                      inputMode="numeric"
                      className="max-w-28"
                      disabled={!isOwner || !d.deployQueue.enabled}
                      aria-invalid={!g.queueValid || undefined}
                      value={Number.isNaN(d.deployQueue.max) ? "" : d.deployQueue.max}
                      onChange={(e) => set({ deployQueue: { ...d.deployQueue, max: e.target.value === "" ? NaN : Number(e.target.value) } })}
                    />
                    <Text className="text-sm text-[color:var(--jd-muted)]">{t.queueUnit}</Text>
                  </div>
                  {!g.queueValid && <FieldError>{t.queueInvalid}</FieldError>}
                </div>
              </GateRuleRow>
              <GateRuleRow
                n={3}
                title={t.rules.nothingElse.title}
                help={t.rules.nothingElse.help}
                on={d.nothingElse.enabled}
                disabled={!isOwner}
                onChange={(on) => set({ nothingElse: { enabled: on } })}
              />
            </ul>
            {!isOwner && (
              <Note tone="neutral">
                <strong>{t.readOnly.lead}</strong> {t.readOnly.body}
              </Note>
            )}
            {g.conflict && (
              <Note tone="warning">
                <strong>{t.conflict.lead}</strong> {t.conflict.body}
              </Note>
            )}
            {g.saveError && (
              <Note tone="danger">
                <strong>{t.saveFailed}</strong> {g.saveError}
              </Note>
            )}
            {g.saved && (
              <Note tone="success" role="status">
                <strong>{t.saved.lead}</strong> {t.saved.body}
              </Note>
            )}
            {isOwner && (
              <div className="flex flex-row gap-2">
                <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={g.unchanged || g.saving} onClick={g.cancel}>
                  {t.cancel}
                </Button>
                <Button type="button" register="ui" className="min-h-11" disabled={g.unchanged || g.saving || !g.queueValid} onClick={() => void g.save()}>
                  {g.saving ? t.saving : t.save}
                </Button>
              </div>
            )}
          </ConfigSection>
        </>
      )}
    </ConfigPage>
  );
}
