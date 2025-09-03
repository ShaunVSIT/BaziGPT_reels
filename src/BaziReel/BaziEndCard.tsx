import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const BaziEndCard: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const fadeIn = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
        easing: Easing.out(Easing.quad),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const floatY = interpolate(
        Math.sin((frame / fps) * Math.PI),
        [-1, 1],
        [-2, 2]
    );

    return (
        <AbsoluteFill
            style={{
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Scrim to make text pop */}
            <AbsoluteFill
                style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6))",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) translateY(${floatY}px)`,
                    width: "88%",
                    maxWidth: 980,
                    borderRadius: 28,
                    padding: "28px 32px",
                    textAlign: "center",
                    background: "rgba(0,0,0,0.55)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                    opacity: fadeIn,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <img
                        src={require("../../public/bazigpt.png")}
                        alt="BaziGPT"
                        style={{ width: 56, height: 56, borderRadius: 10 }}
                    />
                    <div
                        style={{
                            fontFamily: "Arial Black, sans-serif",
                            fontWeight: 900,
                            fontSize: 40,
                            color: "white",
                            letterSpacing: 0.2,
                            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                        }}
                    >
                        Follow for daily Bazi insights
                    </div>
                </div>

                <div
                    style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: 36,
                        color: "#FFD08A",
                        marginBottom: 10,
                    }}
                >
                    More on our page and website
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)",
                        color: "white",
                        fontFamily: "Arial Black, sans-serif",
                        fontSize: 32,
                        boxShadow: "0 8px 24px rgba(255,140,0,0.35)",
                    }}
                >
                    <span style={{ fontWeight: 900 }}>bazigpt.io</span>
                </div>
            </div>
        </AbsoluteFill>
    );
};


