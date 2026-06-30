import {
	type ProjectPromptTemplate,
	type PromptTemplate,
	type VisualizerVariant,
	visualizerVariants,
} from "./types";

const artistModules = import.meta.glob("../../../prompts/artists/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const projectModules = import.meta.glob("../../../prompts/projects/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const projectMetadataModules = import.meta.glob("../../../prompts/projects/*.json", {
	import: "default",
	eager: true,
}) as Record<string, unknown>;

export function listArtistPrompts(): PromptTemplate[] {
	return Object.entries(artistModules)
		.map(([path, body]) => parsePrompt(path, body))
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function listProjectPrompts(): ProjectPromptTemplate[] {
	return Object.entries(projectModules)
		.map(([path, body]) => {
			const prompt = parsePrompt(path, body);
			const metadata = metadataFor(path);
			return {
				...prompt,
				project: stringValue(metadata.project, prompt.id),
				category: stringValue(metadata.category, "interventions"),
				visualizer: visualizerValue(metadata.visualizer),
				lora_slug: stringValue(metadata.lora_slug, "glithar-house"),
				constraints: Array.isArray(metadata.constraints)
					? metadata.constraints.map((item) => String(item))
					: [],
			};
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function getArtistPrompt(id: string): PromptTemplate {
	const prompt = listArtistPrompts().find((item) => item.id === id);
	if (!prompt) throw new Error(`Unknown artist prompt: ${id}`);
	return prompt;
}

export function getProjectPrompt(id: string): ProjectPromptTemplate {
	const prompt = listProjectPrompts().find((item) => item.id === id);
	if (!prompt) throw new Error(`Unknown project prompt: ${id}`);
	return prompt;
}

function parsePrompt(path: string, raw: string): PromptTemplate {
	const id = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
	const titleMatch = raw.match(/^#\s+(.+)$/m);
	return {
		id,
		label: titleMatch?.[1]?.trim() || titleize(id),
		body: raw.trim(),
	};
}

function metadataFor(markdownPath: string): Record<string, unknown> {
	const jsonPath = markdownPath.replace(/\.md$/, ".json");
	const metadata = projectMetadataModules[jsonPath];
	return typeof metadata === "object" && metadata !== null
		? (metadata as Record<string, unknown>)
		: {};
}

function visualizerValue(value: unknown): VisualizerVariant {
	return typeof value === "string" &&
		visualizerVariants.includes(value as VisualizerVariant)
		? (value as VisualizerVariant)
		: "urban-spirit";
}

function stringValue(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value : fallback;
}

function titleize(value: string): string {
	return value
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}
