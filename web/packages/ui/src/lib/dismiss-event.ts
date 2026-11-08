/** The event a dismiss guard receives (the shape of Radix's `onEscapeKeyDown`): `preventDefault()` keeps the layer open. */
export interface DismissEvent {
  readonly defaultPrevented: boolean;
  preventDefault: () => void;
}

/** Offers a dismissal to the caller's guard and closes unless it was prevented. */
export function requestClose(guard: ((event: DismissEvent) => void) | undefined, close: () => void) {
  let prevented = false;
  guard?.({
    get defaultPrevented() {
      return prevented;
    },
    preventDefault: () => {
      prevented = true;
    },
  });
  if (!prevented) close();
}
