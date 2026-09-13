#!/usr/bin/env bash
# Wires up the conversation backend for remote access in one command:
# starts uvicorn with a persistent auth token and the deployed PWA's
# origin allowed, opens a Cloudflare quick tunnel to it, and (if `gh` is
# authenticated) updates the deployed app's default backend address to
# match and triggers a redeploy — so a phone that has never touched
# Settings picks up the current tunnel URL on its next reload.
#
# This is the quick-tunnel path (backend/README.md): no Cloudflare
# domain required, but the URL is different every run. Once a domain is
# added to the Cloudflare account, the named-tunnel steps in that same
# README give a stable hostname instead — at that point this script's
# CI-update step becomes unnecessary (a stable hostname never changes),
# though the token/uvicorn wiring below still applies.
#
# Requires: uv, cloudflared, curl. Optional: an authenticated `gh` (its
# absence only skips the CI auto-update, everything else still runs).
#
# Usage (from anywhere): backend/scripts/run_with_tunnel.sh
# Stop with Ctrl+C — cleans up both the backend and the tunnel.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$BACKEND_DIR")"
TOKEN_FILE="$BACKEND_DIR/.tunnel-token"
TUNNEL_LOG="$(mktemp -t cloudflared-tunnel.XXXXXX.log)"

# Every `gh` call below needs repo context — resolve it from this
# script's own location rather than the caller's cwd, so "run this from
# anywhere" (the usage note above) is actually true.
cd "$REPO_ROOT"

for cmd in uv cloudflared curl; do
	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "error: '$cmd' is required but not on PATH" >&2
		exit 1
	fi
done

# --- Auth token: generated once, then stable across runs ------------------

if [[ ! -f "$TOKEN_FILE" ]]; then
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 32 >"$TOKEN_FILE"
	else
		head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' >"$TOKEN_FILE"
	fi
	echo "Generated a new backend auth token -> $TOKEN_FILE"
fi
BACKEND_TOKEN="$(cat "$TOKEN_FILE")"

# --- The deployed PWA's own origin, from the Pages API itself (never
# reconstructed from the repo owner's login — GitHub Pages always serves
# a lowercase hostname regardless of the account's display casing, and
# an exact-string CORS allowlist match would silently fail against a
# mismatched-case guess) --------------------------------------------------

PWA_ORIGIN=""
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
	if pages_url="$(gh api repos/{owner}/{repo}/pages --jq .html_url 2>/dev/null)"; then
		# Origin is scheme + host only — strip any path (GitHub Pages'
		# html_url includes the repo path for project pages).
		PWA_ORIGIN="$(printf '%s' "$pages_url" | sed -E 's#(https?://[^/]+).*#\1#')"
	fi
fi
if [[ -z "$PWA_ORIGIN" ]]; then
	echo "warning: could not determine the deployed PWA's origin via gh; CORS will only allow the dev server" >&2
fi

# --- Free the port from any stale process before starting -----------------

if lsof -ti tcp:8000 >/dev/null 2>&1; then
	echo "Port 8000 is already in use — stopping whatever's on it..."
	lsof -ti tcp:8000 | xargs kill 2>/dev/null || true
	sleep 1
fi

# --- Start the backend ------------------------------------------------------

echo "Starting the conversation backend (uvicorn, 127.0.0.1:8000)..."
(
	cd "$BACKEND_DIR"
	CONVERSATION_BACKEND_TOKEN="$BACKEND_TOKEN" \
		CONVERSATION_ALLOWED_ORIGINS="$PWA_ORIGIN" \
		exec uv run --project . uvicorn app.main:app --host 127.0.0.1
) &
BACKEND_PID=$!

cleanup() {
	echo ""
	echo "Stopping..."
	kill "$BACKEND_PID" 2>/dev/null || true
	[[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
	rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

# uvicorn's lifespan only starts accepting connections once all three
# models finish loading (app/main.py's `lifespan`), so a cold start with
# an unwarmed model cache can genuinely take minutes here — matching the
# e2e suite's own 4-minute budget for the same wait, not a typo.
echo -n "Waiting for it to accept connections (can take minutes on a cold start)"
READY=false
for _ in $(seq 1 240); do
	if curl -fsS -o /dev/null "http://localhost:8000/health" 2>/dev/null; then
		echo " ready."
		READY=true
		break
	fi
	echo -n "."
	sleep 1
done
if [[ "$READY" != true ]]; then
	echo ""
	echo "error: backend did not become ready within 4 minutes — check its output above" >&2
	exit 1
fi

# --- Start the tunnel and capture its assigned URL -------------------------

echo "Starting the Cloudflare quick tunnel..."
cloudflared tunnel --url http://localhost:8000 >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 30); do
	TUNNEL_URL="$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)"
	[[ -n "$TUNNEL_URL" ]] && break
	sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
	echo "error: could not detect the tunnel URL — see $TUNNEL_LOG" >&2
	exit 1
fi

echo ""
echo "Tunnel URL:  $TUNNEL_URL"
echo "Auth token:  $BACKEND_TOKEN"
echo ""

# --- Update the deployed app's default and redeploy (best-effort) ---------

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
	echo "Updating the deployed app's default backend address..."
	if gh variable set CONVERSATION_BACKEND_URL --body "$TUNNEL_URL" 2>/dev/null; then
		echo "Triggering a redeploy so devices with no saved override pick it up..."
		gh workflow run deploy-thai-srs.yml 2>/dev/null ||
			echo "warning: could not trigger the redeploy workflow (check gh's permissions)" >&2
	else
		echo "warning: could not set the CONVERSATION_BACKEND_URL repo variable (check gh's permissions)" >&2
	fi
else
	echo "warning: gh is not authenticated — skipping the CI auto-update." >&2
	echo "The tunnel still works; devices need the URL above entered manually in Settings." >&2
fi

echo ""
echo "First time on a device (or after resetting Settings): open Settings ->"
echo "Conversation Backend and paste the auth token above. The address"
echo "itself only needs entering if 'gh' isn't wired up, or the device"
echo "has a Settings override — the deployed app's own automatic address"
echo "updates on its next reload once the redeploy above finishes."
echo ""
echo "Backend + tunnel running. Press Ctrl+C to stop both."

wait
