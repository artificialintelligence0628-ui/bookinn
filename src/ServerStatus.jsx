import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { subscribeSlowServer } from "./api.js";
import { C } from "./theme.js";

// Friendly banner shown only while an API request is taking unusually long
// (typically the server waking up from sleep). Hidden the rest of the time.
export default function ServerStatus() {
  const [slow, setSlow] = useState(false);
  useEffect(() => subscribeSlowServer(setSlow), []);
  // Remove the static splash from index.html now that React has mounted.
  useEffect(() => { document.getElementById("bi-splash")?.remove(); }, []);
  if (!slow) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ background: C.navy, color: C.white, zIndex: 9999 }}
      className="fixed top-0 inset-x-0 px-4 py-2.5 text-sm flex items-center justify-center gap-2 text-center shadow-md"
    >
      <Loader2 size={16} className="animate-spin shrink-0" />
      <span>
        <strong>Waking up BookInn…</strong> We're getting things ready. This can take up to a minute the first time, thanks for your patience.
      </span>
    </div>
  );
}
