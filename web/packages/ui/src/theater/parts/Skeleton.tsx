import { LoadingRegion } from "../../ui/loading-region";
import { Skeleton } from "../../ui/skeleton";

/* The bone takes the stage's own ink at 12%, whatever the surface around the Theater is. */
const BONE = "bg-[color:var(--theater-bone)]";

/** The scene stand-in: a rail and a title with two body lines, at the scene's geometry. Bones after 300 ms (the system delay), inside the window. */
export function SceneSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion
      loading
      label={label}
      showLabel
      fallbackClassName="h-[calc(100%-2rem)]"
      className="absolute inset-0 p-6"
      fallback={
        <div className="flex h-full flex-row gap-5">
          <Skeleton shape="block" pulse className={BONE + " h-full w-[18%] min-w-[120px]"} />
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <Skeleton shape="block" pulse className={BONE + " h-9 w-full"} />
            <Skeleton shape="block" pulse className={BONE + " flex-1"} />
            <Skeleton shape="block" pulse className={BONE + " flex-1"} />
          </div>
        </div>
      }
    />
  );
}
