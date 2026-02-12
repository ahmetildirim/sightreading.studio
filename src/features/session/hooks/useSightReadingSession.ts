import { useCallback, useRef } from "react";

export type NoteOnResult =
    | "correct"
    | "wrong"
    | "complete";

export type NoteOffResult =
    | "advanced"
    | "complete"
    | "idle";

export interface SightReadingSession {
    reset: (expectedNotes: number[]) => void;
    handleNoteOn: (midiNote: number) => NoteOnResult;
    handleNoteOff: (midiNote: number) => NoteOffResult;
}

export default function useSightReadingSession(): SightReadingSession {
    const expectedNotes = useRef<number[]>([]);
    const cursor = useRef(0);
    const armedNote = useRef<number | null>(null);

    const reset = useCallback((notes: number[]) => {
        expectedNotes.current = notes;
        cursor.current = 0;
        armedNote.current = null;
    }, []);

    const handleNoteOn = useCallback((midiNote: number): NoteOnResult => {
        const idx = cursor.current;

        if (idx >= expectedNotes.current.length) return "complete";

        if (armedNote.current !== null) {
            return midiNote === armedNote.current ? "correct" : "wrong";
        }

        if (midiNote === expectedNotes.current[idx]) {
            armedNote.current = midiNote;
            return "correct";
        }

        return "wrong";
    }, []);

    const handleNoteOff = useCallback((midiNote: number): NoteOffResult => {
        if (armedNote.current === null || midiNote !== armedNote.current) {
            return "idle";
        }

        armedNote.current = null;
        cursor.current += 1;

        return cursor.current >= expectedNotes.current.length
            ? "complete"
            : "advanced";
    }, []);

    return { reset, handleNoteOn, handleNoteOff };
}
