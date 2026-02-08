/**
 * Root application component for 88keys sight-reading trainer.
 *
 * Orchestrates the data flow between three concerns:
 *
 *   1. Score generation — random MusicXML based on user settings
 *   2. MIDI input      — listens for key presses from a connected device
 *   3. Session tracking — compares pressed notes against the expected sequence
 *
 * Data flows in one direction:
 *
 *   User settings → generated score → expected notes
 *       → session state machine → cursor feedback → Staff renderer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Staff, { type StaffHandle } from "./components/Staff";
import { CURSOR_STYLES } from "./config/presets";
import useMidiInput from "./hooks/useMidiInput";
import useSightReadingSession from "./hooks/useSightReadingSession";
import {
  NOTE_NAMES,
  generateScore,
  type NoteName,
} from "./generator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Feedback state that drives cursor color — one of the CURSOR_STYLES keys. */
type CursorFeedback = "idle" | "correct" | "wrong";

const MIN_TOTAL_NOTES = 4;
const MAX_TOTAL_NOTES = 200;
const DEFAULT_TOTAL_NOTES = 100;

/** Clamps a note count to the allowed [MIN, MAX] range. */
function clampNoteCount(n: number): number {
  return Math.max(MIN_TOTAL_NOTES, Math.min(MAX_TOTAL_NOTES, n));
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const staffRef = useRef<StaffHandle>(null);

  // -- User settings --------------------------------------------------------

  const [minNote, setMinNote] = useState<NoteName>("C4");
  const [maxNote, setMaxNote] = useState<NoteName>("G5");
  const [totalNotes, setTotalNotes] = useState(DEFAULT_TOTAL_NOTES);
  const [seed, setSeed] = useState(1);

  // -- Score generation (derived from settings) -----------------------------

  const score = useMemo(
    () =>
      generateScore({
        minNote,
        maxNote,
        noteCount: totalNotes,
        seed,
      }),
    [minNote, maxNote, totalNotes, seed],
  );

  // -- Sight-reading session ------------------------------------------------

  const [cursorFeedback, setCursorFeedback] = useState<CursorFeedback>("idle");
  const { reset, handleNoteOn, handleNoteOff } = useSightReadingSession();

  // Reset the session whenever a new score is generated.
  useEffect(() => {
    reset(score.expectedNotes);
    setCursorFeedback("idle");
    staffRef.current?.resetCursor();
  }, [reset, score.expectedNotes]);

  // -- MIDI event handlers --------------------------------------------------

  const onNoteOn = useCallback(
    (note: number) => {
      const result = handleNoteOn(note);
      setCursorFeedback(result === "correct" ? "correct" : "wrong");
    },
    [handleNoteOn],
  );

  const onNoteOff = useCallback(
    (note: number) => {
      const result = handleNoteOff(note);
      if (result === "advanced" || result === "complete") {
        staffRef.current?.nextCursor();
        setCursorFeedback("idle");
      }
    },
    [handleNoteOff],
  );

  const onAllNotesOff = useCallback(() => {
    setCursorFeedback("idle");
  }, []);

  const midiStatus = useMidiInput({ onNoteOn, onNoteOff, onAllNotesOff });

  // -- Derived visual state -------------------------------------------------

  const cursorStyle = CURSOR_STYLES[cursorFeedback];

  // -- Render ---------------------------------------------------------------

  return (
    <main className="app">
      <ControlPanel
        minNote={minNote}
        maxNote={maxNote}
        totalNotes={totalNotes}
        onMinNoteChange={setMinNote}
        onMaxNoteChange={setMaxNote}
        onTotalNotesChange={setTotalNotes}
        onNewScore={() => setSeed((s) => s + 1)}
      />

      <section className="sheet">
        <div className="osmd-wrapper">
          <Staff ref={staffRef} scoreXml={score.xml} cursorStyle={cursorStyle} />
        </div>
      </section>

      <footer className="note">{midiStatus}</footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// ControlPanel (private sub-component)
// ---------------------------------------------------------------------------

interface ControlPanelProps {
  minNote: NoteName;
  maxNote: NoteName;
  totalNotes: number;
  onMinNoteChange: (note: NoteName) => void;
  onMaxNoteChange: (note: NoteName) => void;
  onTotalNotesChange: (count: number) => void;
  onNewScore: () => void;
}

/**
 * Header with the title copy and user-adjustable controls.
 *
 * Extracted as a named function component for readability, but kept in
 * the same file because it has no independent reuse outside of App.
 */
function ControlPanel({
  minNote,
  maxNote,
  totalNotes,
  onMinNoteChange,
  onMaxNoteChange,
  onTotalNotesChange,
  onNewScore,
}: ControlPanelProps) {
  const minIndex = NOTE_NAMES.indexOf(minNote);
  const maxIndex = NOTE_NAMES.indexOf(maxNote);
  const maxCandidates = NOTE_NAMES.filter((_, index) => index >= minIndex);
  const minCandidates = NOTE_NAMES.filter((_, index) => index <= maxIndex);

  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Sightreading trainer</p>
        <h1>Practice one measure at a time.</h1>
        <p className="sub">
          Generate random notes and read them on staff. Adjust range as you
          improve.
        </p>
      </div>

      <div className="controls">
        <button className="primary" onClick={onNewScore}>
          New Random Score
        </button>

        <label className="switch">
          <span>Min note</span>
          <select
            className="select"
            value={minNote}
            onChange={(e) => onMinNoteChange(e.target.value as NoteName)}
          >
            {minCandidates.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label className="switch">
          <span>Max note</span>
          <select
            className="select"
            value={maxNote}
            onChange={(e) => onMaxNoteChange(e.target.value as NoteName)}
          >
            {maxCandidates.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label className="switch">
          <span>Total notes</span>
          <input
            className="number"
            type="number"
            min={MIN_TOTAL_NOTES}
            max={MAX_TOTAL_NOTES}
            value={totalNotes}
            onChange={(e) => {
              const n = Number(e.target.value);
              onTotalNotesChange(Number.isNaN(n) ? DEFAULT_TOTAL_NOTES : clampNoteCount(n));
            }}
          />
        </label>
      </div>
    </header>
  );
}
