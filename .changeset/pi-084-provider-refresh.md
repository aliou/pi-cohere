---
"@aliou/pi-cohere": patch
---

Add Pi coding-agent 0.84 compatibility for the provider model refresh: the persisted model cache now goes through a runtime shape-detection shim (`src/refresh-store-compat.ts`) that uses the 0.84 `context.stored` snapshot and `context.publish({ persist })` transaction when available, and falls back to the legacy `context.store` read/write on older hosts. Cache TTL and offline fallback behavior are unchanged. The `@earendil-works/pi-coding-agent` peer range keeps its >=0.80.8 floor and now also supports 0.84.
