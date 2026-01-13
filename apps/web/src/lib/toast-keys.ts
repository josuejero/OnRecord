export const toastKeys = {
  SESSION_STARTED: 'session_started',
  SESSION_START_FAILED: 'session_start_failed',
  SESSION_ENDED: 'session_ended',
  SESSION_END_FAILED: 'session_end_failed',
  RECAP_PUBLISHED: 'recap_published',
  RECAP_UNPUBLISHED: 'recap_unpublished',
  RECAP_PUBLISH_FAILED: 'recap_publish_failed',
  RECAP_UNPUBLISH_FAILED: 'recap_unpublish_failed',
  ASSET_UPLOADED: 'asset_uploaded',
} as const;

export type ToastKey = (typeof toastKeys)[keyof typeof toastKeys];
