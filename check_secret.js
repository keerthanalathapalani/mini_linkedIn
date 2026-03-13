require('dotenv').config();
const s = process.env.CLOUDINARY_API_SECRET;
console.log('Secret Length:', s.length);
console.log('Starts with:', s[0]);
console.log('Ends with:', s[s.length-1]);
console.log('Has spaces?:', s.includes(' '));
console.log('Has newlines?:', s.includes('\n'));
