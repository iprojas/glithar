# Glithar AR Publishing Implementation Plan

## Summary

This plan describes how to evolve the existing EmDash/Astro/Cloudflare site into an AR publishing platform after the specification is accepted. It builds on EmDash as the CMS and Agents as the content-generation and production-orchestration layer. It intentionally avoids replacing EmDash, adding a separate CMS, exposing provider keys, or building localStorage gameplay/unlock mechanics. A temporary `/discover` localStorage counter is allowed only for testing how many public intervention pages the current browser has seen.

The work should proceed in phases. Each phase should preserve a deployable site and use Bun commands already defined by the project.

Baseline validation for implementation phases:

- `bun run typecheck`
- `bun run build`
- Targeted route checks against local preview or deployed Worker when relevant

## Phase 1: Project Baseline And Content Model Alignment

Objective: align the current `posts` collection with intervention drafts while preserving the existing EmDash blog structure.

Likely files/modules:

- `seed/seed.json`
- `emdash-env.d.ts`
- Current post detail/list pages

Tasks:

- Add intervention metadata fields to `posts` or define an EmDash-native metadata strategy if supported.
- Keep `pages`, `category`, and `tag` available for the existing site structure.
- Regenerate EmDash types after schema changes.
- Confirm `entry.id` remains the public slug and `entry.data.id` remains the database ID for API calls.

Dependencies:

- EmDash schema field support for strings, text, image/media references, select/status values, and metadata-like fields.

Testing:

- Run the local schema seed/type workflow.
- Confirm generated types include the new intervention fields.
- Confirm existing `/posts`, `/posts/[slug]`, category, tag, and search pages still render.

Completion:

- A draft post can represent an intervention without losing existing blog functionality.

## Phase 2: Markdown And JSON Sync Strategy

Objective: define and implement Git-synced source files that mirror EmDash intervention content without replacing the CMS.

Likely files/modules:

- `content/interventions/`
- `src/lib/ar/content-sync.ts`
- EmDash draft import/update service or agent tool

Tasks:

- Define Markdown frontmatter for human-editable intervention content.
- Define JSON sidecars for production metadata and stage history.
- Implement import/export commands or service functions that sync between files and EmDash drafts.
- Ensure `production.json` can later mirror the R2 object at `/interventions/{slug}/production.json`.

Dependencies:

- Existing EmDash APIs, agent tools, or MCP support for draft create/update.

Testing:

- Export a draft to Markdown/JSON.
- Re-import the same draft without duplicating it.
- Verify EmDash remains the source used by admin and public runtime queries.

Completion:

- Git can store reviewable intervention source files while EmDash remains the operational CMS.

## Phase 3: Prompt Template Structure

Objective: add repo-owned prompt templates for artists and projects/categories.

Likely files/modules:

- `prompts/artists/`
- `prompts/projects/`
- `src/lib/ar/prompts.ts`

Tasks:

- Add loader functions for prompt Markdown and optional structured JSON metadata.
- Validate prompt IDs, labels, project/category recommendation, and visualizer defaults.
- Keep templates read-only from the admin UI.

Dependencies:

- Server-side file access strategy that works in local development and Cloudflare build/runtime.

Testing:

- List available artist prompts.
- List available project prompts.
- Confirm invalid prompt IDs fail with clear admin-facing errors.

Completion:

- Idea generation can select prompt templates from versioned repo files.

## Phase 4: Idea Generator Admin Page And Ideas Table

Objective: provide a single admin surface for generation settings and editable idea rows.

Likely files/modules:

- EmDash plugin/admin extension for AR tools
- `src/lib/ar/ideas.ts`
- Provider module for OpenAI/Gemini idea generation

Tasks:

- Create a same-page generator and ideas table.
- Support artist prompt, project prompt, number of ideas, provider/model, and high reasoning/high quality options.
- Render editable columns exactly: `title`, `location_type`, `concept`, `ar_object`, `interaction`, `visual_style`, `social_caption`.
- Support delete, CSV export/import, selected regeneration, and selected import.
- Assign project/category automatically from the selected project prompt metadata.

