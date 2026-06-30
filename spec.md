# Glithar AR Publishing Platform Specification

## Product Overview

Glithar evolves the current EmDash blog into a single-editor AR graffiti and AR publishing platform. The editor uses EmDash as the operational CMS for idea review, draft posts, production state, asset references, publishing, and admin dashboards. Agents provide the content-generation and production-orchestration layer on top of EmDash; they should assist with ideation, prompt refinement, provider calls, status updates, and maintenance without becoming a separate CMS. Public visitors scan or open clean intervention URLs and view generated AR objects through mobile-first pages backed by Cloudflare and R2-hosted assets.

The platform has three core workflows:

- Idea generation: create, review, edit, delete, regenerate, import, and export intervention ideas.
- Asset production: turn selected ideas into image prompts, generated images, GLB/GLTF models, optimized public assets, and publishable metadata.
- Public publishing: serve clean intervention pages, AR viewers, QR routes, and analytics without exposing private provider keys or internal logs.

This specification is for planning only. It does not replace EmDash, introduce a separate CMS, migrate away from the existing Cloudflare deployment model, or implement the system yet.

## Guiding Architecture

- EmDash remains the CMS and admin orchestrator. Drafts, revisions, search, media references, admin routes, and publishing state should use EmDash-native patterns where available.
- Agents sit above EmDash as generation/orchestration workers. They may create ideas, refine prompts, call provider services, update production metadata, and coordinate retries through supported server APIs.
- Markdown and JSON become a Git-synced source format that complements EmDash. They should not split the editorial model or replace the production D1/R2 setup.
- Cloudflare remains the runtime base: Astro server output on Workers, D1 for EmDash CMS data, R2 for generated media and model assets, and KV for sessions.
- Public content pages stay server-rendered. Do not use `getStaticPaths()` for CMS-backed content.
- Provider integrations must live behind server-side modules or EmDash plugin/server actions. Do not call OpenAI, Gemini, FAL, or asset-processing services from client code.
- The existing `posts` collection is the starting point for intervention drafts. The current `pages`, `category`, and `tag` structures can remain for static pages, grouping, and discovery.
- Generated assets are public references only after they are persisted to R2 and attached to post metadata.

Inspect existing: verify the current EmDash plugin/admin extension APIs before choosing whether idea generation and production controls live in a custom plugin, custom admin page, or server-rendered admin-adjacent route.

## System Architecture

The system should be organized around five layers:

- Content layer: EmDash collections, taxonomies, drafts, revisions, site settings, and generated types.
- Git content layer: Markdown/frontmatter plus JSON sidecars for source control, review, export/import, and prompt assets.
- Agent and production services: agent-facing tools plus provider modules for LLM idea generation, prompt optimization, FAL image generation, FAL image-to-3D, GLB optimization, QR generation, analytics logging, and R2 persistence.
- Admin UI layer: idea generator, ideas table, draft import, production stage controls, dashboard widgets, logs, retries, and publish controls.
- Public delivery layer: clean intervention URL, `model-viewer` rendering, AR launch, fallback content, QR image routes, SEO metadata, and analytics events.

Likely future modules:

- `prompts/artists/` and `prompts/projects/` for repo-owned prompt templates.
- `src/lib/ar/` for provider-neutral production services and shared status types.
- `src/components/ModelViewer.astro` for the public GLB viewer.
- `src/pages/discover.astro` for a temporary public discovery/testing page.
- `src/pages/[slug].astro` for clean public intervention pages if route conflicts are resolved safely.
- `src/pages/[slug]/qr.png.ts` and `src/pages/[slug]/qr.svg.ts` for QR routes if dynamic generation is selected.
- An EmDash plugin or admin extension for idea generation, production controls, and dashboard surfaces.

Open Decision: confirm the exact EmDash extension point for custom admin pages and server actions before implementation. Do not invent unsupported MCP or plugin APIs.

## Content Model

Interventions should map to EmDash draft posts, with extra AR production fields added to the current `posts` collection or stored in an EmDash-native metadata structure if the platform provides one. Markdown/frontmatter and JSON sidecars should mirror the same data for Git sync.

Each intervention needs at least:

- `title`
- `slug`
- `status`
- `project`
- `location_type`
- `concept`
- `ar_object`
- `interaction`
- `visual_style`
- `social_caption`
- `image_prompt`
- `image_url`
- `raw_model_url`
- `optimized_model_url`
- `thumbnail_url`
- `public_url`
- `visualizer`
- `created_at`
- `updated_at`

