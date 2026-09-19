#!/usr/bin/env node

/**
 * Dependency-free release check for the DJSON v0.1.0 example documents.
 * It intentionally supports the JSON Schema keywords used by this repository,
 * rather than presenting itself as a general-purpose JSON Schema validator.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalSchemaUrl =
  "https://raw.githubusercontent.com/dougsubbertjr-cell/djson-standard/main/schema/djson-v0.1.schema.json";
const canonicalSchemaPath = join(repoRoot, "schema", "djson-v0.1.schema.json");
const compatibilityAliasPath = join(repoRoot, "schema.json");
const examplePaths = [
  join(repoRoot, "examples", "ecommerce-skincare.json"),
  join(repoRoot, "examples", "local-hvac.json"),
  join(repoRoot, "examples", "business-coach.json")
];
const compatibilitySamplePaths = [
  join(repoRoot, "djson.json"),
  join(repoRoot, "templates", "digital-product.json"),
  join(repoRoot, "templates", "templates", "ecommerce.json")
];
const documentPaths = [...examplePaths, ...compatibilitySamplePaths];

const errors = [];

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    errors.push(`${filePath}: invalid or unreadable JSON (${error.message})`);
    return null;
  }
}

function typeMatches(value, expectedType) {
  if (expectedType === "array") return Array.isArray(value);
  if (expectedType === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expectedType === "null") return value === null;
  return typeof value === expectedType;
}

function getJsonPointer(document, ref) {
  if (ref === "#") return document;
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((value, token) => value?.[token.replace(/~1/g, "/").replace(/~0/g, "~")], document);
}

function validFormat(value, format) {
  if (typeof value !== "string") return false;
  try {
    if (format === "uri") return Boolean(new URL(value).protocol);
    if (format === "uri-reference") return value.length > 0;
    if (format === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (format === "date-time") return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
  } catch {
    return false;
  }
  return true;
}

function validate(value, schema, rootSchema, location) {
  const problems = [];
  if (schema.$ref) {
    const target = getJsonPointer(rootSchema, schema.$ref);
    if (!target) return [`${location}: unresolved reference ${schema.$ref}`];
    return validate(value, target, rootSchema, location);
  }

  for (const branch of schema.allOf ?? []) problems.push(...validate(value, branch, rootSchema, location));
  if (schema.anyOf && !schema.anyOf.some((branch) => validate(value, branch, rootSchema, location).length === 0)) {
    problems.push(`${location}: does not match any permitted schema`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => validate(value, branch, rootSchema, location).length === 0).length;
    if (matches !== 1) problems.push(`${location}: must match exactly one permitted schema (matched ${matches})`);
  }

  const expectedTypes = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  if (expectedTypes.length && !expectedTypes.some((type) => typeMatches(value, type))) {
    return [...problems, `${location}: expected ${expectedTypes.join(" or ")}`];
  }
  if (Object.hasOwn(schema, "const") && value !== schema.const) problems.push(`${location}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) problems.push(`${location}: must be one of ${schema.enum.join(", ")}`);
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) problems.push(`${location}: must contain at least ${schema.minLength} characters`);
    if (schema.maxLength && value.length > schema.maxLength) problems.push(`${location}: must contain no more than ${schema.maxLength} characters`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) problems.push(`${location}: does not match ${schema.pattern}`);
    if (schema.format && !validFormat(value, schema.format)) problems.push(`${location}: is not a valid ${schema.format}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${location}: must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) problems.push(`${location}: must be at most ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) problems.push(`${location}: must contain at least ${schema.minItems} item(s)`);
    if (schema.maxItems && value.length > schema.maxItems) problems.push(`${location}: must contain no more than ${schema.maxItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) problems.push(`${location}: items must be unique`);
    if (schema.items) value.forEach((item, index) => problems.push(...validate(item, schema.items, rootSchema, `${location}[${index}]`)));
  }
  if (typeMatches(value, "object")) {
    if (schema.minProperties && Object.keys(value).length < schema.minProperties) {
      problems.push(`${location}: must contain at least ${schema.minProperties} properties`);
    }
    if (schema.maxProperties && Object.keys(value).length > schema.maxProperties) {
      problems.push(`${location}: must contain no more than ${schema.maxProperties} properties`);
    }
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) problems.push(`${location}: missing required property ${required}`);
    }
    for (const [property, dependencies] of Object.entries(schema.dependentRequired ?? {})) {
      if (Object.hasOwn(value, property)) {
        for (const dependency of dependencies) {
          if (!Object.hasOwn(value, dependency)) {
            problems.push(`${location}: property ${property} requires property ${dependency}`);
          }
        }
      }
    }
    const properties = schema.properties ?? {};
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) {
        problems.push(...validate(item, properties[key], rootSchema, `${location}.${key}`));
      } else if (schema.additionalProperties === false) {
        problems.push(`${location}: unexpected property ${key}`);
      } else if (typeof schema.additionalProperties === "object") {
        problems.push(...validate(item, schema.additionalProperties, rootSchema, `${location}.${key}`));
      }
    }
  }
  return problems;
}

const schema = await readJson(canonicalSchemaPath);
const alias = await readJson(compatibilityAliasPath);
const documents = await Promise.all(documentPaths.map(readJson));

if (schema) {
  if (schema.$id !== canonicalSchemaUrl) errors.push(`${canonicalSchemaPath}: $id must be ${canonicalSchemaUrl}`);
  if (schema.properties?.djson_version?.const !== "0.1.0") errors.push(`${canonicalSchemaPath}: djson_version must be fixed to 0.1.0`);
  const offering = schema.$defs?.offering;
  if (!offering?.dependentRequired?.price?.includes("currency") || !offering?.dependentRequired?.currency?.includes("price")) {
    errors.push(`${canonicalSchemaPath}: offerings must require price and currency together`);
  }
  const priceWithoutCurrency = validate(
    { name: "Regression probe", type: "product", status: "active", price: 1 },
    offering,
    schema,
    "regression.offering"
  );
  if (!priceWithoutCurrency.some((problem) => problem.includes("price requires property currency"))) {
    errors.push("validator: must reject an offering with a price but no currency");
  }
  const emptyContact = validate({}, schema.$defs?.contact, schema, "regression.contact");
  if (!emptyContact.some((problem) => problem.includes("must contain at least 1 properties"))) {
    errors.push("validator: must reject an empty contact object");
  }
}
if (alias && alias.$ref !== "./schema/djson-v0.1.schema.json") {
  errors.push(`${compatibilityAliasPath}: must be a compatibility alias to the canonical v0.1 schema`);
}
if (schema) {
  documents.forEach((document, index) => {
    if (!document) return;
    const displayPath = documentPaths[index].replace(`${repoRoot}/`, "");
    if (document.$schema !== canonicalSchemaUrl) errors.push(`${displayPath}: $schema must identify the canonical v0.1 schema`);
    errors.push(...validate(document, schema, schema, displayPath));
  });
}

const validExamples = documents.slice(0, examplePaths.length).filter(Boolean);
if (new Set(validExamples.map((example) => example.entity?.name)).size !== validExamples.length) {
  errors.push("public examples: entity names must be distinct");
}

if (errors.length) {
  console.error("DJSON release validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${examplePaths.length} public example(s) and ${compatibilitySamplePaths.length} migrated sample(s) against the canonical schema.`);
}
