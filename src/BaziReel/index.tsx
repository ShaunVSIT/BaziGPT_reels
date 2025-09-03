import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AbsoluteFill,
    Audio,
    CalculateMetadataFunction,
    cancelRender,
    continueRender,
    delayRender,
    getStaticFiles,
    OffthreadVideo,
    Sequence,
    useVideoConfig,
    watchStaticFile,
    interpolate,
    useCurrentFrame,
    Easing,
} from "remotion";
import { z } from "zod";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { loadFont } from "../load-font";
import { Caption } from "@remotion/captions";
import { BaziSubtitlePage } from "./BaziSubtitlePage";
import { BaziBranding } from "./BaziBranding";

export const baziReelSchema = z.object({
    audioSrc: z.string(),
    backgroundSrc: z.string(),
});

export const calculateBaziReelMetadata: CalculateMetadataFunction<
    z.infer<typeof baziReelSchema>
> = async ({ props }) => {
    const fps = 30;
    const durationInSeconds = await getAudioDurationInSeconds(props.audioSrc);

    return {
        fps,
        durationInFrames: Math.floor(durationInSeconds * fps),
    };
};

const getFileExists = (file: string) => {
    const files = getStaticFiles();
    const fileExists = files.find((f) => {
        return f.src === file;
    });
    return Boolean(fileExists);
};

// Custom chunking - we create our own chunks instead of using createTikTokStyleCaptions

