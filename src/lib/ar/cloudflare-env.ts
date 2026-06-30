import { env } from "cloudflare:workers";

export interface GlitharCloudflareEnv {
	MEDIA?: R2Bucket;
	DB?: D1Database;
	SESSION?: KVNamespace;
	FAL_KEY?: string;
	FAL_Z_IMAGE_TURBO_LORA_PREFIX?: string;
	PUBLIC_SITE_URL?: string;
	AR_ENABLE_LIVE_PROVIDERS?: string;
}

export function getCloudflareEnv(): GlitharCloudflareEnv {
	return env as unknown as GlitharCloudflareEnv;
}
