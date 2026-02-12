import type { ReactNode } from "react";
import { APP_NAME, APP_RELEASE_STAGE } from "../config/appMeta";

interface AppTopBarProps {
    rightSlot?: ReactNode;
}

export default function AppTopBar({ rightSlot }: AppTopBarProps) {
    return (
        <header className="app-top-bar">
            <div className="app-top-bar-inner">
                <div className="app-brand" aria-label={`${APP_NAME}.app ${APP_RELEASE_STAGE}`}>
                    <span className="app-brand-mark" aria-hidden>
                        88
                    </span>
                    <span className="app-brand-wordmark">
                        <strong>keys.app</strong>
                        <small>Sight Reading Lab · {APP_RELEASE_STAGE}</small>
                    </span>
                </div>

                {rightSlot ? <div className="app-top-bar-right">{rightSlot}</div> : null}
            </div>
        </header>
    );
}
