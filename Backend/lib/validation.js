export function hasText(value, max = 255) {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value.length <= max
  );
}

export function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function parsePositiveInteger(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : null;
  }

  return null;
}

export function toNullablePositiveInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return parsePositiveInteger(value);
}

export function toNullableValue(value) {
  return value || null;
}

export function ensureRequiredFields(fields) {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      return `${fieldName} is required`;
    }
  }

  return null;
}

/** H-6: Minimum password complexity rule used in both change-password and user creation. */
export function validatePassword(password) {
  if (!password || typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be at most 128 characters";
  return null;
}
