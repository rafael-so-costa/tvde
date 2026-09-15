/**
 * Rules deciding when each profile section in the contract "Detalhes" tab
 * should be rendered. A section is shown when there is real data for that
 * profile linked to the contract — the template requirement alone is NOT
 * enough, since the template may reference a profile that was never filled
 * in for a given contract (e.g. legacy contracts).
 *
 * Keep this logic in a single, testable place so the UI and the tests
 * stay aligned.
 */

export type ProfileData = Record<string, unknown> | null | undefined;

/**
 * Returns true if the entity object has at least one meaningful (non-empty)
 * value. Empty strings, null/undefined and pure-whitespace are ignored.
 */
export function hasProfileData(data: ProfileData): boolean {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return true;
    if (typeof v === "boolean") return true;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return false;
  });
}

/**
 * Decides whether a profile section (Motorista / Empresa / Proprietário /
 * Veículo) should render in the Detalhes tab.
 *
 * Rule: data must exist for that profile. The template requirement flag
 * is accepted as input for future extensions, but it never overrides the
 * "no data => no section" rule.
 */
export function shouldRenderProfileSection(
  data: ProfileData,
  _requiredByTemplate: boolean = false,
): boolean {
  return hasProfileData(data);
}
