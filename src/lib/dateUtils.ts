/**
 * Safely converts any Firestore timestamp, serialized timestamp, number, string,
 * or Date object into a valid JS Date.
 * Never throws RangeError: Invalid time value.
 */
export const safelyConvertToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();

  // 1. If it has a toDate function (Firestore Timestamp)
  if (typeof timestamp.toDate === 'function') {
    try {
      const d = timestamp.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (_) {}
  }

  // 2. If it has seconds/nanoseconds (e.g. serialized JSON or fallback object)
  const secs = timestamp.seconds ?? timestamp._seconds;
  if (typeof secs === 'number' || (typeof secs === 'string' && !isNaN(Number(secs)))) {
    try {
      const d = new Date(Number(secs) * 1000);
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (_) {}
  }

  // 3. Try parsing string, number or raw Date directly
  try {
    const d = new Date(timestamp);
    if (d instanceof Date && !isNaN(d.getTime())) return d;
  } catch (_) {}

  // 4. Default fallback to current time
  return new Date();
};
