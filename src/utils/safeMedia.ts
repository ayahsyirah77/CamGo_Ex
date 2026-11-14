export const DEFAULT_PLACE_IMAGE =
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80';

export const DEFAULT_AVATAR_IMAGE =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

/**
 * Ensures React / DOM `src` attributes never receive an empty string (`""`).
 * Returns `undefined` when no valid non-empty URL or fallback is available.
 */
export function safeSrc(value?: string | null, fallback?: string | null): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  if (typeof fallback === 'string') {
    const trimmedFallback = fallback.trim();
    if (trimmedFallback.length > 0) return trimmedFallback;
  }
  return undefined;
}