Dependencies:

- Confirm EmDash custom admin page/plugin API.
- Server-side LLM provider abstraction.

Testing:

- Generate ideas with mocked provider output.
- Edit and delete table rows.
- Export and import CSV.
- Verify project/category cannot drift from the selected prompt unless explicitly supported later.

Completion:

- The editor can generate and curate ideas before creating drafts.

## Phase 5: Draft Post Creation And Import Path

Objective: import selected idea rows into EmDash as draft posts.

Likely files/modules:

- Agent tool and EmDash MCP integration if available
- Fallback internal draft service
- `src/lib/ar/drafts.ts`

Tasks:

- Inspect available EmDash MCP tools.
- Map draft creation and metadata updates to Agents/MCP where supported.
- Implement a minimal internal service for unsupported operations.
- Generate safe slugs and initialize production fields.
- Start imported posts with `status: draft`.

Dependencies:

- EmDash draft creation/update APIs, agent tools, or MCP tools.

Testing:

- Import one selected idea.
- Import multiple selected ideas.
- Prevent duplicate slug collisions.
- Confirm imported drafts do not appear on public intervention routes.

Completion:

- Curated idea rows become EmDash draft posts.

## Phase 6: Production Interface On Draft Posts

Objective: turn each draft post into a manual production control surface.

Likely files/modules:

- EmDash admin extension
- `src/lib/ar/pipeline.ts`
- Production status components

Tasks:

- Display the ten pipeline stages with status, input, output, logs, errors, retry, timestamp, provider, and model.
- Allow running one stage at a time.
- Allow continuing from the latest successful stage.
- Prevent publish until required assets and metadata exist.

Dependencies:

- Stage storage structure from Phase 2.
- Draft metadata fields from Phase 1.

Testing:

- Run mocked stage transitions.
- Retry a failed mocked stage.
- Confirm failed stages do not erase previous outputs.

Completion:

- The editor can inspect and control production manually per draft.

## Phase 7: FAL Image Provider With Z-Image Turbo LoRA

Objective: generate the first production image from an optimized prompt.

Likely files/modules:

- `src/lib/ar/providers/fal-image.ts`
- `src/lib/ar/providers/types.ts`
- Server-side production action

Tasks:

- Add FAL provider interface and normalized result shape.
- Use `FAL_KEY` from server environment or Cloudflare secrets.
- Implement Z-Image Turbo LoRA request creation.
- Resolve LoRA assets from the R2 prefix `/loras/z-image-turbo/{lora-slug}/`.
- Store the active LoRA slug or provider LoRA identifier in stage metadata.
- Support polling or webhook completion after endpoint inspection.
- Map provider errors to stage errors.

Dependencies:

- Current FAL endpoint documentation and account access.
- Cloudflare secret configured for `FAL_KEY`.
- R2 LoRA assets placed under `/loras/z-image-turbo/`.
- Confirmation of whether FAL accepts direct R2 URLs, signed URLs, uploaded FAL file references, or provider-specific LoRA IDs.

Testing:

- Unit-test request normalization with fixture responses.
- Unit-test LoRA selection and URL/reference resolution.
- Run an integration test only with explicit real credentials.
- Confirm no FAL key appears in client bundles or public HTML.

Completion:

- A draft can move from `prompt_ready` to `image_generated` with a generated image result.

## Phase 8: R2 Persistence For Images And Production Metadata

Objective: persist generated images and stage metadata to R2.

Likely files/modules:

- `src/lib/ar/storage.ts`
- Existing Cloudflare `MEDIA` R2 binding
- Production metadata service

Tasks:

- Preserve LoRA assets under `/loras/z-image-turbo/{lora-slug}/model.safetensors`, `/metadata.json`, and `/preview.jpg`.
- Write generated image to `/interventions/{slug}/image.png`.
- Write stage metadata to `/interventions/{slug}/production.json`.
- Update EmDash post metadata with image URL/storage key.
- Define cache headers and public access strategy.

Dependencies:

- Decision on public R2 delivery route.

Testing:

