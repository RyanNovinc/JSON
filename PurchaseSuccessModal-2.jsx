import { useState } from "react";

const CYAN = "#00E5CC";
const DARK_BG = "#0A0E14";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#8A9BB0";
const TEXT_DIM = "#5A6B80";

function ConfettiParticle({ delay, left }) {
  const colors = [CYAN, "#00B4D8", "#FFD700", "#FF6B9D", "#A78BFA", "#34D399"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 4 + Math.random() * 6;

  return (
    <div
      style={{
        position: "absolute",
        top: -8,
        left: `${left}%`,
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 0.5),
        background: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "1px",
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `confettiFall ${1.6 + Math.random() * 1}s ease-in ${delay}s forwards`,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default function PurchaseSuccessModal() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        @keyframes successPop {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes checkDraw {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(260px) rotate(540deg); }
        }
        .success-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(0, 229, 204, 0.4) !important;
        }
        .success-cta:active { transform: translateY(1px); }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: DARK_BG,
          borderRadius: 20,
          border: `1px solid rgba(0, 229, 204, 0.2)`,
          boxShadow: `0 0 60px rgba(0, 229, 204, 0.1), 0 24px 48px rgba(0,0,0,0.5)`,
          animation: "successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
          padding: "44px 28px 28px",
        }}
      >
        {/* Confetti */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={Math.random() * 0.6}
              left={Math.random() * 100}
            />
          ))}
        </div>

        {/* Check circle */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${CYAN}, #00B4D8)`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            boxShadow: `0 0 30px rgba(0, 229, 204, 0.25)`,
            animation:
              "successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <path
              d="M10 18L16 24L26 12"
              stroke={DARK_BG}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 48,
                strokeDashoffset: 48,
                animation: "checkDraw 0.4s ease 0.5s forwards",
              }}
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            color: TEXT_PRIMARY,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.3px",
            margin: "0 0 8px",
            animation: "fadeUp 0.4s ease 0.4s both",
          }}
        >
          You're all set!
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: TEXT_SECONDARY,
            fontSize: 15,
            lineHeight: 1.5,
            margin: "0 0 28px",
            animation: "fadeUp 0.4s ease 0.55s both",
          }}
        >
          Nutrition is unlocked forever.
          <br />
          <span style={{ color: TEXT_DIM, fontSize: 13 }}>
            No subscription. No renewals.
          </span>
        </p>

        {/* CTA */}
        <button
          className="success-cta"
          onClick={() => setIsVisible(false)}
          style={{
            width: "100%",
            padding: "15px 24px",
            background: `linear-gradient(135deg, ${CYAN}, #00B4D8)`,
            border: "none",
            borderRadius: 14,
            color: DARK_BG,
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: `0 4px 20px rgba(0, 229, 204, 0.3)`,
            animation: "fadeUp 0.4s ease 0.7s both",
          }}
        >
          Get Started →
        </button>
      </div>
    </div>
  );
}