Production metadata should also preserve stage logs and history. The preferred shape is a sidecar `production.json` mirrored to R2 at `/interventions/{slug}/production.json`, with the current stage summary stored on the EmDash post for admin queries and public rendering.

Recommended lifecycle:

- `draft`
- `prompt_ready`
- `image_generating`
- `image_generated`
- `model_generating`
- `model_generated`
- `optimizing`
- `ready`
- `published`
- `error`
- `archived`

Status transitions should be explicit. A failed provider call must move the relevant stage to an error state without corrupting the existing post, generated assets, or previous successful stage outputs.

## Prompt Template Strategy

Prompt templates are repo-owned content, not editable admin records.

Recommended structure:

- `prompts/artists/{artist-slug}.md`
- `prompts/projects/{project-slug}.md`
- Optional `prompts/projects/{project-slug}.json` for structured defaults such as project, category recommendation, visualizer preference, and generation constraints.

The idea generator should allow the editor to select:

- Artist prompt
- Project or category prompt
- Number of ideas
- Provider and model, initially OpenAI or Gemini
- High reasoning / high quality mode

The selected project/category prompt should automatically assign the project/category recommendation. The editable ideas table should not require the editor to type project/category manually.

## Idea Generation Workflow

The Idea Generator and Ideas Table should live on the same admin page. The editor starts a generation run, reviews rows, edits the rows in place, removes bad ideas, regenerates clean selected rows, exports/imports CSV when needed, and imports selected ideas into EmDash as draft posts.

Editable table fields must be exactly:

- `title`
- `location_type`
- `concept`
- `ar_object`
- `interaction`
- `visual_style`
- `social_caption`

Table actions:

- Generate ideas from selected templates and provider options.
- Review and edit generated rows.
- Delete rows.
- Regenerate selected rows if they have no manual edits or after explicit confirmation.
- Export and import CSV.
- Import selected rows as draft posts.

Canonical draft creation should use EmDash MCP tools if available. If the required MCP functions are not available, implement a minimal server-side EmDash service that creates draft posts through supported EmDash APIs.

Inspect existing: discover available EmDash MCP tools before implementation and document the exact supported operations.

## Draft Lifecycle

Imported ideas become draft posts. A draft post page or related admin production screen becomes the control surface for asset generation.

Drafts should start with:

- Core idea fields populated from the ideas table.
- `status: draft`.
- `project` and category populated from the selected project prompt or recommendation.
- Empty production asset fields.
- A generated `slug` that can be manually adjusted before publish if EmDash supports it.

The production interface must allow manual intervention between stages. The editor should be able to run a single stage, inspect its input/output/logs, retry after failure, continue from the latest successful stage, and publish only once the intervention is ready.

## Production Pipeline

Required stages:

1. Generate or refine an optimized image prompt.
2. Run FAL image generation using Z-Image Turbo LoRA.
3. Store the generated image in R2.
4. Run FAL image-to-GLB/GLTF.
5. Store the raw model in R2.
6. Optimize and compress the model.
7. Store the optimized GLB in R2.
8. Update post metadata.
9. Preview the public viewer.
10. Publish the intervention.

Every stage must expose:

- Status
- Input
- Output
- Logs
- Error message when failed
- Retry action
- Timestamp
- Provider and model

The production pipeline must be provider-agnostic. Initial providers:

- LLM idea/prompt provider: OpenAI and/or Gemini, selected per run.
- Image provider: FAL with Z-Image Turbo LoRA.
- Model provider: FAL image-to-3D endpoint selected during implementation after checking current FAL capabilities.
- Optimization provider: local/server-side optimizer or Worker-compatible external processing path, selected after feasibility review.

Open Decision: confirm the GLB optimization runtime. Cloudflare Workers may not be suitable for heavy binary optimization, so implementation may need a queued external processor, FAL-compatible transform, or a build-time/offline tool.

## FAL Integration

FAL logic must be implemented as provider modules, not inline UI code.

The initial image provider should support:

- Environment-backed credentials through `FAL_KEY`.
- Z-Image Turbo LoRA model configuration.
- Server-side LoRA selection from R2-hosted LoRA assets.
- Server-side request creation.
- Polling or webhook handling, based on the selected FAL endpoint.
- Structured response normalization.
- Provider error mapping.
- Retry handling with idempotent stage records.
- R2 persistence after successful generation.
- EmDash metadata update after the asset is stored.

