import { getCloudflareEnv } from "../cloudflare-env";
import type { ModelProvider } from "./types";

export const falImageToModelProvider: ModelProvider = {
	id: "fal",
	model: "image-to-3d-configured-endpoint",
	async generate() {
		const env = getCloudflareEnv();
		if (env.AR_ENABLE_LIVE_PROVIDERS !== "true" || !env.FAL_KEY) {
			throw new Error(
				"FAL image-to-3D generation is disabled. Set AR_ENABLE_LIVE_PROVIDERS=true and FAL_KEY after confirming the current endpoint and input shape.",
			);
		}

		throw new Error(
			"FAL image-to-3D endpoint details are intentionally not hard-coded. Configure this provider after endpoint selection.",
		);
	},
};
