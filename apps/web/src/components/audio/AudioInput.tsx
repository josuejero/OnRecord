'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { uploadSessionAudio, saveTranscript } from '@/app/rooms/[figureSlug]/[roomSlug]/actions';
import { useSpeechRecognition } from './useSpeechRecognition';

type SaveTranscriptAction = (formData: FormData) => Promise<void>;
type UploadAudioAction = (formData: FormData) => Promise<void>;

type AudioInputProps = {
  sessionId: string;
  revalidatePath: string;
  initialText?: string;
  voiceInputEnabled: boolean;
  voiceUploadEnabled: boolean;
  saveAction?: SaveTranscriptAction;
  uploadAction?: UploadAudioAction;
};

const statusLabelMap: Record<'idle' | 'recording' | 'processing' | 'ready', string> = {
  idle: 'Idle',
  recording: 'Recording…',
  processing: 'Processing…',
  ready: 'Ready'
};

async function measureAudioDuration(file: File) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const AudioCtx =
    (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return 0;
  }

  const arrayBuffer = await file.arrayBuffer();
  const context = new AudioCtx();

  try {
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return Math.max(0, Math.round(audioBuffer.duration * 1000));
  } catch {
    return 0;
  } finally {
    context.close();
  }
}

export default function AudioInput({
  sessionId,
  revalidatePath,
  initialText = '',
  voiceInputEnabled,
  voiceUploadEnabled,
  saveAction,
  uploadAction
}: AudioInputProps) {
  const [text, setText] = useState(initialText);
  const [pendingInterim, setPendingInterim] = useState('');
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleFinalTranscript = useCallback((chunk: string) => {
    setText((prev) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !chunk.startsWith(' ');
      return `${prev}${needsSpace ? ' ' : ''}${chunk}`;
    });
    setPendingInterim('');
    setVoiceUsed(true);
  }, []);

  const { status, interimTranscript, error, isSupported, provider, start, stop } = useSpeechRecognition({
    onFinalResult: handleFinalTranscript
  });

  useEffect(() => {
    setPendingInterim(interimTranscript);
  }, [interimTranscript]);

  const displayValue = pendingInterim ? `${text}${pendingInterim}` : text;

  const handleTextareaChange = (value: string) => {
    let normalized = value;
    if (pendingInterim && normalized.endsWith(pendingInterim)) {
      normalized = normalized.slice(0, normalized.length - pendingInterim.length);
    }

    setText(normalized);
    setPendingInterim('');
  };

  const saveActionToUse = saveAction ?? saveTranscript;
  const uploadActionToUse = uploadAction ?? uploadSessionAudio;

  const sourceValue = voiceUsed ? 'voice' : 'manual';
  const metaValue = voiceUsed
    ? JSON.stringify({
        source: 'voice',
        provider: provider ?? 'web-speech',
        browser: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent
      })
    : '{}';

  const debugInfo = useMemo(() => {
    const browser = typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent;
    return [
      `browser: ${browser}`,
      `provider: ${provider ?? 'n/a'}`,
      `speech api supported: ${isSupported}`,
      `voice input feature: ${voiceInputEnabled}`,
      `voice upload feature: ${voiceUploadEnabled}`
    ].join('\n');
  }, [provider, isSupported, voiceInputEnabled, voiceUploadEnabled]);

  const handleCopyDebugInfo = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(debugInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleRecordClick = () => {
    if (status === 'recording') {
      stop();
    } else {
      start();
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const durationMs = await measureAudioDuration(file);
      const formData = new FormData();
      formData.set('session_id', sessionId);
      formData.set('revalidate', revalidatePath);
      formData.set('duration_ms', durationMs.toString());
      formData.set('file', file);
      await uploadActionToUse(formData);
      setUploadMessage('Upload complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadMessage(message);
    } finally {
      setUploading(false);
    }
  };

  const recordLabel =
    status === 'recording' ? 'Stop recording' : status === 'processing' ? 'Processing…' : status === 'ready' ? 'Record again' : 'Record audio';

  return (
    <div className="space-y-4">
      {voiceInputEnabled && !isSupported ? (
        <div
          data-testid="voice-input-fallback"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>The Web Speech API is unavailable in this browser. Text input is unchanged.</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button
              type="button"
              data-testid="copy-debug-info"
              onClick={handleCopyDebugInfo}
              className="font-semibold text-amber-900 underline"
            >
              Copy debug info
            </button>
            {copied ? <span className="text-amber-700">Copied!</span> : null}
          </div>
        </div>
      ) : null}

      <form action={saveActionToUse} className="space-y-3">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="revalidate" value={revalidatePath} />
        <input type="hidden" name="source" value={sourceValue} />
        <input type="hidden" name="meta" value={metaValue} />

        <Textarea
          name="raw_text"
          data-testid="transcript-textarea"
          rows={12}
          placeholder="Paste transcript text here or dictate a question."
          value={displayValue}
          onChange={(event) => handleTextareaChange(event.currentTarget.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          {voiceInputEnabled ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={status === 'recording' ? 'destructive' : 'outline'}
                onClick={handleRecordClick}
                disabled={status === 'processing' || !isSupported}
              >
                {recordLabel}
              </Button>
              <span className="text-xs text-slate-500">Status: {statusLabelMap[status]}</span>
            </div>
          ) : null}
          {error ? (
            <div className="text-xs text-red-600" aria-live="polite">
              {error.message}
            </div>
          ) : null}
          <Button data-testid="save-transcript-button" type="submit">
            Save transcript
          </Button>
        </div>
      </form>

      {voiceUploadEnabled ? (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Upload audio file</p>
              <p className="text-xs text-slate-500">Saved files land in the private audio bucket.</p>
            </div>
            <input
              type="file"
              accept="audio/*"
              className="text-xs text-slate-500"
              disabled={uploading}
              onChange={handleFileChange}
            />
          </div>
          {uploadMessage ? <p className="mt-2 text-xs text-slate-500">{uploadMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
