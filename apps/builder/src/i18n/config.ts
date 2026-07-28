export type Locale = (typeof locales)[number]

// `de` was listed here with no `messages/de.json` to back it, so picking German
// broke the panel. `vi` is the opposite case: the file ships but the locale was
// never registered, which left it unreachable from the selector.
export const locales = ["en", "vi", "pt-BR"] as const
export const defaultLocale: Locale = "pt-BR"
