import {
	type InterventionLifecycleStatus,
	type ProductionMetadata,
	type ProductionStageId,
	type ProductionStageRecord,
	productionStageIds,
} from "./types";

export const PRODUCTION_METADATA_VERSION = "1";

export const productionStageLabels: Record<ProductionStageId, string> = {
	prompt: "Prompt refinement",
	image: "FAL image generation",
	image_persist: "Persist generated image",
	model: "FAL image-to-3D",
	model_persist: "Persist raw model",
	optimize: "Optimize GLB",
	optimized_persist: "Persist optimized assets",
	metadata: "Persist production metadata",
	preview: "Preview public viewer",
	publish: "Publish intervention",
};

export function productionMetadataKey(slug: string): string {
	return `interventions/${slug}/production.json`;
}

export function emptyProductionMetadata(
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
		stages: productionStageIds.map((stage) =>
			stageRecord(stage, "pending", now),
		),
		history: [],
	};
}

export function normalizeProductionMetadata(
	value: unknown,
	slug: string,
	status: InterventionLifecycleStatus,
	now = new Date().toISOString(),
): ProductionMetadata {
	const fallback = emptyProductionMetadata(slug, status, now);
	if (!isRecord(value)) return fallback;

	const stages = Array.isArray(value.stages)
		? value.stages.map((record) => normalizeStageRecord(record, now))
		: fallback.stages;
	const byStage = new Map(stages.map((record) => [record.stage, record]));
	const orderedStages = productionStageIds.map(
		(stage) => byStage.get(stage) ?? stageRecord(stage, "pending", now),
	);

	const currentStatus = lifecycleStatus(value.current_status, status);
	return {
		version: "1",
		slug,
		current_status: currentStatus,
		r2_mirror_key:
			typeof value.r2_mirror_key === "string"
				? value.r2_mirror_key
				: productionMetadataKey(slug),
		updated_at: typeof value.updated_at === "string" ? value.updated_at : now,
		stages: orderedStages,
		history: Array.isArray(value.history)
			? value.history.map((record) => normalizeStageRecord(record, now))
			: [],
	};
}

export function stageRecord(
	stage: ProductionStageId,
	status: ProductionStageRecord["status"],
	now = new Date().toISOString(),
	patch: Partial<ProductionStageRecord> = {},
): ProductionStageRecord {
	return {
		stage,
		label: productionStageLabels[stage],
		status,
		logs: [],
		error: null,
		provider: null,
		model: null,
		started_at: status === "running" ? now : null,
		finished_at:
			status === "succeeded" || status === "failed" || status === "skipped"
				? now
				: null,
		timestamp: now,
		...patch,
	};
}

export function upsertStageRecord(
	metadata: ProductionMetadata,
	record: ProductionStageRecord,
): ProductionMetadata {
	const stages = metadata.stages.map((current) =>
		current.stage === record.stage ? record : current,
	);
	if (!stages.some((current) => current.stage === record.stage)) {
		stages.push(record);
	}

	return {
		...metadata,
		current_status: metadata.current_status,
		updated_at: record.finished_at ?? record.timestamp,
		stages,
		history: [...metadata.history, record],
	};
}

export function lifecycleStatus(
	value: unknown,
	fallback: InterventionLifecycleStatus = "draft",
): InterventionLifecycleStatus {
	const allowed = [
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
	return typeof value === "string" &&
		allowed.includes(value as InterventionLifecycleStatus)
		? (value as InterventionLifecycleStatus)
		: fallback;
}

export function stageAfter(stage: ProductionStageId): ProductionStageId | null {
	const index = productionStageIds.indexOf(stage);
	return index >= 0 ? (productionStageIds[index + 1] ?? null) : null;
}

export function latestRunnableStage(
	metadata: ProductionMetadata,
): ProductionStageId {
	for (const stage of productionStageIds) {
		const current = metadata.stages.find((record) => record.stage === stage);
		if (!current || current.status !== "succeeded") return stage;
	}
	return "publish";
}

function normalizeStageRecord(
	value: unknown,
	now: string,
): ProductionStageRecord {
	if (!isRecord(value)) return stageRecord("prompt", "pending", now);
	const stage = productionStageIds.includes(value.stage as ProductionStageId)
		? (value.stage as ProductionStageId)
		: "prompt";
	const status =
		value.status === "running" ||
		value.status === "succeeded" ||
		value.status === "failed" ||
		value.status === "skipped" ||
		value.status === "pending"
			? value.status
			: "pending";

	return stageRecord(stage, status, now, {
		input: value.input,
		output: value.output,
		logs: Array.isArray(value.logs)
			? value.logs.map((item) => String(item))
			: [],
		error: typeof value.error === "string" ? value.error : null,
		provider: typeof value.provider === "string" ? value.provider : null,
		model: typeof value.model === "string" ? value.model : null,
		started_at:
			typeof value.started_at === "string" ? value.started_at : null,
		finished_at:
			typeof value.finished_at === "string" ? value.finished_at : null,
		timestamp: typeof value.timestamp === "string" ? value.timestamp : now,
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
