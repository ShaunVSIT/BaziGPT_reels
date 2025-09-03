require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { execSync } = require('child_process');

// Configuration
const DAILY_READING_URL = process.env.BAZIGPT_API_URL || 'https://www.bazigpt.io/api/daily-bazi';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const AUDIO_FILE = path.join(PUBLIC_DIR, 'bazi-audio.mp3');
const CAPTIONS_FILE = path.join(PUBLIC_DIR, 'bazi-audio.json');
const METADATA_FILE = path.join(PUBLIC_DIR, 'bazi-metadata.json');
const OUTPUT_VIDEO = path.join(OUTPUT_DIR, 'bazi-reel.mp4');

// Validate environment variables
function validateEnv() {
    const required = ['OPENAI_TTS_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Ensure directories exist
function ensureDirectories() {
    [OUTPUT_DIR, PUBLIC_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
}

// Remove old assets so each run produces fresh outputs
function cleanPreviousAssets() {
    [AUDIO_FILE, CAPTIONS_FILE, METADATA_FILE, OUTPUT_VIDEO].forEach(file => {
        try {
            if (fs.existsSync(file)) {
                fs.rmSync(file, { force: true });
                console.log(`🧹 Removed old asset: ${file}`);
            }
        } catch (err) {
            console.warn(`⚠️ Could not remove ${file}: ${err.message}`);
        }
    });
}

// Should we render automatically?
function shouldRender() {
    return process.argv.includes('--render') || String(process.env.AUTO_RENDER).toLowerCase() === 'true';
}

function renderReel() {
    console.log('🎞️ Rendering reel with Remotion...');
    try {
        // Use local Remotion CLI via npx; overwrite existing file if present
        execSync('npx remotion render src/index.ts BaziReel output/bazi-reel.mp4 --overwrite', { stdio: 'inherit' });
        console.log('✅ Render completed: output/bazi-reel.mp4');
        return OUTPUT_VIDEO;
    } catch (err) {
        console.error('❌ Render failed:', err.message);
        throw err;
    }
}

// Fetch daily reading text from JSON API (migrated from tweetbot)
async function fetchDailyReading() {
    console.log('🌐 Fetching daily reading from API...');

    try {
        const client = axios.create();
        const response = await client.get(DAILY_READING_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }).catch(async (err) => {
            console.warn('⏳ API request failed, retrying once in 2s...', err.message);
            await new Promise(r => setTimeout(r, 2000));
            return client.get(DAILY_READING_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
        });

        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data = response.data;

        if (!data.forecast) {
            throw new Error('Invalid API response: missing forecast field');
        }

        const readingText = data.forecast.trim();
        const baziPillar = data.baziPillar || 'Unknown Pillar';
        const date = data.date || new Date().toISOString().split('T')[0];

        console.log('✅ Daily reading fetched from API');
        console.log(`📅 Date: ${date}`);
        console.log(`🏛️ Bazi Pillar: ${baziPillar}`);
        console.log(`📝 Text length: ${readingText.length} characters`);

        // Clean the Bazi pillar text
        const cleanBaziPillar = baziPillar
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const enhancedText = `Today's Bazi pillar is ${cleanBaziPillar}. ${readingText}`;

        console.log(`🧹 Cleaned pillar text: "${cleanBaziPillar}"`);
        return {
            text: enhancedText,
            pillar: cleanBaziPillar,
            date: date,
            originalForecast: readingText
        };

    } catch (error) {
        console.error('❌ Error fetching daily reading from API:', error.message);
        console.log('🔄 Using fallback text...');

        return {
            text: `Today's Bazi reading brings insights into the cosmic energies surrounding you. The interplay of the five elements - Wood, Fire, Earth, Metal, and Water - creates a unique pattern that influences your day. Pay attention to the balance between your personal energy and the universal flow. This is a time for reflection and mindful action.`,
            pillar: 'Universal Balance',
            date: new Date().toISOString().split('T')[0],
            originalForecast: 'Fallback reading'
        };
    }
}

// Generate audio narration using OpenAI TTS (migrated from tweetbot)
async function generateAudio(text) {
    console.log('🎙️ Generating audio narration...');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_TTS_KEY
    });

    try {
        const response = await openai.audio.speech.create({
            model: 'tts-1-hd',
            voice: 'nova', // Female voice, good for spiritual content
            input: text,
            speed: 0.9 // Slightly slower for better comprehension
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(AUDIO_FILE, buffer);

        console.log('✅ Audio narration generated');
        console.log(`🎵 Saved to: ${AUDIO_FILE}`);

        return AUDIO_FILE;

    } catch (error) {
        console.error('❌ Error generating audio narration:', error.message);
        throw error;
    }
}

// Convert text to Remotion captions format (fallback only)
function generateCaptionsFromText(text) {
    console.log('📝 Converting text to captions format...');

    const words = text.split(' ').filter(word => word.length > 0);
    const wordsPerSecond = 2.5; // Adjust based on speech speed

    const captions = words.map((word, index) => {
        const startMs = (index / wordsPerSecond) * 1000;
        const endMs = ((index + 1) / wordsPerSecond) * 1000;

        return {
            text: word,
            startMs,
            endMs,
            timestampMs: startMs + (endMs - startMs) / 2,
            confidence: 1,
        };
    });

    // Save captions as JSON file for Remotion
    const captionsFile = path.join(PUBLIC_DIR, 'bazi-audio.json');
    fs.writeFileSync(captionsFile, JSON.stringify(captions, null, 2));

    console.log(`✅ Captions saved to: ${captionsFile}`);
    console.log(`📊 Generated ${captions.length} caption entries`);

    return captionsFile;
}

// Main function
async function main() {
    try {
        console.log('🎯 Starting BaziGPT Reel Generation...');

        // Validate environment and setup
        validateEnv();
        ensureDirectories();
        cleanPreviousAssets();
        console.log('✅ Environment validated and directories ready');

        // Step 1: Fetch daily reading
        const reading = await fetchDailyReading();

        // Step 2: Generate audio
        const audioFile = await generateAudio(reading.text);

        // Step 3: Generate captions by aligning actual TTS audio with Whisper (preferred)
        let captionsFile;
        try {
            const subScript = path.join(__dirname, '..', 'sub.mjs');
            const audioArg = AUDIO_FILE;
            console.log('🔎 Aligning captions using Whisper on generated audio...');
            execSync(`node "${subScript}" "${audioArg}"`, { stdio: 'inherit' });
            captionsFile = CAPTIONS_FILE;
            if (!fs.existsSync(captionsFile)) {
                throw new Error('Whisper alignment did not produce captions file');
            }
            console.log('✅ Whisper alignment completed');
        } catch (err) {
            console.warn('⚠️ Whisper alignment failed, falling back to synthetic timings:', err.message);
            captionsFile = generateCaptionsFromText(reading.text);
        }

        // Step 4: Create metadata file for Remotion
        const metadata = {
            date: reading.date,
            pillar: reading.pillar,
            audioFile: 'bazi-audio.mp3',
            captionsFile: 'bazi-audio.json',
            text: reading.text,
            originalForecast: reading.originalForecast,
            generatedAt: new Date().toISOString()
        };

        const metadataFile = METADATA_FILE;
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

        console.log('🎉 Reel generation preparation completed!');
        console.log(`📁 Files ready in public directory:`);
        console.log(`   Audio: ${path.basename(audioFile)}`);
        console.log(`   Captions: ${path.basename(captionsFile)}`);
        console.log(`   Metadata: ${path.basename(metadataFile)}`);
        console.log('');
        if (shouldRender()) {
            const renderedPath = renderReel();
            console.log('');
            console.log('🎉 All done!');
            console.log(`   Video: ${renderedPath}`);
        } else {
            console.log('🎬 Next steps:');
            console.log('   1. Run: npm run dev (to preview in Remotion Studio)');
            console.log('   2. Run: npm run render-reel (to render final video)');
            console.log('      Or rerun this script with --render or AUTO_RENDER=true to render automatically');
        }

        return {
            success: true,
            audioFile,
            captionsFile,
            metadataFile,
            reading
        };

    } catch (error) {
        console.error('💥 Error in reel generation:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    main,
    fetchDailyReading,
    generateAudio,
    generateCaptionsFromText
};
