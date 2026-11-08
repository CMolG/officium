import { Dialog, DialogContent, LoadingRegion, Skeleton } from "@javadaba/ui";

/**
 * The stand-in while a card's editor chunk loads (JAVA-1647): the rich-text editor is kept out of
 * the board's first read, so a cold open waits for it here instead of painting nothing. It is drawn
 * in the same dialog frame as the card modal (and the new-card dialog, and the Backlog's detail), at
 * the same height, so the person sees the place the card will open in and nothing jumps when it
 * lands. Its close is the parent's close: Escape, the scrim and the phone's close all cancel the open
 * (the parent passes the same handler it gives the real dialog). From sm up the sheet has no close
 * control of its own, on purpose: the card's header draws one, and this stand-in is up for a moment
 * with the scrim and Escape both working. Once the idle prefetch has run, the chunk is already there
 * and this never shows.
 */
export function CardEditorLoading({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* The stand-in takes no focus and gives none back: the card's own dialog, which replaces it, keeps the trigger as its return target. */}
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:min-h-[min(52rem,calc(100%-2rem))] sm:rounded-[var(--radius-jd-xl)]"
      >
        <LoadingRegion
          loading
          label="Loading the card"
          showLabel
          className="flex flex-1 flex-col p-6"
          // The gap is on the bones' own wrapper: LoadingRegion puts `fallbackClassName` around them, so a gap
          // set on its outer box has one child to space and the three rows read as one grey block.
          fallbackClassName="flex flex-col gap-3 pb-3"
          // The bones are the muted text tone at 30%: the skeleton's own border tone is too faint on the
          // dark sheet to read as a placeholder at all (JAVA-1647's review, forced-dark captures). The visible
          // label carries the state in words, since a forced-dark browser draws no bone.
          fallback={[0, 1, 2].map((row) => (
            <Skeleton key={row} className={`bg-[color-mix(in_srgb,var(--jd-muted)_30%,transparent)] ${row === 0 ? "h-6 w-2/3" : "h-4 w-full"}`} />
          ))}
        />
      </DialogContent>
    </Dialog>
  );
}