- Confirm a fixture LoRA object can be listed/resolved by the server-side provider.
- Store and retrieve a fixture image.
- Confirm metadata records the storage key and public URL.
- Confirm drafts do not expose private/admin-only routes publicly.

Completion:

- Generated images and production state are durable outside the provider response.

## Phase 9: FAL Image-To-3D Model Generation

Objective: create a raw GLB/GLTF model from the generated image.

Likely files/modules:

- `src/lib/ar/providers/fal-model.ts`
- Production pipeline stage runner

Tasks:

- Select the current FAL image-to-3D endpoint.
- Submit the generated image URL/reference.
- Normalize the model response.
- Persist the raw model to `/interventions/{slug}/model.raw.glb`.
- Update stage metadata and post fields.

Dependencies:

- Valid FAL image-to-3D endpoint and accepted input shape.

Testing:

- Unit-test response normalization.
- Integration-test with a known image only when credentials are available.
- Confirm failed model generation keeps the generated image intact.

Completion:

- A draft can move from `image_generated` to `model_generated`.

## Phase 10: GLB Optimization And Compression

Objective: produce a public optimized GLB suitable for mobile AR.

Likely files/modules:

- `src/lib/ar/optimize.ts`
- External/offline optimization command or provider adapter

Tasks:

- Inspect Worker runtime feasibility for GLB optimization.
- Choose a supported optimizer path.
- Produce `/interventions/{slug}/model.optimized.glb`.
- Generate or persist `/interventions/{slug}/thumbnail.jpg` if supported.
- Update production metadata and post fields.

Dependencies:

- Decision on runtime: local command, queue-backed worker, external processor, or provider transform.

Testing:

- Optimize a fixture GLB.
- Validate file size improvement or mobile-safe output.
- Confirm optimized model loads in `model-viewer`.

Completion:

- A draft can move from `model_generated` to `ready`.

## Phase 11: Public Model Viewer Intervention Page

Objective: serve clean public AR pages for published interventions.

Likely files/modules:

- `src/pages/[slug].astro`
- `src/components/ModelViewer.astro`
- Existing `Base.astro`

Tasks:

- Add clean slug routing with conflict checks for existing routes.
- Query only published/ready intervention posts.
- Render optimized GLB through `model-viewer`.
- Use the provided `model-viewer` baseline: `ar`, `ar-modes="scene-viewer quick-look"`, `camera-controls`, `touch-action="pan-y"`, `auto-rotate`, `disable-pan`, optional `skybox-image`, `skybox-height="2m"`, and `max-camera-orbit="auto 90deg auto"`.
- Implement the provided `ar-status` failure handler that reveals "AR is not supported on this device" when AR launch fails.
- Add mobile AR launch, loading state, fallback state, and viewer controls.
- Support visualizer variants: `urban-spirit`, `glitch-monument`, `micro-monument`, `qr-sigil`.
- Treat recording support as optional until a tested approach is selected.

Dependencies:

- Public asset URL strategy from Phase 8.
- Route conflict decision for root slugs.

Testing:

- Load a published fixture intervention.
- Confirm draft/archived posts return 404.
- Verify desktop and mobile viewport screenshots.
- Verify GLB loads and AR button appears on capable mobile browsers.
- Simulate or trigger `ar-status: failed` and confirm the fallback error message appears and hides after transition.

Completion:

- Published interventions have public AR-ready pages at clean URLs.

## Phase 12: Temporary Discover Testing Page

Objective: add a lightweight public page for testing discovery behavior without creating gameplay or unlock mechanics.

Likely files/modules:

- `src/pages/discover.astro`
- Public viewer page client script or small island for page-seen tracking

Tasks:

- Add `/discover`.
- Use localStorage key `glithar.discover.pagesSeen`.
- Store a JSON value with `slugs`, `count`, and `updated_at`.
- Update the key after a successful public intervention page view.
- Show the current count on `/discover`.
- Keep this feature clearly testing-only and independent from production analytics.

Dependencies:

- Public clean slug route from Phase 11.

Testing:

