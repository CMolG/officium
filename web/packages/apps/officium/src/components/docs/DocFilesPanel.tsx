"use client";

import { X } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";
import { configurationPath } from "../../lib/configuration/places";

import type { FileNotice } from "./use-doc-files";

/**
 * The picker every entry point opens (hidden), and what happened to each file in words: busy and done politely, a
 * refusal as an alert; storage full says where the space goes.
 */
export function DocFilesPanel({ projectId, inputRef, notices, onFiles, onDismiss }: {
  projectId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  notices: readonly FileNotice[];
  onFiles: (files: File[]) => void;
  onDismiss: (id: number) => void;
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        tabIndex={-1}
        aria-label="Files to add to the page"
        data-testid="doc-file-input"
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      {notices.length > 0 && (
        <ul className="flex flex-col gap-1" data-testid="doc-file-notices">
          {notices.map((notice) => (
            <li
              key={notice.id}
              role={notice.tone === "error" ? "alert" : "status"}
              data-tone={notice.tone}
              className={`flex flex-row items-center gap-2 text-sm ${notice.tone === "error" ? "font-medium text-destructive" : "text-[color:var(--jd-muted)]"}`}
            >
              <span className="min-w-0 flex-1">
                {notice.text}
                {notice.full && (
                  <>
                    {" "}
                    <Link href={configurationPath("documentation", projectId)} className="underline underline-offset-2">
                      See what takes the space
                    </Link>
                  </>
                )}
              </span>
              {notice.tone !== "busy" && (
                <Button type="button" register="ui" size="sm" variant="ghost" className="size-11" aria-label="Dismiss" onClick={() => onDismiss(notice.id)}>
                  <X size={14} aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
