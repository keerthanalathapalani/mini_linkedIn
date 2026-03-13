const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { verifyToken } = require('../../config/firebase');
const mockDb = require('../utils/mockDb');

router.post('/create', verifyToken, async (req, res) => {
  try {
    const { caption, imageUrl } = req.body;

    if (req.useMock) {
        const user = mockDb.findUserByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const post = mockDb.addPost({ userId: user._id, caption, imageUrl });
        return res.status(201).json({ post, matchNotifications: [] });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post = new Post({ userId: user._id, caption, imageUrl });
    await post.save();
    
    // Simple Keyword matching for notification
    const keywords = caption.toLowerCase().split(/\s+/);
    const usersWithMatches = await User.find({
      _id: { $ne: user._id },
      skills: { $in: keywords }
    }).limit(5);

    let matchNotifications = [];
    if (usersWithMatches.length > 0) {
      matchNotifications = usersWithMatches.map(u => {
        const matchedSkills = u.skills.filter(skill => keywords.includes(skill.toLowerCase()));
        return `You and ${u.name} both mentioned ${matchedSkills.join(', ')}. Consider connecting since you share similar skills.`;
      });
    }

    res.status(201).json({ post, matchNotifications });
  } catch (error) {
    console.error('Post Create Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    if (req.useMock) {
        return res.json(mockDb.getFeed());
    }
    const posts = await Post.find()
      .populate('userId', 'name profilePicture skills')
      .populate('comments.userId', 'name profilePicture')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Feed Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/like/:postId', verifyToken, async (req, res) => {
  try {
    if (req.useMock) {
        // Mocking likes is lower priority but can be added if needed
        return res.json({ likes: [] });
    }
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const post = await Post.findById(req.params.postId);
    if (!user || !post) return res.status(404).json({ error: 'Not found' });

    const likeIndex = post.likes.indexOf(user._id);
    if (likeIndex === -1) {
      post.likes.push(user._id);
    } else {
      post.likes.splice(likeIndex, 1);
    }
    
    await post.save();
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/comment/:postId', verifyToken, async (req, res) => {
  try {
    if (req.useMock) {
        return res.json([]);
    }
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const post = await Post.findById(req.params.postId);
    if (!user || !post) return res.status(404).json({ error: 'Not found' });

    const { text } = req.body;
    post.comments.push({ userId: user._id, text });
    await post.save();
    
    const updatedPost = await Post.findById(post._id).populate('comments.userId', 'name profilePicture');
    res.json(updatedPost.comments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
