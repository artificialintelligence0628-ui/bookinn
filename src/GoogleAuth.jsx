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
export function GoogleOneTap({ enabled, onCredential }) {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !enabled) return undefined;
    let cancelled = false;
    activeHandler = onCredential;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        ensureInitialized();
        window.google.accounts.id.prompt();
      })
      .catch(() => { /* script blocked/offline — the normal sign-in screen still works */ });
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
