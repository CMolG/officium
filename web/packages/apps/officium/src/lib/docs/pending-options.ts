/**
 * Page features of the wiki the design draws (Doc-Page, "More for the wiki") that the server and the editor do not
 * serve yet. `DocPageMoreOptions` lists them off with their reason; each TODO names what turns it on.
 */
interface PendingDocOption {
  id: string;
  label: string;
  reason: string;
}

// TODO(backend): PUT/DELETE /projects/{id}/docs/{path}/public-link -> { enabled, url }; a public read of that one page without an account, child pages stay private (JAVA-807).
// TODO(backend): GET /projects/{id}/docs/{path}/views -> members by name with the last time (30 days) and the public link as a count (JAVA-810).
// TODO(backend): GET /projects/{id}/docs/{path}/export?format=pdf|html&children=bool -> the page (and its children) rendered as a file (JAVA-811).
// TODO(backend): POST /projects/{id}/docs/ask { question } -> an answer drawn only from this project's pages, with the pages it used named (JAVA-813; low priority).
// Find and replace (JAVA-812), side by side (JAVA-809) and presenting (JAVA-808) need no endpoint: they are editor and route work that has not been built.
export const DOC_PAGE_PENDING: readonly PendingDocOption[] = [
  { id: "share", label: "Share…", reason: "A public link needs the server to issue one." },
  { id: "views", label: "Who viewed", reason: "Page views are not recorded yet." },
  { id: "export", label: "Export as PDF or HTML", reason: "Only Markdown is exported today." },
  { id: "find", label: "Find and replace", reason: "The editor has no find and replace yet." },
  { id: "beside", label: "Open beside", reason: "Two pages side by side are not built yet." },
  { id: "present", label: "Present", reason: "Presenting a page as slides is not built yet." },
  { id: "ask", label: "Ask the wiki", reason: "Answers from the project's pages need the server." },
];
