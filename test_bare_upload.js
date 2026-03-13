require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testBareUpload() {
    try {
        console.log('Testing BARE upload...');
        // Use a tiny base64 image (a 1x1 black pixel)
        const result = await cloudinary.uploader.upload('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        console.log('✅ Bare Upload SUCCESS:', result.secure_url);
    } catch (err) {
        console.error('❌ Bare Upload FAILED:', err.message);
        console.error('Code:', err.http_code);
    }
}

testBareUpload();