- Visit two public intervention pages in the same browser and confirm `/discover` shows count `2`.
- Reload a previously seen slug and confirm the count does not double-count unless duplicate views are intentionally enabled later.
- Clear localStorage and confirm `/discover` returns to zero.
- Confirm no EmDash/D1/R2 state is modified by this testing counter.

Completion:

- The editor can test local browser discovery behavior through `/discover`.

## Phase 13: QR PNG And SVG Routes

Objective: expose QR assets for each published intervention.

Likely files/modules:

- `src/pages/[slug]/qr.png.ts`
- `src/pages/[slug]/qr.svg.ts`
- QR utility module

Tasks:

- Generate QR from the canonical public URL.
- Return PNG and SVG formats.
- Cache responses.
- Return 404 for unpublished or missing interventions.
- Optionally store QR assets in R2 later if dynamic generation becomes expensive.

Dependencies:

- Public URL canonicalization.
- QR generation package compatible with Astro/Cloudflare.

Testing:

- Fetch `/{slug}/qr.png`.
- Fetch `/{slug}/qr.svg`.
- Decode QR output in a fixture test if practical.
- Confirm unpublished slugs return 404.

Completion:

- Every published intervention has download/view QR routes.

## Phase 14: Publish Transition

Objective: provide a safe admin-only transition from ready draft to public intervention.

Likely files/modules:

- Production admin action
- EmDash post update service
- Public route query filters

Tasks:

- Require optimized model URL and required metadata before publish.
- Set status to `published`.
- Set canonical `public_url`.
- Trigger sitemap/RSS/search behavior only if desired for AR interventions.
- Keep archived/error drafts out of public routes.

Dependencies:

- EmDash publish/draft APIs.

Testing:

- Publish a ready draft.
- Block publish for incomplete drafts.
- Confirm public route returns 200 after publish and 404 before publish.

Completion:

- Ready interventions can be made public safely.

## Phase 15: Dashboard And Analytics

Objective: add operational visibility for ideas, production, published interventions, QR links, and engagement.

Likely files/modules:

- EmDash dashboard/admin extension
- `src/lib/ar/analytics.ts`
- Cloudflare Analytics Engine or D1-backed events

Tasks:

- Show idea generation entry point.
- Show drafts, production status, failed generations, published interventions, QR links, recent assets, and active projects/categories.
- Track QR scans, page views, AR launches, date/time buckets, device/browser, and popular projects.
- Prefer Cloudflare-native analytics over external vendors.

Dependencies:

- Decide between Web Analytics, Analytics Engine, D1 aggregates, or a hybrid.

Testing:

- Record fixture analytics events.
- Verify dashboard aggregates.
- Confirm analytics does not store secrets or sensitive admin data.

Completion:

- The editor can monitor publishing and engagement from the admin area.

## Phase 16: UX Polish, Failure States, And Deployment Validation

Objective: harden the MVP and validate production deployment.

Likely files/modules:

- Admin AR plugin/routes
- Public viewer component
- README/operator notes

Tasks:

- Add empty states, loading states, and actionable error messages.
- Add generation guardrails for count, concurrency, retries, and cost.
- Document required Cloudflare secrets.
- Verify deployed Worker routes and admin-only production actions.
- Confirm no API keys or provider internals appear in client output.

Dependencies:

- Completion of previous phases.

Testing:

- `bun run typecheck`
- `bun run build`
- Deployed route checks for public pages, QR routes, and admin routes.
- Manual mobile AR test with a real published intervention.

Completion:

- The MVP is deployable, observable, and safe for single-editor production use.

## Explicit Non-Goals

- Do not build a new CMS.
- Do not replace EmDash.
- Do not treat Agents as a CMS replacement; Agents coordinate generation and production work on top of EmDash.
- Do not add a new database unless existing EmDash/Cloudflare storage proves insufficient.
- Do not implement localStorage gameplay, unlock mechanics, or multi-user roles in the MVP. The `/discover` localStorage counter is allowed only as a temporary testing aid.
- Do not make prompt templates editable from the admin UI.
- Do not expose provider API keys to client code.
- Do not assume unsupported MCP APIs.
- Do not call FAL from an LLM agent as the production mechanism.
