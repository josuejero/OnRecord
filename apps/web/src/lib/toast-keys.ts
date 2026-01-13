export const toastKeys = {
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  RECAP_PUBLISHED: 'recap_published',
  ASSET_UPLOADED: 'asset_uploaded',
} as const;

export type ToastKey = (typeof toastKeys)[keyof typeof toastKeys];
