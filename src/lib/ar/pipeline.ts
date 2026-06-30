import { getPostForAdmin, productionForPost, updatePostData } from "./drafts";
import { fixtureJpeg } from "./fixtures";
import {
	latestRunnableStage,
	productionMetadataKey,
	stageRecord,
	upsertStageRecord,
} from "./metadata";
import { optimizeGlbFixture } from "./optimize";
import { fixtureImageProvider, fixtureModelProvider } from "./providers/fixture";
import { putAsset } from "./storage";
import type {
	AdminActionContext,
	EmDashPostItem,
	ProductionMetadata,
	ProductionStageId,
	StageRunInput,
} from "./types";

export async function runProductionStage(
	context: AdminActionContext,
	postId: string,
	stage: ProductionStageId,
): Promise<{ post: EmDashPostItem; metadata: ProductionMetadata }> {
	const post = await getPostForAdmin(context.emdash, postId);
	const metadata = productionForPost(post);
	const input: StageRunInput = { post, metadata, siteUrl: context.siteUrl };
	const now = new Date().toISOString();
	const running = stageRecord(stage, "running", now, {
		input: stageInput(stage, post),
		started_at: now,
	});
	const withRunning = upsertStageRecord(metadata, running);
	await updatePostData(context.emdash, post, {
		...post.data,
		production_status: statusForRunningStage(stage),
		production_summary: withRunning,
		production_history: withRunning.history,
	});

	try {
		const result = await executeStage(context, input, stage);
		const finished = stageRecord(stage, "succeeded", new Date().toISOString(), {
			input: running.input,
			output: result.output,
			logs: result.logs,
			provider: result.provider,
			model: result.model,
			started_at: now,
		});
		const nextMetadata = upsertStageRecord(
			{ ...withRunning, current_status: result.status },
			finished,
		);
		const nextData = {
			...post.data,
			...result.data,
			production_status: result.status,
			production_summary: nextMetadata,
			production_history: nextMetadata.history,
		};
		const updated = await updatePostData(context.emdash, post, nextData);
		return { post: updated, metadata: nextMetadata };
	} catch (error) {
		const failed = stageRecord(stage, "failed", new Date().toISOString(), {
			input: running.input,
			logs: ["Stage failed. Previous successful outputs were preserved."],
			error: error instanceof Error ? error.message : String(error),
			started_at: now,
		});
		const failedMetadata = upsertStageRecord(
			{ ...withRunning, current_status: "error" },
			failed,
		);
		await updatePostData(context.emdash, post, {
			...post.data,
			production_status: "error",
			production_summary: failedMetadata,
			production_history: failedMetadata.history,
		});
		throw error;
	}
}

export async function continueProduction(
	context: AdminActionContext,
	postId: string,
): Promise<{ post: EmDashPostItem; metadata: ProductionMetadata }> {
	const post = await getPostForAdmin(context.emdash, postId);
	const metadata = productionForPost(post);
	return runProductionStage(context, postId, latestRunnableStage(metadata));
}

export async function publishReadyIntervention(
	context: AdminActionContext,
	postId: string,
): Promise<{ post: EmDashPostItem; metadata: ProductionMetadata }> {
	const post = await getPostForAdmin(context.emdash, postId);
	if (!post.data.optimized_model_url || !post.data.thumbnail_url) {
		throw new Error("Publish requires optimized model and thumbnail URLs.");
	}
	const result = await runProductionStage(context, postId, "publish");
	const publish = await context.emdash.handleContentPublish("posts", postId, {
		publishedAt: new Date().toISOString(),
	});
	if (!publish.success) {
		throw new Error(publish.error?.message ?? "EmDash publish failed");
	}
	return result;
}

