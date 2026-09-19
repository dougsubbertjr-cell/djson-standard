# DJSON Standard

**DJSON** (Digital JSON) is a small, publisher-authored JSON document for presenting an entity, its public offerings, and its own trust-related assertions in a machine-readable form. This repository is the **v0.1.0 release candidate** of the public specification.

DJSON is deliberately a description format, not a verification network. A document can state that an entity has been verified or describe an anti-scam policy, but a parser must treat those fields as **self-declared claims** unless it independently validates them against an authoritative source. DJSON does not establish identity, endorsement, legitimacy, safety, ownership, or legal compliance.

## Canonical contract

The authoritative v0.1.0 schema is [`schema/djson-v0.1.schema.json`](schema/djson-v0.1.schema.json). Its stable identifier is:

```text
https://raw.githubusercontent.com/dougsubbertjr-cell/djson-standard/main/schema/djson-v0.1.schema.json
```

The root [`schema.json`](schema.json) is retained only as a **compatibility alias** for integrations that used the original repository layout. It contains a single `$ref` to the canonical schema and defines no separate contract. New documents should use the canonical URL above in their optional `$schema` field.

A conforming v0.1.0 document requires `djson_version`, `entity`, and `last_updated`. It declares `djson_version` exactly as `"0.1.0"`; unknown properties are rejected at every modeled object level to keep published documents predictable.

| Field | Required | Purpose |
|---|---:|---|
| `$schema` | No | URI identifying the canonical schema used to author the document. |
| `djson_version` | Yes | The fixed specification version, `"0.1.0"`. |
| `entity` | Yes | The named organization, business, brand, or individual being described. |
| `trust_layer` | No | Publisher assertions about verification, fraud prevention, and policy locations. |
| `offerings` | No | One or more current products or services. |
| `contact` | No | Public contact channels. |
| `last_updated` | Yes | An ISO 8601 date-time indicating when the publisher last reviewed the document. |

`entity.name` and `entity.type` are required. An offering requires `name`, `type`, and a `status` of `active`, `inactive`, `coming_soon`, or `discontinued`. An advertised `price` is a non-negative number paired with an ISO 4217 `currency` code. A `trust_layer`, when included, requires the boolean `verified`; its meaning is defined by the publisher’s stated process, not by this specification.

## Quick start

Publish a JSON document at a stable, public URL, commonly `/djson.json` or `/.well-known/djson.json`. Include the canonical schema identifier and use UTC for `last_updated`.

```json
{
  "$schema": "https://raw.githubusercontent.com/dougsubbertjr-cell/djson-standard/main/schema/djson-v0.1.schema.json",
  "djson_version": "0.1.0",
  "entity": {
    "name": "Example Lantern Studio",
    "type": "business",
    "url": "https://example-lantern-studio.example"
  },
  "trust_layer": {
    "verified": false,
    "anti_scam_policy": "This fictional business accepts bookings only through its published website."
  },
  "last_updated": "2026-09-19T12:00:00Z"
}
```

The examples in [`examples/`](examples/) demonstrate three fictional business shapes: an e-commerce skincare shop, a local HVAC service, and a business coach. They are illustrative test data, not real businesses or endorsements.

## Validation

This repository deliberately uses a dependency-free Node.js release check. It parses the schema and examples, verifies the compatibility alias, and validates the supported JSON Schema constraints used in the canonical schema.

```bash
node tests/validate-examples.mjs
```

The schema itself declares [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema). Consumers may validate documents with a full Draft 2020-12 implementation; the included check is a reproducible safeguard for this repository’s examples rather than a general-purpose validator.

## Compatibility and release status

Version 0.1.0 is a release candidate. It supersedes the repository’s incomplete `1.0` examples and original top-level schema with one versioned, strict contract. Existing consumers that fetch `schema.json` continue to reach the v0.1.0 contract through its compatibility alias. Documents using `djson_version: "1.0"` are not v0.1.0-conformant and should migrate by adopting the canonical schema URL, setting `djson_version` to `"0.1.0"`, and mapping product data to `offerings`.

See [`CHANGELOG.md`](CHANGELOG.md) for release notes. The specification is made available under the [MIT License](LICENSE).
