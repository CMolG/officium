/**
 * Systema's observatory (JAVA-1598, JAVA-1601 to JAVA-1615; Doc-Sweeps, Doc-Scores, Doc-Lenses): control branches swept
 * against a baseline, five scores from 1 to 100, coverage and mutation by module, the Web Vitals of the routes, and
 * lenses over the map. The server keeps no sweeps yet, so the page shows its honest unavailable state: nothing here
 * invents a score. When the endpoints ship, `getObservatory` becomes their client and the tab draws what it returns.
 */

/** The five scores, in the order the design lists them, each with what it is made of. */
export const OBSERVATORY_SCORES = [
  { id: "reliability", name: "Reliability", about: "Failing tests, flaky runs and error paths without a test." },
  { id: "maintainability", name: "Maintainability", about: "Complexity, duplication, file size and how deep the imports go." },
  { id: "security", name: "Security", about: "Secrets, dependency advisories and unchecked input at the edges." },
  { id: "performance", name: "Performance", about: "Bundle size, slow queries and the Web Vitals of the routes." },
  { id: "accessibility", name: "Accessibility", about: "Contrast, names, focus and keyboard on every page the sweep opens." },
] as const;

type ObservatoryAnswer = { available: false };

// TODO(backend): GET /projects/{id}/systema/branches -> the control branches with their last sweep, overall score and move against the baseline; POST adds one; PUT sets the baseline.
// TODO(backend): POST /projects/{id}/systema/sweeps { branch, measure[], baseline } -> a sweep that runs on the project's build machine; GET lists and follows it (steps, progress, failure at a step, build machine offline, read only for non owners).
// TODO(backend): GET /projects/{id}/systema/sweeps/{id} -> the five scores with their measures and worst files, coverage by module (lines, branches, mutation score, survivors), Web Vitals per route on phone and desktop, and the comparison with the baseline.
// TODO(backend): GET /projects/{id}/systema/lenses/{lens} -> a value per map node for scores, coverage, mutation, web vitals and changes ("No data" when the sweep did not measure the node).
export async function getObservatory(_projectId: string): Promise<ObservatoryAnswer> {
  return { available: false };
}
