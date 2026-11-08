"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimInboxToasts } from "@javadaba/account";
import { ToastViewport } from "@javadaba/ui";
import { useRouter, useSearchParams } from "@javadaba/ui/navigation";

import { cardPath } from "../../lib/backlog/search-links";
import { useCurrentAccountId } from "../../lib/backlog/use-current-account";
import { useCopy } from "../../lib/i18n/use-copy";
import { SUMMONS_PARAMS, type Summons, type SummonsItem } from "../../lib/summons/summons";
import {
  announceSnoozed,
  dismissLoadFailed,
  dismissToasts,
  planToasts,
  raiseItem,
  raiseLoadFailed,
  toastIdOf,
} from "../../lib/summons/summons-toasts";
import { useStackReserve } from "../../lib/summons/stack-reserve";
import { useSummons } from "../../lib/summons/use-summons";
import { useSummonsAnswer } from "../../lib/summons/use-summons-answer";
import { CardFormModal } from "../backlog/CardFormModal";
import { SummonsRequestDialog } from "./SummonsRequestDialog";

/**
 * Mounted once in the `/app` shell for a signed-in person (JAVA-1145, JAVA-1624). What an agent waits on
 * shows as toasts, one per item, without trapping focus: the page behind stays usable. The same items
 * land in the notification center, so a dismissed toast is not lost. It opens the summons from the
 * server's push or from `/app?view=summons&projectId=…&summons=…`, reads that link once and strips it.
 */
export function SummonsHost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [named] = useState(() => (searchParams.get("view") === "summons" ? searchParams.get("summons") : null));
  const copy = useCopy().summons;
  const accountId = useCurrentAccountId();
  const { shown, failed, refresh, later } = useSummons(named);
  const { open, answer, close } = useSummonsAnswer(accountId, copy, refresh);
  // Toast id to the round that raised it: a toast the person dismissed stays out until a new round.
  const raised = useRef(new Map<string, number>());
  // The toasts the page's stack draws now, dismissed ones left out: the board keeps clear of exactly these.
  const [onScreen, setOnScreen] = useState(0);

  useEffect(() => claimInboxToasts("officium", "summons"), []);
  useStackReserve(onScreen);

  useEffect(() => {
    if (named === null) return;
    const rest = new URLSearchParams(searchParams.toString());
    for (const param of SUMMONS_PARAMS) rest.delete(param);
    const query = rest.toString();
    router.replace(query ? `/app?${query}` : "/app");
    // The link is read once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLater = useCallback(
    (summons: Summons) => {
      dismissToasts(summons.items.map(toastIdOf));
      announceSnoozed(copy);
      later();
    },
    [copy, later],
  );

  // The toasts follow what is pending: raised for new items, dismissed for the answered ones.
  useEffect(() => {
    const plan = planToasts(shown, raised.current);
    raised.current = plan.next;
    dismissToasts(plan.dismiss);
    if (!shown) return;
    const handlers = {
      answer: (item: SummonsItem) => {
        // Answer dismisses the toast; if the form closes unanswered, the next read raises it again.
        raised.current.delete(toastIdOf(item));
        void answer(shown.projectId, item);
      },
      open: (item: SummonsItem) => router.push(cardPath(shown.projectId, item.cardKey)),
      later: () => onLater(shown),
    };
    for (const item of plan.raise) raiseItem(shown, item, copy, handlers);
  }, [shown, copy, answer, onLater, router]);

  useEffect(() => {
    if (failed && shown) raiseLoadFailed(copy, refresh);
    else dismissLoadFailed();
  }, [failed, shown, copy, refresh]);

  return (
    <>
      <ToastViewport labels={copy.toasts} onVisibleChange={setOnScreen} />
      {open?.form && (
        <CardFormModal
          open
          onOpenChange={(next) => {
            if (!next) {
              close();
              refresh();
            }
          }}
          cardKey={open.item.cardKey}
          cardTitle={open.item.cardTitle}
          fillPath={open.form.fillPath}
          onCompleted={() => {
            close();
            refresh();
          }}
        />
      )}
      {open?.item.kind === "request" && (
        <SummonsRequestDialog
          projectId={open.projectId}
          item={open.item}
          copy={copy}
          onOpenChange={(next) => {
            if (!next) {
              close();
              refresh();
            }
          }}
          onAnswered={() => {
            close();
            refresh();
          }}
        />
      )}
    </>
  );
}
