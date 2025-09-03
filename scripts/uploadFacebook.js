require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Files
const OUTPUT_VIDEO = path.join(__dirname, '..', 'output', 'bazi-reel.mp4');
const METADATA_FILE = path.join(__dirname, '..', 'public', 'bazi-metadata.json');

function validateEnv() {
    const required = ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
}

function readCaption() {
    try {
        const json = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        const date = json.date || new Date().toISOString().split('T')[0];
        const pillar = json.pillar ? `Bazi Pillar: ${json.pillar}\n\n` : '';
        return `Daily Bazi Reading — ${date}\n${pillar}More on our page`;
    } catch {
        return `Daily Bazi Reading — ${new Date().toISOString().split('T')[0]}\nMore on our page`;
    }
}

async function startUploadSession(pageId, accessToken) {
    const url = `https://graph.facebook.com/v23.0/${pageId}/video_reels`;
    const payload = {
        upload_phase: 'start',
        access_token: accessToken,
    };
    const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    return res.data; // { video_id, upload_url }
}

async function uploadBinary(uploadUrl, accessToken, filePath, fileSize) {
    const data = fs.readFileSync(filePath);
    const headers = {
        Authorization: `OAuth ${accessToken}`,
        'offset': '0',
        'file_size': String(fileSize),
        'Content-Type': 'application/octet-stream',
    };
    const res = await axios.post(uploadUrl, data, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    return res.data; // { success: true }
}

async function finishUpload(pageId, accessToken, videoId, description) {
    const url = `https://graph.facebook.com/v23.0/${pageId}/video_reels`;
    const payload = {
        upload_phase: 'finish',
        video_id: videoId,
        video_state: 'PUBLISHED',
        description,
        access_token: accessToken,
    };
    const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
    return res.data;
}

async function uploadReel() {
    validateEnv();

    if (!fs.existsSync(OUTPUT_VIDEO)) {
        throw new Error(`Video not found at ${OUTPUT_VIDEO}. Generate and render first.`);
    }

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const caption = readCaption();

    // Basic sanity checks per spec (3–90s, 9:16, etc.) are assumed handled at render time

    console.log('▶️ Starting Reels upload session...');
    const { video_id, upload_url } = await startUploadSession(pageId, accessToken);
    if (!video_id || !upload_url) {
        throw new Error('Failed to start upload session: Missing video_id or upload_url');
    }
    console.log('✅ Session started. video_id:', video_id);

    const stats = fs.statSync(OUTPUT_VIDEO);
    console.log('⬆️ Uploading binary to rupload...', { bytes: stats.size });
    const uploadResult = await uploadBinary(upload_url, accessToken, OUTPUT_VIDEO, stats.size);
    if (!uploadResult?.success) {
        throw new Error(`Binary upload did not return success: ${JSON.stringify(uploadResult)}`);
    }
    console.log('✅ Binary upload complete. Publishing...');

    const publishResult = await finishUpload(pageId, accessToken, video_id, caption);
    console.log('✅ Publish response:', publishResult);

    return { video_id, publishResult };
}

async function main() {
    try {
        await uploadReel();
    } catch (err) {
        console.error('❌ Facebook Reels upload failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { uploadReel };
