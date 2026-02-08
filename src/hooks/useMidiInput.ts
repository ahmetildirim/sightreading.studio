import { useEffect, useRef, useState } from "react";

type MidiHandlers = {
  onNoteOn?: (note: number, velocity: number) => void;
  onNoteOff?: (note: number) => void;
  onAllNotesOff?: () => void;
};

export default function useMidiInput({ onNoteOn, onNoteOff, onAllNotesOff }: MidiHandlers) {
  const [midiStatus, setMidiStatus] = useState("MIDI: not connected");
  const activeNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let activeInputs: MIDIInput[] = [];

    if (!navigator.requestMIDIAccess) {
      setMidiStatus("MIDI: not supported in this browser");
      return undefined;
    }

    const handleMidiMessage = (event: MIDIMessageEvent) => {
      if (!event.data) return;
      const [status, note, velocity] = event.data;
      const command = status & 0xf0;

      if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        activeNotesRef.current.delete(note);
        onNoteOff?.(note);
        if (activeNotesRef.current.size === 0) {
          onAllNotesOff?.();
        }
        return;
      }

      if (command !== 0x90) return;
      if (activeNotesRef.current.has(note)) {
        return;
      }
      activeNotesRef.current.add(note);
      onNoteOn?.(note, velocity);
    };

    navigator
      .requestMIDIAccess()
      .then((access) => {
        const inputs = Array.from(access.inputs.values());
        activeInputs = inputs;
        inputs.forEach((input) => {
          input.onmidimessage = handleMidiMessage;
        });
        setMidiStatus(inputs.length ? "MIDI: connected" : "MIDI: no device found");
      })
      .catch(() => {
        setMidiStatus("MIDI: permission denied");
      });

    return () => {
      activeInputs.forEach((input) => {
        input.onmidimessage = null;
      });
      activeNotesRef.current.clear();
    };
  }, [onAllNotesOff, onNoteOff, onNoteOn]);

  return midiStatus;
}
