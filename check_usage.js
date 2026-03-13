require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkUsage() {
    try {
        const result = await cloudinary.api.usage();
        console.log('✅ Usage Info:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Usage Check FAILED:', err.message);
        console.error('Full Error:', JSON.stringify(err, null, 2));
    }
}

checkUsage();
