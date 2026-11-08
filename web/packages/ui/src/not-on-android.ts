/**
 * What a name in `index.native.ts` is until its Android twin exists: it throws, naming the piece,
 * the moment it is rendered or called, so a port screen fails loudly instead of drawing
 * `undefined`. The first port card that reaches a piece writes `<piece>.native.tsx` in
 * `packages/ui` and swaps the stub in `index.native.ts` for the twin's export.
 */
export function notOnAndroid(name: string) {
  const piece = () => {
    throw new Error(`@javadaba/ui: ${name} has no Android twin yet. Write its .native.tsx and export it from index.native.ts.`);
  };
  Object.defineProperty(piece, "name", { value: name });
  return piece;
}
