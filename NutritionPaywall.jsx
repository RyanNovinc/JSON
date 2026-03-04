import { useState, useEffect, useRef } from "react";

const CYAN = "#00E5CC";
const CYAN_DIM = "rgba(0, 229, 204, 0.15)";
const CYAN_GLOW = "rgba(0, 229, 204, 0.4)";
const DARK_BG = "#0A0E14";
const CARD_BG = "#111820";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#8A9BB0";
const TEXT_DIM = "#5A6B80";

const features = [
  {
    icon: "🧬",
    title: "AI Macro Engine",
    desc: "Precision-calculated protein, carbs, fat & fiber targets calibrated to your exact body composition and goals",
  },
  {
    icon: "🛒",
    title: "Smart Grocery Lists",
    desc: "Store-specific shopping lists with real pricing, organized by aisle — priced at actual pack sizes",
  },
  {
    icon: "📋",
    title: "Meal Prep Blueprints",
    desc: "Step-by-step prep sessions timed to your skill level — from assembly-only to advanced batch cooking",
  },
  {
    icon: "🌙",
    title: "Sleep-Synced Timing",
    desc: "Meal times optimized around your circadian rhythm for better recovery, energy, and sleep quality",
  },
  {
    icon: "🍳",
    title: "Skill-Adaptive Recipes",
    desc: "From kitchen beginner to passionate chef — recipes that match YOUR comfort zone, not someone else's",
  },
  {
    icon: "🥡",
    title: "Pantry Intelligence",
    desc: "Tell us what's in your fridge — the AI builds around what you already have to minimize waste and cost",
  },
];

const comparisonRows = [
  { feature: "Personalized macros", us: true, them: false },
  { feature: "Sleep-optimized timing", us: true, them: false },
  { feature: "Skill-adaptive recipes", us: true, them: false },
  { feature: "Real grocery pricing", us: true, them: false },
  { feature: "Meal prep planning", us: true, them: "Basic" },
  { feature: "No subscription", us: true, them: false },
  { feature: "Typical cost", us: "$14.99 once", them: "$15–30/mo" },
];

