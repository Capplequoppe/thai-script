# conversation-backend

Local-only FastAPI backend for the AI conversation practice mode. See
`docs/conversation-backend-api.md` (repo root) for the HTTP contract.

Run locally (from `backend/`):

```
uv run --project . uvicorn app.main:app --host 127.0.0.1 --reload
```

or, from the repo root:

```
uv run --project backend uvicorn app.main:app --host 127.0.0.1 --reload
```

Bind address is `127.0.0.1` by default — this backend drives a local
GPU on the user's own machine, with no authentication, so it is not
reachable from the network unless you opt in.

## Reaching it from another device (e.g. a phone on the same LAN)

There is currently no authentication of any kind. Only do this on a
network you trust — anyone who can reach the port can drive your GPU
and read session audio/transcripts.

```
uv run --project backend uvicorn app.main:app --host 0.0.0.0 --reload
CONVERSATION_ALLOWED_ORIGINS="https://your-deployed-pwa.example" \
  uv run --project backend uvicorn app.main:app --host 0.0.0.0 --reload
```

`--host 0.0.0.0` makes uvicorn listen on every network interface, not
just the loopback one, so a device on the same LAN can address your
machine's IP. `CONVERSATION_ALLOWED_ORIGINS` (comma-separated) adds to
the built-in dev-server allowlist in `app/main.py` — set it to whatever
origin the phone's browser actually loads (the deployed PWA's origin,
or the Vite dev server's LAN address if you're serving the frontend
that way too). On the phone, point the app at
`http://<this machine's LAN IP>:8000` (Settings → Conversation backend
URL in the app).

CORS only restricts a *browser tab's* cross-origin fetch — it does not
stop a direct request from anything else that can reach the port. If
that gap is a problem, don't leave this running on an untrusted network
long-term; a private tunnel (e.g. Tailscale, Cloudflare Tunnel) that
puts your phone and PC on the same private network is the safer way to
reach it from outside your LAN.
