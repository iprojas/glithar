import type { APIRoute } from "astro";
import { publishReadyIntervention } from "../../../../lib/ar/pipeline";
import {
	json,
	originFromContext,
	readJson,
	requireAdminJson,
} from "../../../../lib/ar/http";

export const POST: APIRoute = async (context) => {
	const denied = requireAdminJson(context);
	if (denied) return denied;

	try {
		const body = await readJson<{ postId?: string }>(context.request);
		if (!body.postId) return json({ error: "Missing postId" }, 400);

		const result = await publishReadyIntervention(
			{ emdash: context.locals.emdash, siteUrl: originFromContext(context) },
			body.postId,
		);
		return json({
			post: {
				id: result.post.id,
				slug: result.post.slug,
				public_url: result.post.data.public_url,
				production_status: result.post.data.production_status,
			},
			metadata: result.metadata,
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Publish failed" },
			400,
		);
	}
};
