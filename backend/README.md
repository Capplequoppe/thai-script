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

## Auth token (`CONVERSATION_BACKEND_TOKEN`)

Unset by default — every request is accepted, same as always. Once set,
every `/conversation/session/*` route requires a matching
`X-Conversation-Backend-Token` header (`/health` stays open regardless —
it does no GPU work and leaks nothing beyond three booleans). This is
what actually gates a request, since CORS (below) only restricts a
*browser tab's* cross-origin fetch, not a direct request from anything
else that can reach the port — irrelevant on a trusted LAN, essential
once this is reachable from the public internet (the Cloudflare Tunnel
section below).

```
CONVERSATION_BACKEND_TOKEN="a long random passphrase" \
  uv run --project backend uvicorn app.main:app --host 127.0.0.1 --reload
```

Pick something long and random (e.g. `openssl rand -hex 32`) and paste
the same value into the app's Settings → Conversation Backend → Auth
token field. Rejects with `401`, never with a silent drop, so a
mismatched token shows up as "backend isn't answering" rather than a
mysterious hang.

## Reaching it from another device (e.g. a phone on the same LAN)

No token is required for this step (a trusted LAN is its own boundary),
but nothing stops you from setting one too. Only do this on a network
you trust — anyone who can reach the port can drive your GPU and read
session audio/transcripts unless `CONVERSATION_BACKEND_TOKEN` is set.

```
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
`http://<this machine's LAN IP>:8000` (Settings → Conversation Backend
in the app).

## Reaching it from anywhere (Cloudflare Tunnel)

Puts this backend on the public internet. **Set `CONVERSATION_BACKEND_TOKEN`
for this — not optional.** CORS/origin checks mean nothing once the URL
is public; the token is the only thing standing between the internet and
your GPU.

`cloudflared` makes an *outbound* connection from this machine to
Cloudflare and proxies from there to `http://127.0.0.1:8000` — the
backend does **not** need `--host 0.0.0.0` for this, and shouldn't have
it: there's no reason to also expose the port on your LAN interface
when the tunnel already reaches it locally.

Install `cloudflared` (see Cloudflare's docs for your OS), then:

**Quick tunnel — no domain needed, URL changes every time.** The
fastest way to try this or to use it occasionally:

```
CONVERSATION_BACKEND_TOKEN="a long random passphrase" \
  uv run --project backend uvicorn app.main:app --host 127.0.0.1 --reload

cloudflared tunnel --url http://localhost:8000
```

`cloudflared` prints a `https://<random-words>.trycloudflare.com` URL.
Put that in the app's Settings → Conversation Backend address, and the
same passphrase in its Auth token field. Restarting `cloudflared` gets
you a *new* random URL — there's no account or domain involved, so
Cloudflare has nothing to attach a stable name to. Re-enter it in
Settings each time.

**Named tunnel — a stable hostname, once you have a domain on your
Cloudflare account.** A quick tunnel's random URL is fine occasionally,
but annoying to keep re-entering. A named tunnel gives a hostname that
never changes (e.g. `conversation.yourdomain.com`) — this requires at
least one domain added to your Cloudflare account as a zone (Cloudflare
can't issue a stable public hostname without one; a cheap domain from
any registrar works as long as its nameservers point at Cloudflare).
Once you have one:

```
cloudflared tunnel login                     # opens your browser, once
cloudflared tunnel create conversation-backend
cloudflared tunnel route dns conversation-backend conversation.yourdomain.com
```

Then create `~/.cloudflared/config.yml` (see
`backend/cloudflared/config.yml.example` in this repo for a template)
and run:

```
cloudflared tunnel run conversation-backend
```

Point the app's Settings at `https://conversation.yourdomain.com` and
the same `CONVERSATION_BACKEND_TOKEN` value. Optionally, put [Cloudflare
Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
in front of the hostname (requires the domain too) for a second gate
that runs before Cloudflare even forwards the request to your
machine — the token above still matters even with Access in front of
it, in case Access is ever misconfigured or bypassed.
