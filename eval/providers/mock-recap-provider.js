const MAX_SUMMARY_SENTENCES = 3;

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function buildSummary(transcript) {
  const sentences = splitSentences(transcript);
  const chunks = sentences.slice(0, MAX_SUMMARY_SENTENCES);
  if (!chunks.length) {
    return 'No transcript text is available yet to summarize.';
  }
  return chunks
    .map((chunk, index) => {
      if (index === 0) return chunk;
      return chunk;
    })
    .join(' ');
}

function buildEvidenceSpan(transcript, start, length) {
  const safeTranscript = normalize(transcript);
  const head = Math.max(0, Math.min(start, safeTranscript.length));
  const tail = Math.min(safeTranscript.length, head + Math.max(5, length));
  if (tail <= head) return undefined;
  return {
    start_offset: head,
    end_offset: tail,
  };
}

function buildConcerns(transcript) {
  const sentences = splitSentences(transcript);
  const concerns = [];
  for (let i = 0; i < 2; i += 1) {
    const sentence = sentences[i] || 'Verify this point once the transcript is updated.';
    concerns.push({
      title: i === 0 ? 'Key takeaway' : 'Conversation detail',
      detail: sentence,
      evidence_span: buildEvidenceSpan(transcript, i * 30, 40),
    });
  }
  return concerns;
}

function buildFollowUps(transcript) {
  const matches = transcript.match(/[^.?!]*\?/g) || [];
  const questions = matches
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (questions.length) return questions;
  return ['What else should staff confirm once the consultant responds?'];
}

module.exports = class MockRecapProvider {
  constructor(options = {}) {
    this.providerId = (options.id && String(options.id)) || 'mock-recap';
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context = {}) {
    const transcript = normalize(context.vars?.transcript ?? prompt ?? '');
    const recap = {
      summary: buildSummary(transcript),
      key_concerns: buildConcerns(transcript),
      follow_up_questions: buildFollowUps(transcript),
      safety_notes:
        'Draft recap only; verify every fact before publishing and do not treat this as medical or legal guidance.',
      verification_notes:
        'Confirm statements with the official transcript and supporting documents.',
    };

    return {
      output: JSON.stringify(recap),
    };
  }
};
