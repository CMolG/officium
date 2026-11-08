/**
 * The Configuration sections whose pages are drawn (Cfg-Rules, Cfg-Project) but whose server side does not exist yet:
 * each is one typed read that answers "not available", so the page shows its honest unavailable state and its actions
 * stay off with the reason. Nothing here invents data. When an endpoint ships, the function below becomes its client.
 */
export type PendingSection = "capabilities" | "wake-reasons" | "glossary";

interface PendingCopy {
  /** What the page will let an owner do, in one sentence. */
  lede: string;
  /** The unavailable state's title and sentence. */
  title: string;
  body: string;
  /** The page's primary actions, shown off. */
  actions: string[];
  /** What the section's table will hold, for the screen reader and the sighted reader alike. */
  columns: string[];
}

// TODO(backend): GET/PUT /projects/{id}/capabilities -> built-in and the project own capabilities, each with its roles and a rule per phase (allowed | asks | never), versioned like the role matrix; POST creates one; each gets a generated docs page.
// TODO(backend): GET/PUT /projects/{id}/wake-reasons -> the ordered closed list { id, label, openCards }, versioned; refuse removing a reason that open cards use.
// TODO(backend): GET/PUT /projects/{id}/glossary -> { writingChecker: boolean, terms: { use, instead: string[], note }[] }, versioned; CSV import; the checker reads it on save for cards and pages.
export const PENDING_COPY: Record<PendingSection, PendingCopy> = {
  capabilities: {
    lede: "What agents can do in this project, and in which phase each is allowed.",
    title: "Capabilities aren't available yet.",
    body: "Each capability will have a rule per phase (allowed, asks a person, or never), the roles that use it, and a generated documentation page. Until the server keeps them, agents use Officium's defaults.",
    actions: ["New capability", "Save"],
    columns: ["Capability", "Roles that use it", "Phases"],
  },
  "wake-reasons": {
    lede: "The closed list of reasons a person's card can wait, in order.",
    title: "Wake reasons aren't available yet.",
    body: "Owners will keep an ordered list per project, with how many open cards use each reason. A reason in use can't be removed until its cards move to another. Until the server keeps them, people's cards wait without one.",
    actions: ["Add", "Save"],
    columns: ["Reason", "Open cards"],
  },
  glossary: {
    lede: "The terms to use and the words they replace; the writing checker reads them on save.",
    title: "The glossary isn't available yet.",
    body: "Owners will list a term, the words it replaces and a note, import them from a CSV, and switch the writing checker on for cards and pages. Until the server keeps them, saved text is not checked.",
    actions: ["Add a term", "Import CSV", "Save"],
    columns: ["Term to use", "Instead of", "Note"],
  },
};
