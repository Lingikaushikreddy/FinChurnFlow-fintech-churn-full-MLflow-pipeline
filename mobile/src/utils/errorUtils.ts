/**
 * Safely extracts a string error message from API error responses.
 * FastAPI validation errors return detail as an array of {type, loc, msg, input} objects.
 */
export function extractErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || String(d)).join('; ');
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
}
