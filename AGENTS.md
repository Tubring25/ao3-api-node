# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript ESM client for Archive of Our Own. Public exports are collected in `src/index.ts`. Keep request and scraping logic in `src/lib/`, shared API models in `src/types/`, and tests in `src/tests/`. Saved AO3 pages used by tests belong in `src/fixtures/`; name each fixture after the resource it represents, such as `work-35961484.html`. Generated `dist/` and `coverage/` output must not be committed.

## Build, Test, and Development Commands

- `pnpm install` installs the project dependencies.
- `pnpm run build` removes `dist/` and compiles declarations and JavaScript with `tsc`.
- `pnpm test` starts Vitest in watch mode for local development.
- `pnpm exec vitest run` runs the complete test suite once, as CI should.
- `pnpm run test:coverage` writes V8 coverage reports to `coverage/`.

Run the build and one-shot test suite before opening a pull request.

## Coding Style & Naming Conventions

Use strict TypeScript and two-space indentation. Follow the surrounding file's semicolon style; no formatter or linter is currently enforced. Use `camelCase` for functions and variables, `PascalCase` for interfaces and type aliases, and descriptive filenames such as `request.ts` or `getUserProfile.test.ts`. Because the compiler uses Node16 ESM resolution, local TypeScript imports must include the emitted `.js` extension. Keep the public surface explicit through `src/index.ts` and `src/types/index.ts`.

## Testing Guidelines

Tests use Vitest and follow the `*.test.ts` convention. Add focused tests beside related suites under `src/tests/`. Prefer mocked requests and deterministic HTML fixtures over live AO3 calls. Cover successful parsing, missing or malformed markup, HTTP failures, and optional proxy behavior when relevant. No numeric coverage threshold is enforced; new behavior should still include regression coverage.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Update license information` and `Refactor scraping functions`. Keep each commit focused; Conventional Commit prefixes are not required. Pull requests should explain the behavior change, list verification commands, and link relevant issues. Update `readme.md` for public API changes and call out added or refreshed fixtures. Screenshots are only useful when documenting parsed HTML differences.

## Security & Responsible Use

Never commit AO3 credentials, session cookies, proxy secrets, or private-page fixtures. This is an unofficial scraper: preserve request error handling, avoid adding aggressive concurrency, and respect AO3 rate limits and Terms of Service.
