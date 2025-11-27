import { useEffect, useState } from "react";

// Global announcer state
let globalSetMessage: ((message: string, politeness?: "polite" | "assertive") => void) | null = null;

export function ScreenReaderAnnouncer() {
  const [message, setMessage] = useState("");
  const [politeness, setPoliteness] = useState<"polite" | "assertive">("polite");

  useEffect(() => {
    globalSetMessage = (msg: string, pol: "polite" | "assertive" = "polite") => {
      setMessage(msg);
      setPoliteness(pol);
      // Clear message after it's announced
      setTimeout(() => setMessage(""), 1000);
    };
    return () => {
      globalSetMessage = null;
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export function announce(message: string, politeness: "polite" | "assertive" = "polite") {
  if (globalSetMessage) {
    globalSetMessage(message, politeness);
  }
}
