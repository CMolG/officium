import { LoadingRegion, Skeleton } from "@javadaba/ui";

/**
 * The stand-in for the role's card list: three rows with the box `RoleEligibleCards` draws for each
 * card, so the list lands in place. No visible label: a line under the rows would itself move the
 * content below it.
 */
export function CardRowsLoading() {
  return (
    <LoadingRegion
      loading
      label="Loading the cards it can take"
      className="flex flex-col border-t border-[color:var(--jd-line)]"
      fallback={[0, 1, 2].map((row) => (
        <div key={row} className="flex min-h-14 flex-row items-center gap-3.5 border-b border-[color:var(--jd-line)] px-1 py-2.5">
          <Skeleton className="w-16 shrink-0 sm:w-20" />
          <Skeleton shape="circle" className="size-4 shrink-0" />
          <Skeleton className="min-w-0 flex-1" />
        </div>
      ))}
    />
  );
}
