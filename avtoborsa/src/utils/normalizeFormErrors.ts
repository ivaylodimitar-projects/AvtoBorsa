const DEFAULT_SUBMIT_ERROR = "Възникна грешка при изпращането на формата.";

const toErrorMessage = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toErrorMessage(entry))
      .filter(Boolean)
      .join(" ");
  }

  if (value && typeof value === "object") {
    const detail = "detail" in value ? toErrorMessage((value as { detail?: unknown }).detail) : "";
    if (detail) {
      return detail;
    }

    const message = "message" in value ? toErrorMessage((value as { message?: unknown }).message) : "";
    if (message) {
      return message;
    }
  }

  return "";
};

export const normalizeFormErrors = (
  payload: unknown,
  fieldMap: Record<string, string> = {}
): Record<string, string> => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { submit: DEFAULT_SUBMIT_ERROR };
  }

  const normalized: Record<string, string> = {};

  Object.entries(payload as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
    const message = toErrorMessage(rawValue);
    if (!message) {
      return;
    }

    if (rawKey === "error" || rawKey === "detail" || rawKey === "message") {
      normalized.submit = message;
      return;
    }

    const mappedKey = fieldMap[rawKey] || rawKey;
    normalized[mappedKey === "non_field_errors" ? "submit" : mappedKey] = message;
  });

  if (!Object.keys(normalized).length) {
    normalized.submit = DEFAULT_SUBMIT_ERROR;
  }

  return normalized;
};
