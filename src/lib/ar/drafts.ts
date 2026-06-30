import {
	emptyProductionMetadata,
	normalizeProductionMetadata,
	productionMetadataKey,
} from "./metadata";
import { ideaToPostData, slugifyTitle } from "./ideas";
import type {
	AdminActionContext,
	EmDashPostItem,
	IdeaRow,
	InterventionLifecycleStatus,
} from "./types";

export interface ImportedDraft {
	id: string;
	slug: string;
	title: string;
	admin_url: string;
}

export async function importIdeasAsDrafts(
	context: AdminActionContext,
	ideas: IdeaRow[],
): Promise<ImportedDraft[]> {
	const imported: ImportedDraft[] = [];
	for (const idea of ideas) {
		const slug = await uniqueSlug(context.emdash, slugifyTitle(idea.title));
		const now = new Date().toISOString();
		const production = emptyProductionMetadata(slug, "draft", now);
		const data = {
			...ideaToPostData(idea),
			production_summary: production,
			production_history: production.history,
			production_metadata_url: `/assets/${productionMetadataKey(slug)}`,
		};

		const result = await context.emdash.handleContentCreate("posts", {
			slug,
			status: "draft",
			data,
		});
		if (!result.success) {
			throw new Error(result.error?.message ?? "Failed to create draft");
		}
		const item = responseItem(result.data);
		imported.push({
			id: item.id,
			slug: item.slug ?? slug,
			title: String(item.data.title ?? idea.title),
			admin_url: `/_glithar/admin/interventions/${item.id}`,
		});
	}
	return imported;
}

export async function getPostForAdmin(
	emdash: App.Locals["emdash"],
	id: string,
): Promise<EmDashPostItem> {
	const result = await emdash.handleContentGet("posts", id);
	if (!result.success) {
		throw new Error(result.error?.message ?? "Post not found");
	}
	return responseItem(result.data);
}

export async function updatePostData(
	emdash: App.Locals["emdash"],
	post: EmDashPostItem,
	data: Record<string, unknown>,
	status = post.status,
): Promise<EmDashPostItem> {
	const result = await emdash.handleContentUpdate("posts", post.id, {
		data,
		status,
		_rev: post._rev,
	});
	if (!result.success) {
		throw new Error(result.error?.message ?? "Failed to update post");
	}
	return responseItem(result.data);
}

export function productionForPost(post: EmDashPostItem) {
	const slug = post.slug ?? slugifyTitle(String(post.data.title ?? post.id));
	const status = lifecycleStatusForPost(post);
	return normalizeProductionMetadata(
		post.data.production_summary,
		slug,
		status,
		post.updatedAt,
	);
}

export function lifecycleStatusForPost(
	post: EmDashPostItem,
): InterventionLifecycleStatus {
	const value = post.data.production_status;
	if (
		value === "draft" ||
		value === "prompt_ready" ||
		value === "image_generating" ||
		value === "image_generated" ||
		value === "model_generating" ||
		value === "model_generated" ||
		value === "optimizing" ||
		value === "ready" ||
		value === "published" ||
		value === "error" ||
		value === "archived"
	) {
		return value;
	}
	return "draft";
}

export function responseItem(value: unknown): EmDashPostItem {
	const record =
		typeof value === "object" && value !== null
			? (value as Record<string, unknown>)
			: {};
	const item =
		typeof record.item === "object" && record.item !== null
			? (record.item as Record<string, unknown>)
			: record;
	const data =
		typeof item.data === "object" && item.data !== null
			? (item.data as Record<string, unknown>)
			: {};
	return {
		id: String(item.id),
		slug: typeof item.slug === "string" ? item.slug : null,
		status: typeof item.status === "string" ? item.status : "draft",
		data,
		authorId: typeof item.authorId === "string" ? item.authorId : null,
		createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
		updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
		publishedAt:
			typeof item.publishedAt === "string" ? item.publishedAt : null,
		_rev: typeof record._rev === "string" ? record._rev : undefined,
	};
}

async function uniqueSlug(
	emdash: App.Locals["emdash"],
	baseSlug: string,
): Promise<string> {
	let slug = baseSlug;
	let index = 2;
	while (await slugExists(emdash, slug)) {
		slug = `${baseSlug}-${index}`;
		index += 1;
	}
	return slug;
}

async function slugExists(
	emdash: App.Locals["emdash"],
	slug: string,
): Promise<boolean> {
	const result = await emdash.handleContentGet("posts", slug);
	return result.success;
}
