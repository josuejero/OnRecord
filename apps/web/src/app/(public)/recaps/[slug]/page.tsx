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

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ASSET_ORDER = ['image', 'video', 'audio', 'application', 'other'] as const;

const ASSET_LABELS: Record<string, string> = {
  image: 'Images & media',
  video: 'Videos & clips',
  audio: 'Audio captures',
  application: 'Documents',
  other: 'Supplemental assets',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return DATE_FORMATTER.format(new Date(value));
}

function groupAssetsByType(assets: Asset[]) {
  return assets.reduce<Record<string, Asset[]>>((groups, asset) => {
    const category = asset.mime_type?.split('/')[0] ?? 'other';
    const normalized = ASSET_ORDER.includes(category as typeof ASSET_ORDER[number])
      ? category
      : 'other';
    if (!groups[normalized]) {
      groups[normalized] = [];
    }
    groups[normalized].push(asset);
    return groups;
  }, {});
}

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
  const assetGroups = groupAssetsByType(assets);
  const tableOfContents = [
    { id: 'summary', label: 'Summary' },
    { id: 'qa', label: 'Q&A' },
    { id: 'assets', label: 'Assets' },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Public recap</p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900">{recap.title}</h1>
          {recap.summary ? (
            <p className="text-lg leading-relaxed text-slate-700">{recap.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border px-3 py-1 text-slate-600">
              Figure: {recap.public_figure_name}
            </span>
            <span className="rounded-full border px-3 py-1 text-slate-600">
              Room: {recap.room_title}
            </span>
            <span className="rounded-full border px-3 py-1 text-slate-600">
              Session: {recap.session_status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Published {formatDateTime(recap.published_at)}</span>
            <span className="text-slate-500">
              Session {recap.starts_at ? 'started' : 'scheduled'} at{' '}
              {formatDateTime(recap.starts_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
          <div className="ml-auto flex flex-1 justify-end lg:flex-none">
            <ExportButtonsClient slug={recap.slug} className="justify-end" />
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr),220px]">
        <article className="space-y-12 text-base leading-relaxed text-slate-700">
          <section id="summary" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">Summary</h2>
              {!recap.summary && (
                <p className="text-sm text-slate-500">No summary available for this session.</p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session timeline</p>
              <p className="font-semibold text-slate-900">
                {formatDateTime(recap.starts_at)} — {recap.ends_at ? formatDateTime(recap.ends_at) : 'Ongoing'}
              </p>
            </div>
            {recap.summary ? (
              <p className="text-lg text-slate-700">{recap.summary}</p>
            ) : null}
          </section>

          <section id="qa" className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-900">Q&A</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">No public Q&A yet.</p>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <article
                    key={`${item.sort_rank}-${item.asked_at}`}
                    className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                      Q{item.sort_rank}
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900">{item.question_body}</h3>
                    <div className="rounded-2xl bg-slate-50/80 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Answer</p>
                      <p className="mt-2 text-slate-800">{item.answer_body}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="assets" className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-900">Assets</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {assets.length} asset{assets.length === 1 ? '' : 's'}
              </span>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm text-slate-500">No public assets associated with this recap.</p>
            ) : (
              ASSET_ORDER.map((type) => {
                const group = assetGroups[type];
                if (!group?.length) return null;
                return (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {ASSET_LABELS[type]}
                      </h3>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {group.length} item{group.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      {group.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/80 p-4"
                        >
                          <a
                            className="text-base font-semibold text-slate-900 underline-offset-4 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:underline"
                            href={asset.public_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {asset.original_filename ?? asset.sha256}
                          </a>
                          <p className="text-xs text-slate-500">
                            {asset.mime_type} · {Math.round(asset.byte_size / 1024)} KB
                          </p>
                          <p className="text-xs text-slate-400">
                            Created {formatDateTime(asset.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-600 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Table of contents</p>
            <nav className="space-y-2">
              {tableOfContents.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className="block rounded-md px-2 py-1 text-slate-800 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-slate-100 hover:text-slate-900"
                >
                  {entry.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </main>
  );
}
