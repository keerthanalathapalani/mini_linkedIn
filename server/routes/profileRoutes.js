const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../../config/firebase');
const mockDb = require('../utils/mockDb');

router.get('/:id', async (req, res) => {
  try {
    if (req.useMock) {
        const user = mockDb.findUserById(req.params.id);
        return user ? res.json(user) : res.status(404).json({ error: 'User not found' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

router.post('/create', verifyToken, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { name, email } = req.body;
    
    if (req.useMock) {
        let user = mockDb.findUserByFirebaseUid(firebaseUid);
        if (!user) {
            user = mockDb.addUser({ firebaseUid, name, email });
        }
        return res.status(200).json(user);
    }
    
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = new User({ firebaseUid, name, email });
      await user.save();
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Profile Create Error:', error);
    res.status(500).json({ error: 'Failed to create profile', details: error.message });
  }
});

router.put('/update', verifyToken, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { name, bio, skills, profilePicture } = req.body;

    if (req.useMock) {
        const user = mockDb.updateUser(firebaseUid, { name, bio, skills, profilePicture });
        return user ? res.json(user) : res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (profilePicture) user.profilePicture = profilePicture;
    
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

router.get('/me/info', verifyToken, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const email = req.user.email || '';
    const name = req.user.name || email.split('@')[0] || 'User';

    if (req.useMock) {
        let user = mockDb.findUserByFirebaseUid(firebaseUid);
        if (!user) {
            console.log('📝 Auto-creating local user for:', email);
            user = mockDb.addUser({ firebaseUid, name, email, bio: '', skills: [], profilePicture: '' });
        }
        return res.json(user);
    }
    
    let user = await User.findOne({ firebaseUid });
    if (!user) {
        console.log('📝 Auto-creating MongoDB user for:', email);
        user = new User({ firebaseUid, name, email });
        await user.save();
    }
    res.json(user);
  } catch (error) {
    console.error('Me Info Error:', error);
    res.status(500).json({ error: 'Failed to fetch or create current user info', details: error.message });
  }
});

router.get('/all/users', async (req, res) => {
  try {
    if (req.useMock) {
        return res.json(mockDb.getUsers().slice(0, 10));
    }
    const users = await User.find().limit(10);
    res.json(users);
  } catch (error) {
    console.error('All Users Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

router.post('/connect/:id', verifyToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const firebaseUid = req.user.uid;

    if (req.useMock) {
      const currentUser = mockDb.findUserByFirebaseUid(firebaseUid);
      if (!currentUser) return res.status(404).json({ error: 'Current user not found' });
      
      const updatedUser = mockDb.toggleConnection(currentUser._id, targetUserId);
      return updatedUser ? res.json({ message: 'Success', connections: updatedUser.connections }) : res.status(404).json({ error: 'Target user not found' });
    }

    const currentUser = await User.findOne({ firebaseUid });
    if (!currentUser) return res.status(404).json({ error: 'Current user not found' });

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    // Toggle connection
    const index = currentUser.connections.indexOf(targetUser._id);
    if (index === -1) {
      currentUser.connections.push(targetUser._id);
      targetUser.connections.push(currentUser._id);
    } else {
      currentUser.connections.splice(index, 1);
      const targetIndex = targetUser.connections.indexOf(currentUser._id);
      if (targetIndex !== -1) targetUser.connections.splice(targetIndex, 1);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ message: 'Success', connections: currentUser.connections });
  } catch (error) {
    console.error('Connect Error:', error);
    res.status(500).json({ error: 'Failed to connect', details: error.message });
  }
});

router.get('/network/suggestions', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
        
        if (req.useMock) {
            const currentUser = mockDb.findUserByFirebaseUid(firebaseUid);
            const allUsers = mockDb.getUsers();
            // Filter out current user
            const suggestions = allUsers.filter(u => u.firebaseUid !== firebaseUid);
            return res.json(suggestions);
        }

        const currentUser = await User.findOne({ firebaseUid });
        // Find users who are not the current user and not already connected
        const users = await User.find({ 
            firebaseUid: { $ne: firebaseUid },
            _id: { $nin: currentUser.connections }
        }).limit(20);
        
        res.json(users);
    } catch (error) {
        console.error('Suggestions Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions', details: error.message });
    }
});

module.exports = router;
