import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import Staff, { type StaffHandle } from "./components/Staff";
import { CURSOR_STYLES } from "./config/presets";
import {
  NOTE_NAMES,
  generateScore,
  type NoteName,
} from "./generator";
import useMidiInput, { type MidiStatus } from "./hooks/useMidiInput";
import useSightReadingSession from "./hooks/useSightReadingSession";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

type CursorFeedback = "idle" | "correct" | "wrong";
type AppPage = "setup" | "practice" | "settings";
type ReturnPage = Exclude<AppPage, "settings">;
type MidiInputOption = { id: string; name: string };

const MIN_TOTAL_NOTES = 4;
const MAX_TOTAL_NOTES = 200;
const DEFAULT_TOTAL_NOTES = 20;
const DEFAULT_MIN_NOTE: NoteName = "A0";
const DEFAULT_MAX_NOTE: NoteName = "C8";
const MISSED_MESSAGE_TIMEOUT_MS = 1400;

const CHROMATIC_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampNoteCount(value: number): number {
  return clamp(value, MIN_TOTAL_NOTES, MAX_TOTAL_NOTES);
}

function midiToNoteLabel(midi: number): string {
  const safeMidi = clamp(Math.round(midi), 0, 127);
  const octave = Math.floor(safeMidi / 12) - 1;
  const note = CHROMATIC_NAMES[safeMidi % 12];
  return `${note}${octave}`;
}

