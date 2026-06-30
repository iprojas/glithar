import { getEmDashEntry } from "emdash";
import {
	lifecycleStatusForPost,
	productionForPost,
	responseItem,
} from "./drafts";
import type { EmDashPostItem, VisualizerVariant } from "./types";

export interface PublicIntervention {
	post: EmDashPostItem;
	slug: string;
	title: string;
	description: string;
	optimizedModelUrl: string;
	thumbnailUrl: string;
	imageUrl?: string;
	publicUrl: string;
	visualizer: VisualizerVariant | string;
	socialCaption: string;
	project: string;
	productionMetadataUrl?: string;
}

export async function getPublishedIntervention(slug: string, origin: string) {
	const result = await getEmDashEntry("posts", slug);
	if (!result.entry) return { intervention: null, cacheHint: result.cacheHint };

	const post = responseItem({
		item: {
			id: result.entry.data.id,
			slug: result.entry.id,
			status: result.entry.data.status,
			data: result.entry.data,
			updatedAt: result.entry.data.updatedAt?.toISOString(),
			publishedAt: result.entry.data.publishedAt?.toISOString() ?? null,
		},
	});
	const status = lifecycleStatusForPost(post);
	if (
		status !== "published" ||
		!post.data.optimized_model_url
	) {
		return { intervention: null, cacheHint: result.cacheHint };
	}

	const publicUrl =
		stringValue(post.data.public_url) || `${origin.replace(/\/$/, "")}/${slug}`;
	const intervention: PublicIntervention = {
		post,
		slug,
		title: stringValue(post.data.title) || "Untitled intervention",
		description:
			stringValue(post.data.concept) ||
			stringValue(post.data.excerpt) ||
			"Published AR intervention.",
		optimizedModelUrl: stringValue(post.data.optimized_model_url) ?? "",
		thumbnailUrl: stringValue(post.data.thumbnail_url) || "",
		imageUrl: stringValue(post.data.image_url),
		publicUrl,
		visualizer: stringValue(post.data.visualizer) || "urban-spirit",
		socialCaption:
			stringValue(post.data.social_caption) ||
			"Open this Glithar AR intervention.",
		project: stringValue(post.data.project) || "glithar",
		productionMetadataUrl: stringValue(post.data.production_metadata_url),
	};

	return { intervention, cacheHint: result.cacheHint };
}

export function safePublicInterventionData(intervention: PublicIntervention) {
	return {
		slug: intervention.slug,
		title: intervention.title,
		project: intervention.project,
		visualizer: intervention.visualizer,
		optimized_model_url: intervention.optimizedModelUrl,
		thumbnail_url: intervention.thumbnailUrl,
		public_url: intervention.publicUrl,
	};
}

export function productionSummaryForPost(post: EmDashPostItem) {
	return productionForPost(post);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}
