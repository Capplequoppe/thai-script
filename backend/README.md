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

Bind address is always `127.0.0.1`, never `0.0.0.0` — this backend
drives a local GPU on the user's own machine and is not meant to be
reachable from the network.
