import type { NoteName } from "../../generator";

export type PreviousSessionItem = {
  id: string;
  createdAtLabel: string;
  durationLabel: string;
  accuracy: number;
  config: {
    minNote: NoteName;
    maxNote: NoteName;
    totalNotes: number;
  };
};