export const BaziReel: React.FC<{
    audioSrc: string;
    backgroundSrc: string;
}> = ({ audioSrc, backgroundSrc }) => {
    const [subtitles, setSubtitles] = useState<Caption[]>([]);
    const [metadata, setMetadata] = useState<any>(null);
    const [handle] = useState(() => delayRender());
    const { fps, durationInFrames } = useVideoConfig();
    const frame = useCurrentFrame();

    const subtitlesFile = audioSrc
        .replace(/.mp3$/, ".json")
        .replace(/.wav$/, ".json");

    const metadataFile = audioSrc
        .replace(/.mp3$/, "-metadata.json")
        .replace(/.wav$/, "-metadata.json")
        .replace("bazi-audio", "bazi");

    const fetchData = useCallback(async () => {
        try {
            await loadFont();

            // Load captions
            const captionsRes = await fetch(subtitlesFile);
            const captionsData = (await captionsRes.json()) as Caption[];
            setSubtitles(captionsData);

            // Load metadata if available
            try {
                const metadataRes = await fetch(metadataFile);
                const metadataData = await metadataRes.json();
                setMetadata(metadataData);
            } catch (e) {
                console.log("No metadata file found, using defaults");
                setMetadata({
                    pillar: "Daily Wisdom",
                    date: new Date().toISOString().split('T')[0]
                });
            }

            continueRender(handle);
        } catch (e) {
            cancelRender(e);
        }
    }, [handle, subtitlesFile, metadataFile]);

    useEffect(() => {
        fetchData();

        const c1 = watchStaticFile(subtitlesFile, () => {
            fetchData();
        });

        const c2 = watchStaticFile(metadataFile, () => {
            fetchData();
        });

        return () => {
            c1.cancel();
            c2.cancel();
        };
    }, [fetchData, audioSrc]);

    // Scale captions to match actual audio duration to prevent drift while keeping custom chunking
    const scaledSubtitles: Caption[] = useMemo(() => {
        if (!subtitles || subtitles.length === 0 || !fps) return subtitles;
        const totalAudioMs = (durationInFrames / fps) * 1000;
        const lastEndMs = subtitles[subtitles.length - 1]?.endMs ?? 0;

        if (!Number.isFinite(totalAudioMs) || !Number.isFinite(lastEndMs) || lastEndMs <= 0) {
            return subtitles;
        }

        const scale = totalAudioMs / lastEndMs;

        // If scale is very close to 1, skip work
        if (Math.abs(scale - 1) < 0.02) {
            return subtitles;
        }

        const result: Caption[] = subtitles.map((s) => ({
            ...s,
            startMs: s.startMs * scale,
            endMs: s.endMs * scale,
            timestampMs: (s as any).timestampMs != null ? (s as any).timestampMs * scale : null,
        }));

        console.log('Applied caption time scaling', { scale, totalAudioMs, lastEndMs });
        return result;
    }, [subtitles, fps, durationInFrames]);

    const pages = useMemo(() => {
        const source = scaledSubtitles;
        if (!source || source.length === 0) return [];

        // Create our own chunking logic
        const chunks = [] as Array<{
            startMs: number;
            durationMs: number;
            tokens: { text: string; fromMs: number; toMs: number }[];
            text: string;
        }>;
        const WORDS_PER_CHUNK = 24;

        for (let i = 0; i < source.length; i += WORDS_PER_CHUNK) {
            const chunkTokens = source.slice(i, i + WORDS_PER_CHUNK);
            if (chunkTokens.length === 0) continue;

            const startMs = chunkTokens[0].startMs;
            const endMs = chunkTokens[chunkTokens.length - 1].endMs;

            const tikTokTokens = chunkTokens.map((token) => ({
                text: token.text,
                fromMs: token.startMs,
                toMs: token.endMs,
            }));

            chunks.push({
                startMs,
                durationMs: Math.max(1, endMs - startMs),
                tokens: tikTokTokens,
                text: chunkTokens.map((t) => t.text).join(' '),
            });

            if (chunks.length > 1) {
                const prevChunk = chunks[chunks.length - 2];
                const gap = startMs - (prevChunk.startMs + prevChunk.durationMs);
                if (gap > 100) {
                    console.log(`Gap detected between chunk ${chunks.length - 2} and ${chunks.length - 1}: ${gap}ms`);
                }
            }
        }

        return chunks;
    }, [scaledSubtitles]);

    // Background blur animation
    const blurAmount = interpolate(
        frame,
        [0, 30, fps * 2],
        [0, 3, 3],
        {
            easing: Easing.out(Easing.quad),
        }
    );

    return (
        <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
            {/* Background Video with Blur */}
            <AbsoluteFill>
                <OffthreadVideo
                    style={{
                        objectFit: "cover",
                        filter: `blur(${blurAmount}px) brightness(0.7)`,
                    }}
                    src={backgroundSrc}
                />
                {/* Dark overlay for better text readability */}
                <AbsoluteFill
                    style={{
                        background: "linear-gradient(45deg, rgba(0,0,0,0.4), rgba(26,26,46,0.6))",
                    }}
                />
            </AbsoluteFill>

            {/* BaziGPT Branding */}
            <BaziBranding metadata={metadata} />

            {/* TikTok-Style Captions */}
            {pages.map((page, index) => {
                // Safety checks to prevent NaN values
                if (!page || typeof page.startMs !== 'number' || !Number.isFinite(page.startMs) || !fps || fps <= 0) {
                    return null;
                }

                const nextPage = pages[index + 1] ?? null;
                const subtitleStartFrame = Math.round((page.startMs / 1000) * fps);

                // Calculate end frame - use next page start or token end time
                let subtitleEndFrame;
                if (nextPage && Number.isFinite(nextPage.startMs)) {
                    subtitleEndFrame = Math.round((nextPage.startMs / 1000) * fps);
                } else {
                    // Use the last token's end time
                    const lastToken = page.tokens[page.tokens.length - 1];
                    const pageEndMs = lastToken ? lastToken.toMs : page.startMs + 1000;
                    subtitleEndFrame = Math.round((pageEndMs / 1000) * fps);
                }

                const durationInFrames = subtitleEndFrame - subtitleStartFrame;

                // // Debug sequence timing for problematic chunks
                // if (index < 5 || index >= pages.length - 5) {
                //     console.log(`Sequence ${index}:`, {
                //         startMs: page.startMs,
                //         startFrame: subtitleStartFrame,
                //         endFrame: subtitleEndFrame,
                //         duration: durationInFrames,
                //         tokens: page.tokens.length,
                //         text: page.text.substring(0, 30) + '...'
                //     });
                // }

                // Additional safety check for valid frame values
                if (!Number.isFinite(subtitleStartFrame) || !Number.isFinite(durationInFrames) || durationInFrames <= 0) {
                    console.log(`Skipping invalid sequence ${index}:`, { subtitleStartFrame, durationInFrames });
                    return null;
                }

                return (
                    <Sequence
                        key={index}
                        from={subtitleStartFrame}
                        durationInFrames={durationInFrames}
                    >
                        <BaziSubtitlePage key={page.startMs} page={page} />
                    </Sequence>
                );
            })}

            {/* Audio */}
            <Audio src={audioSrc} />

            {/* No Caption File Warning */}
            {!getFileExists(subtitlesFile) && (
                <AbsoluteFill
                    style={{
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0,0,0,0.8)",
                    }}
                >
                    <div
                        style={{
                            color: "#FF8C00",
                            fontSize: 32,
                            fontWeight: "bold",
                            textAlign: "center",
                            padding: 40,
                        }}
                    >
                        No captions found. Run: npm run generate-reel
                    </div>
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
