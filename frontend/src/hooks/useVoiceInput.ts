import { useEffect, useRef, useState } from 'react';
import { useCallback } from 'react';
import { speechRecognitionAvailable } from '../lib/platform';

/** Minimal shape of the (vendor-prefixed) SpeechRecognition instances we use. */
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => RecognitionLike;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as RecognitionConstructor | undefined;
  return ctor ?? null;
}

/**
 * Hook for voice-to-text input using the Web Speech API.
 * Gracefully degrades when speech recognition is unavailable or permission is denied.
 *
 * - isSupported: whether the browser supports speech recognition at all
 * - isListening: whether recognition is currently active
 * - transcript: the accumulated transcript
 * - start: begins listening (resets transcript)
 * - stop: stops listening
 * - error: any error message (e.g., permission denied)
 */
export default function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !speechRecognitionAvailable) return;

    const Constructor = getRecognitionConstructor();
    if (!Constructor) return;

    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (e) => {
      const results = e.results;
      let final = '';
      for (let i = 0; i < results.length; i++) {
        final += results[i][0].transcript;
      }
      setTranscript((prev) => prev + ' ' + final);
    };

    recognition.onerror = (e) => {
      const code = e?.error ?? 'unknown';
      let msg = `Voice input error: ${code}`;
      if (code === 'not-allowed' || code === 'permission-denied') {
        msg = 'Microphone access was denied. Enable it in your browser settings.';
      } else if (code === 'no-speech') {
        msg = 'No speech detected. Try again.';
      } else if (code === 'not-supported') {
        msg = 'Voice input is not supported on this device.';
      }
      setError(msg);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (typeof window === 'undefined' || !speechRecognitionAvailable) {
      setError('Voice input is not supported in this browser.');
      return;
    }
    const r = recognitionRef.current;
    if (!r || isListening) return;
    setTranscript('');
    setError(null);
    try {
      r.start();
    } catch {
      setError('Unable to start voice input. Try clicking again.');
    }
  }, [isListening]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (r && isListening) {
      r.stop();
    }
  }, [isListening]);

  return {
    isSupported: speechRecognitionAvailable,
    isListening,
    transcript,
    start,
    stop,
    error,
  };
}
