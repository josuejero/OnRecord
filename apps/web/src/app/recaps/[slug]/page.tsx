import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { supabaseServer } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ExportButtonsClient } from './ExportButtonsClient';

type Asset = {
  id: string;
  public_url: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  original_filename: string | null;
  created_at: string;
};

type RecapPayload = {
  recap: {
    slug: string;
    title: string;
    summary: string | null;
    published_at: string;
    session_id: string;
    session_status: string;
    starts_at: string;
    ends_at: string | null;
    public_figure_slug: string;
    public_figure_name: string;
    room_slug: string;
    room_title: string;
  };
  items: Array<{
    question_body: string;
    answer_body: string;
    asked_at: string;
    answered_at: string;
    sort_rank: number;
  }>;
  assets: Asset[];
};

async function loadRecap(slug: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc('get_public_recap', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data ?? null) as RecapPayload | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await loadRecap(slug);

  if (!payload) {
    return { title: 'Recap not found' };
  }

  const title = payload.recap.title;
  const description =
    payload.recap.summary ??
    `Public recap for ${payload.recap.public_figure_name} in ${payload.recap.room_title}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/recaps/${payload.recap.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function RecapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await loadRecap(slug);
  if (!payload) notFound();

  const { recap, items, assets } = payload;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Public recap</p>
          <h1 className="text-3xl font-bold">{recap.title}</h1>
          {recap.summary ? <p className="mt-2 text-muted-foreground">{recap.summary}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border px-3 py-1">
              Figure: {recap.public_figure_name}
            </span>
            <span className="rounded-full border px-3 py-1">Room: {recap.room_title}</span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Published {new Date(recap.published_at).toLocaleString()}
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Q&A</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No public Q&A yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {items.map((it, idx) => (
              <article key={`${it.sort_rank}-${idx}`} className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Q{it.sort_rank}</p>
                <p className="mt-2 font-medium">{it.question_body}</p>
                <div className="mt-4 rounded-lg bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">Answer</p>
                  <p className="mt-1">{it.answer_body}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Assets</h2>
        {assets.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No public assets.</p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="public-assets">
            {assets.map((a) => (
              <li key={a.id} className="rounded-lg border p-3">
                <a
                  href={a.public_url}
                  className="font-medium underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.original_filename ?? a.sha256}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.mime_type} · {Math.round(a.byte_size / 1024)} KB
                </p>
              </li>
            ))}
          </ul>
        )}

        <ExportButtonsClient slug={recap.slug} />
      </section>
    </main>
  );
}
