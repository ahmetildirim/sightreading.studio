import { useCallback, useRef, useState } from "react";

export type NoteOnResult = "armed" | "wrong" | "complete";
export type NoteOffResult = "advanced" | "complete" | "idle";

type SessionApi = {
  isWrong: boolean;
  reset: (expectedNotes: number[]) => void;
  handleNoteOn: (midiNote: number) => NoteOnResult;
  handleNoteOff: (midiNote: number) => NoteOffResult;
};

export default function useSightReadingSession(): SessionApi {
  const expectedRef = useRef<number[]>([]);
  const indexRef = useRef(0);
  const armedNoteRef = useRef<number | null>(null);
  const [isWrong, setIsWrong] = useState(false);

  const reset = useCallback((expectedNotes: number[]) => {
    expectedRef.current = expectedNotes;
    indexRef.current = 0;
    armedNoteRef.current = null;
    setIsWrong(false);
  }, []);

  const handleNoteOn = useCallback((midiNote: number): NoteOnResult => {
    const expected = expectedRef.current;
    const index = indexRef.current;

    if (index >= expected.length) {
      setIsWrong(false);
      return "complete";
    }

    // Only one note can be armed at a time; wait for its key-up.
    if (armedNoteRef.current !== null) {
      if (midiNote === armedNoteRef.current) {
        setIsWrong(false);
        return "armed";
      }
      setIsWrong(true);
      return "wrong";
    }

    if (midiNote === expected[index]) {
      armedNoteRef.current = midiNote;
      setIsWrong(false);
      return "armed";
    }

    setIsWrong(true);
    return "wrong";
  }, []);

  const handleNoteOff = useCallback((midiNote: number): NoteOffResult => {
    if (armedNoteRef.current === null) {
      setIsWrong(false);
      return "idle";
    }

    if (midiNote !== armedNoteRef.current) {
      return "idle";
    }

    armedNoteRef.current = null;
    indexRef.current += 1;
    setIsWrong(false);
    return indexRef.current >= expectedRef.current.length ? "complete" : "advanced";
  }, []);

  return {
    isWrong,
    reset,
    handleNoteOn,
    handleNoteOff,
  };
}