function midiStatusLabel(status: MidiStatus): string {
  if (status === "MIDI: connected") return "MIDI Connected";
  if (status === "Checking MIDI support…") return "Checking MIDI";
  if (status === "MIDI: permission denied") return "MIDI Permission Denied";
  if (status === "MIDI: not supported in this browser") return "MIDI Unsupported";
  return "MIDI Disconnected";
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const staffRef = useRef<StaffHandle>(null);
  const missedMessageTimer = useRef<number | null>(null);
  const timerStartedAtMs = useRef<number | null>(null);
  const timerAccumulatedMs = useRef(0);

  const [page, setPage] = useState<AppPage>("setup");
  const [settingsReturnPage, setSettingsReturnPage] = useState<ReturnPage>("setup");
  const [minNote, setMinNote] = useState<NoteName>(DEFAULT_MIN_NOTE);
  const [maxNote, setMaxNote] = useState<NoteName>(DEFAULT_MAX_NOTE);
  const [totalNotes, setTotalNotes] = useState(DEFAULT_TOTAL_NOTES);
  const [seed, setSeed] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MidiInputOption[]>([]);
  const [selectedMidiDevice, setSelectedMidiDevice] = useState("");

  const [cursorFeedback, setCursorFeedback] = useState<CursorFeedback>("idle");
  const [completedNotes, setCompletedNotes] = useState(0);
  const [isTimerRunning, setTimerRunning] = useState(false);
  const [elapsedTimerMs, setElapsedTimerMs] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [missedMessage, setMissedMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    let accessRef: MIDIAccess | null = null;
    let mounted = true;

    const syncInputs = () => {
      if (!accessRef || !mounted) return;
      const inputs = Array.from(accessRef.inputs.values()).map((input) => ({
        id: input.id,
        name: input.name ?? "Unnamed MIDI Input",
      }));
      setMidiInputs(inputs);
    };

    navigator.requestMIDIAccess().then(
      (access) => {
        if (!mounted) return;
        accessRef = access;
        syncInputs();
        access.onstatechange = syncInputs;
      },
      () => {
        if (!mounted) return;
        setMidiInputs([]);
      },
    );

    return () => {
      mounted = false;
      if (accessRef) {
        accessRef.onstatechange = null;
      }
    };
  }, []);

  useEffect(() => {
    if (midiInputs.length === 0) {
      setSelectedMidiDevice("");
      return;
    }

    setSelectedMidiDevice((current) => {
      if (current && midiInputs.some((input) => input.id === current)) {
        return current;
      }
      return midiInputs[0].id;
    });
  }, [midiInputs]);

  useEffect(() => {
    return () => {
      if (missedMessageTimer.current !== null) {
        window.clearTimeout(missedMessageTimer.current);
      }
    };
  }, []);

  const resetTimer = useCallback(() => {
    timerStartedAtMs.current = null;
    timerAccumulatedMs.current = 0;
    setElapsedTimerMs(0);
    setTimerRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (isTimerRunning) return;
    timerStartedAtMs.current = Date.now();
    setTimerRunning(true);
  }, [isTimerRunning]);

  const stopTimer = useCallback(() => {
    if (!isTimerRunning || timerStartedAtMs.current === null) return;
    timerAccumulatedMs.current += Date.now() - timerStartedAtMs.current;
    timerStartedAtMs.current = null;
    setElapsedTimerMs(timerAccumulatedMs.current);
    setTimerRunning(false);
  }, [isTimerRunning]);

  const toggleTimer = useCallback(() => {
    if (isTimerRunning) {
      stopTimer();
      return;
    }
    startTimer();
  }, [isTimerRunning, startTimer, stopTimer]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const tick = () => {
      if (timerStartedAtMs.current === null) return;
      setElapsedTimerMs(
        timerAccumulatedMs.current + (Date.now() - timerStartedAtMs.current),
      );
    };

    tick();
    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

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

  const { reset, handleNoteOn, handleNoteOff } = useSightReadingSession();

  const clearMissedMessage = useCallback(() => {
    if (missedMessageTimer.current !== null) {
      window.clearTimeout(missedMessageTimer.current);
      missedMessageTimer.current = null;
    }
    setMissedMessage(null);
  }, []);

  const showMissedMessage = useCallback((midi: number) => {
    if (missedMessageTimer.current !== null) {
      window.clearTimeout(missedMessageTimer.current);
    }
    setMissedMessage(`Missed ${midiToNoteLabel(midi)}`);
    missedMessageTimer.current = window.setTimeout(() => {
      setMissedMessage(null);
      missedMessageTimer.current = null;
    }, MISSED_MESSAGE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    reset(score.expectedNotes);
    setCursorFeedback("idle");
    setCompletedNotes(0);
    setAttempts(0);
    setCorrectAttempts(0);
    resetTimer();
    clearMissedMessage();
    staffRef.current?.resetCursor();
  }, [reset, score.expectedNotes, clearMissedMessage, resetTimer]);

  const onNoteOn = useCallback(
    (note: number) => {
      if (page === "practice" && !isTimerRunning) {
        startTimer();
      }

      const result = handleNoteOn(note);
      if (result === "complete") return;

      setAttempts((value) => value + 1);

      if (result === "correct") {
        setCorrectAttempts((value) => value + 1);
        setCursorFeedback("correct");
        return;
      }

      setCursorFeedback("wrong");
      showMissedMessage(note);
    },
    [handleNoteOn, showMissedMessage, page, isTimerRunning, startTimer],
  );

  const onNoteOff = useCallback(
    (note: number) => {
      const result = handleNoteOff(note);
      if (result !== "advanced" && result !== "complete") return;

      staffRef.current?.nextCursor();
      setCompletedNotes((value) => Math.min(totalNotes, value + 1));
      setCursorFeedback("idle");
    },
    [handleNoteOff, totalNotes],
  );

  const onAllNotesOff = useCallback(() => {
    setCursorFeedback("idle");
  }, []);

  const midiStatus = useMidiInput({ onNoteOn, onNoteOff, onAllNotesOff });

  const midiConnected = midiStatus === "MIDI: connected";
  const midiLabel = midiStatusLabel(midiStatus);

  const cursorStyle = CURSOR_STYLES[cursorFeedback];

  const minIndex = NOTE_NAMES.indexOf(minNote);
  const maxIndex = NOTE_NAMES.indexOf(maxNote);
  const maxNoteIndex = NOTE_NAMES.length - 1;
  const selectedRangeLeftPercent = (minIndex / maxNoteIndex) * 100;
  const selectedRangeWidthPercent =
    ((maxIndex - minIndex) / maxNoteIndex) * 100;

  const accuracy =
    attempts === 0 ? 100 : Math.round((correctAttempts / attempts) * 100);
  const elapsedSeconds = Math.floor(elapsedTimerMs / 1000);

  const rangeSummary =
    minNote === "A0" && maxNote === "C8"
      ? "Full Piano (A0 - C8)"
      : `${minNote} - ${maxNote}`;

  const updateMinNoteByStep = useCallback(
    (delta: number) => {
      setMinNote((current) => {
        const currentIndex = NOTE_NAMES.indexOf(current);
        const maxAllowedIndex = NOTE_NAMES.indexOf(maxNote);
        const nextIndex = clamp(currentIndex + delta, 0, maxAllowedIndex);
        return NOTE_NAMES[nextIndex] as NoteName;
      });
    },
    [maxNote],
  );

  const updateMaxNoteByStep = useCallback(
    (delta: number) => {
      setMaxNote((current) => {
        const currentIndex = NOTE_NAMES.indexOf(current);
        const minAllowedIndex = NOTE_NAMES.indexOf(minNote);
        const nextIndex = clamp(currentIndex + delta, minAllowedIndex, maxNoteIndex);
        return NOTE_NAMES[nextIndex] as NoteName;
      });
    },
    [minNote, maxNoteIndex],
  );

  const startSession = useCallback(() => {
    setSeed((value) => value + 1);
    setPage("practice");
  }, []);

  const finishSession = useCallback(() => {
    resetTimer();
    setPage("setup");
  }, [resetTimer]);

  const openSettings = useCallback((from: ReturnPage) => {
    setSettingsReturnPage(from);
    setPage("settings");
  }, []);

  const closeSettings = useCallback(() => {
    setPage(settingsReturnPage);
  }, [settingsReturnPage]);

  if (page === "setup") {
    return (
      <GeneratorSetupPage
        midiConnected={midiConnected}
        midiLabel={midiLabel}
        minNote={minNote}
        maxNote={maxNote}
        totalNotes={totalNotes}
        rangeSummary={rangeSummary}
        selectedRangeLeftPercent={selectedRangeLeftPercent}
        selectedRangeWidthPercent={selectedRangeWidthPercent}
        onDecreaseMinNote={() => updateMinNoteByStep(-1)}
        onIncreaseMinNote={() => updateMinNoteByStep(1)}
        onDecreaseMaxNote={() => updateMaxNoteByStep(-1)}
        onIncreaseMaxNote={() => updateMaxNoteByStep(1)}
        onDecreaseNotes={() =>
          setTotalNotes((value) => clampNoteCount(value - 1))
        }
        onIncreaseNotes={() =>
          setTotalNotes((value) => clampNoteCount(value + 1))
        }
        onNoteCountInput={(value) =>
          setTotalNotes(
            Number.isNaN(value) ? DEFAULT_TOTAL_NOTES : clampNoteCount(value),
          )
        }
        onStartSession={startSession}
        onOpenSettings={() => openSettings("setup")}
      />
    );
  }

  if (page === "practice") {
    return (
      <PracticePlayerPage
        staffRef={staffRef}
        scoreXml={score.xml}
        cursorStyle={cursorStyle}
        rangeLabel={`${minNote} - ${maxNote}`}
        totalNotes={totalNotes}
        completedNotes={completedNotes}
        accuracy={accuracy}
        elapsedTimeLabel={formatTime(elapsedSeconds)}
        timerRunning={isTimerRunning}
        onToggleTimer={toggleTimer}
        missedMessage={missedMessage}
        onFinish={finishSession}
      />
    );
  }

  return (
    <SettingsPage
      darkMode={darkMode}
      midiInputs={midiInputs}
      midiDevice={selectedMidiDevice}
      midiConnected={midiConnected}
      onDarkModeChange={setDarkMode}
      onMidiDeviceChange={setSelectedMidiDevice}
      onBack={closeSettings}
    />
  );
}

// ---------------------------------------------------------------------------
// Generator Setup Page
// ---------------------------------------------------------------------------

interface GeneratorSetupPageProps {
  midiConnected: boolean;
  midiLabel: string;
  minNote: NoteName;
  maxNote: NoteName;
  totalNotes: number;
  rangeSummary: string;
  selectedRangeLeftPercent: number;
  selectedRangeWidthPercent: number;
  onDecreaseMinNote: () => void;
  onIncreaseMinNote: () => void;
  onDecreaseMaxNote: () => void;
  onIncreaseMaxNote: () => void;
  onDecreaseNotes: () => void;
  onIncreaseNotes: () => void;
  onNoteCountInput: (value: number) => void;
  onStartSession: () => void;
  onOpenSettings: () => void;
}

function GeneratorSetupPage({
  midiConnected,
  midiLabel,
  minNote,
  maxNote,
  totalNotes,
  rangeSummary,
  selectedRangeLeftPercent,
  selectedRangeWidthPercent,
  onDecreaseMinNote,
  onIncreaseMinNote,
  onDecreaseMaxNote,
  onIncreaseMaxNote,
  onDecreaseNotes,
  onIncreaseNotes,
  onNoteCountInput,
  onStartSession,
  onOpenSettings,
}: GeneratorSetupPageProps) {
  return (
    <div className="setup-page">
      <nav className="setup-nav">
        <div className="setup-brand">
          <span className="material-symbols-outlined">piano</span>
          <span>88keys.app</span>
        </div>

        <div className="setup-nav-right">
          <div className="midi-chip">
            <span
              className={`status-dot ${midiConnected ? "connected" : "disconnected"}`}
              aria-hidden
            />
            <span className="midi-chip-label">{midiLabel}</span>
          </div>

          <button
            type="button"
            className="profile-button"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </nav>

      <main className="setup-main">
        <div className="setup-wrapper">
          <header className="setup-intro">
            <h1>Generator Setup</h1>
            <p>Configure your sight-reading session parameters.</p>
          </header>

          <section className="setup-card">
            <div className="setup-section">
              <div className="section-head">
                <h2>
                  <span className="material-symbols-outlined">piano</span>
                  Note Range
                </h2>
                <span>{rangeSummary}</span>
              </div>

              <div className="key-grid">
                <KeyStepper
                  label="Minimum Key"
                  value={minNote}
                  hint="Lowest note to generate"
                  onIncrease={onIncreaseMinNote}
                  onDecrease={onDecreaseMinNote}
                />

                <KeyStepper
                  label="Maximum Key"
                  value={maxNote}
                  hint="Highest note to generate"
                  onIncrease={onIncreaseMaxNote}
                  onDecrease={onDecreaseMaxNote}
                />
              </div>

              <div className="range-slider" aria-hidden>
                <div className="range-track">
                  <div
                    className="range-selection"
                    style={{
                      left: `${selectedRangeLeftPercent}%`,
                      width: `${Math.max(selectedRangeWidthPercent, 1.5)}%`,
                    }}
                  />
                  <span
                    className="range-handle"
                    style={{ left: `${selectedRangeLeftPercent}%` }}
                  />
                  <span
                    className="range-handle"
                    style={{ left: `${selectedRangeLeftPercent + selectedRangeWidthPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="setup-section">
              <div className="section-head">
                <h2>
                  <span className="material-symbols-outlined">queue_music</span>
                  Session Length
                </h2>
              </div>

              <label className="notes-label" htmlFor="number-of-notes-input">
                Number of Notes
              </label>
              <div className="notes-row">
                <button
                  type="button"
                  className="step-button"
                  onClick={onDecreaseNotes}
                  aria-label="Decrease note count"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>

                <div className="notes-input-wrap">
                  <input
                    id="number-of-notes-input"
                    className="notes-input"
                    type="number"
                    min={MIN_TOTAL_NOTES}
                    max={MAX_TOTAL_NOTES}
                    value={totalNotes}
                    onChange={(event) => onNoteCountInput(Number(event.target.value))}
                  />
                  <span>notes</span>
                </div>

                <button
                  type="button"
                  className="step-button"
                  onClick={onIncreaseNotes}
                  aria-label="Increase note count"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div className="setup-actions">
              <button
                type="button"
                className="start-session-button"
                onClick={onStartSession}
              >
                <span className="material-symbols-outlined">play_arrow</span>
                <span>Start Session</span>
              </button>
            </div>
          </section>

          <div className="setup-links">
            <button type="button" className="ghost-link" onClick={onOpenSettings}>
              <span className="material-symbols-outlined">settings</span>
              Advanced Settings
            </button>
          </div>
        </div>
      </main>

      <footer className="setup-footer">© 2023 88keys.app. Minimalist Sight-Reading Trainer.</footer>
    </div>
  );
}

interface KeyStepperProps {
  label: string;
  value: string;
  hint: string;
  onIncrease: () => void;
  onDecrease: () => void;
}

function KeyStepper({
  label,
  value,
  hint,
  onIncrease,
  onDecrease,
}: KeyStepperProps) {
  return (
    <div className="key-stepper">
      <span className="key-label">{label}</span>
      <div className="key-field">
        <span>{value}</span>
        <div className="key-step-buttons">
          <button type="button" onClick={onIncrease} aria-label={`Increase ${label}`}>
            <span className="material-symbols-outlined">expand_less</span>
          </button>
          <button type="button" onClick={onDecrease} aria-label={`Decrease ${label}`}>
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      </div>
      <span className="key-hint">{hint}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Practice Player Page
// ---------------------------------------------------------------------------

interface PracticePlayerPageProps {
  staffRef: RefObject<StaffHandle | null>;
  scoreXml: string;
  cursorStyle: { color: string; alpha: number };
  rangeLabel: string;
  totalNotes: number;
  completedNotes: number;
  accuracy: number;
  elapsedTimeLabel: string;
  timerRunning: boolean;
  onToggleTimer: () => void;
  missedMessage: string | null;
  onFinish: () => void;
}

function PracticePlayerPage({
  staffRef,
  scoreXml,
  cursorStyle,
  rangeLabel,
  totalNotes,
  completedNotes,
  accuracy,
  elapsedTimeLabel,
  timerRunning,
  onToggleTimer,
  missedMessage,
  onFinish,
}: PracticePlayerPageProps) {
  const completionPercent = Math.min(
    100,
    (completedNotes / Math.max(totalNotes, 1)) * 100,
  );
  const completionPercentLabel = `${Math.round(completionPercent)}%`;

  return (
    <div className="practice-page">
      <header className="practice-header">
        <div className="practice-header-inner">
          <div className="practice-header-top">
            <div className="practice-session-meta">
              <h2>Practice Session</h2>
              <p>Range: {rangeLabel} | {totalNotes} Notes</p>
            </div>

            <div className="practice-stat-list">
              <button
                type="button"
                className={`practice-stat-chip timer-chip ${timerRunning ? "running" : ""}`}
                onClick={onToggleTimer}
                aria-label={timerRunning ? "Stop timer" : "Start timer"}
              >
                <span className="material-symbols-outlined">schedule</span>
                <span className="practice-stat-value">{elapsedTimeLabel}</span>
                <span className="practice-stat-label">Time</span>
                <span className="material-symbols-outlined timer-chip-action-icon">
                  {timerRunning ? "pause_circle" : "play_circle"}
                </span>
              </button>

              <div className="practice-stat-chip">
                <span className="material-symbols-outlined">music_note</span>
                <span className="practice-stat-value">{completedNotes}/{totalNotes}</span>
                <span className="practice-stat-label">Notes</span>
              </div>

              <div className="practice-stat-chip success">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="practice-stat-value">{accuracy}%</span>
                <span className="practice-stat-label">Acc.</span>
              </div>
            </div>
          </div>

          <div className="practice-progress-row">
            <span className="practice-progress-label">{completionPercentLabel}</span>
            <div className="practice-progress-track" aria-label="Completed notes progress">
              <span
                className="practice-progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="practice-progress-label">100%</span>
          </div>
        </div>
      </header>

      <main className="practice-main">
        {missedMessage ? (
          <div className="missed-message" aria-live="polite">
            {missedMessage}
          </div>
        ) : null}

        <div className="practice-score">
          <Staff ref={staffRef} scoreXml={scoreXml} cursorStyle={cursorStyle} />
        </div>
      </main>

      <footer className="practice-footer">
        <button type="button" className="finish-button" onClick={onFinish}>
          <span className="material-symbols-outlined">flag</span>
          <span>Finish Session</span>
        </button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

interface SettingsPageProps {
  darkMode: boolean;
  midiInputs: MidiInputOption[];
  midiDevice: string;
  midiConnected: boolean;
  onDarkModeChange: (value: boolean) => void;
  onMidiDeviceChange: (value: string) => void;
  onBack: () => void;
}

function SettingsPage({
  darkMode,
  midiInputs,
  midiDevice,
  midiConnected,
  onDarkModeChange,
  onMidiDeviceChange,
  onBack,
}: SettingsPageProps) {
  return (
    <div className="settings-page">
      <nav className="settings-nav">
        <div className="settings-nav-inner">
          <div className="settings-brand">
            <div className="brand-mark">88</div>
            <span>88keys.app</span>
          </div>

          <button type="button" className="back-button" onClick={onBack}>
            <span>Back to Practice</span>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </nav>

      <main className="settings-main">
        <div className="settings-wrapper">
          <header className="settings-intro">
            <h1>Settings</h1>
            <p>Configure your instrument and appearance.</p>
          </header>

          <section className="settings-card">
            <div className="settings-section">
              <div className="settings-title">
                <div className="settings-icon-box">
                  <span className="material-symbols-outlined">palette</span>
                </div>
                <h2>Appearance</h2>
              </div>

              <div className="toggle-row">
                <div>
                  <h3>Dark Mode</h3>
                  <p>Switch between light and dark themes.</p>
                </div>
                <label className="switch" htmlFor="dark-mode-toggle">
                  <input
                    id="dark-mode-toggle"
                    className="toggle-input"
                    type="checkbox"
                    checked={darkMode}
                    onChange={(event) => onDarkModeChange(event.target.checked)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <div className="settings-icon-box">
                  <span className="material-symbols-outlined">piano</span>
                </div>
                <h2>MIDI Input Device</h2>
              </div>

              <label className="settings-field" htmlFor="midi-device-select">
                Select MIDI Device
              </label>

              <div className="select-wrap">
                <select
                  id="midi-device-select"
                  value={midiDevice}
                  onChange={(event) => onMidiDeviceChange(event.target.value)}
                  disabled={midiInputs.length === 0}
                >
                  {midiInputs.length === 0 ? (
                    <option value="">No MIDI inputs detected</option>
                  ) : (
                    midiInputs.map((input) => (
                      <option key={input.id} value={input.id}>
                        {input.name}
                      </option>
                    ))
                  )}
                </select>
                <span className="material-symbols-outlined">expand_more</span>
              </div>

              <div
                className={`device-status ${midiConnected ? "connected" : "disconnected"}`}
              >
                <span className="status-dot" aria-hidden />
                <span>{midiConnected ? "Device Connected" : "No Device Detected"}</span>
              </div>

              <div className="settings-info">
                <span className="material-symbols-outlined">info</span>
                <p>
                  If your keyboard isn't showing up, try reconnecting the USB cable
                  or refreshing the page.
                </p>
              </div>
            </div>

            <div className="settings-bottom-row">
              <span>Version 1.0.2 (Build 8420)</span>
            </div>
          </section>

          <div className="settings-handle" aria-hidden />
        </div>
      </main>
    </div>
  );
}
