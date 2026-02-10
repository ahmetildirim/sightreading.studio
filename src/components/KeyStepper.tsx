interface KeyStepperProps {
    label: string;
    value: string;
    hint: string;
    onIncrease: () => void;
    onDecrease: () => void;
}

export default function KeyStepper({
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
                <button
                    type="button"
                    className="stepper-control"
                    onClick={onDecrease}
                    aria-label={`Decrease ${label}`}
                >
                    <span className="material-symbols-outlined">remove</span>
                </button>

                <span className="mono">{value}</span>

                <button
                    type="button"
                    className="stepper-control"
                    onClick={onIncrease}
                    aria-label={`Increase ${label}`}
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
            <span className="key-hint">{hint}</span>
        </div>
    );
}
