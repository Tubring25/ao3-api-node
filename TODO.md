# TODO

## Parsing completeness

- Return all work-list metadata, including summaries, chapters, dates, comments, bookmarks, completion state, and multiple authors.
- Preserve comment thread relationships when parent and child comments appear on different pages.
- Add fixtures and fallbacks for empty, restricted, and adult-content interstitial pages.

## API consistency

- Use resource-specific not-found errors consistently for works, users, series, bookmarks, and comments.
- Add opt-in helpers for iterating all result pages without introducing aggressive concurrent requests.
- Support request timeouts and cancellation with `AbortSignal` while preserving proxy support.

## Release readiness

- Align the Vitest and coverage package versions and commit a lockfile for reproducible installs.
- Declare supported Node.js versions in `package.json`.
- Add continuous integration for build, tests, coverage, and package-content checks.
- Document rate-limit guidance and the unsupported authenticated/private AO3 flows.
