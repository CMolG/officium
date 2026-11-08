"use client";

import { useEffect, useState } from "react";
import { copyText } from "@javadaba/sdk/platform";
import { Badge, Button, Input, Panel, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { HeartbeatDevice, IssuedHeartbeatToken } from "../../lib/backlog/types";
import { useNow } from "../../lib/docs/use-now";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

const deviceName = (device: { machine: string | null }) => device.machine ?? "Unnamed computer";

/** A computer that beat within this long ago is Live; a quieter one says so (Cfg-Integrations, "Computers"). */
const LIVE_WINDOW_MS = 5 * 60_000;

/**
 * JAVA-186/675 (officium-api.md §4.2): the computers whose harness keeps the card their agent works
 * lit on the board between the agent's own writes, at no model tokens. One token per computer, so
 * revoking one stops only that one. A token is shown once, like the pipeline token: only its hash is
 * kept, so losing it means adding the computer again.
 */
export function HeartbeatPanel({ heartbeatUrl }: { heartbeatUrl: string }) {
  const repository = getBacklogRepository();
  const [devices, setDevices] = useState<HeartbeatDevice[] | null>(null);
  const [machine, setMachine] = useState("");
  const [issued, setIssued] = useState<IssuedHeartbeatToken | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const now = useNow(30_000);

  useEffect(() => {
    repository.listHeartbeatDevices().then(setDevices, (err: unknown) => setError(messageOf(err)));
  }, [repository]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const issue = () =>
    run(async () => {
      const result = await repository.issueHeartbeatToken(machine.trim() || null);
      setIssued(result);
      setMachine("");
      setCopied(false);
      setDevices(await repository.listHeartbeatDevices());
    });

  const revoke = (device: HeartbeatDevice) =>
    run(async () => {
      await repository.revokeHeartbeatDevice(device.id);
      if (issued?.id === device.id) setIssued(null);
      setConfirmingRevoke(null);
      setDevices(await repository.listHeartbeatDevices());
    });

  const example = [
    `curl -X POST ${heartbeatUrl} \\`,
    `  -H "Authorization: Bearer $OFFICIUM_HEARTBEAT_TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"machine":"<the name your agent passes as machine>","text":"Running the tests"}'`,
  ].join("\n");

  return (
    <Panel as="section" material="plain" radius="lg" className="flex flex-col gap-3 p-4" aria-labelledby="heartbeat-heading">
      <h3 id="heartbeat-heading" className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        Keep your agent&apos;s card live
      </h3>
      <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-ink)]">
        While an agent works a card, the board shows it live, but only as long as the agent keeps writing. Give its
        hooks a token and they keep the card live for it, through a long test run too, without spending the
        agent&apos;s tokens. At the end of each turn they also report the whole session as the time of the cards it
        worked, with the model and tokens it spent. A token can only touch cards your agent is already working.
      </p>
      <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
        Each computer gets its own token, so revoking one stops only that computer. The quickest way to add one: ask
        your agent to set up Officium&apos;s heartbeat on it. It saves the token there without showing it in the chat.
      </p>

      {devices === null && !error && <p className="text-sm text-[color:var(--jd-muted)]">Checking your computers…</p>}

      {devices && devices.length === 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">No computers send a heartbeat yet.</p>
          <p className="text-sm text-[color:var(--jd-muted)]">Add the computer your agent runs on.</p>
        </div>
      )}

      {devices && devices.length > 0 && (
        <ul aria-label="Your computers" className="flex flex-col gap-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-col gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4"
            >
              <div className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Text className="font-semibold">{deviceName(device)}</Text>
                  <Text className="text-xs text-[color:var(--jd-muted)]">
                    {`Added ${formatDate(device.createdAt)} · ${
                      device.lastUsedAt ? `last beat ${formatDate(device.lastUsedAt)}` : "never beat yet"
                    }`}
                  </Text>
                </div>
                {device.lastUsedAt ? (
                  <Badge register="chip" size="sm" tone={now - Date.parse(device.lastUsedAt) <= LIVE_WINDOW_MS ? "success" : "neutral"} fill="subtle">
                    {now - Date.parse(device.lastUsedAt) <= LIVE_WINDOW_MS ? "Live" : "Quiet"}
                  </Badge>
                ) : (
                  <Badge register="chip" size="sm" tone="neutral" fill="subtle">
                    No beat yet
                  </Badge>
                )}
                {confirmingRevoke !== device.id && (
                  <Button
                    type="button"
                    register="ui"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Revoke ${deviceName(device)}`}
                    onClick={() => setConfirmingRevoke(device.id)}
                  >
                    <span>Revoke</span>
                  </Button>
                )}
              </div>
              {confirmingRevoke === device.id && (
                <div role="alert" className="flex flex-col gap-2">
                  <p className="text-sm">
                    Revoke {deviceName(device)}? Its hooks stop keeping cards live; your other computers keep working.
                  </p>
                  <div className="flex flex-row flex-wrap gap-2">
                    <Button type="button" register="ui" size="sm" variant="outline" disabled={busy} onClick={() => void revoke(device)}>
                      <span>Revoke this computer</span>
                    </Button>
                    <Button type="button" register="ui" size="sm" variant="ghost" onClick={() => setConfirmingRevoke(null)}>
                      <span>Keep it</span>
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {issued && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Token for {deviceName(issued)}</p>
          <p className="text-sm text-[color:var(--jd-muted)]">
            Save it as <code>~/.config/officium/heartbeat-token</code> on that computer. It is not shown again.
          </p>
          <div className="flex flex-row gap-2">
            <Input readOnly value={issued.token} aria-label="Heartbeat token" className="min-w-0 flex-1 font-mono text-xs" />
            <Button type="button" register="ui" variant="outline" onClick={async () => setCopied(await copyText(issued.token))}>
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-[color:var(--jd-muted)]">What the hooks send</p>
        <pre className="overflow-x-auto rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] p-3 font-mono text-xs">
          {example}
        </pre>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-row flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-[color:var(--jd-muted)]">Computer name (optional)</span>
          <Input value={machine} onChange={(event) => setMachine(event.target.value)} placeholder="LAPTOP" maxLength={100} />
        </label>
        <Button type="button" register="ui" disabled={busy || devices === null} onClick={() => void issue()}>
          <span>{busy ? "Working…" : "Add a computer"}</span>
        </Button>
      </div>
    </Panel>
  );
}
