export {};

declare global {
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence?: number;
  }

  interface SpeechRecognitionResult extends Array<SpeechRecognitionAlternative> {
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionResultList extends Array<SpeechRecognitionResult> {}

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
    onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionStatic {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  }

  var SpeechRecognition: SpeechRecognitionStatic | undefined;
  var webkitSpeechRecognition: SpeechRecognitionStatic | undefined;
}
