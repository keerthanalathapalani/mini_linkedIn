const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());
const fs = require('fs');
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware to check if MongoDB is connected - with SMART FALLBACK
const checkDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ MongoDB not connected. Using local JSON storage fallback.');
    req.useMock = true;
  } else {
    req.useMock = false;
  }
  next();
};

// Routes
app.use('/api/profile', checkDb, require('./routes/profileRoutes'));
app.use('/api/posts', checkDb, require('./routes/postRoutes'));
app.use('/api/ai', checkDb, require('./routes/aiRoutes'));

app.get('/api/config/firebase', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  });
});


// Endpoint to handle Cloudinary upload via backend if needed, but we upload from frontend in this typical approach, 
// wait, the prompt asks to use Cloudinary. Let's create an upload endpoint just in case.
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const cloudinary = require('../config/cloudinary');

app.post('/api/upload', checkDb, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'linkedin-posts' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.warn('⚠️ Cloudinary failed (403/Forbidden). Falling back to local storage...');
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

      const fileName = Date.now() + '-' + req.file.originalname.replace(/\s/g, '_');
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, req.file.buffer);
      console.log('✅ Saved image locally:', fileName);
      
      res.json({ url: `/uploads/${fileName}` });
    } catch (localError) {
      console.error('❌ Local Upload Error:', localError);
      res.status(500).json({ error: 'All upload methods failed' });
    }
  }
});

// HTML Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'feed.html')));
app.get('/network', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'network.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'profile.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))); // we will handle form toggle in index.html

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 
})
  .then(() => {
    console.log('✅ MongoDB connected successfully to', mongoose.connection.host);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 TIP: Check if your IP address is whitelisted in MongoDB Atlas (Network Access).');
    console.log('🚀 Server starting in SMART-FALLBACK mode (using local JSON storage for database actions)...');
  })
  .finally(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  });
