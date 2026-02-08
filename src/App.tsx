import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Staff, { type StaffHandle } from "./components/Staff";
import { CURSOR_COLORS, RANGE_PRESETS } from "./config/presets";
import useMidiInput from "./hooks/useMidiInput";
import useSightReadingSession from "./hooks/useSightReadingSession";
import { buildScore } from "./lib/musicxml";

type CursorState = "idle" | "correct" | "wrong";

const CURSOR_STYLES = {
  idle: { color: CURSOR_COLORS.idle, alpha: 0.6 },
  correct: { color: CURSOR_COLORS.correct, alpha: 0.4 },
  wrong: { color: CURSOR_COLORS.wrong, alpha: 0.45 },
} as const;

const MIN_NOTES = 4;
const MAX_NOTES = 200;
const NOTES_PER_MEASURE = 4;

const rangeLabels = Object.keys(RANGE_PRESETS);

function clampNotes(value: number): number {
  return Math.min(MAX_NOTES, Math.max(MIN_NOTES, value));
}

export default function App() {
  const staffRef = useRef<StaffHandle | null>(null);

  const [rangeLabel, setRangeLabel] = useState(rangeLabels[0] ?? "Treble (C4-G5)");
  const [totalNotes, setTotalNotes] = useState(100);
  const [seed, setSeed] = useState(1);
  const [cursorState, setCursorState] = useState<CursorState>("idle");

  const selectedRange = RANGE_PRESETS[rangeLabel] ?? RANGE_PRESETS[rangeLabels[0]];
  const scoreData = useMemo(
    () =>
      buildScore({
        rangePreset: selectedRange,
        notesPerMeasure: NOTES_PER_MEASURE,
        totalNotes,
        seed,
      }),
    [selectedRange, seed, totalNotes]
  );

  const { reset, handleNoteOn, handleNoteOff } = useSightReadingSession();

  useEffect(() => {
    reset(scoreData.expected);
    setCursorState("idle");
    staffRef.current?.resetCursor();
  }, [reset, scoreData.expected]);

  const onMidiNoteOn = useCallback(
    (note: number) => {
      const result = handleNoteOn(note);
      if (result === "armed") {
        setCursorState("correct");
      } else if (result === "wrong") {
        setCursorState("wrong");
      }
    },
    [handleNoteOn]
  );

  const onMidiNoteOff = useCallback(
    (note: number) => {
      const result = handleNoteOff(note);
      if (result === "advanced" || result === "complete") {
        staffRef.current?.nextCursor();
      }
    },
    [handleNoteOff]
  );

  const onMidiAllNotesOff = useCallback(() => {
    setCursorState("idle");
  }, []);

  const midiStatus = useMidiInput({
    onNoteOn: onMidiNoteOn,
    onNoteOff: onMidiNoteOff,
    onAllNotesOff: onMidiAllNotesOff,
  });
  const cursorStyle = CURSOR_STYLES[cursorState];

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Sightreading trainer</p>
          <h1>Practice one measure at a time.</h1>
          <p className="sub">Generate random notes and read them on staff. Adjust range as you improve.</p>
        </div>
        <div className="controls">
          <button className="primary" onClick={() => setSeed((value) => value + 1)}>
            New Random Measure
          </button>
          <label className="switch">
            <span>Note range</span>
            <select
              className="select"
              value={rangeLabel}
              onChange={(event) => setRangeLabel(event.target.value)}
            >
              {rangeLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="switch">
            <span>Total notes</span>
            <input
              className="number"
              type="number"
              min={MIN_NOTES}
              max={MAX_NOTES}
              value={totalNotes}
              onChange={(event) => {
                const value = Number(event.target.value);
                setTotalNotes(Number.isNaN(value) ? 100 : clampNotes(value));
              }}
            />
          </label>
        </div>
      </header>

      <section className="sheet">
        <div className="osmd-wrapper">
          <Staff ref={staffRef} scoreXml={scoreData.xml} cursorStyle={cursorStyle} />
        </div>
      </section>

      <footer className="note">{midiStatus}</footer>
    </main>
  );
}
