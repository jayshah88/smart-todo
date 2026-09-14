/** Lightweight platform checks used for UX tuning, not feature gating. */

export const isStandalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true;

interface SpeechCapableWindow extends Window {
  SpeechRecognition?: new () => unknown;
  webkitSpeechRecognition?: new () => unknown;
}

export const speechRecognitionAvailable =
  typeof window !== 'undefined' &&
  !!(('SpeechRecognition' in window && (window as SpeechCapableWindow).SpeechRecognition) ||
    ('webkitSpeechRecognition' in window && (window as SpeechCapableWindow).webkitSpeechRecognition));
