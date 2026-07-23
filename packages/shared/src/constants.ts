export const APP_LANGUAGES = ['en', 'bn'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const USER_ROLES = ['ADMIN', 'CAPTAIN', 'STUDENT'] as const;
export type UserRole = (typeof USER_ROLES)[number];
