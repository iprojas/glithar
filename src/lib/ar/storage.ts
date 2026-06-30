import { getCloudflareEnv } from "./cloudflare-env";
import { fixtureAssetForKey } from "./fixtures";

export interface StoredAsset {
	key: string;
	url: string;
	contentType: string;
	size: number;
	persisted: boolean;
}

export function publicAssetUrl(key: string, siteUrl = ""): string {
	const path = `/assets/${key.replace(/^\/+/, "")}`;
	return siteUrl ? `${siteUrl.replace(/\/$/, "")}${path}` : path;
}

export async function putAsset(
	key: string,
	body: Uint8Array | string,
	contentType: string,
	siteUrl: string,
): Promise<StoredAsset> {
	const normalizedKey = key.replace(/^\/+/, "");
	const bytes =
		typeof body === "string" ? new TextEncoder().encode(body) : body;
	const bucket = getCloudflareEnv().MEDIA;

	if (bucket) {
		await bucket.put(normalizedKey, bytes, {
			httpMetadata: {
				contentType,
				cacheControl: cacheControlFor(normalizedKey),
			},
		});
	}

	return {
		key: normalizedKey,
		url: publicAssetUrl(normalizedKey, siteUrl),
		contentType,
		size: bytes.byteLength,
		persisted: Boolean(bucket),
	};
}

export async function getAsset(
	key: string,
): Promise<{ body: ReadableStream | Uint8Array; contentType: string } | null> {
	const normalizedKey = key.replace(/^\/+/, "");
	const bucket = getCloudflareEnv().MEDIA;
	if (bucket) {
		const object = await bucket.get(normalizedKey);
		if (object) {
			return {
				body: object.body,
				contentType:
					object.httpMetadata?.contentType ||
					contentTypeFor(normalizedKey),
			};
		}
	}

	return fixtureAssetForKey(normalizedKey);
}

export function cacheControlFor(key: string): string {
	if (key.endsWith("production.json")) return "public, max-age=60";
	return "public, max-age=31536000, immutable";
}

export function contentTypeFor(key: string): string {
	if (key.endsWith(".json")) return "application/json; charset=utf-8";
	if (key.endsWith(".png")) return "image/png";
	if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
	if (key.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
	if (key.endsWith(".glb")) return "model/gltf-binary";
	if (key.endsWith(".gltf")) return "model/gltf+json";
	return "application/octet-stream";
}
