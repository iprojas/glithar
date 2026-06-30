# Intervention Source Mirror

This directory is a Git-synced mirror for EmDash intervention drafts. EmDash
remains the operational CMS for admin editing, drafts, revisions, publishing,
search, and runtime queries.

Each intervention draft uses this shape:

```text
content/interventions/{slug}/
├── intervention.md
└── production.json
```

`intervention.md` contains editable Markdown with flat frontmatter for the
Phase 1 post metadata fields. The frontmatter `status` is the intervention
production lifecycle status, while `cms_status` records the EmDash content
status.

`production.json` preserves production stage metadata and is shaped so it can
later mirror the R2 object at:

```text
interventions/{slug}/production.json
```

Use the sync scripts instead of editing EmDash storage directly:

```bash
bun run ar:sync:export
bun run ar:sync:import -- --dry-run
bun run ar:sync:validate
```

The public site and admin runtime must continue to query EmDash, not these
files.
