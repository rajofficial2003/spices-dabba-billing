import React, { useEffect } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDanger = true,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#FFFFFF",
          borderRadius: "18px",
          padding: "24px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
          border: "1px solid var(--sd-zinc-200)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          animation: "scaleUp 0.15s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon button in top corner */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            border: "none",
            background: "transparent",
            color: "var(--sd-zinc-400)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px"
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Warning Badge Icon */}
        <div style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: isDanger ? "#FEE2E2" : "#FEF3C7",
          color: isDanger ? "#DC2626" : "#D97706",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "14px",
          boxShadow: isDanger ? "0 0 0 8px #FEF2F2" : "0 0 0 8px #FFFBEB"
        }}>
          {isDanger ? <Trash2 size={26} strokeWidth={2.2} /> : <AlertTriangle size={26} strokeWidth={2.2} />}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--sd-black)",
          margin: "0 0 8px 0",
          letterSpacing: "-0.2px"
        }}>
          {title}
        </h3>

        {/* Message */}
        <div style={{
          fontSize: "0.86rem",
          color: "var(--sd-zinc-600)",
          lineHeight: 1.5,
          margin: "0 0 22px 0",
          padding: "0 4px",
          width: "100%"
        }}>
          {message}
        </div>

        {/* Actions Button Row */}
        <div style={{
          display: "flex",
          gap: "10px",
          width: "100%"
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "10px",
              border: "1px solid var(--sd-zinc-300)",
              background: "#FFFFFF",
              color: "var(--sd-zinc-700)",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "10px",
              border: "none",
              background: isDanger ? "var(--sd-red)" : "var(--sd-black)",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: isDanger ? "0 4px 14px rgba(220, 38, 38, 0.35)" : "0 4px 14px rgba(0, 0, 0, 0.2)",
              transition: "all 0.15s ease"
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
