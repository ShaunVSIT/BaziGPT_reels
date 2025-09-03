import "./index.css";
import { Composition, staticFile } from "remotion";
// Removed CaptionedVideo - only using BaziReel
import {
  BaziReel,
  calculateBaziReelMetadata,
  baziReelSchema,
} from "./BaziReel";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BaziReel"
        component={BaziReel}
        calculateMetadata={calculateBaziReelMetadata}
        schema={baziReelSchema}
        width={1080}
        height={1920}
        defaultProps={{
          audioSrc: staticFile("bazi-audio.mp3"),
          backgroundSrc: staticFile("bg-extended.mp4"),
        }}
      />
    </>
  );
};
