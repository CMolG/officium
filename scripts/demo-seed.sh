#!/usr/bin/env bash
# Fills a running Officium Local with a small demo project, so the board has something to show.
#   scripts/demo-seed.sh [base-url]        default http://127.0.0.1:${OFFICIUM_API_PORT:-8190}
# Needs curl and jq. Honors OFFICIUM_LOCAL_TOKEN like the API does.
set -euo pipefail

BASE="${1:-http://127.0.0.1:${OFFICIUM_API_PORT:-8190}}"
AUTH=()
[[ -n "${OFFICIUM_LOCAL_TOKEN:-}" ]] && AUTH=(-H "Authorization: Bearer $OFFICIUM_LOCAL_TOKEN")

api() { # api METHOD PATH [JSON]
  curl -sS -f -X "$1" "${AUTH[@]}" -H 'Content-Type: application/json' ${3:+-d "$3"} "$BASE$2"
}

pid="$(api POST /officium/v1/projects '{"name":"Storefront","keyPrefix":"SHOP"}' | jq -r .id)"

card() { # card JSON -> "id version"
  api POST "/officium/v1/projects/$pid/cards" "$1" | jq -r '"\(.id) \(.version)"'
}

move() { # move "id version" STATUS [extra-json] -> "id version"
  local id="${1% *}" ver="${1#* }" extra="${3:-}"
  api POST "/officium/v1/projects/$pid/cards/$id/move" \
    "{\"expectedVersion\":$ver,\"status\":\"$2\",\"position\":0${extra:+,$extra}}" | jq -r '"\(.id) \(.version)"'
}

epic="$(api POST "/officium/v1/projects/$pid/cards" \
  '{"title":"Checkout v2","category":"epic","executor":"ai","priority":"high","description":"Faster checkout with partial refunds and clear taxes."}' | jq -r .key)"

ai() { # ai TITLE CATEGORY PRIORITY STATUS [epic]
  card "{\"title\":\"$1\",\"category\":\"$2\",\"priority\":\"$3\",\"status\":\"$4\",\"executor\":\"ai\"${5:+,\"epic\":\"$5\"}}"
}

ai "Gift cards at checkout" feature medium refine >/dev/null
ai "Search filters remember the last choice" enhancement low todo >/dev/null
ai "Show tax per line in the cart" feature high todo "$epic" >/dev/null
refund="$(ai "Refund flow for partial orders" feature high todo "$epic")"
move "$refund" doing >/dev/null
price="$(ai "Price API returns cents, not floats" bug high todo)"
move "$(move "$price" doing)" review >/dev/null
coupon="$(ai "Coupon codes ignore letter case" bug medium todo "$epic")"
coupon="$(move "$(move "$coupon" doing)" review)"
move "$coupon" doing '"reviewReturn":{"reasons":["tests-missing-or-red"],"findings":"No test pins the lowercase code path."}' >/dev/null
card '{"title":"Approve the new pricing page copy","category":"feature","priority":"high","status":"todo","executor":"human","description":"No form: a yes or no in the comments is enough."}' >/dev/null

echo "Demo project Storefront ($pid) is ready: open the board and pick it."
