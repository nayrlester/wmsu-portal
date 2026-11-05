export interface DocumentVersionParts {
  major: number
  minor: number
}

export const INITIAL_DRAFT_VERSION: DocumentVersionParts = { major: 0, minor: 1 }

export function formatVersionLabel(major: number, minor = 0): string {
  return minor > 0 ? `v${major}.${minor}` : `v${major}`
}

export function isPreBaselineVersion(parts: DocumentVersionParts): boolean {
  return parts.major === 0
}

/**
 * Pre-approval drafts live on the v0.x line (v0.1, v0.2, …).
 * After the first approval, v0.x is promoted to v1 and revisions follow the approved baseline.
 */
export function resolveNextPreBaselineRevision(
  source: DocumentVersionParts,
  latest: DocumentVersionParts | null
): DocumentVersionParts {
  const latestMinor = latest?.major === 0 ? latest.minor : 0
  return { major: 0, minor: Math.max(source.minor, latestMinor) + 1 }
}

/**
 * Next version when revising from a specific source version.
 */
export function resolveNextRevisionVersion(
  source: DocumentVersionParts,
  latest: DocumentVersionParts | null,
  hasApprovedBaseline: boolean
): DocumentVersionParts {
  if (!hasApprovedBaseline) {
    return resolveNextPreBaselineRevision(source, latest)
  }

  if (source.major === 0) {
    return resolveNextMajorVersion(latest, true)
  }

  if (!latest || latest.major === 0) {
    return { major: 1, minor: 1 }
  }

  const latestMajor = latest.major

  if (source.major < latestMajor) {
    return resolveNextMajorVersion(latest, true)
  }

  return { major: latestMajor, minor: latest.minor + 1 }
}

/** Explicit new version rows bump the next line (v0.x pre-baseline, vN post-baseline). */
export function resolveNextMajorVersion(
  latest: DocumentVersionParts | null,
  hasApprovedBaseline: boolean
): DocumentVersionParts {
  if (!hasApprovedBaseline) {
    const latestMinor = latest?.major === 0 ? latest.minor : 0
    return { major: 0, minor: latestMinor + 1 }
  }

  const latestMajor = latest && latest.major > 0 ? latest.major : 1
  return { major: latestMajor + 1, minor: 0 }
}

export function toVersionParts(version: { versionNumber: number; versionMinor?: number | null }): DocumentVersionParts {
  return {
    major: version.versionNumber,
    minor: version.versionMinor ?? 0,
  }
}

/** First approved pre-baseline draft (v0.x) becomes baseline v1. */
export function resolveBaselinePromotion(
  version: DocumentVersionParts,
  hasApprovedBaseline: boolean
): DocumentVersionParts | null {
  if (hasApprovedBaseline || !isPreBaselineVersion(version)) {
    return null
  }

  return { major: 1, minor: 0 }
}
