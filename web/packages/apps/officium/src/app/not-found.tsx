import { NotFound } from "@javadaba/ui";

import { BASE_PATH } from "@/lib/site";
import { OFFICIUM_MACHINE, OFFICIUM_PLACES, OFFICIUM_TELL_US, officiumNotFoundSentence } from "@/lib/not-found-places";

/**
 * Officium's own 404 (Off-Shell, "Not found"). It answers a real 404 and is never indexed (Next sets the status
 * and `noindex`). Inside the app (`/app/**`) the shell stays around it: `app/app/not-found.tsx` is this page
 * under the product bar and the sidebar.
 */
export default function OfficiumNotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <NotFound
        doodle="oh"
        heading="This project or card isn't here."
        places={OFFICIUM_PLACES}
        tellUs={OFFICIUM_TELL_US}
        machine={OFFICIUM_MACHINE}
        search={{ action: `${BASE_PATH}/app`, label: "Search your projects", placeholder: "A project's name or key", submit: "Search" }}
      >
        {officiumNotFoundSentence()}
      </NotFound>
    </main>
  );
}
