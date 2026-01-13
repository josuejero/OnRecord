import { AiRecapProvider, AiRecapProviderSchema } from '@onrecord/shared';

export interface FeatureFlags {
  voiceInputEnabled: boolean;
  voiceUploadEnabled: boolean;
  aiRecapEnabled: boolean;
  aiRecapProvider: AiRecapProvider;
  labelerEnabled: boolean;
  evalsPageEnabled: boolean;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  voiceInputEnabled: true,
  voiceUploadEnabled: false,
  aiRecapEnabled: true,
  aiRecapProvider: 'mock',
  labelerEnabled: true,
  evalsPageEnabled: true,
};

const AVAILABLE_AI_RECAP_PROVIDERS: AiRecapProvider[] = AiRecapProviderSchema.options;

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'off':
      return false;
    default:
      return fallback;
  }
}

function parseAiRecapProvider(value: string | undefined): AiRecapProvider {
  if (!value) {
    return DEFAULT_FEATURE_FLAGS.aiRecapProvider;
  }

  const normalized = value.trim().toLowerCase();

  if (AVAILABLE_AI_RECAP_PROVIDERS.includes(normalized as AiRecapProvider)) {
    return normalized as AiRecapProvider;
  }

  return DEFAULT_FEATURE_FLAGS.aiRecapProvider;
}

let cachedFeatureFlags: FeatureFlags | null = null;

export function getFeatureFlags(): FeatureFlags {
  if (cachedFeatureFlags) {
    return cachedFeatureFlags;
  }

  cachedFeatureFlags = {
    voiceInputEnabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_VOICE_INPUT_ENABLED,
      DEFAULT_FEATURE_FLAGS.voiceInputEnabled,
    ),
    voiceUploadEnabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_VOICE_UPLOAD_ENABLED,
      DEFAULT_FEATURE_FLAGS.voiceUploadEnabled,
    ),
    aiRecapEnabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_AI_RECAP_ENABLED,
      DEFAULT_FEATURE_FLAGS.aiRecapEnabled,
    ),
    aiRecapProvider: parseAiRecapProvider(process.env.NEXT_PUBLIC_AI_RECAP_PROVIDER),
    labelerEnabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_LABELER_ENABLED,
      DEFAULT_FEATURE_FLAGS.labelerEnabled,
    ),
    evalsPageEnabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_EVALS_PAGE_ENABLED,
      DEFAULT_FEATURE_FLAGS.evalsPageEnabled,
    ),
  };

  return cachedFeatureFlags;
}

export { AVAILABLE_AI_RECAP_PROVIDERS };
