import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

import {
	INTERVENTION_CONTENT_ROOT,
	INTERVENTION_MARKDOWN_FILE,
	PRODUCTION_METADATA_FILE,
	combineInterventionSource,
	interventionSourceToPostData,
	parseProductionMetadata,
	planInterventionDraftImport,
	postToInterventionSource,
	serializeInterventionMarkdown,
	serializeProductionMetadata,
	type EmDashPostSnapshot,
	type InterventionSource,
} from "../src/lib/ar/content-sync.ts";

interface CliOptions {
	root: string;
	url?: string;
	status: string;
	limit: number;
	dryRun: boolean;
}

interface EmDashListResult {
	items: EmDashPostSnapshot[];
	nextCursor?: string;
}

const command = process.argv[2];
const options = parseOptions(process.argv.slice(3));

if (!command || !["export", "import", "validate"].includes(command)) {
	printUsage();
	process.exit(1);
}

if (command === "export") {
	await exportDrafts(options);
} else if (command === "import") {
	await importDrafts(options);
} else {
	await validateFiles(options);
}

async function exportDrafts(options: CliOptions): Promise<void> {
	const posts = await listAllPosts(options.status, options);
	let exported = 0;

	for (const summary of posts) {
		const post = await emdashJson<EmDashPostSnapshot>([
			"content",
			"get",
			"posts",
			summary.id,
			"--json",
			...connectionArgs(options),
		]);
		const source = postToInterventionSource(post);
		await writeInterventionSource(options.root, source);
		exported += 1;
	}

	console.log(`Exported ${exported} ${options.status} post(s) to ${options.root}`);
}

async function importDrafts(options: CliOptions): Promise<void> {
	const sources = await readInterventionSources(options.root);
	const existingPosts = await listAllPosts("", options);
	const actions = planInterventionDraftImport(sources, existingPosts);

	for (const action of actions) {
		const data = interventionSourceToPostData(action.source);

		if (options.dryRun) {
			console.log(`${action.action} ${action.slug}`);
			continue;
		}

		if (action.action === "create") {
			await emdashJson<EmDashPostSnapshot>(
				[
					"content",
					"create",
					"posts",
					"--slug",
					action.slug,
					"--draft",
					"--stdin",
					"--json",
					...connectionArgs(options),
				],
				data,
			);
			console.log(`created ${action.slug}`);
		} else {
			const existing = action.existing;
			if (!existing) {
				throw new Error(`Missing existing post for update action: ${action.slug}`);
			}
			const current = await emdashJson<EmDashPostSnapshot>([
				"content",
				"get",
				"posts",
				existing.id,
				"--json",
				...connectionArgs(options),
			]);
			if (!current._rev) {
				throw new Error(`Missing _rev for ${action.slug}; refusing blind update`);
			}
			await emdashJson<EmDashPostSnapshot>(
				[
					"content",
					"update",
					"posts",
					existing.id,
					"--rev",
					current._rev,
					"--draft",
					"--stdin",
					"--json",
					...connectionArgs(options),
				],
				data,
			);
			console.log(`updated ${action.slug}`);
		}
	}
}

async function validateFiles(options: CliOptions): Promise<void> {
	const sources = await readInterventionSources(options.root);
	for (const source of sources) {
		const markdown = serializeInterventionMarkdown(source);
		const productionJson = serializeProductionMetadata(source.production);
		combineInterventionSource(markdown, productionJson);
	}
	console.log(`Validated ${sources.length} intervention source file(s)`);
}

async function listAllPosts(
	status: string,
	options: CliOptions,
): Promise<EmDashPostSnapshot[]> {
	const posts: EmDashPostSnapshot[] = [];
	let cursor: string | undefined;

	do {
		const args = [
			"content",
			"list",
			"posts",
			"--limit",
			String(options.limit),
			"--json",
			...connectionArgs(options),
		];
		if (status) args.push("--status", status);
		if (cursor) args.push("--cursor", cursor);

		const result = await emdashJson<EmDashListResult>(args);
		posts.push(...result.items);
		cursor = result.nextCursor;
	} while (cursor);

	return posts;
}

async function writeInterventionSource(
	root: string,
	source: InterventionSource,
): Promise<void> {
	const dir = join(root, source.frontmatter.slug);
	await mkdir(dir, { recursive: true });
	await writeFile(
		join(dir, INTERVENTION_MARKDOWN_FILE),
		serializeInterventionMarkdown(source),
		"utf8",
	);
	await writeFile(
		join(dir, PRODUCTION_METADATA_FILE),
		serializeProductionMetadata(source.production),
		"utf8",
	);
}

async function readInterventionSources(root: string): Promise<InterventionSource[]> {
	const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	});

	const sources: InterventionSource[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const dir = join(root, entry.name);
		const markdown = await readFile(join(dir, INTERVENTION_MARKDOWN_FILE), "utf8");
		const productionJson = await readFile(
			join(dir, PRODUCTION_METADATA_FILE),
			"utf8",
		);
		const source = combineInterventionSource(markdown, productionJson);
		parseProductionMetadata(productionJson);
		sources.push(source);
	}

	return sources;
}

async function emdashJson<T>(
	args: string[],
	stdin?: Record<string, unknown>,
): Promise<T> {
	const child = spawn("npx", ["emdash", ...args], {
		stdio: ["pipe", "pipe", "pipe"],
	});

	let stdout = "";
	let stderr = "";
	child.stdout.setEncoding("utf8");
	child.stderr.setEncoding("utf8");
	child.stdout.on("data", (chunk) => {
		stdout += chunk;
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk;
	});

	if (stdin) {
		child.stdin.end(JSON.stringify(stdin));
	} else {
		child.stdin.end();
	}

	const code = await new Promise<number | null>((resolve) => {
		child.on("close", resolve);
	});
	if (code !== 0) {
		throw new Error(
			`emdash ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`,
		);
	}

	return JSON.parse(stdout) as T;
}

function connectionArgs(options: CliOptions): string[] {
	return options.url ? ["--url", options.url] : [];
}

function parseOptions(args: string[]): CliOptions {
	const options: CliOptions = {
		root: INTERVENTION_CONTENT_ROOT,
		status: "draft",
		limit: 100,
		dryRun: false,
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--root") {
			options.root = requiredArg(args, ++index, arg);
		} else if (arg === "--url") {
			options.url = requiredArg(args, ++index, arg);
		} else if (arg === "--status") {
			options.status = requiredArg(args, ++index, arg);
		} else if (arg === "--limit") {
			options.limit = Number.parseInt(requiredArg(args, ++index, arg), 10);
		} else if (arg === "--dry-run") {
			options.dryRun = true;
		} else {
			throw new Error(`Unknown option: ${arg}`);
		}
	}

	if (!Number.isInteger(options.limit) || options.limit < 1) {
		throw new Error("--limit must be a positive integer");
	}

	return options;
}

function requiredArg(args: string[], index: number, flag: string): string {
	const value = args[index];
	if (!value) throw new Error(`${flag} requires a value`);
	return value;
}

function printUsage(): void {
	console.log(`Usage:
  bun scripts/sync-interventions.ts export [--url http://localhost:4321] [--root content/interventions] [--status draft]
  bun scripts/sync-interventions.ts import [--url http://localhost:4321] [--root content/interventions] [--dry-run]
  bun scripts/sync-interventions.ts validate [--root content/interventions]
`);
}
