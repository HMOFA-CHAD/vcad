import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, EnvelopeSimple } from "@phosphor-icons/react";
import { getSupabase } from "../client";
import type { GatedFeature } from "../hooks/useRequireAuth";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Feature that triggered the auth modal, for contextual messaging */
  feature?: GatedFeature;
}

const featureMessages: Record<GatedFeature, string> = {
  "cloud-sync": "to sync your designs",
  ai: "to use AI features",
  quotes: "to request quotes",
  "step-export": "to export STEP files",
  "version-history": "to access history",
};

/**
 * Modal dialog for user authentication.
 * Supports OAuth (Google, GitHub) and magic link sign-in.
 */
export function AuthModal({ open, onOpenChange, feature }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const signInWithOAuth = async (provider: "google" | "github") => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const signInWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when modal closes
      setTimeout(() => {
        setEmail("");
        setSent(false);
        setError(null);
        setLoading(false);
      }, 200);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 border border-border bg-card/95 backdrop-blur-sm shadow-lg focus:outline-none">
          {/* Close button */}
          <div className="absolute right-2 top-2 z-10">
            <Dialog.Close className="p-1 text-text-muted hover:bg-border/50 hover:text-text cursor-pointer">
              <X size={14} />
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-6 py-5">
            {/* Header */}
            <Dialog.Title className="text-2xl font-bold tracking-tighter text-text mb-0.5">
              vcad<span className="text-accent">.</span>
            </Dialog.Title>
            <p className="text-xs text-text-muted mb-5">
              {feature ? featureMessages[feature] : "sign in to save your work"}
            </p>

            {error && (
              <div className="w-full mb-4 p-2 bg-danger/10 border border-danger/30 text-xs text-danger text-center">
                {error}
              </div>
            )}

            {sent ? (
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center bg-accent/10">
                  <EnvelopeSimple size={20} className="text-accent" />
                </div>
                <p className="text-sm text-text mb-1">Check your email</p>
                <p className="text-xs text-text-muted mb-4">
                  Link sent to <span className="text-text">{email}</span>
                </p>
                <button
                  onClick={() => handleOpenChange(false)}
                  className="text-[10px] text-text-muted hover:text-text"
                >
                  close
                </button>
              </div>
            ) : (
              <div className="w-64">
                {/* OAuth buttons */}
                <div className="flex flex-col gap-2 mb-4">
                  <button
                    onClick={() => signInWithOAuth("google")}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 h-9 bg-accent text-white text-xs font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    onClick={() => signInWithOAuth("github")}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 h-9 border border-border bg-transparent text-text text-xs hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </button>
                </div>

                {/* Email divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="px-2 bg-card text-text-muted">or</span>
                  </div>
                </div>

                {/* Email form */}
                <form onSubmit={signInWithEmail} className="flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-transparent border border-border text-xs text-text placeholder-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-9 border border-border text-xs text-text hover:bg-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Sending..." : "Continue with email"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 flex items-center justify-center">
            <p className="text-[10px] text-text-muted">
              <a href="https://vcad.io/terms" className="hover:text-text" target="_blank" rel="noopener noreferrer">terms</a>
              {" · "}
              <a href="https://vcad.io/privacy" className="hover:text-text" target="_blank" rel="noopener noreferrer">privacy</a>
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
