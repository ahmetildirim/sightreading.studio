import { useEffect } from "react";

import AppTopBar from "./AppTopBar";

type ImprovementItem = {
    note: string;
    misses: number;
};

interface SessionResultPageProps {
    accuracy: number;
    speedNpm: number;
    speedDelta: number;
    improvements: ImprovementItem[];
    durationLabel: string;
    sessionId: string;
    onNewSetup: () => void;
    onTryAgain: () => void;
}

export default function SessionResultPage({
    accuracy,
    speedNpm,
    speedDelta,
    improvements,
    durationLabel,
    sessionId,
    onNewSetup,
    onTryAgain,
}: SessionResultPageProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            onTryAgain();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onTryAgain]);

    return (
        <div className="app-page result-page">
            <AppTopBar />

            <main className="result-main">
                <section className="result-card">
                    <div className="result-status-icon" aria-hidden>
                        <span className="material-symbols-outlined">check</span>
                    </div>

                    <header className="result-intro">
                        <p className="section-kicker">Session report</p>
                        <h1>Session complete</h1>
                        <p className="mono">{sessionId}</p>
                    </header>

                    <div className="result-metrics">
                        <article className="result-metric-card">
                            <h2>Accuracy</h2>
                            <div className="result-metric-value primary">{accuracy}%</div>
                        </article>

                        <article className="result-metric-card">
                            <h2>Speed</h2>
                            <div className="result-metric-value">
                                {speedNpm}
                                <span>NPM</span>
                            </div>
                            <p className={`result-speed-delta ${speedDelta >= 0 ? "up" : "down"}`}>
                                {speedDelta >= 0 ? "+" : ""}
                                {speedDelta} vs avg
                            </p>
                        </article>

                        <article className="result-metric-card">
                            <h2>Total time</h2>
                            <div className="result-metric-value time">{durationLabel}</div>
                        </article>
                    </div>

                    <section className="result-improvements">
                        <h3>Focus notes</h3>

                        {improvements.length === 0 ? (
                            <div className="result-improvement-row empty">
                                <div className="result-note-badge success">OK</div>
                                <div>
                                    <div className="result-row-title">No major weak spots detected</div>
                                    <p>Keep going with this setup.</p>
                                </div>
                            </div>
                        ) : (
                            improvements.map((item) => (
                                <div key={item.note} className="result-improvement-row">
                                    <div className="result-note-badge">{item.note}</div>
                                    <div>
                                        <div className="result-row-title">{item.note}</div>
                                        <p>Missed {item.misses} {item.misses === 1 ? "time" : "times"}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>

                    <div className="result-actions">
                        <button type="button" className="result-secondary-button" onClick={onNewSetup}>
                            New setup
                        </button>

                        <button type="button" className="result-primary-button" onClick={onTryAgain}>
                            <span className="material-symbols-outlined">replay</span>
                            <span>Try again</span>
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
