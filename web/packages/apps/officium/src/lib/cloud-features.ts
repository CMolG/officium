/**
 * The Cloud-only features Officium Local shows locked, each with one honest line on what Cloud adds
 * (no urgency, no discount, no "limited"). The key is also the `data-testid` suffix of its panel.
 */
export const CLOUD_FEATURES = {
  organization: {
    title: "Organization, teams and invitations",
    line: "Cloud adds teams, members and invitations, with roles for each person on a project.",
  },
  members: {
    title: "Members and invitations",
    line: "Cloud lets you invite people to a project by email and set what each of them can do.",
  },
  sharing: {
    title: "Sharing",
    line: "Cloud lets you share a project with other people and choose what each of them may do.",
  },
  integrationGate: {
    title: "Integration gate",
    line: "Cloud can hold a card in review until your CI and the repository agree it is ready.",
  },
  github: {
    title: "GitHub and CI integration",
    line: "Cloud connects repositories and your CI, so merges and test runs update the cards they belong to.",
  },
  changelog: {
    title: "Changelog",
    line: "Cloud keeps a changelog of what your work changed and asks the docs to catch up.",
  },
  testHistory: {
    title: "Test history",
    line: "Cloud keeps the history of your test runs next to the cards they covered.",
  },
  value: {
    title: "Value report",
    line: "Cloud measures what a month of agent work delivered and what its usage was worth.",
  },
  timeReport: {
    title: "Time report",
    line: "Cloud adds timesheets: the time each card took, per person, ready to print.",
  },
  agentWindows: {
    title: "Agent windows",
    line: "Cloud queues a card into an agent window you have open, from the board, on any machine.",
  },
} as const;

export type CloudFeatureId = keyof typeof CLOUD_FEATURES;

/** The Configuration sections that are Cloud-only as a whole, and the feature each one shows locked. */
export const CLOUD_SECTIONS: Partial<Record<string, CloudFeatureId>> = {
  organization: "organization",
  sharing: "sharing",
  "integration-gate": "integrationGate",
};
