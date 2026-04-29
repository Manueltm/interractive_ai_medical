// utils/elevenlabsVoice.ts
import { ElevenLabsClient } from 'elevenlabs';

export interface VoiceConfig {
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  model: 'eleven_monolingual_v1',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  useSpeakerBoost: true,
};

export const pickElevenLabsVoice = (patient: any): string => {
  // ElevenLabs voice IDs
  const VOICES = {
    female: '21m00Tcm4TlvDq8ikWAM',  // Rachel - natural female voice
    male: 'AZnzlk1XvdvUeBnXmlld',     // Adam - natural male voice
    default: 'EXAVITQu4l4H1Jz1Y1zJ',   // Default voice
  };

  if (patient?.gender === 'female') {
    return VOICES.female;
  } else if (patient?.gender === 'male') {
    return VOICES.male;
  }
  return VOICES.default;
};

// Helper to get voice settings for a patient
export const getVoiceSettings = (patient: any): VoiceConfig => {
  return {
    ...DEFAULT_VOICE_CONFIG,
    voiceId: pickElevenLabsVoice(patient),
    // Adjust based on patient's age or condition
    stability: patient?.age > 60 ? 0.8 : 0.5,
    similarityBoost: 0.75,
  };
};