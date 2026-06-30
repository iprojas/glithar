import { responseItem } from "./drafts";
import type { EmDashPostItem } from "./types";

export async function listAdminPosts(
	emdash: App.Locals["emdash"],
): Promise<EmDashPostItem[]> {
	const result = await emdash.handleContentList("posts", {
		limit: 100,
		orderBy: "updatedAt",
		order: "desc",
	});
	if (!result.success) {
		throw new Error(result.error?.message ?? "Failed to list posts");
	}
	const data = result.data as { items?: unknown[] } | undefined;
	return (data?.items ?? []).map((item) => responseItem({ item }));
}

export function isInterventionPost(post: EmDashPostItem): boolean {
	return Boolean(
		post.data.production_status ||
			post.data.concept ||
			post.data.ar_object ||
			post.data.optimized_model_url,
	);
}

export function groupByProductionStatus(posts: EmDashPostItem[]) {
	return posts.reduce<Record<string, number>>((acc, post) => {
		const status =
			typeof post.data.production_status === "string"
				? post.data.production_status
				: "blog";
		acc[status] = (acc[status] ?? 0) + 1;
		return acc;
	}, {});
}
