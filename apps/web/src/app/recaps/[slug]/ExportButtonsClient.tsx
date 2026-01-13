'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getEnv } from '@/lib/env';
import { toast } from 'sonner';

async function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButtonsClient(props: { slug: string }) {
  const [busy, setBusy] = useState<null | 'json' | 'csv'>(null);
  const env = getEnv();

  async function run(format: 'json' | 'csv') {
    setBusy(format);
    toast('Download started');
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ slug: props.slug, format }),
      });

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      await downloadBlob(`onrecord-${props.slug}.${format}`, blob);
      toast.success('Download ready');
    } catch (error: unknown) {
      toast.error(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error occurred.'}`,
      );
      throw error;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={() => run('json')}
        disabled={busy !== null}
        data-testid="export-json"
      >
        {busy === 'json' ? 'Downloading…' : 'Download JSON'}
      </Button>
      <Button
        type="button"
        onClick={() => run('csv')}
        disabled={busy !== null}
        variant="secondary"
        data-testid="export-csv"
      >
        {busy === 'csv' ? 'Downloading…' : 'Download CSV'}
      </Button>
    </div>
  );
}
