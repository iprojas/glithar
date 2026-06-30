import type { APIRoute } from "astro";
import {
	continueProduction,
	runProductionStage,
} from "../../../../lib/ar/pipeline";
import {
	json,
	originFromContext,
	readJson,
	requireAdminJson,
} from "../../../../lib/ar/http";
import { productionStageIds, type ProductionStageId } from "../../../../lib/ar/types";

export const POST: APIRoute = async (context) => {
	const denied = requireAdminJson(context);
	if (denied) return denied;

	try {
		const body = await readJson<{
			postId?: string;
			stage?: ProductionStageId;
			continue?: boolean;
		}>(context.request);
		if (!body.postId) return json({ error: "Missing postId" }, 400);

		const actionContext = {
			emdash: context.locals.emdash,
			siteUrl: originFromContext(context),
		};
		const result = body.continue
			? await continueProduction(actionContext, body.postId)
			: await runProductionStage(
					actionContext,
					body.postId,
					validStage(body.stage),
				);

		return json({
			post: {
				id: result.post.id,
				slug: result.post.slug,
				status: result.post.status,
				production_status: result.post.data.production_status,
			},
			metadata: result.metadata,
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Stage failed" },
			400,
		);
	}
};

function validStage(stage: unknown): ProductionStageId {
	if (
		typeof stage === "string" &&
		productionStageIds.includes(stage as ProductionStageId)
	) {
		return stage as ProductionStageId;
	}
	throw new Error("Invalid production stage");
}
