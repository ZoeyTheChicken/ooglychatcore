import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

interface TosToastProps {
  visible: boolean;
  onDone: () => void;
}

/**
 * Auto-dismissing TOS violation popup.
 * Shows for 4 seconds then fades out and calls onDone.
 */
export function TosToast({ visible, onDone }: TosToastProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setFading(false);

    // Start fade-out 400 ms before the 4 s deadline
    const fadeTimer = setTimeout(() => setFading(true), 3600);
    const doneTimer = setTimeout(() => onDone(), 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        flex items-start gap-3
        bg-destructive text-destructive-foreground
        rounded-xl shadow-lg px-5 py-4
        max-w-sm w-[calc(100%-2rem)]
        transition-opacity duration-400
        ${fading ? "opacity-0" : "opacity-100"}
      `}
      role="alert"
      aria-live="assertive"
    >
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm leading-snug">
        The message you have just attempted to send is against the Oogly Chat
        terms of service. Do not attempt to send a message that is against the
        terms of service again.
      </p>
    </div>
  );
}
