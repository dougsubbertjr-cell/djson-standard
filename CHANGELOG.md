# Changelog

All notable changes to the DJSON Standard are documented in this file. The project follows [Semantic Versioning](https://semver.org/).

## [0.1.0-rc.1] - 2026-09-19

### Added

- A canonical **DJSON v0.1.0** JSON Schema at `schema/djson-v0.1.schema.json`.
- A clear document model for an entity, optional trust assertions, offerings, contact channels, and an ISO 8601 `last_updated` timestamp.
- Three fully fictional, validated examples covering e-commerce, a local service, and professional coaching.
- A dependency-free Node.js validation check for the canonical schema, compatibility alias, and examples.

### Changed

- `schema.json` now acts solely as a documented compatibility alias to the canonical v0.1 schema; it no longer defines an independent, competing contract.
- Repository examples and templates use `djson_version: "0.1.0"` and the canonical schema identifier.
- Trust-related data is represented as self-declared assertions, not as evidence of identity or safety.

### Removed

- The incomplete `1.0` schema contract and unversioned conventions are superseded by the v0.1.0 release-candidate contract.
