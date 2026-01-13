'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SpeechRecognitionStatus = 'idle' | 'recording' | 'processing' | 'ready';

export type SpeechRecognitionFailure =
  | { type: 'permission-denied'; message: string }
  | { type: 'unsupported'; message: string }
  | { type: 'no-speech-detected'; message: string }
  | { type: 'speech-ended-unexpectedly'; message: string };

interface UseSpeechRecognitionOptions {
  onFinalResult?: (text: string) => void;
}

const mapErrorType = (errorCode: string): SpeechRecognitionFailure['type'] => {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied';
    case 'no-speech':
      return 'no-speech-detected';
    default:
      return 'speech-ended-unexpectedly';
  }
};

export function useSpeechRecognition({ onFinalResult }: UseSpeechRecognitionOptions = {}) {
  const recognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
      .SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition ??
      null;
  }, []);

  const provider = useMemo(() => recognitionCtor?.name ?? null, [recognitionCtor]);
  const isSupported = Boolean(recognitionCtor);

  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionFailure | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinalResult);

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
      recognitionRef.current?.abort();
    };
  }, []);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    let interim = '';
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';

      if (result.isFinal) {
        finalChunk += transcript;
      } else {
        interim += transcript;
      }
    }

    setInterimTranscript(interim);

    if (finalChunk.trim().length > 0) {
      onFinalRef.current?.(finalChunk.trim());
    }
  }, []);

  const handleEnd = useCallback(() => {
    recognitionRef.current = null;
    setInterimTranscript('');
    setStatus('processing');

    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
    }

    readyTimeoutRef.current = window.setTimeout(() => {
      setStatus('ready');
    }, 150);
  }, []);

  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    recognitionRef.current = null;
    setInterimTranscript('');
    const failureType = mapErrorType(event.error);
    setError({
      type: failureType,
      message:
        failureType === 'permission-denied'
          ? 'Microphone access denied. Please allow the browser to use your microphone.'
          : failureType === 'no-speech-detected'
          ? 'No speech detected. Try again with a clearer question.'
          : 'Recording ended unexpectedly. Try again.'
    });
    setStatus('ready');
  }, []);

  const start = useCallback(() => {
    if (!recognitionCtor) {
      setError({
        type: 'unsupported',
        message: 'Web Speech API is not available in this browser.'
      });
      setStatus('ready');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new recognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setStatus('recording');
      setInterimTranscript('');
    };

    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    try {
      recognition.start();
    } catch {
      setError({
        type: 'speech-ended-unexpectedly',
        message: 'Unable to access the microphone right now.'
      });
      setStatus('ready');
    }
  }, [handleEnd, handleError, handleResult, recognitionCtor]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    status,
    interimTranscript,
    error,
    provider,
    isSupported,
    start,
    stop
  };
}
