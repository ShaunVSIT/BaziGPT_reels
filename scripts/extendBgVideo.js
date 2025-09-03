#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ORIGINAL_VIDEO = path.join(PUBLIC_DIR, 'bg.mp4');
const EXTENDED_VIDEO = path.join(PUBLIC_DIR, 'bg-extended.mp4');

function extendBackgroundVideo() {
    console.log('🎬 Extending background video...');

    // Check if original video exists
    if (!fs.existsSync(ORIGINAL_VIDEO)) {
        console.error('❌ Original bg.mp4 not found in public folder');
        process.exit(1);
    }

    try {
        // Use FFmpeg to concatenate the video with itself
        console.log('📹 Creating extended video (2x length)...');

        // Create a temporary file list for FFmpeg
        const fileListPath = path.join(PUBLIC_DIR, 'temp_filelist.txt');
        const fileListContent = `file 'bg.mp4'\nfile 'bg.mp4'`;
        fs.writeFileSync(fileListPath, fileListContent);

        // Run FFmpeg command to concatenate
        const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${EXTENDED_VIDEO}" -y`;

        console.log('⚙️  Running FFmpeg...');
        execSync(ffmpegCommand, { stdio: 'inherit' });

        // Clean up temp file
        fs.unlinkSync(fileListPath);

        console.log('✅ Extended background video created successfully!');
        console.log(`📁 Output: ${EXTENDED_VIDEO}`);
        console.log('💡 Update your Root.tsx to use "bg-extended.mp4" instead of "bg.mp4"');

    } catch (error) {
        console.error('❌ Error extending video:', error.message);

        // Check if FFmpeg is installed
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
        } catch {
            console.error('💡 FFmpeg not found. Please install FFmpeg:');
            console.error('   macOS: brew install ffmpeg');
            console.error('   Windows: Download from https://ffmpeg.org/download.html');
            console.error('   Linux: sudo apt install ffmpeg');
        }

        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    extendBackgroundVideo();
}

module.exports = { extendBackgroundVideo };
