# pi-cohere

Pi extension that registers Cohere as a model provider.

## Structure

- `extensions/provider/index.ts` is the only Pi extension entry point.
- `src/index.ts` re-exports public source helpers.
- `src/cohere/` contains Cohere API code:
  - `models.ts` fetches and maps `GET /v1/models` into Pi provider model configs.
  - `context-overflow.ts` contains Cohere overflow matching.

## Provider behavior

- Provider id: `cohere`.
- API key env var: `COHERE_API_KEY`.
- Base URL: `https://api.cohere.ai/compatibility/v1`.
- API mode: Pi's native `openai-completions` path.
- If `COHERE_API_KEY` is missing or model fetching fails, the provider uses a small fallback model list.
- Known model costs are set from public pricing data. Unknown model costs stay at `0`.

## Development

- Run `pnpm typecheck` and `pnpm lint` after changes.
- Keep Pi registration code in `extensions/*` and reusable API code in `src/*`.
- Do not use the Cohere SDK. Use API endpoints directly.
- Do not read or print `COHERE_API_KEY`; only pass it to API requests.
