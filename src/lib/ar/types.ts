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

export const productionStageIds = [
	"prompt",
	"image",
	"image_persist",
	"model",
	"model_persist",
	"optimize",
	"optimized_persist",
	"metadata",
	"preview",
	"publish",
] as const;

export type InterventionLifecycleStatus =
	(typeof interventionLifecycleStatuses)[number];
export type VisualizerVariant = (typeof visualizerVariants)[number];
export type ProductionStageId = (typeof productionStageIds)[number];
export type ProductionStageStatus =
	| "pending"
	| "running"
	| "succeeded"
	| "failed"
	| "skipped";

export interface IdeaRow {
	id: string;
	title: string;
	location_type: string;
	concept: string;
	ar_object: string;
	interaction: string;
	visual_style: string;
	social_caption: string;
	project: string;
	category: string;
	visualizer: VisualizerVariant;
	lora_slug: string;
	source_artist: string;
	source_project: string;
	manuallyEdited?: boolean;
}

export interface PromptTemplate {
	id: string;
	label: string;
	body: string;
}

export interface ProjectPromptTemplate extends PromptTemplate {
	project: string;
	category: string;
	visualizer: VisualizerVariant;
	lora_slug: string;
	constraints: string[];
}

export interface ProductionStageRecord {
	stage: ProductionStageId;
	label: string;
	status: ProductionStageStatus;
	input?: unknown;
	output?: unknown;
	logs: string[];
	error?: string | null;
	provider?: string | null;
	model?: string | null;
	started_at?: string | null;
	finished_at?: string | null;
	timestamp: string;
}

export interface ProductionMetadata {
	version: "1";
	slug: string;
	current_status: InterventionLifecycleStatus;
	r2_mirror_key: string;
	updated_at: string;
	stages: ProductionStageRecord[];
	history: ProductionStageRecord[];
}

export interface ProviderResult {
	url?: string;
	key?: string;
	bytes?: Uint8Array;
	contentType?: string;
	metadata?: Record<string, unknown>;
	logs?: string[];
}

export interface EmDashPostItem {
	id: string;
	slug: string | null;
	status: string;
	data: Record<string, unknown>;
	authorId?: string | null;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string | null;
	_rev?: string;
}

export interface AdminActionContext {
	emdash: App.Locals["emdash"];
	siteUrl: string;
}

export interface StageRunInput {
	post: EmDashPostItem;
	metadata: ProductionMetadata;
	siteUrl: string;
}

export interface StageRunResult {
	data: Record<string, unknown>;
	metadata: ProductionMetadata;
	record: ProductionStageRecord;
}
