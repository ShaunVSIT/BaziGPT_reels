import React from "react";
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    Easing,
} from "remotion";

interface BaziBrandingProps {
    metadata: {
        pillar?: string;
        date?: string;
    } | null;
}

export const BaziBranding: React.FC<BaziBrandingProps> = ({ metadata }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Safety checks to prevent NaN values
    if (!fps || fps <= 0 || !Number.isFinite(frame)) {
        return null;
    }

    // Logo entrance animation
    const logoProgress = interpolate(
        frame,
        [0, 30, 60], // 2 second entrance
        [0, 1, 1],
        {
            easing: Easing.out(Easing.back(1.5)),
        }
    );

    const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
    const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);

    // Pillar info animation (delayed)
    const pillarProgress = interpolate(
        frame,
        [60, 90], // Starts after logo
        [0, 1],
        {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        }
    );

    const pillarOpacity = interpolate(pillarProgress, [0, 1], [0, 1]);
    const pillarY = interpolate(pillarProgress, [0, 1], [20, 0]);

    // Subtle glow animation
    const glowIntensity = interpolate(
        Math.sin((frame / fps) * Math.PI * 0.5), // Slow sine wave
        [-1, 1],
        [0.6, 1]
    );

    return (
        <>
            {/* Main Logo/Brand */}
            <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
                <div
                    style={{
                        position: "absolute",
                        top: "12%", // Push below Facebook UI overlays
                        left: "50%",
                        transform: `translateX(-50%) scale(${logoScale})`,
                        opacity: logoOpacity,
                        background: `linear-gradient(135deg, #FF8C00 0%, #FFA500 50%, #FF8C00 100%)`,
                        padding: "18px 36px",
                        borderRadius: "40px",
                        width: "85%",
                        maxWidth: 980,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontFamily: "Arial Black, sans-serif",
                        fontSize: 44,
                        fontWeight: "900",
                        color: "white",
                        textAlign: "center",
                        boxShadow: `0 0 ${30 * glowIntensity}px rgba(255, 140, 0, ${0.6 * glowIntensity}), 0 8px 32px rgba(0, 0, 0, 0.3)`,
                        border: "3px solid rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                    }}
                >
                    🔮 BaziGPT Daily Reading
                </div>
            </AbsoluteFill>

            {/* Pillar Information */}
            {metadata?.pillar && (
                <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
                    <div
                        style={{
                            position: "absolute",
                            top: "17%", // Below the main logo and still above captions
                            left: "50%",
                            transform: `translateX(-50%) translateY(${pillarY}px)`,
                            opacity: pillarOpacity,
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            padding: "12px 24px",
                            borderRadius: "25px",
                            width: "85%",
                            maxWidth: 980,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontFamily: "Arial, sans-serif",
                            fontSize: 42,
                            fontWeight: "700",
                            color: "#FF8C00",
                            textAlign: "center",
                            border: "2px solid rgba(255, 140, 0, 0.3)",
                            backdropFilter: "blur(10px)",
                            WebkitBackdropFilter: "blur(10px)",
                        }}
                    >
                        Today's Pillar: {metadata.pillar}
                    </div>
                </AbsoluteFill>
            )}

            {/* Date Badge */}
            {metadata?.date && (
                <AbsoluteFill
                    style={{
                        justifyContent: "flex-start",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "75%",
                            left: "50%",
                            transform: "translate(-50%, 0)",
                            zIndex: 10,
                            opacity: pillarOpacity,
                            backgroundColor: "rgba(255, 140, 0, 0.9)",
                            padding: "12px 24px",
                            borderRadius: "20px",
                            fontFamily: "Arial, sans-serif",
                            fontSize: 42,
                            fontWeight: "bold",
                            color: "white",
                            textAlign: "center",
                        }}
                    >
                        {new Date(metadata.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>

                    {/* Logo + watermark below date */}
                    <div
                        style={{
                            position: "absolute",
                            top: "82%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            padding: "8px 14px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.15)",
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                        }}
                    >
                        <img
                            src={require('../../public/bazigpt.png')}
                            alt="BaziGPT"
                            style={{ width: 44, height: 44, borderRadius: 8 }}
                        />
                        <span
                            style={{
                                fontFamily: 'Arial Black, sans-serif',
                                fontWeight: 900,
                                fontSize: 28,
                                letterSpacing: 0.2,
                                color: 'white',
                                textShadow: '0 2px 6px rgba(0,0,0,0.7)'
                            }}
                        >
                            bazigpt.io
                        </span>
                    </div>
                </AbsoluteFill>
            )}

            {/* Subtle particle effects */}
            <AbsoluteFill>
                {[...Array(5)].map((_, i) => {
                    const particleFrame = (frame + i * 20) % (fps * 8); // 8 second loop
                    const particleProgress = particleFrame / (fps * 8);

                    const x = interpolate(
                        particleProgress,
                        [0, 1],
                        [Math.random() * 1080, Math.random() * 1080]
                    );

                    const y = interpolate(
                        particleProgress,
                        [0, 1],
                        [1920, -100]
                    );

                    const opacity = interpolate(
                        particleProgress,
                        [0, 0.2, 0.8, 1],
                        [0, 0.6, 0.6, 0]
                    );

                    return (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                left: x,
                                top: y,
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                backgroundColor: "#FF8C00",
                                opacity: opacity * 0.7,
                                boxShadow: "0 0 10px rgba(255, 140, 0, 0.5)",
                            }}
                        />
                    );
                })}
            </AbsoluteFill>
        </>
    );
};
