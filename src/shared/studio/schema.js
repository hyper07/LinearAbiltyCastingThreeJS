/**
 * A tiny JSON-schema subset, used twice from ONE description: the validator here (every write
 * the Studio makes goes through it) and the schema the LM model is asked to follow (lmSchema,
 * which drops the keywords some OpenAI-compatible servers refuse in strict mode — the validator
 * still enforces them).
 *
 * Supported: type (one or [type, 'null']), enum, minimum/maximum, maxLength, pattern,
 * items/maxItems, properties/required/additionalProperties:false.
 */
export const S = {
  str: (maxLength, extra = {}) => ({ type: 'string', maxLength, ...extra }),
  oneOf: (values) => ({ type: 'string', enum: [...values] }),
  int: (minimum, maximum) => ({ type: 'integer', minimum, maximum }),
  num: (minimum, maximum) => ({ type: 'number', minimum, maximum }),
  bool: () => ({ type: 'boolean' }),
  arr: (items, maxItems) => ({ type: 'array', items, maxItems }),
  obj: (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false }),
  /** The same, or null ("leave as it is" in a patch). */
  orNull: (schema) => ({ ...schema, type: [schema.type, 'null'], ...(schema.enum ? { enum: [...schema.enum, null] } : {}) })
};

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const fits = (want, v) => {
  const t = typeOf(v);
  return want === t || (want === 'number' && t === 'integer');
};

/**
 * Check `value` against `schema`. Returns a list of problems ("maps[0].name: too long"),
 * empty when it fits. Unknown keys are problems (additionalProperties:false everywhere).
 */
export function check(schema, value, path = '', out = []) {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.some((t) => fits(t, value))) {
    out.push(`${path || 'value'}: expected ${types.join(' or ')}`);
    return out;
  }
  if (value === null) return out;
  if (schema.enum && !schema.enum.includes(value)) out.push(`${path}: "${String(value).slice(0, 40)}" is not one of ${schema.enum.filter((e) => e !== null).slice(0, 12).join(', ')}`);
  if (typeof value === 'string') {
    if (schema.maxLength != null && value.length > schema.maxLength) out.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) out.push(`${path}: not in the expected form`);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) out.push(`${path}: not a number`);
    if (schema.minimum != null && value < schema.minimum) out.push(`${path}: below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) out.push(`${path}: above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems != null && value.length > schema.maxItems) out.push(`${path}: more than ${schema.maxItems} items`);
    value.slice(0, (schema.maxItems ?? value.length) + 1).forEach((item, i) => check(schema.items, item, `${path}[${i}]`, out));
  }
  if (typeOf(value) === 'object' && schema.properties) {
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties, key)) out.push(`${path ? `${path}.` : ''}${key}: unknown field`);
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) out.push(`${path ? `${path}.` : ''}${key}: missing`);
      else check(schema.properties[key], value[key], path ? `${path}.${key}` : key, out);
    }
    for (const key of Object.keys(schema.properties)) {
      if (!(schema.required ?? []).includes(key) && Object.hasOwn(value, key)) check(schema.properties[key], value[key], path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

const DROP = new Set(['maxLength', 'minimum', 'maximum', 'maxItems', 'pattern']);
/** The schema as sent to the LM model: structure and enums only. */
export function lmSchema(schema) {
  if (Array.isArray(schema)) return schema.map(lmSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (DROP.has(k)) continue;
    out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, lmSchema(pv)])) : lmSchema(v);
  }
  return out;
}
