require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
    try {
        console.log('Attempting test upload...');
        // Upload a small placeholder image
        const result = await cloudinary.uploader.upload('https://ui-avatars.com/api/?name=Test', {
            folder: 'test-folder'
        });
        console.log('✅ Upload Success:', result.secure_url);
    } catch (err) {
        console.error('❌ Upload Failed:', err.message);
        console.error('Full Error:', JSON.stringify(err, null, 2));
    }
}

testUpload();
