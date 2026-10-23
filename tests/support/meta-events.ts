type MetaTrack = ["track", string, Record<string, unknown>?, { eventID?: string }?];

/** Inspect the primary pixel in either single- or dual-pixel deployments.
 * Keep repeated events to the same pixel visible to the assertions. */
export function primaryMetaTracks(events: unknown[][]): MetaTrack[] {
  const primary = events.find(event => event[0] === "init")?.[1]
    ?? events.find(event => event[0] === "trackSingle")?.[1];
  return events.flatMap(event => {
    if (event[0] === "track") return [event as MetaTrack];
    if (event[0] === "trackSingle" && event[1] === primary) {
      return [["track", event[2], event[3], event[4]] as MetaTrack];
    }
    return [];
  });
}
