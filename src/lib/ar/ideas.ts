import { getArtistPrompt, getProjectPrompt } from "./prompts";
import type { IdeaRow, ProjectPromptTemplate, PromptTemplate } from "./types";

export interface IdeaGenerationRequest {
	artist: string;
	project: string;
	count: number;
	provider: "fixture" | "openai" | "gemini";
	model?: string;
	highReasoning?: boolean;
	highQuality?: boolean;
	regenerateRows?: IdeaRow[];
}

export interface IdeaGenerationResult {
	ideas: IdeaRow[];
	provider: string;
	model: string;
	mode: "fixture";
	warnings: string[];
}

const MAX_IDEAS = 12;

export async function generateIdeas(
	request: IdeaGenerationRequest,
): Promise<IdeaGenerationResult> {
	const artist = getArtistPrompt(request.artist);
	const project = getProjectPrompt(request.project);
	const count = clampIdeaCount(request.count);
	const model = request.model?.trim() || defaultModel(request.provider);

	if (request.provider !== "fixture") {
		return {
			ideas: fixtureIdeas(artist, project, count, request.regenerateRows),
			provider: request.provider,
			model,
			mode: "fixture",
			warnings: [
				`${request.provider} live generation is disabled until credentials, cost limits, and model endpoints are confirmed. Fixture ideas were returned.`,
			],
		};
	}

	return {
		ideas: fixtureIdeas(artist, project, count, request.regenerateRows),
		provider: "fixture",
		model,
		mode: "fixture",
		warnings: [],
	};
}

export function ideaToPostData(idea: IdeaRow): Record<string, unknown> {
	return {
		title: idea.title,
		excerpt: idea.concept,
		content: portableTextFromIdea(idea),
		project: idea.project,
		location_type: idea.location_type,
		concept: idea.concept,
		ar_object: idea.ar_object,
		interaction: idea.interaction,
		visual_style: idea.visual_style,
		social_caption: idea.social_caption,
		visualizer: idea.visualizer,
		lora_slug: idea.lora_slug,
		production_status: "draft",
		production_summary: null,
		production_history: [],
	};
}

export function slugifyTitle(title: string): string {
	const slug = title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
	return slug || "untitled-intervention";
}

function fixtureIdeas(
	artist: PromptTemplate,
	project: ProjectPromptTemplate,
	count: number,
	regenerateRows: IdeaRow[] = [],
): IdeaRow[] {
	const seedRows = regenerateRows.length > 0 ? regenerateRows : undefined;
	return Array.from({ length: count }, (_, index) => {
		const base = seedRows?.[index];
		const suffix = String(index + 1).padStart(3, "0");
		const motif = motifs[(index + project.id.length) % motifs.length];
		const location = locations[(index + artist.id.length) % locations.length];
		const object = objects[(index + motif.length) % objects.length];
		return {
			id: crypto.randomUUID(),
			title: base
				? `${base.title.replace(/\s+\d{3}$/, "")} ${suffix}`
				: `${titleize(motif)} ${suffix}`,
			location_type: base?.location_type || location,
			concept:
				base?.concept ||
				`A ${project.project} intervention that turns ${location} into a short-lived civic signal.`,
			ar_object: base?.ar_object || object,
			interaction:
				base?.interaction ||
				"The object rotates slowly until the viewer taps, then reveals a second damaged surface.",
			visual_style:
				base?.visual_style ||
				`${artist.label.toLowerCase()} with municipal textures, sharp silhouette, and restrained glitch erosion`,
			social_caption:
				base?.social_caption ||
				`Scan the mark. Let the ${motif.toLowerCase()} answer back.`,
			project: project.project,
			category: project.category,
			visualizer: project.visualizer,
			lora_slug: project.lora_slug,
			source_artist: artist.id,
			source_project: project.id,
			manuallyEdited: false,
		};
	});
}

function portableTextFromIdea(idea: IdeaRow): unknown[] {
	return [
		block(idea.concept),
		block(`AR object: ${idea.ar_object}`),
		block(`Interaction: ${idea.interaction}`),
		block(`Visual style: ${idea.visual_style}`),
		block(`Social caption: ${idea.social_caption}`),
	];
}

function block(text: string): Record<string, unknown> {
	return {
		_type: "block",
		style: "normal",
		children: [{ _type: "span", text, _key: crypto.randomUUID() }],
		_key: crypto.randomUUID(),
	};
}

function clampIdeaCount(value: number): number {
	return Math.max(1, Math.min(MAX_IDEAS, Number.isFinite(value) ? value : 4));
}

function defaultModel(provider: IdeaGenerationRequest["provider"]): string {
	if (provider === "openai") return "configured-openai-model";
	if (provider === "gemini") return "configured-gemini-model";
	return "fixture-v1";
}

function titleize(value: string): string {
	return value
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

const motifs = [
	"drain oracle",
	"signal bruise",
	"curb witness",
	"underpass relic",
	"ghost stencil",
	"threshold flare",
	"broken monument",
	"service hatch saint",
];

const locations = [
	"storm drain",
	"bus stop wall",
	"underpass column",
	"utility cabinet",
	"construction hoarding",
	"parking meter",
	"sidewalk crack",
	"bridge stair",
];

const objects = [
	"weathered chrome mask",
	"floating concrete sigil",
	"fragmented public notice",
	"low-poly votive marker",
	"folded neon relic",
	"scanned bronze glyph",
	"compressed glass monument",
	"oxidized QR talisman",
];
