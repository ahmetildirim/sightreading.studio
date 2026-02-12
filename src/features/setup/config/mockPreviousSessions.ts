import type { PreviousSessionItem } from "../types";

export const MOCK_PREVIOUS_SESSIONS: PreviousSessionItem[] = [
  {
    id: "session-01",
    createdAtLabel: "Today 10:42",
    durationLabel: "02:14",
    accuracy: 94,
    config: { minNote: "C4", maxNote: "C5", totalNotes: 80 },
  },
  {
    id: "session-02",
    createdAtLabel: "Yesterday 19:10",
    durationLabel: "03:51",
    accuracy: 88,
    config: { minNote: "A2", maxNote: "E4", totalNotes: 120 },
  },
  {
    id: "session-03",
    createdAtLabel: "Yesterday 08:33",
    durationLabel: "02:47",
    accuracy: 91,
    config: { minNote: "G4", maxNote: "C7", totalNotes: 90 },
  },
  {
    id: "session-04",
    createdAtLabel: "Feb 9, 2026",
    durationLabel: "05:06",
    accuracy: 86,
    config: { minNote: "C3", maxNote: "G6", totalNotes: 160 },
  },
  {
    id: "session-05",
    createdAtLabel: "Feb 7, 2026",
    durationLabel: "01:39",
    accuracy: 97,
    config: { minNote: "F3", maxNote: "B4", totalNotes: 60 },
  },
  {
    id: "session-06",
    createdAtLabel: "Feb 4, 2026",
    durationLabel: "07:12",
    accuracy: 82,
    config: { minNote: "A0", maxNote: "C8", totalNotes: 240 },
  },
];
