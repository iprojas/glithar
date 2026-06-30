export const INTERVENTION_CONTENT_ROOT = "content/interventions";
export const INTERVENTION_MARKDOWN_FILE = "intervention.md";
export const PRODUCTION_METADATA_FILE = "production.json";
export const PRODUCTION_METADATA_VERSION = "1";

export const interventionLifecycleStatuses = [
	"draft",
	"prompt_ready",
	"image_generating",
	"image_generated",
	"model_generating",
	"model_generated",
	"optimizing",
	"ready",
	"published",
	"error",
	"archived",
] as const;

export const visualizerVariants = [
	"urban-spirit",
	"glitch-monument",
	"micro-monument",
	"qr-sigil",
] as const;

export type InterventionLifecycleStatus =
	(typeof interventionLifecycleStatuses)[number];
export type VisualizerVariant = (typeof visualizerVariants)[number];
export type EmDashContentStatus = "draft" | "published" | string;

export type ProductionStageStatus =
	| "pending"
	| "running"
	| "succeeded"
	| "failed"
	| "skipped";

export interface EmDashPostSnapshot {
	id: string;
	slug: string | null;
	status: EmDashContentStatus;
	data: Record<string, unknown>;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string | null;
	_rev?: string;
}

export interface InterventionFrontmatter {
	slug: string;
	title: string;
	cms_collection: "posts";
	cms_id?: string | null;
	cms_status: EmDashContentStatus;
	status: InterventionLifecycleStatus;
	project?: string | null;
	location_type?: string | null;
	concept?: string | null;
	ar_object?: string | null;
	interaction?: string | null;
	visual_style?: string | null;
	social_caption?: string | null;
	image_prompt?: string | null;
	image_url?: string | null;
	raw_model_url?: string | null;
	optimized_model_url?: string | null;
	thumbnail_url?: string | null;
	public_url?: string | null;
	visualizer?: VisualizerVariant | string | null;
	lora_slug?: string | null;
	production_metadata_key: string;
	created_at?: string | null;
	updated_at?: string | null;
	published_at?: string | null;
}

export interface InterventionSource {
	frontmatter: InterventionFrontmatter;
	body: string;
	production: ProductionMetadata;
}

export interface ProductionStageRecord {
	stage: string;
	status: ProductionStageStatus;
	input?: unknown;
	output?: unknown;
	logs?: string[];
	error?: string | null;
	provider?: string | null;
	model?: string | null;
	started_at?: string | null;
	finished_at?: string | null;
	timestamp?: string | null;
}

export interface ProductionMetadata {
	version: typeof PRODUCTION_METADATA_VERSION;
	slug: string;
	current_status: InterventionLifecycleStatus;
	r2_mirror_key: string;
	updated_at: string;
	stages: ProductionStageRecord[];
	history: ProductionStageRecord[];
}

export interface ImportPlanAction {
	action: "create" | "update";
	slug: string;
	source: InterventionSource;
	existing?: EmDashPostSnapshot;
}

const FRONTMATTER_DELIMITER = "---";
const FRONTMATTER_ORDER: Array<keyof InterventionFrontmatter> = [
	"slug",
	"title",
	"cms_collection",
	"cms_id",
	"cms_status",
	"status",
	"project",
	"location_type",
	"concept",
	"ar_object",
	"interaction",
	"visual_style",
	"social_caption",
	"image_prompt",
	"image_url",
	"raw_model_url",
	"optimized_model_url",
	"thumbnail_url",
	"public_url",
	"visualizer",
	"lora_slug",
	"production_metadata_key",
	"created_at",
	"updated_at",
	"published_at",
];

