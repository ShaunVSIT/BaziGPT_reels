import { execSync } from "node:child_process";
import {
  existsSync,
  rmSync,
  writeFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import path from "path";
import {
  WHISPER_LANG,
  WHISPER_MODEL,
  WHISPER_PATH,
  WHISPER_VERSION,
} from "./whisper-config.mjs";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const extractToTempAudioFile = (fileToTranscribe, tempOutFile) => {
  // Extracting audio from mp4 and save it as 16khz wav file
  execSync(
    `npx remotion ffmpeg -i "${fileToTranscribe}" -ar 16000 "${tempOutFile}" -y`,
    { stdio: ["ignore", "inherit"] },
  );
};

const subFile = async (filePath, outJsonPath) => {
  const whisperCppOutput = await transcribe({
    inputPath: filePath,
    model: WHISPER_MODEL,
    tokenLevelTimestamps: true,
    whisperPath: WHISPER_PATH,
    whisperCppVersion: WHISPER_VERSION,
    printOutput: false,
    translateToEnglish: false,
    language: WHISPER_LANG,
    splitOnWord: true,
  });

  const { captions } = toCaptions({
    whisperCppOutput,
  });
  writeFileSync(outJsonPath, JSON.stringify(captions, null, 2));
};

const processVideo = async (fullPath, entry, directory, force = false) => {
  if (
    !fullPath.endsWith(".mp4") &&
    !fullPath.endsWith(".webm") &&
    !fullPath.endsWith(".mkv") &&
    !fullPath.endsWith(".mov")
  ) {
    return;
  }

  const outJsonPath = fullPath
    .replace(/\.mp4$/, ".json")
    .replace(/\.mkv$/, ".json")
    .replace(/\.mov$/, ".json")
    .replace(/\.webm$/, ".json");

  const isTranscribed = existsSync(outJsonPath);
  if (isTranscribed && !force) {
    return;
  }
  let shouldRemoveTempDirectory = false;
  if (!existsSync(path.join(process.cwd(), "temp"))) {
    mkdirSync(`temp`);
    shouldRemoveTempDirectory = true;
  }
  console.log("Extracting audio from file", entry);

  const tempWavFileName = entry.split(".")[0] + ".wav";
  const tempOutFilePath = path.join(process.cwd(), `temp/${tempWavFileName}`);

  extractToTempAudioFile(fullPath, tempOutFilePath);
  await subFile(tempOutFilePath, outJsonPath);
  if (shouldRemoveTempDirectory) {
    rmSync(path.join(process.cwd(), "temp"), { recursive: true });
  }
};

const processAudio = async (fullPath, entry, directory, force = false) => {
  if (
    !fullPath.endsWith(".mp3") &&
    !fullPath.endsWith(".wav") &&
    !fullPath.endsWith(".m4a") &&
    !fullPath.endsWith(".aac") &&
    !fullPath.endsWith(".flac") &&
    !fullPath.endsWith(".ogg")
  ) {
    return;
  }

  const outJsonPath = fullPath
    .replace(/\.mp3$/, ".json")
    .replace(/\.wav$/, ".json")
    .replace(/\.m4a$/, ".json")
    .replace(/\.aac$/, ".json")
    .replace(/\.flac$/, ".json")
    .replace(/\.ogg$/, ".json");

  const isTranscribed = existsSync(outJsonPath);
  if (isTranscribed && !force) {
    return;
  }

  let shouldRemoveTempDirectory = false;
  if (!existsSync(path.join(process.cwd(), "temp"))) {
    mkdirSync(`temp`);
    shouldRemoveTempDirectory = true;
  }

  console.log("Preparing audio for transcription", entry);

  const baseName = entry.split(".")[0];
  const tempWavFileName = baseName + ".wav";
  const tempOutFilePath = path.join(process.cwd(), `temp/${tempWavFileName}`);

  // Convert to 16kHz WAV for better alignment
  extractToTempAudioFile(fullPath, tempOutFilePath);

  await subFile(tempOutFilePath, outJsonPath);

  if (shouldRemoveTempDirectory) {
    rmSync(path.join(process.cwd(), "temp"), { recursive: true });
  }
};

const processDirectory = async (directory) => {
  const entries = readdirSync(directory).filter((f) => f !== ".DS_Store");

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stat = lstatSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(fullPath); // Recurse into subdirectories
    } else {
      // Decide based on file extension whether to treat as video or audio
      if (
        fullPath.endsWith(".mp4") ||
        fullPath.endsWith(".webm") ||
        fullPath.endsWith(".mkv") ||
        fullPath.endsWith(".mov")
      ) {
        await processVideo(fullPath, entry, directory);
      } else if (
        fullPath.endsWith(".mp3") ||
        fullPath.endsWith(".wav") ||
        fullPath.endsWith(".m4a") ||
        fullPath.endsWith(".aac") ||
        fullPath.endsWith(".flac") ||
        fullPath.endsWith(".ogg")
      ) {
        await processAudio(fullPath, entry, directory);
      }
    }
  }
};

await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
await downloadWhisperModel({ folder: WHISPER_PATH, model: WHISPER_MODEL });

// Read arguments for filename if given else process all files in the directory
const hasArgs = process.argv.length > 2;

if (!hasArgs) {
  await processDirectory(path.join(process.cwd(), "public"));
  process.exit(0);
}

for (const arg of process.argv.slice(2)) {
  const fullPath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  const stat = lstatSync(fullPath);

  if (stat.isDirectory()) {
    await processDirectory(fullPath);
    continue;
  }

  console.log(`Processing file ${fullPath}`);
  const directory = path.dirname(fullPath);
  const fileName = path.basename(fullPath);
  if (
    fullPath.endsWith(".mp4") ||
    fullPath.endsWith(".webm") ||
    fullPath.endsWith(".mkv") ||
    fullPath.endsWith(".mov")
  ) {
    await processVideo(fullPath, fileName, directory, true);
  } else if (
    fullPath.endsWith(".mp3") ||
    fullPath.endsWith(".wav") ||
    fullPath.endsWith(".m4a") ||
    fullPath.endsWith(".aac") ||
    fullPath.endsWith(".flac") ||
    fullPath.endsWith(".ogg")
  ) {
    await processAudio(fullPath, fileName, directory, true);
  } else {
    console.log("Skipping unsupported file type", fileName);
  }
}
