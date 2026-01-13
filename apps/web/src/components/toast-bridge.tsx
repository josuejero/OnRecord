'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { toastKeys } from '@/lib/toast-keys';

export function ToastBridge() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const toastKey = searchParams.get('toast');
    const toastError = searchParams.get('toast_error');
    if (!toastKey || handledRef.current === toastKey) return;
    handledRef.current = toastKey;

    const slug = searchParams.get('slug');
    const assetUrl = searchParams.get('asset_url');

    if (toastKey === toastKeys.SESSION_STARTED) {
      toast.success('Session started', {
        description: 'The session is live. Questions and recaps are now available.',
      });
    } else if (toastKey === toastKeys.SESSION_START_FAILED) {
      toast.error('Unable to start session', {
        description: toastError ?? 'Something went wrong. Please try again.',
      });
    } else if (toastKey === toastKeys.SESSION_ENDED) {
      toast.success('Session ended', {
        description: 'The session is closed. Start a new one when you are ready.',
      });
    } else if (toastKey === toastKeys.SESSION_END_FAILED) {
      toast.error('Unable to end session', {
        description: toastError ?? 'Something went wrong. Please try again.',
      });
    } else if (toastKey === toastKeys.RECAP_PUBLISHED) {
      toast.success('Recap published', {
        description: 'The recap is now public.',
        action: slug
          ? {
              label: 'View recap',
              onClick: () => router.push(`/recaps/${slug}`),
            }
          : undefined,
      });
    } else if (toastKey === toastKeys.ASSET_UPLOADED) {
      toast.success('Upload complete', {
        description: 'Your file is saved to this session.',
        action: assetUrl
          ? {
              label: 'View asset',
              onClick: () => window.open(assetUrl, '_blank'),
            }
          : undefined,
      });
    } else if (toastKey === toastKeys.RECAP_UNPUBLISHED) {
      toast.success('Recap unpublished', {
        description: 'The recap is no longer public.',
      });
    } else if (toastKey === toastKeys.RECAP_PUBLISH_FAILED) {
      toast.error('Unable to publish recap', {
        description: toastError ?? 'Something went wrong. Please try again.',
      });
    } else if (toastKey === toastKeys.RECAP_UNPUBLISH_FAILED) {
      toast.error('Unable to unpublish recap', {
        description: toastError ?? 'Something went wrong. Please try again.',
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('toast');
    params.delete('slug');
    params.delete('asset_url');
    params.delete('toast_error');

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
