const FENCE = "`".repeat(3);

const EXAMPLE = {
  groups: [{ id: "core", label: "Our system" }],
  nodes: [
    { id: "web", label: "Web app", kind: "app", group: "core", description: "What people open in the browser." },
    { id: "api", label: "API", kind: "service", group: "core", description: "Answers the web app and owns the rules." },
    { id: "db", label: "Database", kind: "database", group: "core", description: "Where the data lives." },
    { id: "jobs", label: "Job queue", kind: "queue", group: "core", description: "Work that can wait, like sending emails." },
    { id: "mail", label: "Email provider", kind: "external", description: "A service we do not run." },
  ],
  edges: [
    { from: "web", to: "api", label: "HTTPS" },
    { from: "api", to: "db", label: "SQL" },
    { from: "api", to: "jobs", label: "enqueue" },
    { from: "jobs", to: "mail", label: "sends" },
  ],
};

export const STARTER_TITLE = "System design";

/** The page "Create the system map" writes: the format in prose, then a small example to edit. */
export const STARTER_BODY = [
  "# System design",
  "",
  "The System design view draws a map of this project from the block below. Edit the block and the map redraws; an agent can edit it too.",
  "",
  "How to write it:",
  "",
  `- Write one code block whose language is \`system-design\`, holding JSON with \`nodes\`, \`edges\` and, if you want boxes around related nodes, \`groups\`.`,
  `- A node has an \`id\` (unique), a \`label\`, a \`kind\` (one of app, service, database, queue, server, external), and optionally a \`group\` (a group id) and a \`description\`.`,
  `- An edge goes \`from\` one node id \`to\` another, with an optional \`label\`.`,
  "- A group has an `id` and a `label`.",
  "",
  `${FENCE}system-design`,
  JSON.stringify(EXAMPLE, null, 2),
  FENCE,
  "",
].join("\n");
