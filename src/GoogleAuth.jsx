import React, { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------
   GOOGLE SIGN-IN (Google Identity Services)

   Gives the familiar Google experience: the "Continue with Google" button
   opens Google's account chooser (your signed-in accounts, last used first),
   and — on the sign-in screen — the One Tap prompt slides in automatically
   with the same list. Either way Google returns a signed ID token that we
   hand to the backend (/api/auth/google) to verify.

   Needs VITE_GOOGLE_CLIENT_ID at build time; without it this renders nothing,
   so the normal email/password form is untouched.
--------------------------------------------------------- */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

let scriptPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = "https://accounts.google.com/gsi/client";
      el.async = true;
      el.defer = true;
      el.onload = () => resolve();
      el.onerror = () => { scriptPromise = null; reject(new Error("Couldn't load Google sign-in.")); };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

// Google only lets initialize() run meaningfully once per page, so the
// callback goes through this module-level slot and each mounted button just
// swaps in its own handler.
let activeHandler = null;
let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => { if (resp?.credential && activeHandler) activeHandler(resp.credential); },
    auto_select: true,             // returning visitors with one remembered Google session are signed in automatically
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,    // browser-native account chooser where supported
  });
  initialized = true;
}

/**
 * Site-wide Google One Tap. Mount it once near the top of the app: while
 * `enabled` is true (signed out, session check finished, not on a screen that
 * has its own Google button) Google's account popup slides in at the top right
 * of every page, and returning visitors are signed in automatically.
 * onCredential(idToken) receives Google's signed ID token.
 */
export function GoogleOneTap({ enabled, onCredential, onUnavailable }) {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !enabled) return undefined;
    let cancelled = false;
    activeHandler = onCredential;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        ensureInitialized();
        window.google.accounts.id.prompt((n) => {
          // Safari/iOS (tracking protection), blocked cookies, or a Google cooldown can
          // stop One Tap from showing — let the app offer its own sign-in sheet instead.
          try {
            if (cancelled || !onUnavailable) return;
            if (n.isDismissedMoment?.()) return;
            if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) onUnavailable();
          } catch { /* ignore */ }
        });
      })
      .catch(() => { if (!cancelled && onUnavailable) onUnavailable(); });
    return () => {
      cancelled = true;
      if (activeHandler === onCredential) activeHandler = null;
      if (window.google?.accounts?.id) window.google.accounts.id.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Keep the live handler current without re-prompting.
  useEffect(() => { if (GOOGLE_CLIENT_ID && enabled) activeHandler = onCredential; });
  return null;
}

/** Call on sign-out so One Tap doesn't instantly sign the person back in. */
export function disableGoogleAutoSelect() {
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* not loaded */ }
}

/**
 * onCredential(idToken)  — called when the person picks a Google account.
 * text    — "signin_with" | "signup_with" | "continue_with"
 * oneTap  — also show Google's One Tap account prompt (use on the sign-in screen)
 */
export default function GoogleAuthButton({ onCredential, text = "continue_with", oneTap = false }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    activeHandler = onCredential;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        ensureInitialized();
        const width = Math.min(400, Math.max(200, Math.floor(holder.current.offsetWidth || 320)));
        holder.current.innerHTML = "";
        window.google.accounts.id.renderButton(holder.current, {
          type: "standard", theme: "outline", size: "large",
          text, shape: "rectangular", logo_alignment: "left", width,
        });
        if (oneTap) window.google.accounts.id.prompt();
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      if (activeHandler === onCredential) activeHandler = null;
      if (oneTap && window.google?.accounts?.id) window.google.accounts.id.cancel();
    };
    // onCredential is kept fresh below without re-rendering Google's button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, oneTap]);

  // Keep the live handler current across re-renders (form state changes etc.).
  useEffect(() => { if (GOOGLE_CLIENT_ID) activeHandler = onCredential; });

  if (!GOOGLE_CLIENT_ID || failed) return null;
  return <div ref={holder} className="w-full flex justify-center min-h-[44px]" />;
}


/**
 * Fallback bottom sheet shown when Google's One Tap can't appear (common on
 * iPhone Safari). Same Google sign-in underneath, just our own container.
 */
export function GoogleSignInSheet({ onCredential, onClose }) {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, background: "#fff", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: "16px 16px calc(16px + env(safe-area-inset-bottom))" }}
      role="dialog" aria-label="Sign in to BookInn"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-base font-extrabold">Sign in to BookInn</div>
          <div className="text-xs text-gray-500">Save hostels and contact owners faster.</div>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 text-2xl leading-none px-1">×</button>
      </div>
      <GoogleAuthButton onCredential={onCredential} text="continue_with" />
    </div>
  );
}
