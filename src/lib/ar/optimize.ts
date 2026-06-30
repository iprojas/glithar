import { createFixtureGlb } from "./fixtures";
import type { ProviderResult, StageRunInput } from "./types";

export async function optimizeGlbFixture(
	input: StageRunInput,
): Promise<ProviderResult> {
	return {
		bytes: createFixtureGlb(),
		contentType: "model/gltf-binary",
		metadata: {
			raw_model_url: input.post.data.raw_model_url,
			optimizer: "fixture-copy",
		},
		logs: [
			"Worker-safe fixture optimizer copied a compact GLB.",
			"Live optimization still needs a confirmed processor path for heavy GLB compression.",
		],
	};
}
