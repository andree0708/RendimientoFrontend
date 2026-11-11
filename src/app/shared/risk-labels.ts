/**
 * Shared Spanish labels for backend risk enums.
 *
 * The API returns English codes, sometimes suffixed ('low_risk',
 * 'moderate', 'high', 'unknown'). Display layers must never show the raw
 * codes to Spanish-speaking users.
 */

const LABELS: Record<string, string> = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  unknown: 'Desconocido',
  improving: 'Mejorando',
  stable: 'Estable',
  declining: 'Empeorando',
};

/** Normalize a backend risk code to its base English word. */
export function normalizeRisk(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return value
    .toLowerCase()
    .replace(/[\s_]+(risk|label)$/, '')
    .replace(/_/g, ' ')
    .trim();
}

/** Spanish label for a backend risk code. Never returns the raw code. */
export function riskEs(value: string | null | undefined): string {
  const key = normalizeRisk(value);
  if (LABELS[key] !== undefined) return LABELS[key];
  if (!key) return 'Desconocido';
  return key.charAt(0).toUpperCase() + key.slice(1);
}
