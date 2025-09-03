import React from "react";
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    Easing,
} from "remotion";
import { TikTokPage } from "@remotion/captions";

interface BaziSubtitlePageProps {
    page: TikTokPage;
}

export const BaziSubtitlePage: React.FC<BaziSubtitlePageProps> = ({ page }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Safety checks to prevent NaN values
    if (!page || !fps || fps <= 0 || typeof page.startMs !== 'number' ||
        !Number.isFinite(page.startMs) || !Number.isFinite(frame)) {
        return null;
    }

    // Note: endMs calculation removed as we now use individual token timing

    // In a Sequence, frame is relative to the sequence start, so we need to add the page startMs
    const sequenceTimeMs = (frame / fps) * 1000;
    const currentTimeMs = page.startMs + sequenceTimeMs;

    // console.log(`BaziSubtitlePage Render: page.startMs=${page.startMs}, frame=${frame}, currentTimeMs=${currentTimeMs}, text=${page.text.substring(0, 30)}...`);

    // Animation progress for entrance
    const progress = interpolate(
        frame,
        [0, 15], // 0.5 second entrance animation
        [0, 1],
        {
            easing: Easing.out(Easing.back(1.7)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        }
    );

    // Scale and opacity animations
    const scale = interpolate(progress, [0, 1], [0.8, 1]);
    const opacity = interpolate(progress, [0, 1], [0, 1]);

    const allTokens = page.tokens || [];
    const tokensToShow = allTokens; // Use all tokens from the current page

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "0 20px",
            }}
        >
            {/* Caption area container - centered but avoiding branding */}
            <div
                style={{
                    position: "absolute",
                    top: "45%", // Slightly higher to avoid date badge
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "700px", // Slightly smaller to prevent overflow
                }}
            >
                <div
                    style={{
                        transform: `scale(${scale})`,
                        opacity,
                        textAlign: "center",
                        maxWidth: "95%",
                        maxHeight: "100%",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        alignItems: "center",
                        lineHeight: 1.4,
                        gap: "8px",
                        overflow: "hidden",
                        minHeight: "120px", // Ensure consistent height for chunks
                    }}
                >
                    {tokensToShow.map((token, index) => {
                        // Use actual token timing from TikTok format
                        const tokenStartMs = token.fromMs;
                        const tokenEndMs = token.toMs;

                        // Safety check for token timing values
                        if (!Number.isFinite(tokenStartMs) || !Number.isFinite(tokenEndMs) || !Number.isFinite(currentTimeMs)) {
                            return null;
                        }

                        // Calculate relative timing within the sequence
                        const relativeStartMs = tokenStartMs - page.startMs;
                        const relativeEndMs = tokenEndMs - page.startMs;
                        const relativeCurrentMs = currentTimeMs - page.startMs;

                        // Smooth highlighting logic
                        const isActiveWord = relativeCurrentMs >= relativeStartMs && relativeCurrentMs <= relativeEndMs;
                        const isUpcoming = relativeCurrentMs < relativeStartMs && relativeCurrentMs >= relativeStartMs - 1000; // 1 second ahead
                        const isPast = relativeCurrentMs > relativeEndMs;

                        // Smooth opacity transitions instead of jarring visibility changes
                        let wordOpacity = 0.4; // Default dim state
                        if (isActiveWord) {
                            wordOpacity = 1.0; // Fully bright when active
                        } else if (isUpcoming) {
                            wordOpacity = 0.7; // Slightly brighter for upcoming words
                        } else if (isPast) {
                            wordOpacity = 0.3; // Dimmer for past words
                        }

                        const wordScale = 1.0; // Keep stable - no scaling

                        return (
                            <span
                                key={`${tokenStartMs}-${index}`}
                                style={{
                                    display: "inline-block",
                                    margin: "3px 5px",
                                    transform: `scale(${wordScale})`,
                                    opacity: wordOpacity,
                                    fontSize: 52, // Slightly larger for better readability
                                    fontWeight: "900",
                                    fontFamily: "Arial Black, sans-serif",
                                    color: isActiveWord ? "#FFD700" : (isUpcoming ? "#E0E0E0" : "#FFFFFF"),
                                    textShadow: isActiveWord
                                        ? "0 0 20px rgba(255, 215, 0, 1), 4px 4px 8px rgba(0, 0, 0, 1), -2px -2px 3px rgba(0, 0, 0, 0.9)"
                                        : "4px 4px 8px rgba(0, 0, 0, 0.8), -2px -2px 3px rgba(0, 0, 0, 0.7)",
                                    backgroundColor: "transparent",
                                    padding: "4px 6px",
                                    borderRadius: "0px",
                                    border: "none",
                                    transition: "color 0.4s ease, text-shadow 0.4s ease, opacity 0.4s ease",
                                }}
                            >
                                {token.text}
                            </span>
                        );
                    })}
                </div>
            </div>
        </AbsoluteFill>
    );
};