The model provider should follow the same interface:

- Accept the generated image URL or R2 object reference.
- Produce a raw GLB/GLTF result.
- Persist raw model output to R2.
- Return normalized asset metadata to the production pipeline.

Do not call FAL from an LLM agent during production. The application should call FAL through its own server-side provider modules.

LoRA assets should be placed in a dedicated R2 prefix and referenced by server-side provider configuration:

- `/loras/z-image-turbo/{lora-slug}/model.safetensors`
- `/loras/z-image-turbo/{lora-slug}/metadata.json`
- `/loras/z-image-turbo/{lora-slug}/preview.jpg`

The provider should resolve the selected LoRA to a FAL-compatible URL or signed/public R2 URL on the server. Public pages should not expose private storage credentials.

Open Decision: confirm whether the selected FAL Z-Image Turbo LoRA endpoint accepts direct R2 URLs, signed URLs, uploaded FAL file references, or a provider-specific LoRA identifier.

## R2 Asset Storage

Recommended public asset structure:

- `/loras/z-image-turbo/{lora-slug}/model.safetensors`
- `/loras/z-image-turbo/{lora-slug}/metadata.json`
- `/loras/z-image-turbo/{lora-slug}/preview.jpg`
- `/interventions/{slug}/image.png`
- `/interventions/{slug}/model.raw.glb`
- `/interventions/{slug}/model.optimized.glb`
- `/interventions/{slug}/thumbnail.jpg`
- `/interventions/{slug}/production.json`

The EmDash post should store stable public URLs or resolvable storage keys for:

- Generated image
- Raw model
- Optimized model
- Thumbnail
- Production metadata
- Selected LoRA slug or provider LoRA identifier

Open Decision: decide whether R2 objects should be public through the existing EmDash media route, a custom Worker asset route, or a public bucket/custom domain. The public viewer must not depend on admin-only URLs.

## Public Viewer

Public intervention pages should prefer clean root slugs:

- `https://glitchar.com/{slug}`
- Current Worker development host remains `https://glithar.rojas-ip.workers.dev`

Avoid `/p/{slug}` unless root slug routing conflicts with existing pages or EmDash internals.

The page should render:

- Intervention title and minimal context.
- Optimized GLB through `model-viewer`.
- Mobile AR launch support with `ar` and `ar-modes="scene-viewer quick-look"`.
- Loading and preload states.
- Viewer controls appropriate for public discovery.
- Graceful fallback when AR or WebGL is unavailable.
- Social caption or share metadata.
- QR download links.

Visualizer variants:

- `urban-spirit`
- `glitch-monument`
- `micro-monument`
- `qr-sigil`

Recording support is desirable but feasibility-dependent. The public viewer should use this `model-viewer` pattern as its baseline, replacing the demo assets with R2-backed intervention assets:

```html
<model-viewer
  id="model-viewer"
  src="{optimized_model_url}"
  ar
  ar-modes="scene-viewer quick-look"
  camera-controls
  touch-action="pan-y"
  alt="{title}"
  shadow-intensity="2"
  auto-rotate
  disable-pan
  skybox-image="{optional_skybox_url}"
  skybox-height="2m"
  max-camera-orbit="auto 90deg auto"
>
  <div id="error" class="hide">AR is not supported on this device</div>
</model-viewer>
<script>
  document.querySelector("#model-viewer").addEventListener("ar-status", (event) => {
    if (event.detail.status === "failed") {
      const error = document.querySelector("#error");
      error.classList.remove("hide");
      error.addEventListener("transitionend", () => {
        error.classList.add("hide");
      });
    }
  });
</script>
```

The implementation should carry over the AR failure message behavior and adapt the styles to Glithar's public viewer design.

## Discover Testing Page

Add a temporary `/discover` page for testing public browsing behavior. This page is not gameplay and must not create unlocks, gated content, or permanent progression.

For testing only, `/discover` should show how many public intervention pages the current browser has seen. Use a localStorage key:

- `glithar.discover.pagesSeen`

Recommended value shape:

```json
{
  "slugs": ["drain-oracle-003"],
  "count": 1,
  "updated_at": "2026-06-30T00:00:00.000Z"
}
```

Public intervention pages may update this key after a successful page view. `/discover` should read it and display the count. This localStorage value is only a client-side testing aid; analytics and production state must still use Cloudflare/EmDash-backed systems.

