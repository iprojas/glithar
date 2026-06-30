import type { APIRoute } from "astro";
import { generateIdeas } from "../../../../lib/ar/ideas";
import { json, readJson, requireAdminJson } from "../../../../lib/ar/http";

export const POST: APIRoute = async (context) => {
	const denied = requireAdminJson(context);
	if (denied) return denied;

	try {
		const body = await readJson<{
			artist?: string;
			project?: string;
			count?: number;
			provider?: "fixture" | "openai" | "gemini";
			model?: string;
			highReasoning?: boolean;
			highQuality?: boolean;
			regenerateRows?: [];
		}>(context.request);
		const result = await generateIdeas({
			artist: body.artist || "glithar-house",
			project: body.project || "street-prophecies",
			count: Number(body.count ?? 4),
			provider: body.provider || "fixture",
			model: body.model,
			highReasoning: body.highReasoning,
			highQuality: body.highQuality,
			regenerateRows: body.regenerateRows,
		});
		return json(result);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Generation failed" },
			400,
		);
	}
};
