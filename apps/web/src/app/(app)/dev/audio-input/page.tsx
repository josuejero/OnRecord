import { notFound } from 'next/navigation';

import { processTranscript } from '@/app/(app)/rooms/[figureSlug]/[roomSlug]/actions';
import AudioInput from '@/components/audio/AudioInput';
import { Button } from '@/components/ui/button';

const DEV_SESSION_ID = '00000000-0000-0000-0000-000000000000';

export default function DevAudioInputPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-sm text-slate-500">
        This page is a dev-only fixture used for automated voice input testing.
      </div>

      <AudioInput
        sessionId={DEV_SESSION_ID}
        revalidatePath="/"
        initialText="Factory preset transcript"
        voiceInputEnabled
        voiceUploadEnabled
      />

      <form
        action={processTranscript}
        className="flex items-center gap-3"
        data-testid="process-transcript-form"
      >
        <input type="hidden" name="session_id" value={DEV_SESSION_ID} />
        <input type="hidden" name="revalidate" value="/" />
        <Button data-testid="process-transcript-button" type="submit" variant="secondary">
          Cleanup + refresh insights
        </Button>
      </form>
    </div>
  );
}