const POST_DATA_FIELDS = [
	"project",
	"location_type",
	"concept",
	"ar_object",
	"interaction",
	"visual_style",
	"social_caption",
	"image_prompt",
	"image_url",
	"raw_model_url",
	"optimized_model_url",
	"thumbnail_url",
	"public_url",
	"visualizer",
	"lora_slug",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER_LINE_PATTERN = /^([a-zA-Z0-9_]+):\s*(.*)$/;

export function productionMetadataKey(slug: string): string {
	return `interventions/${slug}/production.json`;
}

export function createEmptyProductionMetadata(
	slug: string,
	status: InterventionLifecycleStatus = "draft",
	now = new Date().toISOString(),
): ProductionMetadata {
	return {
		version: PRODUCTION_METADATA_VERSION,
		slug,
		current_status: status,
		r2_mirror_key: productionMetadataKey(slug),
		updated_at: now,
		stages: [],
		history: [],
	};
}

export function postToInterventionSource(
	post: EmDashPostSnapshot,
	now = new Date().toISOString(),
): InterventionSource {
	const slug = assertSlug(post.slug ?? stringValue(post.data["slug"]));
	const status = lifecycleStatusValue(post.data["production_status"] ?? post.status);
	const production = productionMetadataValue(
		post.data["production_summary"],
		post.data["production_history"],
		slug,
		status,
		stringValue(post.data["updated_at"]) ?? post.updatedAt ?? now,
	);

	return {
		frontmatter: {
			slug,
			title: requiredString(post.data["title"], "title"),
			cms_collection: "posts",
			cms_id: post.id,
			cms_status: post.status,
			status,
			project: nullableString(post.data["project"]),
			location_type: nullableString(post.data["location_type"]),
			concept: nullableString(post.data["concept"]),
			ar_object: nullableString(post.data["ar_object"]),
			interaction: nullableString(post.data["interaction"]),
			visual_style: nullableString(post.data["visual_style"]),
			social_caption: nullableString(post.data["social_caption"]),
			image_prompt: nullableString(post.data["image_prompt"]),
			image_url: nullableString(post.data["image_url"]),
			raw_model_url: nullableString(post.data["raw_model_url"]),
			optimized_model_url: nullableString(post.data["optimized_model_url"]),
			thumbnail_url: nullableString(post.data["thumbnail_url"]),
			public_url: nullableString(post.data["public_url"]),
			visualizer: nullableString(post.data["visualizer"]),
			lora_slug: nullableString(post.data["lora_slug"]),
			production_metadata_key: production.r2_mirror_key,
			created_at: post.createdAt ?? null,
			updated_at: post.updatedAt ?? null,
			published_at: post.publishedAt ?? null,
		},
		body: stringValue(post.data["content"]) ?? "",
		production,
	};
}

export function interventionSourceToPostData(
	source: InterventionSource,
): Record<string, unknown> {
	validateInterventionSource(source);

	const data: Record<string, unknown> = {
		title: source.frontmatter.title,
		content: source.body,
		production_status: source.frontmatter.status,
		production_summary: {
			version: source.production.version,
			current_status: source.production.current_status,
			r2_mirror_key: source.production.r2_mirror_key,
			stage_count: source.production.stages.length,
			updated_at: source.production.updated_at,
		},
		production_history: source.production.history,
	};

	for (const field of POST_DATA_FIELDS) {
		const value = source.frontmatter[field];
		if (value !== undefined && value !== null && value !== "") {
			data[field] = value;
		}
	}

	if (!data["excerpt"] && source.frontmatter.concept) {
		data["excerpt"] = source.frontmatter.concept;
	}

	return data;
}

export function serializeInterventionMarkdown(
	source: InterventionSource,
): string {
	validateInterventionSource(source);

	const frontmatter = FRONTMATTER_ORDER.flatMap((key) => {
		if (!(key in source.frontmatter)) return [];
		return `${key}: ${serializeFrontmatterValue(source.frontmatter[key])}`;
	}).join("\n");

	return [
		FRONTMATTER_DELIMITER,
		frontmatter,
		FRONTMATTER_DELIMITER,
		source.body.trimEnd(),
		"",
	].join("\n");
}

export function parseInterventionMarkdown(markdown: string): {
	frontmatter: InterventionFrontmatter;
	body: string;
} {
	const normalized = markdown.replace(/\r\n/g, "\n");
	if (!normalized.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
		throw new Error("Intervention Markdown must start with frontmatter");
	}

	const end = normalized.indexOf(`\n${FRONTMATTER_DELIMITER}\n`, 4);
	if (end === -1) {
		throw new Error("Intervention Markdown frontmatter is not closed");
	}

	const frontmatterText = normalized.slice(4, end);
	const body = normalized.slice(end + 5);
	const frontmatter = parseFrontmatter(frontmatterText);

	return {
		frontmatter,
		body: body.trimEnd() ? `${body.trimEnd()}\n` : "",
	};
}

export function serializeProductionMetadata(
	production: ProductionMetadata,
): string {
	validateProductionMetadata(production);
	return `${JSON.stringify(production, null, "\t")}\n`;
}

export function parseProductionMetadata(json: string): ProductionMetadata {
	const parsed = JSON.parse(json) as ProductionMetadata;
	validateProductionMetadata(parsed);
	return parsed;
}

export function combineInterventionSource(
	markdown: string,
	productionJson: string,
): InterventionSource {
	const { frontmatter, body } = parseInterventionMarkdown(markdown);
	const production = parseProductionMetadata(productionJson);
	const source = { frontmatter, body, production };
	validateInterventionSource(source);
	return source;
}

export function validateInterventionSource(source: InterventionSource): void {
	validateFrontmatter(source.frontmatter);
	validateProductionMetadata(source.production);

	if (source.frontmatter.slug !== source.production.slug) {
		throw new Error(
			`Markdown slug ${source.frontmatter.slug} does not match production slug ${source.production.slug}`,
		);
	}

	if (source.frontmatter.status !== source.production.current_status) {
		throw new Error(
			`Markdown status ${source.frontmatter.status} does not match production status ${source.production.current_status}`,
		);
	}

	if (source.frontmatter.production_metadata_key !== source.production.r2_mirror_key) {
		throw new Error(
			`Markdown production metadata key ${source.frontmatter.production_metadata_key} does not match production key ${source.production.r2_mirror_key}`,
		);
	}
}

export function validateProductionMetadata(
	production: ProductionMetadata,
): void {
	if (production.version !== PRODUCTION_METADATA_VERSION) {
		throw new Error(`Unsupported production metadata version: ${production.version}`);
	}
	assertSlug(production.slug);
	assertLifecycleStatus(production.current_status);

	const expectedKey = productionMetadataKey(production.slug);
	if (production.r2_mirror_key !== expectedKey) {
		throw new Error(
			`production.r2_mirror_key must be ${expectedKey}, got ${production.r2_mirror_key}`,
		);
	}

	if (!Array.isArray(production.stages)) {
		throw new Error("production.stages must be an array");
	}
	if (!Array.isArray(production.history)) {
		throw new Error("production.history must be an array");
	}
}

export function planInterventionDraftImport(
	sources: InterventionSource[],
	existingPosts: EmDashPostSnapshot[],
): ImportPlanAction[] {
	const existingBySlug = new Map(
		existingPosts
			.filter((post) => post.slug)
			.map((post) => [post.slug as string, post] as const),
	);

	return sources.map((source) => {
		validateInterventionSource(source);
		const existing = existingBySlug.get(source.frontmatter.slug);
		return existing
			? { action: "update", slug: source.frontmatter.slug, source, existing }
			: { action: "create", slug: source.frontmatter.slug, source };
	});
}

function parseFrontmatter(text: string): InterventionFrontmatter {
	const result: Record<string, unknown> = {};

	for (const line of text.split("\n")) {
		if (!line.trim()) continue;
		const match = line.match(FRONTMATTER_LINE_PATTERN);
		if (!match) {
			throw new Error(`Invalid frontmatter line: ${line}`);
		}
		result[match[1]] = parseFrontmatterValue(match[2]);
	}

	validateFrontmatter(result);
	return result;
}

function validateFrontmatter(value: unknown): asserts value is InterventionFrontmatter {
	if (!isRecord(value)) throw new Error("Frontmatter must be an object");
	assertSlug(requiredString(value["slug"], "slug"));
	requiredString(value["title"], "title");
	if (value["cms_collection"] !== "posts") {
		throw new Error("Intervention frontmatter cms_collection must be posts");
	}
	assertLifecycleStatus(value["status"]);
	requiredString(value["production_metadata_key"], "production_metadata_key");
}

function serializeFrontmatterValue(value: unknown): string {
	if (value === undefined || value === null) return "null";
	return JSON.stringify(value);
}

function parseFrontmatterValue(value: string): unknown {
	const trimmed = value.trim();
	if (trimmed === "null" || trimmed === "~") return null;
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed;
	}
}

