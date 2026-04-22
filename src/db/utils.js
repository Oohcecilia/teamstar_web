// ----------------------------
// VALIDATOR
// ----------------------------
export function validate(schema, data) {
  const missing = schema.required.filter(
    (key) => !(key in data)
  );

  if (missing.length) {
    throw new Error(
      `❌ Validation failed. Missing fields: ${missing.join(", ")}`
    );
  }

  return true;
}