function AnimatedNumber({ target, duration = 1200, prefix = "", suffix = "" }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

function PulseGlow({ children }) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-4px",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${CYAN}, #00B4D8)`,
          opacity: 0.6,
          filter: "blur(12px)",
          animation: "pulseGlow 2s ease-in-out infinite",
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export default function NutritionPaywall() {
  const [isVisible, setIsVisible] = useState(true);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

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
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .feature-card:hover {
          transform: translateY(-2px);
          border-color: ${CYAN} !important;
          box-shadow: 0 0 20px ${CYAN_DIM};
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(0, 229, 204, 0.4) !important;
        }
        .cta-btn:active {
          transform: translateY(1px);
        }
        .close-btn:hover {
          color: ${CYAN} !important;
        }
        .compare-row:nth-child(even) {
          background: rgba(255,255,255,0.02);
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "92vh",
          overflowY: "auto",
          background: DARK_BG,
          borderRadius: 20,
          border: `1px solid rgba(0, 229, 204, 0.2)`,
          boxShadow: `0 0 60px rgba(0, 229, 204, 0.1), 0 24px 48px rgba(0,0,0,0.5)`,
          animation: "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          className="close-btn"
          onClick={() => setIsVisible(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "none",
            border: "none",
            color: TEXT_DIM,
            fontSize: 22,
            cursor: "pointer",
            padding: 8,
            lineHeight: 1,
            transition: "color 0.2s",
          }}
        >
          ✕
        </button>

        {/* Hero Section */}
        <div
          style={{
            padding: "40px 28px 24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: "absolute",
              top: -60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 300,
              height: 200,
              background: `radial-gradient(ellipse, ${CYAN_DIM} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Icon */}
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "float 3s ease-in-out infinite",
            }}
          >
            🍽️
          </div>

          <h1
            style={{
              color: TEXT_PRIMARY,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
              margin: "0 0 8px",
            }}
          >
            Your AI Nutritionist
            <br />
            <span style={{ color: CYAN }}>Is Ready</span>
          </h1>

          <p
            style={{
              color: TEXT_SECONDARY,
              fontSize: 15,
              lineHeight: 1.5,
              margin: "0 0 20px",
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            The same AI that built your workout program — now engineering
            precision meal plans around your life.
          </p>

          {/* Trust badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: CYAN_DIM,
              border: `1px solid rgba(0, 229, 204, 0.25)`,
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 12,
              color: CYAN,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            One-time purchase — no subscription ever
          </div>
        </div>

        {/* What you get section */}
        <div style={{ padding: "0 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: CYAN,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            What You Unlock
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card"
                onClick={() =>
                  setExpandedFeature(expandedFeature === i ? null : i)
                }
                style={{
                  background: CARD_BG,
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: `1px solid ${
                    expandedFeature === i
                      ? CYAN
                      : "rgba(255,255,255,0.06)"
                  }`,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  animation: `fadeIn 0.4s ease ${i * 0.06}s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{f.icon}</span>
                  <span
                    style={{
                      color: TEXT_PRIMARY,
                      fontSize: 14,
                      fontWeight: 600,
                      flex: 1,
                    }}
                  >
                    {f.title}
                  </span>
                  <span
                    style={{
                      color: TEXT_DIM,
                      fontSize: 16,
                      transition: "transform 0.2s",
                      transform:
                        expandedFeature === i
                          ? "rotate(90deg)"
                          : "rotate(0)",
                    }}
                  >
                    ›
                  </span>
                </div>
                {expandedFeature === i && (
                  <p
                    style={{
                      color: TEXT_SECONDARY,
                      fontSize: 13,
                      lineHeight: 1.5,
                      margin: "10px 0 2px 34px",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    {f.desc}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            padding: "24px 20px",
            margin: "20px 20px 0",
            background: CARD_BG,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {[
            { value: 17, label: "Quality Checks", suffix: "" },
            { value: 5, label: "Skill Levels", suffix: "" },
            { value: 3, label: "AI Prompts", suffix: "" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  color: CYAN,
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                <AnimatedNumber
                  target={stat.value}
                  suffix={stat.suffix}
                  duration={800 + i * 200}
                />
              </div>
              <div
                style={{
                  color: TEXT_DIM,
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison toggle */}
        <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
          <button
            onClick={() => setShowComparison(!showComparison)}
            style={{
              background: "none",
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 8,
              color: TEXT_SECONDARY,
              fontSize: 13,
              padding: "8px 16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {showComparison ? "Hide" : "See how we"} compare to meal
            planning apps {showComparison ? "▴" : "▾"}
          </button>
        </div>

        {showComparison && (
          <div
            style={{
              margin: "12px 20px 0",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 70px",
                padding: "10px 14px",
                background: CARD_BG,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 600 }}
              />
              <span
                style={{
                  color: CYAN,
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                JSON.fit
              </span>
              <span
                style={{
                  color: TEXT_DIM,
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                Others
              </span>
            </div>
            {comparisonRows.map((row, i) => (
              <div
                key={i}
                className="compare-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 70px",
                  padding: "9px 14px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: TEXT_SECONDARY,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {row.feature}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: CYAN,
                    fontSize: typeof row.us === "string" ? 11 : 16,
                    fontWeight: 600,
                  }}
                >
                  {row.us === true ? "✓" : row.us}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    color: row.them === false ? "#FF5A5A" : TEXT_DIM,
                    fontSize: typeof row.them === "string" ? 11 : 16,
                  }}
                >
                  {row.them === false ? "✗" : row.them}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Price section */}
        <div
          style={{
            padding: "28px 20px 12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: TEXT_DIM,
              fontSize: 13,
              textDecoration: "line-through",
              marginBottom: 4,
            }}
          >
            $29.99
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                color: TEXT_PRIMARY,
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              $14.99
            </span>
          </div>
          <div
            style={{
              color: TEXT_SECONDARY,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            One-time. Yours forever.
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ padding: "8px 20px 16px" }}>
          <PulseGlow>
            <button
              className="cta-btn"
              style={{
                width: "100%",
                padding: "16px 24px",
                background: `linear-gradient(135deg, ${CYAN}, #00B4D8)`,
                border: "none",
                borderRadius: 14,
                color: DARK_BG,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "0.3px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: `0 4px 20px rgba(0, 229, 204, 0.3)`,
              }}
            >
              Unlock AI Nutrition →
            </button>
          </PulseGlow>
        </div>

        {/* Sub-CTA reassurance */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            padding: "0 20px 8px",
          }}
        >
          {["No subscription", "Instant access", "All future updates"].map(
            (item, i) => (
              <span
                key={i}
                style={{
                  color: TEXT_DIM,
                  fontSize: 10,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span style={{ color: CYAN, fontSize: 10 }}>✓</span> {item}
              </span>
            )
          )}
        </div>

        {/* Restore + links */}
        <div
          style={{
            textAlign: "center",
            padding: "12px 20px 20px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            marginTop: 8,
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              color: TEXT_DIM,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Restore Purchase
          </button>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                color: TEXT_DIM,
                fontSize: 10,
                opacity: 0.6,
              }}
            >
              Terms & Conditions · Privacy Policy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
