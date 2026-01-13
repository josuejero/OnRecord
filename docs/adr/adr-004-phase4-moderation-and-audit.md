# ADR-004: Phase 4 moderation + answer audit strategy

## Status
Accepted

## Context
We need moderators to approve/reject/flag questions, reorder queues, set an active question, and publish answers. These actions must be auditable.

## Decision
- Use Postgres RPC functions (security definer) for moderation + answer publishing.
- Append-only audit events for every moderation/answer action.
- Keep audit metadata minimal and non-sensitive.

## Consequences
- Centralized invariant enforcement in DB
- Easier to write negative tests (RLS + forbidden errors)
- Requires maintaining stable RPC signatures and DB migrations
