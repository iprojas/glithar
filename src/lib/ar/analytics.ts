import { getCloudflareEnv } from "./cloudflare-env";

export type AnalyticsEventType =
	| "intervention_view"
	| "ar_launch_attempt"
	| "qr_view";

export interface AnalyticsEventInput {
	type: AnalyticsEventType;
	slug: string;
	userAgent?: string | null;
	referrer?: string | null;
	path?: string | null;
}

export async function recordAnalyticsEvent(
	input: AnalyticsEventInput,
): Promise<{ stored: boolean }> {
	const db = getCloudflareEnv().DB;
	if (!db) return { stored: false };

	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS ar_events (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				slug TEXT NOT NULL,
				user_agent TEXT,
				referrer TEXT,
				path TEXT,
				created_at TEXT NOT NULL
			)`,
		)
		.run();

	await db
		.prepare(
			`INSERT INTO ar_events
				(id, type, slug, user_agent, referrer, path, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			crypto.randomUUID(),
			input.type,
			input.slug,
			input.userAgent ?? null,
			input.referrer ?? null,
			input.path ?? null,
			new Date().toISOString(),
		)
		.run();

	return { stored: true };
}
