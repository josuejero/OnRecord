# Data retention

## Audio retention defaults

- Recorded session audio is stored in the private `session-audio` bucket. Objects always follow the pattern `rooms/<room_id>/sessions/<session_id>/audio/<filename>`.
- The corresponding metadata is tracked in `public.session_audio_assets`, which links each asset to a `session_id` and, optionally, a `transcript_id`.
- By default, objects remain available for 90 days after the session ends (`sessions.ends_at`). After that window—or when the session is explicitly deleted—you should assume the recording will be removed from storage and the metadata row deleted.

## Deletion pathway

1. Identify the asset by querying `session_audio_assets` (e.g. `select * from public.session_audio_assets where session_id = '<session_id>'`).
2. Delete the storage object via the Supabase CLI:
   ```bash
   pnpm exec supabase storage rm session-audio rooms/<room_id>/sessions/<session_id>/audio/<filename>
   ```
3. Remove the metadata record to keep the database consistent:
   ```sql
   delete from public.session_audio_assets
   where session_id = '<session_id>' and storage_path = '<path>'
   ```
4. Optional: clear any corresponding transcript or recap artifacts if those too need purging (delete from `public.session_transcripts`, `public.transcript_ai_outputs`, etc.).

Always confirm the `session_audio_assets` row and the storage object are both deleted before closing the retention request.
