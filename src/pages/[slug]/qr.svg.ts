import type { APIRoute } from "astro";
import { recordAnalyticsEvent } from "../../lib/ar/analytics";
import { getPublishedIntervention } from "../../lib/ar/interventions";
import { qrSvg } from "../../lib/ar/qr";

export const GET: APIRoute = async ({ params, request, url }) => {
	const slug = params.slug;
	if (!slug) return new Response("Not found", { status: 404 });
	const { intervention } = await getPublishedIntervention(slug, url.origin);
	if (!intervention) return new Response("Not found", { status: 404 });

	await recordAnalyticsEvent({
		type: "qr_view",
		slug,
		userAgent: request.headers.get("user-agent"),
		referrer: request.headers.get("referer"),
		path: url.pathname,
	});

	return new Response(await qrSvg(intervention.publicUrl), {
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
};
