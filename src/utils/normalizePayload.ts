type FieldMap = Record<string, string[]>;

export function normalizePayload<T extends Record<string, any>>(
  data: T,
  fieldMap: FieldMap,
): Record<string, any> {
  const result: Record<string, any> = { ...data };
  for (const [canonical, aliases] of Object.entries(fieldMap)) {
    if (result[canonical] !== undefined) continue;
    for (const alias of aliases) {
      if (data[alias] !== undefined) {
        result[canonical] = data[alias];
        break;
      }
    }
  }
  return result;
}
