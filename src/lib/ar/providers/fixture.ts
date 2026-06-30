import { createFixtureGlb, fixturePng } from "../fixtures";
import type { ImageProvider, ModelProvider } from "./types";

export const fixtureImageProvider: ImageProvider = {
	id: "fixture",
	model: "fixture-image-v1",
	async generate(input) {
		return {
			bytes: fixturePng,
			contentType: "image/png",
			metadata: {
				prompt: input.post.data.image_prompt,
				lora_slug: input.post.data.lora_slug ?? "glithar-house",
			},
			logs: ["Fixture image generated without calling a paid provider."],
		};
	},
};

export const fixtureModelProvider: ModelProvider = {
	id: "fixture",
	model: "fixture-image-to-3d-v1",
	async generate(input) {
		return {
			bytes: createFixtureGlb(),
			contentType: "model/gltf-binary",
			metadata: {
				image_url: input.post.data.image_url,
			},
			logs: ["Fixture GLB generated without calling a paid provider."],
		};
	},
};
