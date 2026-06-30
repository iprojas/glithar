import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
	INTERVENTION_MARKDOWN_FILE,
	PRODUCTION_METADATA_FILE,
	combineInterventionSource,
	createEmptyProductionMetadata,
	interventionSourceToPostData,
	parseInterventionMarkdown,
	planInterventionDraftImport,
	postToInterventionSource,
	serializeInterventionMarkdown,
	serializeProductionMetadata,
	type EmDashPostSnapshot,
} from "../src/lib/ar/content-sync.ts";

const fixturePost: EmDashPostSnapshot = {
	id: "01JGLITHARPHASE200000000",
	slug: "drain-oracle-003",
	status: "draft",
	createdAt: "2026-06-30T00:00:00.000Z",
	updatedAt: "2026-06-30T00:00:00.000Z",
	publishedAt: null,
	data: {
		title: "Drain Oracle 003",
		content:
			"An intervention draft mirrored to Git while EmDash remains the CMS.\n",
		project: "street-prophecies",
		location_type: "storm drain",
		concept: "A small oracle appears where runoff disappears.",
		ar_object: "weathered chrome mask",
		interaction: "The object murmurs when the viewer circles it.",
		visual_style: "low-poly municipal relic with glitch patina",
		social_caption: "Ask the drain what the street remembers.",
		image_prompt:
			"An AR graffiti object shaped like a chrome oracle mask over a storm drain.",
		visualizer: "urban-spirit",
		production_status: "draft",
	},
	_rev: "fixture-rev",
};

const source = postToInterventionSource(fixturePost);
const markdown = serializeInterventionMarkdown(source);
const productionJson = serializeProductionMetadata(source.production);
const parsed = combineInterventionSource(markdown, productionJson);

assert.equal(parsed.frontmatter.slug, "drain-oracle-003");
assert.equal(parsed.frontmatter.cms_collection, "posts");
assert.equal(parsed.frontmatter.status, "draft");
assert.equal(parsed.production.r2_mirror_key, "interventions/drain-oracle-003/production.json");
assert.equal(
	interventionSourceToPostData(parsed).title,
	fixturePost.data["title"],
);

const plannedUpdate = planInterventionDraftImport([parsed], [fixturePost]);
assert.equal(plannedUpdate.length, 1);
assert.equal(plannedUpdate[0].action, "update");
assert.equal(plannedUpdate[0].existing?.id, fixturePost.id);

const plannedCreate = planInterventionDraftImport([parsed], []);
assert.equal(plannedCreate.length, 1);
assert.equal(plannedCreate[0].action, "create");

const tempRoot = await mkdtemp(join(tmpdir(), "glithar-content-sync-"));
try {
	const interventionDir = join(tempRoot, parsed.frontmatter.slug);
	await mkdir(interventionDir, { recursive: true });
	await writeFile(join(interventionDir, INTERVENTION_MARKDOWN_FILE), markdown);
	await writeFile(join(interventionDir, PRODUCTION_METADATA_FILE), productionJson);

	const roundTripMarkdown = await readFile(
		join(interventionDir, INTERVENTION_MARKDOWN_FILE),
		"utf8",
	);
	const roundTripProduction = await readFile(
		join(interventionDir, PRODUCTION_METADATA_FILE),
		"utf8",
	);
	const roundTrip = combineInterventionSource(
		roundTripMarkdown,
		roundTripProduction,
	);

	assert.deepEqual(roundTrip.frontmatter, parsed.frontmatter);
	assert.deepEqual(roundTrip.production, parsed.production);
	assert.equal(parseInterventionMarkdown(roundTripMarkdown).body, parsed.body);
} finally {
	await rm(tempRoot, { recursive: true, force: true });
}

const emptyProduction = createEmptyProductionMetadata(
	"drain-oracle-003",
	"draft",
	"2026-06-30T00:00:00.000Z",
);
assert.equal(
	emptyProduction.r2_mirror_key,
	"interventions/drain-oracle-003/production.json",
);

console.log("content sync fixture export/import validation passed");
