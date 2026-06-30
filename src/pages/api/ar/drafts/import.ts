import type { APIRoute } from "astro";
import { importIdeasAsDrafts } from "../../../../lib/ar/drafts";
import {
	json,
	originFromContext,
	readJson,
	requireAdminJson,
} from "../../../../lib/ar/http";
import type { IdeaRow } from "../../../../lib/ar/types";

export const POST: APIRoute = async (context) => {
	const denied = requireAdminJson(context);
	if (denied) return denied;

	try {
		const body = await readJson<{ ideas?: IdeaRow[] }>(context.request);
		if (!Array.isArray(body.ideas) || body.ideas.length === 0) {
			return json({ error: "No ideas selected for import" }, 400);
		}

		const imported = await importIdeasAsDrafts(
			{ emdash: context.locals.emdash, siteUrl: originFromContext(context) },
			body.ideas,
		);
		return json({ imported });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Import failed" },
			400,
		);
	}
};
