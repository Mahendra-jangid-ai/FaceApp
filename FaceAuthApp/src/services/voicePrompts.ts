import { NativeModules, Platform } from 'react-native';
import { getLanguage } from './i18n';

const TTS = NativeModules.RNTts;

let ttsInitialized = false;

const PROMPTS: Record<string, { en: string; hi: string }> = {
  position_face: {
    en: 'Please position your face in the oval',
    hi: 'कृपया अपना चेहरा ओवल में रखें',
  },
  blink: {
    en: 'Please blink your eyes',
    hi: 'कृपया अपनी आँखें झपकाएँ',
  },
  smile: {
    en: 'Now smile please',
    hi: 'अब कृपया मुस्कुराएँ',
  },
  turn_left: {
    en: 'Turn your head to the left',
    hi: 'अपना सिर बाईं ओर घुमाएँ',
  },
  turn_right: {
    en: 'Turn your head to the right',
    hi: 'अपना सिर दाईं ओर घुमाएँ',
  },
  success: {
    en: 'Authentication successful',
    hi: 'प्रमाणीकरण सफल',
  },
  failure: {
    en: 'Authentication failed. Please try again.',
    hi: 'प्रमाणीकरण विफल। कृपया पुन: प्रयास करें।',
  },
  checked_in: {
    en: 'You have been checked in',
    hi: 'आपका चेक-इन हो गया है',
  },
  checked_out: {
    en: 'You have been checked out',
    hi: 'आपका चेक-आउट हो गया है',
  },
  spoof_detected: {
    en: 'Spoof detected. Use your real face.',
    hi: 'स्पूफ का पता चला। अपना असली चेहरा उपयोग करें।',
  },
  enrollment_complete: {
    en: 'Enrollment complete. Your face has been registered.',
    hi: 'नामांकन पूरा। आपका चेहरा पंजीकृत हो गया है।',
  },
  poor_quality: {
    en: 'Image quality is poor. Please try again with better lighting.',
    hi: 'छवि गुणवत्ता खराब है। कृपया बेहतर रोशनी में पुन: प्रयास करें।',
  },
  ppe_missing: {
    en: 'Safety equipment not detected. Please wear your helmet and vest.',
    hi: 'सुरक्षा उपकरण नहीं मिला। कृपया अपना हेलमेट और जैकेट पहनें।',
  },
};

async function initTTS(): Promise<boolean> {
  if (ttsInitialized) return true;
  try {
    if (!TTS) return false;
    const lang = getLanguage() === 'hi' ? 'hi-IN' : 'en-IN';
    await TTS.setDefaultLanguage(lang);
    await TTS.setDefaultRate(Platform.OS === 'ios' ? 0.5 : 0.8);
    await TTS.setDefaultPitch(1.0);
    ttsInitialized = true;
    return true;
  } catch {
    return false;
  }
}

let voiceEnabled = true;

export function setVoiceEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

export async function speak(promptKey: string): Promise<void> {
  if (!voiceEnabled) return;
  const prompt = PROMPTS[promptKey];
  if (!prompt) return;

  const text = prompt[getLanguage()] || prompt.en;
  const ready = await initTTS();
  if (!ready) return;

  try {
    await TTS.stop();
    await TTS.speak(text);
  } catch {}
}

export async function speakText(text: string): Promise<void> {
  if (!voiceEnabled) return;
  const ready = await initTTS();
  if (!ready) return;

  try {
    await TTS.stop();
    await TTS.speak(text);
  } catch {}
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (TTS) await TTS.stop();
  } catch {}
}

export function getPromptText(key: string): string {
  const prompt = PROMPTS[key];
  if (!prompt) return key;
  return prompt[getLanguage()] || prompt.en;
}
