/// <reference types="vite/client" />

interface ImportMetaEnv {
	/**
	 * Baked in at build time by `.github/workflows/deploy-thai-srs.yml`, from
	 * the `CONVERSATION_BACKEND_URL` repo variable — the current
	 * Cloudflare Tunnel URL, when the backend machine's
	 * `backend/scripts/run_with_tunnel.sh` last updated it. Absent in local
	 * dev, which is exactly right: `ConversationBackendSettings.ts` falls
	 * back to the same-machine default when this is unset. Deliberately a
	 * public *address*, never a secret — see that file's own doc comment
	 * for why the auth token can never be baked in here.
	 */
	readonly VITE_CONVERSATION_BACKEND_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
