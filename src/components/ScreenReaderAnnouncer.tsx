import { useEffect, useState } from "react";

interface ScreenReaderAnnouncerProps {
  message: string;
  politeness?: "polite" | "assertive";
}

export function ScreenReaderAnnouncer({ message, politeness = "polite" }: ScreenReaderAnnouncerProps) {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      const timeout = setTimeout(() => setAnnouncement(""), 1000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Global announcer hook
let globalAnnounce: ((message: string, politeness?: "polite" | "assertive") => void) | null = null;

export function useScreenReaderAnnouncer() {
  const [message, setMessage] = useState("");
  const [politeness, setPoliteness] = useState<"polite" | "assertive">("polite");

  useEffect(() => {
    globalAnnounce = (msg: string, pol: "polite" | "assertive" = "polite") => {
      setMessage(msg);
      setPoliteness(pol);
    };
    return () => {
      globalAnnounce = null;
    };
  }, []);

  return { message, politeness };
}

export function announce(message: string, politeness: "polite" | "assertive" = "polite") {
  if (globalAnnounce) {
    globalAnnounce(message, politeness);
  }
}
