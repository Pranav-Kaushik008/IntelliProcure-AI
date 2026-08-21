/**
 * IntelliProcure AI – Date and Time Formatting Utilities
 * Handles UTC ISO string parsing and converts to the user's local browser timezone.
 */

/**
 * Format timestamp into standard localized date string (e.g., "Aug 24, 2026").
 */
export function formatDate(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = typeof dateVal === "string" && !dateVal.endsWith("Z") && !dateVal.includes("+")
      ? new Date(dateVal + "Z")
      : new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return String(dateVal);
  }
}

/**
 * Format timestamp into standard localized date & time string (e.g., "Aug 24, 2026, 12:05 PM").
 */
export function formatDateTime(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = typeof dateVal === "string" && !dateVal.endsWith("Z") && !dateVal.includes("+")
      ? new Date(dateVal + "Z")
      : new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(dateVal);
  }
}

/**
 * Format timestamp into human-readable relative time (e.g., "Just now", "5m ago", "2h ago", "Yesterday").
 */
export function formatRelativeTime(dateVal) {
  if (!dateVal) return "";
  try {
    const d = typeof dateVal === "string" && !dateVal.endsWith("Z") && !dateVal.includes("+")
      ? new Date(dateVal + "Z")
      : new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  } catch {
    return String(dateVal);
  }
}