function productionMetadataValue(
	summaryValue: unknown,
	historyValue: unknown,
	slug: string,
	status: InterventionLifecycleStatus,
	now: string,
): ProductionMetadata {
	if (isRecord(summaryValue)) {
		const maybeKey = stringValue(summaryValue["r2_mirror_key"]);
		const stageCount = numberValue(summaryValue["stage_count"]) ?? 0;
		const metadata: ProductionMetadata = {
			version: PRODUCTION_METADATA_VERSION,
			slug,
			current_status: lifecycleStatusValue(
				summaryValue["current_status"] ?? status,
			),
			r2_mirror_key: maybeKey ?? productionMetadataKey(slug),
			updated_at: stringValue(summaryValue["updated_at"]) ?? now,
			stages: Array.from({ length: stageCount }, (_, index) => ({
				stage: `stage_${index + 1}`,
				status: "pending",
			})),
			history: Array.isArray(historyValue)
				? (historyValue as ProductionStageRecord[])
				: [],
		};
		validateProductionMetadata(metadata);
		return metadata;
	}

	return createEmptyProductionMetadata(slug, status, now);
}

function assertSlug(value: unknown): string {
	const slug = requiredString(value, "slug");
	if (!SLUG_PATTERN.test(slug)) {
		throw new Error(`Invalid intervention slug: ${slug}`);
	}
	return slug;
}

function assertLifecycleStatus(value: unknown): asserts value is InterventionLifecycleStatus {
	if (
		typeof value !== "string" ||
		!interventionLifecycleStatuses.includes(
			value as InterventionLifecycleStatus,
		)
	) {
		throw new Error(`Invalid intervention lifecycle status: ${String(value)}`);
	}
}

function lifecycleStatusValue(value: unknown): InterventionLifecycleStatus {
	if (
		typeof value === "string" &&
		interventionLifecycleStatuses.includes(value as InterventionLifecycleStatus)
	) {
		return value as InterventionLifecycleStatus;
	}
	return "draft";
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`Missing required string field: ${field}`);
	}
	return value;
}

function nullableString(value: unknown): string | null {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value !== "string") return String(value);
	return value;
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	return undefined;
}

function numberValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
