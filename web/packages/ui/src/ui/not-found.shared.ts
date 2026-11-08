/*
 * What a 404 says, as data (Lib-Pieces § Not found · the standard). The page lists the places worth trying
 * and the files machines read; an agent that asks for JSON (`Accept: application/json`, or any address under
 * `/api/`) gets the SAME list, in the same order, as `notFoundPayload`. Pure: no React, so a route handler uses it.
 */

/** One door out of a dead address: a name, what it holds, where it goes. */
export interface NotFoundPlace {
  title: string;
  description: string;
  href: string;
}

/** A file machines read (`sitemap.xml`, `llms.txt`, `agents.md`, `openapi.json`). */
export interface MachineLink {
  label: string;
  href: string;
}

/** Never more than six places on a 404, "tell us" included. */
export const MAX_NOT_FOUND_PLACES = 6;

export interface NotFoundPayload {
  error: "not_found";
  status: 404 | 410;
  message: string;
  path: string;
  try: { title: string; url: string; description: string }[];
  machine: string[];
}

export interface NotFoundPayloadInput {
  /** `https://javadaba.com`, no trailing slash: the places are answered as absolute URLs. */
  origin: string;
  /** The address that did not exist. */
  path: string;
  /** The same sentence the page shows under its heading, before it counts the places. */
  message: string;
  places: NotFoundPlace[];
  machine: MachineLink[];
  /** 410 when we removed it on purpose. */
  status?: 404 | 410;
}

/** The places a page may list: at most six, and the last slot always belongs to "tell us". */
export function limitPlaces(places: NotFoundPlace[], tellUs?: NotFoundPlace): NotFoundPlace[] {
  const room = tellUs ? MAX_NOT_FOUND_PLACES - 1 : MAX_NOT_FOUND_PLACES;
  return tellUs ? [...places.slice(0, room), tellUs] : places.slice(0, room);
}

/** The JSON answer: the same places, in the same order as the page, as absolute URLs. */
export function notFoundPayload({ origin, path, message, places, machine, status = 404 }: NotFoundPayloadInput): NotFoundPayload {
  const absolute = (href: string) => (/^https?:\/\//.test(href) ? href : `${origin}${href}`);
  return {
    error: "not_found",
    status,
    message,
    path,
    try: places.map((place) => ({ title: place.title, url: absolute(place.href), description: place.description })),
    machine: machine.map((file) => absolute(file.href)),
  };
}
