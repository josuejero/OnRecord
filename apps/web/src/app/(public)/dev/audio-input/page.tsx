import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';

import AudioInput from '@/components/audio/AudioInput';
import { Button } from '@/components/ui/button';

const SESSION_ID = 'e2e_audio_input_demo_session';

async function e2eSaveTranscript(_: FormData) {
  'use server';
  void _;
  revalidatePath('/dev/audio-input');
}

async function e2eUploadSessionAudio(_: FormData) {
  'use server';
  void _;
  revalidatePath('/dev/audio-input');
}

async function e2eProcessTranscript(_: FormData) {
  'use server';
  void _;
  revalidatePath('/dev/audio-input');
}

export default function DevAudioInputPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Audio Input Dev Harness</h1>

      <AudioInput
        sessionId={SESSION_ID}
        revalidatePath="/dev/audio-input"
        initialText="Factory preset transcript"
        voiceInputEnabled
        voiceUploadEnabled
        saveAction={e2eSaveTranscript}
        uploadAction={e2eUploadSessionAudio}
      />

      <form
        action={e2eProcessTranscript}
        className="flex items-center gap-3"
        data-testid="process-transcript-form"
      >
        <input type="hidden" name="session_id" value={SESSION_ID} />
        <input type="hidden" name="revalidate_path" value="/dev/audio-input" />
        <Button type="submit" data-testid="process-transcript-button">
          Process Transcript (E2E)
        </Button>
      </form>
    </main>
  );
}
