"@aliou/pi-cohere": minor
---

Register the Cohere provider as a complete pi-ai `Provider` via `pi.registerProvider(provider)` instead of the name-plus-config form, with auth resolution that falls back to an anonymous credential when no key exists so the model catalog no longer fails to refresh on keyless installs.
