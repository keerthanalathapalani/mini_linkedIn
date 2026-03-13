const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { verifyToken } = require('../../config/firebase');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/enhance-bio', verifyToken, async (req, res) => {
  try {
    const { bio } = req.body;
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional LinkedIn profile writer. Make this bio sound extremely professional, engaging, and impressive. Convert it to a polished blurb. Output ONLY the improved text.' },
        { role: 'user', content: bio }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 150
    });
    const enhancedBio = chatCompletion.choices[0]?.message?.content || bio;
    res.json({ enhancedBio: enhancedBio.trim().replace(/^"|"$/g, '') });
  } catch (error) {
    console.error('Groq bio error:', error);
    res.status(500).json({ error: 'Failed to enhance bio' });
  }
});

router.post('/enhance-caption', verifyToken, async (req, res) => {
  try {
    const { caption } = req.body;
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional LinkedIn content creator. Enhance this post title/caption to be engaging, professional, and impactful. Add maybe 1 or 2 relevant emojis. Output ONLY the improved caption text without any quotes.' },
        { role: 'user', content: caption }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 250
    });
    const enhancedCaption = chatCompletion.choices[0]?.message?.content || caption;
    res.json({ enhancedCaption: enhancedCaption.trim().replace(/^"|"$/g, '') });
  } catch (error) {
    console.error('Groq caption error:', error);
    res.status(500).json({ error: 'Failed to enhance caption' });
  }
});

module.exports = router;
