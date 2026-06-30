import type { APIRoute } from "astro";
import { recordAnalyticsEvent } from "../../../../lib/ar/analytics";
import { json, readJson } from "../../../../lib/ar/http";

export const POST: APIRoute = async ({ request, url }) => {
	try {
		const body = await readJson<{
			type?: string;
			slug?: string;
			path?: string;
		}>(request);
		if (
			body.type !== "intervention_view" &&
			body.type !== "ar_launch_attempt" &&
			body.type !== "qr_view"
		) {
			return json({ error: "Invalid analytics event type" }, 400);
		}
		if (!body.slug) return json({ error: "Missing slug" }, 400);

		const result = await recordAnalyticsEvent({
			type: body.type,
			slug: body.slug,
			userAgent: request.headers.get("user-agent"),
			referrer: request.headers.get("referer"),
			path: body.path || url.pathname,
		});
		return json({ ok: true, stored: result.stored });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Invalid request" },
			400,
		);
	}
};
