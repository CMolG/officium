import { NotFound } from "@javadaba/ui";

import { BASE_PATH } from "@/lib/site";
import { OFFICIUM_MACHINE, OFFICIUM_PLACES, OFFICIUM_TELL_US, officiumNotFoundSentence } from "@/lib/not-found-places";

/** The 404 inside the app (Off-Shell, "Not found · new"): it keeps the shell, so the sidebar still says where you are. */
export default function AppNotFound() {
  return (
    <div className="px-4 py-8 sm:px-6">
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
    </div>
  );
}
