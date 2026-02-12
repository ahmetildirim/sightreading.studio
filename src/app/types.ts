export type AppPage = "setup" | "practice" | "settings" | "results" | "about";
export type ReturnPage = Exclude<AppPage, "settings" | "about">;
