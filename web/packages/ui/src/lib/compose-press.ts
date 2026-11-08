/** Runs the caller's `onPress` first, then the part's own action, as Radix's composed handlers do on the web. */
export function composePress<E>(own: () => void, theirs?: ((event: E) => void) | null) {
  return (event: E) => {
    theirs?.(event);
    own();
  };
}
