#!/usr/bin/env bash
# End-to-end smoke test of a running Officium Local API (docker compose up -d first).
#   scripts/smoke.sh [base-url]        default http://127.0.0.1:${OFFICIUM_API_PORT:-8190}
# Set OFFICIUM_LOCAL_TOKEN when the server was started with one.
set -euo pipefail

BASE="${1:-http://127.0.0.1:${OFFICIUM_API_PORT:-8190}}"
AUTH=()
if [[ -n "${OFFICIUM_LOCAL_TOKEN:-}" ]]; then AUTH=(-H "Authorization: Bearer ${OFFICIUM_LOCAL_TOKEN}"); fi

step() { printf '\n== %s\n' "$*"; }
fail() { printf 'SMOKE FAILED: %s\n' "$*" >&2; exit 1; }

# api METHOD PATH [JSON]  -> prints the body, fails on a non-2xx status
api() {
  local method="$1" path="$2" body="${3:-}" out status
  out="$(mktemp)"
  if [[ -n "$body" ]]; then
    status="$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "${AUTH[@]}" -H 'Content-Type: application/json' -d "$body" "$BASE$path")"
  else
    status="$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "${AUTH[@]}" "$BASE$path")"
  fi
  if [[ "$status" != 2* ]]; then cat "$out" >&2; rm -f "$out"; fail "$method $path -> HTTP $status"; fi
  cat "$out"; rm -f "$out"
}

mcp() { # mcp JSON-RPC-body
  curl -sS -f -X POST "${AUTH[@]}" -H 'Content-Type: application/json' -H 'Accept: application/json' -d "$1" "$BASE/officium/mcp"
}

step "wait for the API"
for _ in $(seq 1 60); do
  if curl -sS -o /dev/null -f "${AUTH[@]}" "$BASE/officium/v1/meta" 2>/dev/null; then break; fi
  sleep 2
done
curl -sS -o /dev/null -f "${AUTH[@]}" "$BASE/officium/v1/meta" || fail "the API did not come up at $BASE"

if [[ -n "${OFFICIUM_LOCAL_TOKEN:-}" ]]; then
  step "auth: a request without the token is refused"
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/officium/v1/projects")"
  [[ "$code" == 401 ]] || fail "expected 401 without the token, got $code"
  echo "401 as expected"
fi

step "create a project"
prefix="S$(date +%s | tail -c 6)"
project="$(api POST /officium/v1/projects "{\"name\":\"Smoke $prefix\",\"keyPrefix\":\"$prefix\"}")"
pid="$(jq -r .id <<<"$project")"
echo "project $pid"

step "create a card (todo)"
card="$(api POST "/officium/v1/projects/$pid/cards" \
  '{"title":"Smoke test card","description":"Created by scripts/smoke.sh","status":"todo","priority":"medium","executor":"ai","category":"documentation"}')"
cid="$(jq -r .id <<<"$card")"; ckey="$(jq -r .key <<<"$card")"; ver="$(jq -r .version <<<"$card")"
echo "card $ckey ($cid) version $ver"

move() { # move STATUS [extra-json-fields]
  local status="$1" extra="${2:-}" res
  res="$(api POST "/officium/v1/projects/$pid/cards/$cid/move" \
    "{\"expectedVersion\":$ver,\"status\":\"$status\",\"position\":0${extra:+,$extra}}")"
  ver="$(jq -r .version <<<"$res")"
  echo "-> $(jq -r .status <<<"$res") (version $ver)"
}

step "move todo -> doing -> review"
move doing
move review

step "send it back from review with a reason from the closed list"
move doing '"reviewReturn":{"reasons":["tests-missing-or-red"],"findings":"Smoke: the change has no test pinning it."}'
returned="$(api GET "/officium/v1/projects/$pid/cards/$cid")"
echo "status after send-back: $(jq -r .status <<<"$returned")"
[[ "$(jq -r .status <<<"$returned")" == doing ]] || fail "the card should be back in doing"

step "feature gate: a Cloud-only route answers 501 feature_unavailable_in_local"
gate="$(mktemp)"
code="$(curl -sS -o "$gate" -w '%{http_code}' "${AUTH[@]}" "$BASE/officium/v1/usage")"
[[ "$code" == 501 ]] || fail "expected 501 on /officium/v1/usage, got $code"
jq -c . "$gate"; rm -f "$gate"

step "MCP initialize"
mcp '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}' | jq -c '{server: .result.serverInfo, protocol: .result.protocolVersion}'

step "MCP tools/list"
mcp '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | jq -c '[.result.tools[].name]'

step "MCP tools/call query -> cards.next"
# Move the card back to todo so cards.next has something to offer.
move review
move doing '"reviewReturn":{"reasons":["other"],"findings":"Smoke: back to the queue."}'
move todo
next="$(mcp "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"query\",\"arguments\":{\"operation\":\"cards.next\",\"params\":{\"projectId\":\"$pid\"}}}}")"
echo "$next" | jq -c . | cut -c1-700
grep -q "$ckey" <<<"$next" || fail "cards.next did not return $ckey"
echo "cards.next returned $ckey"

step "MCP: a Cloud-only operation answers feature_unavailable_in_local"
cloud="$(mcp '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"query","arguments":{"operation":"github.repositories","params":{}}}}')"
grep -q feature_unavailable_in_local <<<"$cloud" || fail "expected feature_unavailable_in_local, got: $cloud"
echo "refused as expected"

printf '\nSMOKE PASSED\n'
