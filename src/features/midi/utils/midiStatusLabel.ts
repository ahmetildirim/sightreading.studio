import type { MidiStatus } from "../hooks/useMidiInput";

export function midiStatusLabel(status: MidiStatus): string {
    if (status === "MIDI: connected") return "MIDI connected";
    if (status === "Checking MIDI support…") return "Checking MIDI";
    if (status === "MIDI: permission denied") return "MIDI permission denied";
    if (status === "MIDI: not supported in this browser") return "MIDI unsupported";
    return "MIDI disconnected";
}
