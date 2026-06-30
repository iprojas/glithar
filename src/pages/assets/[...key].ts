import type { APIRoute } from "astro";
import { cacheControlFor, getAsset } from "../../lib/ar/storage";

export const GET: APIRoute = async ({ params }) => {
	const key = params.key;
	if (!key) return new Response("Not found", { status: 404 });

	const asset = await getAsset(key);
	if (!asset) return new Response("Not found", { status: 404 });

	const body =
		asset.body instanceof ReadableStream
			? asset.body
			: toArrayBuffer(asset.body);

	return new Response(body, {
		headers: {
			"Content-Type": asset.contentType,
			"Cache-Control": cacheControlFor(key),
			"X-Content-Type-Options": "nosniff",
		},
	});
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}
