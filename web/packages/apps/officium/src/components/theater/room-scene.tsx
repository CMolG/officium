"use client";

import { BeforeAfter } from "./before-after";
import { LINEAR } from "./room-script";
import { RoomLinearHalf } from "./room-linear-half";
import { RoomOfficiumHalf } from "./room-officium-half";
import { useRoomScript } from "./use-room-script";

/**
 * The room scene (`/officium/app/usage` in the landing's Theater registry): the seats Linear sells
 * against the room Officium gives, one before-and-after slider. The proof sits under the slider,
 * outside both layers, so it is on screen in every state.
 */
export function RoomScene() {
  const room = useRoomScript();
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <BeforeAfter
          label="Linear's per-person prices against Officium's room"
          beforeLabel="Linear, per person"
          afterLabel="Officium, room"
          position={room.position}
          onPositionChange={room.setPosition}
          before={<RoomLinearHalf seats={room.seats} />}
          after={<RoomOfficiumHalf seats={room.seats} cards={room.cards} usage={room.usage} />}
        />
      </div>
      <p className="border-t border-[color:var(--jd-ink)]/[0.12] px-6 py-3 text-xs text-[color:var(--jd-muted)]">
        Linear&apos;s paid plans cost ${LINEAR.basic} or ${LINEAR.business} per person per month, billed yearly (
        {LINEAR.page}, {LINEAR.checkedOn}).
      </p>
    </div>
  );
}
