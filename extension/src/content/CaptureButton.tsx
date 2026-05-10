import { useEffect, useRef } from "react";

type Props = {
  rect: DOMRect;
  onCapture: (text: string) => void;
  onDismiss: () => void;
  text: string;
};

const BUTTON_HEIGHT = 32;
const OFFSET = 8;

export function CaptureButton({ rect, onCapture, onDismiss, text }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const top = rect.top + window.scrollY - BUTTON_HEIGHT - OFFSET;
  const left = rect.left + window.scrollX + rect.width / 2;

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onDismiss]);

  return (
    <button
      ref={buttonRef}
      onClick={() => onCapture(text)}
      style={{
        position: "absolute",
        top,
        left,
        transform: "translateX(-50%)",
        height: BUTTON_HEIGHT,
        padding: "0 14px",
        background: "#1a1a1a",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 13,
        fontFamily: "sans-serif",
        cursor: "pointer",
        zIndex: 2147483647,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      Capture
    </button>
  );
}
