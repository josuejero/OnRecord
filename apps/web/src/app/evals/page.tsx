import fs from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evaluations',
};

type LatestEval = {
  run_id: string;
  timestamp: string;
  prompt_versions: string[];
  status: string;
  summary: string;
  artifact_url?: string;
};

const LATEST_EVAL_PATH = path.join(process.cwd(), 'apps/web/public/evals/latest.json');

async function readLatestEval(): Promise<LatestEval | null> {
  try {
    const payload = await fs.readFile(LATEST_EVAL_PATH, 'utf-8');
    return JSON.parse(payload) as LatestEval;
  } catch (error) {
    console.error('Failed to load latest eval metadata', error);
    return null;
  }
}

const statusClass = (status: string) => {
  const normalized = (status || 'unknown').toLowerCase();
  if (normalized === 'pass') return 'text-emerald-600 dark:text-emerald-400';
  if (normalized === 'fail') return 'text-rose-600 dark:text-rose-400';
  return 'text-slate-700 dark:text-slate-300';
};

export default async function Page() {
  const latest = await readLatestEval();
  if (!latest) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Latest eval metadata is unavailable right now.</p>
      </div>
    );
  }

  const runDate = Number.isNaN(Date.parse(latest.timestamp))
    ? 'Unknown'
    : new Date(latest.timestamp).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest run</p>
            <p className="text-lg font-semibold text-foreground">{runDate}</p>
          </div>
          <span className={`text-sm font-medium ${statusClass(latest.status)}`}>
            {latest.status?.toLowerCase() === 'pass' ? 'Passing' : 'Needs attention'}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{latest.summary}</p>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prompt versions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {latest.prompt_versions.map((version) => (
              <span
                key={version}
                className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground"
                role="status"
              >
                {version}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Run ID</p>
          <p className="mt-2 text-sm font-medium text-foreground">{latest.run_id}</p>
          {latest.artifact_url ? (
            <a
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              href={latest.artifact_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              View CI artifact
              <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
