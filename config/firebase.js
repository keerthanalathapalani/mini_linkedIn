const admin = require('firebase-admin');

let serviceAccount = null;

try {
  try {
    const rawCert = require('./serviceAccountKey.json');
    serviceAccount = {
      project_id: rawCert.project_id || rawCert.projectId,
      private_key: rawCert.private_key || rawCert.privateKey,
      client_email: rawCert.client_email || rawCert.clientEmail
    };
  } catch (err) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY,
        client_email: process.env.FIREBASE_CLIENT_EMAIL
      };
    }
  }

  if (serviceAccount && serviceAccount.private_key) {
    let pk = serviceAccount.private_key;
    if (typeof pk === 'string') {
        pk = pk.trim();
        if (pk.startsWith('"') && pk.endsWith('"')) pk = pk.substring(1, pk.length - 1);
        if (pk.startsWith("'") && pk.endsWith("'")) pk = pk.substring(1, pk.length - 1);
        pk = pk.replace(/\\n/g, '\n');
        serviceAccount.private_key = pk;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized [Project:', serviceAccount.project_id, ']');
    }
  } else {
    if (!admin.apps.length) {
      admin.initializeApp();
      console.log('⚠️ Firebase initialized with DEFAULT credentials');
    }
  }
} catch (error) {
  console.error('❌ Firebase Init Error:', error.message);
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('🔐 Verification Failed:', error.message);
    
    // Attempt to peek inside the token to see why it failed
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('🧐 Token Peek - Project ID (aud):', payload.aud);
            console.log('🧐 Token Peek - Issuer (iss):', payload.iss);
            console.log('🧐 Token Peek - Expired?:', payload.exp < (Date.now() / 1000));
        }
    } catch (peekError) {
        console.log('🧐 Could not peek into token');
    }

    return res.status(401).json({ 
        error: 'Unauthorized: Invalid token', 
        details: error.message 
    });
  }
};

module.exports = { admin, verifyToken };