async function executeStage(
	context: AdminActionContext,
	input: StageRunInput,
	stage: ProductionStageId,
): Promise<{
	data: Record<string, unknown>;
	output: unknown;
	logs: string[];
	provider: string;
	model: string;
	status: ProductionMetadata["current_status"];
}> {
	const slug = input.post.slug ?? input.post.id;
	switch (stage) {
		case "prompt": {
			const prompt = optimizedPrompt(input.post);
			return {
				data: { image_prompt: prompt },
				output: { image_prompt: prompt },
				logs: ["Prompt refined from EmDash intervention metadata."],
				provider: "fixture",
				model: "prompt-refiner-v1",
				status: "prompt_ready",
			};
		}
		case "image": {
			const generated = await fixtureImageProvider.generate(input);
			const stored = await putAsset(
				`interventions/${slug}/image.png`,
				generated.bytes ?? new Uint8Array(),
				generated.contentType ?? "image/png",
				context.siteUrl,
			);
			return {
				data: { image_url: stored.url },
				output: { image_url: stored.url, key: stored.key },
				logs: generated.logs ?? [],
				provider: fixtureImageProvider.id,
				model: fixtureImageProvider.model,
				status: "image_generated",
			};
		}
		case "image_persist":
			return passthroughPersist("image_url", "image_generated");
		case "model": {
			const generated = await fixtureModelProvider.generate(input);
			const stored = await putAsset(
				`interventions/${slug}/model.raw.glb`,
				generated.bytes ?? new Uint8Array(),
				generated.contentType ?? "model/gltf-binary",
				context.siteUrl,
			);
			return {
				data: { raw_model_url: stored.url },
				output: { raw_model_url: stored.url, key: stored.key },
				logs: generated.logs ?? [],
				provider: fixtureModelProvider.id,
				model: fixtureModelProvider.model,
				status: "model_generated",
			};
		}
		case "model_persist":
			return passthroughPersist("raw_model_url", "model_generated");
		case "optimize": {
			const optimized = await optimizeGlbFixture(input);
			const model = await putAsset(
				`interventions/${slug}/model.optimized.glb`,
				optimized.bytes ?? new Uint8Array(),
				optimized.contentType ?? "model/gltf-binary",
				context.siteUrl,
			);
			const thumb = await putAsset(
				`interventions/${slug}/thumbnail.jpg`,
				fixtureJpeg,
				"image/jpeg",
				context.siteUrl,
			);
			return {
				data: {
					optimized_model_url: model.url,
					thumbnail_url: thumb.url,
				},
				output: {
					optimized_model_url: model.url,
					thumbnail_url: thumb.url,
				},
				logs: optimized.logs ?? [],
				provider: "fixture",
				model: "fixture-glb-optimizer",
				status: "ready",
			};
		}
		case "optimized_persist":
			return passthroughPersist("optimized_model_url", "ready");
		case "metadata": {
			const metadataJson = JSON.stringify(input.metadata, null, "\t");
			const stored = await putAsset(
				productionMetadataKey(slug),
				metadataJson,
				"application/json; charset=utf-8",
				context.siteUrl,
			);
			return {
				data: { production_metadata_url: stored.url },
				output: { production_metadata_url: stored.url, key: stored.key },
				logs: ["Production metadata mirrored to the configured asset route."],
				provider: "glithar",
				model: "production-json-v1",
				status: "ready",
			};
		}
		case "preview": {
			const publicUrl = `${context.siteUrl}/${slug}`;
			return {
				data: { public_url: publicUrl },
				output: { public_url: publicUrl },
				logs: ["Public viewer preview URL prepared. Route remains 404 until publish."],
				provider: "glithar",
				model: "public-viewer-v1",
				status: "ready",
			};
		}
		case "publish": {
			const publicUrl = `${context.siteUrl}/${slug}`;
			return {
				data: { public_url: publicUrl },
				output: { public_url: publicUrl },
				logs: ["Intervention marked publishable; EmDash publish follows this stage."],
				provider: "emdash",
				model: "content-publish",
				status: "published",
			};
		}
	}
}

function passthroughPersist(
	field: string,
	status: ProductionMetadata["current_status"],
) {
	return {
		data: {},
		output: { field },
		logs: [`${field} already persisted or represented as a stable asset URL.`],
		provider: "glithar",
		model: "asset-route-v1",
		status,
	};
}

function optimizedPrompt(post: EmDashPostItem): string {
	const fields = [
		post.data.concept,
		`AR object: ${post.data.ar_object}`,
		`Location: ${post.data.location_type}`,
		`Interaction: ${post.data.interaction}`,
		`Visual style: ${post.data.visual_style}`,
		`LoRA: ${post.data.lora_slug ?? "glithar-house"}`,
	];
	return fields.filter(Boolean).join("\n");
}

function stageInput(stage: ProductionStageId, post: EmDashPostItem): unknown {
	if (stage === "prompt") return { concept: post.data.concept };
	if (stage === "image") return { image_prompt: post.data.image_prompt };
	if (stage === "model") return { image_url: post.data.image_url };
	if (stage === "optimize") return { raw_model_url: post.data.raw_model_url };
	return { slug: post.slug, production_status: post.data.production_status };
}

function statusForRunningStage(stage: ProductionStageId) {
	if (stage === "image") return "image_generating";
	if (stage === "model") return "model_generating";
	if (stage === "optimize") return "optimizing";
	return "draft";
}
