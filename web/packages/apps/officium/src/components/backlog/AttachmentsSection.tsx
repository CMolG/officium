"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { Text } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Attachment, CardDetail, MachineStatus } from "../../lib/backlog/types";

/**
 * A card's attachments, which live on the project's machine and never on Javadaba's servers
 * (JDB-242/244). So the section says where they are: with the machine connected, files go to it
 * and open from it; without it, the list still shows every file and its path, and says why it
 * cannot be opened or added right now.
 */
export function AttachmentsSection({
  projectId,
  repository,
  detail,
  onChanged,
}: {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onChanged: (next: CardDetail) => void | Promise<void>;
}) {
  const machine = useMachineStatus(repository, projectId);
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offline = machine !== null && !machine.connected;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProgress({ label: `Sending ${file.name}`, percent: 0 });
    try {
      const next = await repository.uploadAttachment(projectId, detail.id, file, (percent) =>
        setProgress({ label: `Sending ${file.name}`, percent }),
      );
      await onChanged(next);
    } catch (err) {
      // The API's own message (JDB-226 directive: "the API's error messages"), not a generic one.
      setError(err instanceof Error ? err.message : "Couldn't send that file.");
    } finally {
      setProgress(null);
    }
  }

  async function open(file: Attachment) {
    setError(null);
    setProgress({ label: `Fetching ${file.name}`, percent: 0 });
    try {
      const blob = await repository.openAttachment(projectId, detail.id, file, (percent) =>
        setProgress({ label: `Fetching ${file.name}`, percent }),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch that file.");
    } finally {
      setProgress(null);
    }
  }

  async function remove(attachmentId: string) {
    await onChanged(await repository.deleteAttachment(projectId, detail.id, attachmentId));
  }

  return (
    <section aria-label="Attachments" className="flex flex-col gap-3">
      <h3 className="flex flex-row items-center justify-between gap-2 border-b border-[color:var(--jd-line)] pb-2 text-sm font-bold uppercase tracking-wide">
        <span className="flex flex-row items-center gap-2">
          <Paperclip size={16} /> Attachments
        </span>
        <label
          aria-disabled={offline || undefined}
          className={`text-xs font-semibold normal-case tracking-normal underline underline-offset-4 ${
            offline ? "cursor-not-allowed text-[color:var(--jd-faint)] no-underline" : "cursor-pointer"
          }`}
        >
          <Text>Add a file</Text>
          <input
            type="file"
            className="sr-only"
            disabled={offline || progress !== null}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </h3>

      <MachineLine machine={machine} />

      {progress && (
        <div className="flex flex-row items-center gap-2 text-xs text-[color:var(--jd-muted)]" role="status">
          <span className="min-w-0 truncate">{progress.label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-ink)]/[0.08]">
            <span className="block h-full bg-[color:var(--jd-ink)]/50" style={{ width: `${progress.percent}%`, transitionProperty: "none" }} />
          </span>
          <Text>{progress.percent}%</Text>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      {detail.attachments.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {detail.attachments.map((file) => (
            <li key={file.id} className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
              <Paperclip size={16} className="shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{file.name}</p>
                <p className="truncate font-[family-name:var(--font-jd-kicker)] text-xs text-[color:var(--jd-muted)]" title={`.officium/attachments/${file.path}`}>
                  {file.size > 0 ? `${formatSize(file.size)} · ` : ""}
                  {file.path}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void open(file)}
                disabled={offline || progress !== null}
                aria-label={`Open ${file.name}`}
                className="flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={14} />
              </button>
              <button
                type="button"
                onClick={() => void remove(file.id)}
                aria-label={`Remove ${file.name}`}
                className="flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-medium italic text-[color:var(--jd-muted)]">No attachments.</p>
      )}
    </section>
  );
}

function MachineLine({ machine }: { machine: MachineStatus | null }) {
  if (machine === null) return null;
  return (
    <p className="flex flex-row items-start gap-2 text-xs text-[color:var(--jd-muted)]">
      <span
        aria-hidden="true"
        className={`mt-1 size-2 shrink-0 rounded-full ${machine.connected ? "bg-[color:var(--officium-online)]" : "bg-[color:var(--jd-faint)]"}`}
      />
      {machine.connected ? (
        <span>
          Files are kept on the machine where {machine.label ?? "the project's agent"} works, not on Javadaba&apos;s servers.
        </span>
      ) : (
        <span>
          <strong className="font-semibold text-[color:var(--jd-ink)]">Machine disconnected.</strong> Files live on
          the machine where this project&apos;s agent works; ask the agent to connect it (<code>files.connect</code>) to
          add or open them.
        </span>
      )}
    </p>
  );
}

/** The project's machine status, kept current by the project's live channel (`project.machine`). */
function useMachineStatus(repository: BacklogRepository, projectId: string): MachineStatus | null {
  const [machine, setMachine] = useState<MachineStatus | null>(null);
  const load = useCallback(() => {
    repository.getMachine(projectId).then(setMachine, () => setMachine(null));
  }, [repository, projectId]);

  useEffect(() => {
    load();
    return repository.subscribe(projectId, (event) => {
      if (event.type === "project.machine") load();
    });
  }, [repository, projectId, load]);

  return machine;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
