import { useEffect, useRef, useState } from "react";

const COMMAND_MASK = 0xf0;
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
export type MidiStatus =
    | "Checking MIDI support…"
    | "MIDI: connected"
    | "MIDI: no device found"
    | "MIDI: not supported in this browser"
    | "MIDI: permission denied";

export interface MidiCallbacks {
    onNoteOn?: (note: number, velocity: number) => void;
    onNoteOff?: (note: number) => void;
    onAllNotesOff?: () => void;
}
export default function useMidiInput(callbacks: MidiCallbacks): MidiStatus {
    const { onNoteOn, onNoteOff, onAllNotesOff } = callbacks;
    const [status, setStatus] = useState<MidiStatus>("Checking MIDI support…");
    const heldNotes = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (!navigator.requestMIDIAccess) {
            setStatus("MIDI: not supported in this browser");
            return;
        }

        let boundInputs: MIDIInput[] = [];

        const handleMessage = (event: MIDIMessageEvent) => {
            if (!event.data || event.data.length < 3) return;

            const [statusByte, note, velocity] = event.data;
            const command = statusByte & COMMAND_MASK;

            if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
                heldNotes.current.delete(note);
                onNoteOff?.(note);
                if (heldNotes.current.size === 0) {
                    onAllNotesOff?.();
                }
                return;
            }

            if (command === NOTE_ON && !heldNotes.current.has(note)) {
                heldNotes.current.add(note);
                onNoteOn?.(note, velocity);
            }
        };

        navigator.requestMIDIAccess().then(
            (access) => {
                const inputs = Array.from(access.inputs.values());
                boundInputs = inputs;
                for (const input of inputs) {
                    input.onmidimessage = handleMessage;
                }
                setStatus(inputs.length > 0 ? "MIDI: connected" : "MIDI: no device found");
            },
            () => {
                setStatus("MIDI: permission denied");
            },
        );

        return () => {
            for (const input of boundInputs) {
                input.onmidimessage = null;
            }
            heldNotes.current.clear();
        };
    }, [onNoteOn, onNoteOff, onAllNotesOff]);

    return status;
}
