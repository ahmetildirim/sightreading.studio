/**
 * Application presets and visual configuration.
 *
 * Centralizes the tunable parameters of the trainer:
 *   - Note range presets (which pitches to generate)
 *   - Cursor feedback styles (visual response to correct/incorrect input)
 *
 * To add a new practice range, append an entry to RANGE_PRESETS.
 */

import type { NoteName } from "../generator";

interface CursorStyle {
    color: string;
    alpha: number;
}

export interface GeneratorPreset {
    readonly label: string;
    readonly minNote: NoteName;
    readonly maxNote: NoteName;
}

// ---------------------------------------------------------------------------
// Note range presets
// ---------------------------------------------------------------------------

/**
 * Predefined note ranges, ordered from beginner-friendly to advanced.
 *
 * Each preset constrains random note generation to an inclusive
 * natural-note range (for example C4 to G5).
 */
export const RANGE_PRESETS: readonly GeneratorPreset[] = [
    { label: "Treble (C4–G5)", minNote: "C4", maxNote: "G5" },
    { label: "Treble Wide (A3–C6)", minNote: "A3", maxNote: "C6" },
    { label: "Bass (E2–C4)", minNote: "E2", maxNote: "C4" },
];

// ---------------------------------------------------------------------------
// Cursor feedback styles
// ---------------------------------------------------------------------------

/**
 * Maps each feedback state to the visual style applied to the OSMD cursor.
 *
 *   idle    — default blue; awaiting player input
 *   correct — green flash; the player pressed the right key
 *   wrong   — red flash; the player pressed the wrong key
 */
export const CURSOR_STYLES: Readonly<Record<string, CursorStyle>> = {
    idle: { color: "#6daaf5", alpha: 0.60 },
    correct: { color: "#76ffa8", alpha: 0.40 },
    wrong: { color: "#f76666", alpha: 0.45 },
};
