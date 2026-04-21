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

// ----------------------------
// SAFE INSERT / ENTITY BUILDER
// ----------------------------
export function createEntity(schema, data) {
  const finalData = { ...data };

  // apply defaults
  Object.entries(schema.defaults || {}).forEach(
    ([key, value]) => {
      if (!(key in finalData)) {
        finalData[key] =
          typeof value === "function" ? value() : value;
      }
    }
  );

  // validate
  validate(schema, finalData);

  return finalData;
}