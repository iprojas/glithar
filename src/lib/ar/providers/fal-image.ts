import { getCloudflareEnv } from "../cloudflare-env";
import type { ImageProvider } from "./types";

export const falZImageTurboLoraProvider: ImageProvider = {
	id: "fal",
	model: "z-image-turbo-lora",
	async generate() {
		const env = getCloudflareEnv();
		if (env.AR_ENABLE_LIVE_PROVIDERS !== "true" || !env.FAL_KEY) {
			throw new Error(
				"FAL image generation is disabled. Set AR_ENABLE_LIVE_PROVIDERS=true and FAL_KEY after confirming the current Z-Image Turbo LoRA endpoint.",
			);
		}

		throw new Error(
			"FAL Z-Image Turbo LoRA endpoint details are intentionally not hard-coded. Configure the provider after endpoint and LoRA URL support are confirmed.",
		);
	},
};

export function loraAssetKeys(loraSlug: string): {
	model: string;
	metadata: string;
	preview: string;
} {
	const prefix =
		getCloudflareEnv().FAL_Z_IMAGE_TURBO_LORA_PREFIX ||
		"loras/z-image-turbo";
	return {
		model: `${prefix}/${loraSlug}/model.safetensors`,
		metadata: `${prefix}/${loraSlug}/metadata.json`,
		preview: `${prefix}/${loraSlug}/preview.jpg`,
	};
}
