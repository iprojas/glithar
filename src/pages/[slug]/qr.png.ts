import type { APIRoute } from "astro";
import { recordAnalyticsEvent } from "../../lib/ar/analytics";
import { getPublishedIntervention } from "../../lib/ar/interventions";
import { qrPng } from "../../lib/ar/qr";

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

	const png = await qrPng(intervention.publicUrl);
	return new Response(toArrayBuffer(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}
