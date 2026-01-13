-- Phase 10 — AI recap draft attachments

alter table public.transcript_ai_outputs
  add column if not exists include_in_export boolean not null default false;

create index if not exists transcript_ai_outputs_include_in_export_idx
  on public.transcript_ai_outputs(include_in_export);
