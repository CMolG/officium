/** Vite's `?raw` import: a fixture file's text, for the tests that read one. */
declare module "*?raw" {
  const text: string;
  export default text;
}
