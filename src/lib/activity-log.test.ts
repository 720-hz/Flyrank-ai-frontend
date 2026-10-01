import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendActivityEntry, readActivityLog } from "./activity-log";

const STORAGE_KEY = "flyrank:activity";

describe("activity-log", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(readActivityLog()).toEqual([]);
  });

  it("returns an empty array when the stored value is malformed", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(readActivityLog()).toEqual([]);
  });

  it("appends entries most-recent-first", () => {
    appendActivityEntry("first event");
    const afterSecond = appendActivityEntry("second event");

    expect(afterSecond.map((entry) => entry.message)).toEqual([
      "second event",
      "first event",
    ]);

    const persisted = readActivityLog();
    expect(persisted.map((entry) => entry.message)).toEqual([
      "second event",
      "first event",
    ]);

    // Each entry gets a unique id and a valid ISO timestamp.
    for (const entry of persisted) {
      expect(entry.id).toBeTruthy();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    }
  });

  it("caps the stored log at the 20 most recent entries, dropping the oldest", () => {
    for (let i = 1; i <= 25; i += 1) {
      appendActivityEntry(`event ${i}`);
    }

    const log = readActivityLog();
    expect(log).toHaveLength(20);

    // Most recent first: event 25 down to event 6 (events 1-5 dropped).
    expect(log[0].message).toBe("event 25");
    expect(log[log.length - 1].message).toBe("event 6");
    expect(log.map((entry) => entry.message)).not.toContain("event 5");
  });
});
