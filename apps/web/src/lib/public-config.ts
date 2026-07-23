function optionalHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function optionalEmail(value: string | undefined): string | undefined {
  const email = value?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export const publicConfig = {
  supportEmail: optionalEmail(import.meta.env.VITE_SUPPORT_EMAIL),
  reportProblemUrl: optionalHttpUrl(import.meta.env.VITE_REPORT_PROBLEM_URL),
  socialLinks: [
    { label: 'GitHub', url: optionalHttpUrl(import.meta.env.VITE_GITHUB_URL) },
    { label: 'Facebook', url: optionalHttpUrl(import.meta.env.VITE_FACEBOOK_URL) },
    { label: 'YouTube', url: optionalHttpUrl(import.meta.env.VITE_YOUTUBE_URL) },
    { label: 'LinkedIn', url: optionalHttpUrl(import.meta.env.VITE_LINKEDIN_URL) },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url)),
};
