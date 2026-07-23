/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LOGIN_HELP_VIDEO_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_REPORT_PROBLEM_URL?: string;
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_FACEBOOK_URL?: string;
  readonly VITE_YOUTUBE_URL?: string;
  readonly VITE_LINKEDIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
