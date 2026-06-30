import type { APIContext } from "astro";

export function requireAdminJson(context: APIContext): Response | null {
	if (context.locals.user) return null;
	return json({ error: "Authentication required" }, 401);
}

export function requireAdminPage(Astro: { locals: App.Locals; url: URL }) {
	if (Astro.locals.user) return null;
	const redirect = encodeURIComponent(Astro.url.pathname + Astro.url.search);
	return Response.redirect(
		`${Astro.url.origin}/_emdash/admin/login?redirect=${redirect}`,
		302,
	);
}

export function json(body: unknown, status = 200, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status,
		...init,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...init?.headers,
		},
	});
}

export async function readJson<T>(request: Request): Promise<T> {
	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		throw new Error("Expected application/json request body");
	}
	return (await request.json()) as T;
}

export function originFromContext(context: APIContext): string {
	return context.site?.toString().replace(/\/$/, "") || context.url.origin;
}
