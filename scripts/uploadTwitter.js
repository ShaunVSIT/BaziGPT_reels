require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TwitterApi } = require('twitter-api-v2');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const INPUT_VIDEO = path.join(OUTPUT_DIR, 'bazi-reel.mp4');
const TW_READY_VIDEO = path.join(OUTPUT_DIR, 'bazi-reel-twitter.mp4');
const METADATA_FILE = path.join(__dirname, '..', 'public', 'bazi-metadata.json');

function validateEnv() {
    const required = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_SECRET',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
}

function ensureFaststart(inputPath, outputPath) {
    // Remux to move moov atom to front for faster playback/compatibility
    // Also set a sane bitrate/level without re-encoding if possible
    execSync(
        `ffmpeg -y -i "${inputPath}" -c copy -movflags +faststart -map 0:v:0 -map 0:a:0 "${outputPath}"`,
        { stdio: 'inherit' }
    );
    return outputPath;
}

function buildStatus() {
    try {
        const json = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        const date = json.date || new Date().toISOString().split('T')[0];
        const pillar = json.pillar ? `Bazi Pillar: ${json.pillar}. ` : '';
        return `Daily Bazi Reading — ${date}. ${pillar}Full reading on our page.`.slice(0, 280);
    } catch {
        return `Daily Bazi Reading — ${new Date().toISOString().split('T')[0]}`.slice(0, 280);
    }
}

async function uploadToTwitter() {
    validateEnv();

    if (!fs.existsSync(INPUT_VIDEO)) {
        throw new Error(`Video not found at ${INPUT_VIDEO}. Render first.`);
    }

    // Prepare video for Twitter
    const videoPath = ensureFaststart(INPUT_VIDEO, TW_READY_VIDEO);

    const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    const mediaId = await client.v1.uploadMedia(videoPath, { type: 'video/mp4' });
    const status = buildStatus();

    const tweet = await client.v2.tweet({ text: status, media: { media_ids: [mediaId] } });
    console.log('✅ Tweet posted:', tweet);
}

async function main() {
    try {
        await uploadToTwitter();
    } catch (err) {
        console.error('❌ Twitter upload failed:', err?.data || err?.message || err);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { uploadToTwitter };