## QR Routes

Required routes:

- `/{slug}/qr.png`
- `/{slug}/qr.svg`

Default recommendation: generate QR images dynamically from the canonical public URL and cache the response. Store QR assets in R2 only if analytics, download volume, or cache behavior requires persistent files.

QR routes should:

- Resolve only published interventions.
- Return 404 for drafts, archived posts, or unknown slugs.
- Encode the canonical public URL.
- Use cache headers appropriate for published content.

## Dashboard And Analytics

The admin dashboard should surface:

- Idea generation entry point.
- Draft interventions.
- Production status by stage.
- Failed generations.
- Published interventions.
- QR links.
- Recent assets.
- Most active projects/categories.
- Analytics summary.

Analytics should prefer Cloudflare-native tools and current project storage:

- Cloudflare Web Analytics for basic traffic if available.
- Analytics Engine for event-style scan/view metrics if enabled.
- D1 for project-specific scan/view aggregates if a durable queryable table is needed.
- KV only for simple counters or low-complexity cached summaries.

Tracked events should include:

- QR views/scans.
- Public intervention views.
- AR launch attempts.
- Device/browser information where privacy-safe.
- Date/time buckets.
- Popular projects/categories.
- Viral install/share events if the public UX later supports them.

Do not add third-party analytics vendors for the MVP unless Cloudflare-native options are insufficient.

## Agents And MCP Integration

Agents should be treated as the preferred content-generation and production-orchestration layer. MCP should be used as an automation/tooling bridge only where supported by available tools.

Preferred agent/MCP-backed operations:

- Create draft posts from selected ideas.
- Update post metadata after production stages.
- Upload or reference generated assets.
- Query content state for dashboards and maintenance.
- Trigger or coordinate production steps if supported.
- Inspect failures and recommend retries without exposing provider secrets.

Do not assume unsupported MCP functions. If an MCP capability does not exist, define a minimal internal service or agent tool using supported EmDash APIs or Cloudflare bindings.

Inspect existing: enumerate the currently available EmDash MCP tools before implementation and map each workflow action to either MCP or internal service.

## Environment Variables And Secrets

Likely environment values:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `FAL_KEY`
- `FAL_Z_IMAGE_TURBO_LORA_PREFIX=loras/z-image-turbo`
- `PUBLIC_SITE_URL=https://glitchar.com`

Cloudflare bindings already cover:

- D1 binding `DB`
- R2 binding `MEDIA`
- KV binding `SESSION`

Only add direct R2 API credentials if a non-Worker process must write to R2:

- `R2_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Provider keys must be Cloudflare secrets or local `.env` values. They must never be exposed to public pages or client bundles.

## Security And Reliability

- Single editor/admin scope is enough for the MVP. Do not overbuild multi-user permission systems.
- Production actions must be admin-only.
- Batch generation needs limits for count, concurrency, retry attempts, and provider cost.
- Failed provider calls must not erase previous successful outputs.
- Public pages should expose only published metadata and public asset URLs.
- Logs may include provider metadata but must not store raw secrets.
- Draft, production, and archived content must not be reachable through public clean slug routes.
- Public viewer assets must use stable URLs and clear cache behavior.

## Acceptance Criteria

- The architecture keeps EmDash as the CMS and admin orchestrator.
- Agents are documented as the generation/orchestration layer on top of EmDash, not as a replacement for EmDash.
- Markdown/JSON sync is documented as a complementary Git workflow, not a replacement for EmDash storage.
- The idea generator workflow includes the exact required editable fields.
- The production pipeline includes all ten required stages and manual continuation between stages.
- FAL, Z-Image Turbo LoRA, image-to-3D, R2 persistence, and GLB optimization are provider/service concerns, not client code.
- R2 has a documented LoRA prefix for FAL assets, and FAL LoRA resolution stays server-side.
- Public viewer requirements include `model-viewer`, mobile AR launch, fallback behavior, clean slug routing, visualizer variants, and feasibility-dependent recording support.
- `/discover` includes a temporary localStorage-based count of pages seen using `glithar.discover.pagesSeen`; this is testing-only and not a gameplay/unlock system.
- QR routes are specified as `/{slug}/qr.png` and `/{slug}/qr.svg`.
- Analytics prefers Cloudflare-native tooling.
- The specification marks unsupported or uninspected areas with `Open Decision:` or `Inspect existing:`.
