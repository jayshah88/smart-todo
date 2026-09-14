import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useToast } from './Toast';

/** Banner shown while the signed-in user's email is unverified. */
export default function VerifyBanner() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  async function resend() {
    if (sending) return;
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.show('success', 'Verification email sent — check your inbox.');
    } catch {
      toast.show('error', 'Could not send the email. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function markVerified() {
    try {
      await api.post('/auth/verify-email');
      if (user) updateUser({ ...user, emailVerified: true });
      toast.show('success', 'Email verified. Thanks!');
    } catch {
      toast.show('error', 'Verification failed. Use the link from your email first.');
    }
  }

  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800 dark:bg-amber-950/50"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Please verify your email address to secure your account.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void resend()}
            disabled={sending}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
          <button
            onClick={() => void markVerified()}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            I’ve verified
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss verification banner"
            className="px-1.5 text-lg leading-none text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
