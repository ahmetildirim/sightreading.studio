interface BackButtonProps {
    onClick: () => void;
    label?: string;
}

export default function BackButton({ onClick, label = "Back" }: BackButtonProps) {
    return (
        <button type="button" className="back-button" onClick={onClick}>
            <span className="material-symbols-outlined">chevron_left</span>
            <span>{label}</span>
        </button>
    );
}
