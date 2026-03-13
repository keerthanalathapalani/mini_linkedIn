const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'local_database.json');

const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        return { users: [], posts: [] };
    }
    const raw = fs.readFileSync(DATA_FILE);
    return JSON.parse(raw);
};

const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

module.exports = {
    getUsers: () => loadData().users,
    getPosts: () => loadData().posts,
    
    addUser: (user) => {
        const data = loadData();
        const newUser = { ...user, _id: Date.now().toString() };
        data.users.push(newUser);
        saveData(data);
        return newUser;
    },
    
    findUserByFirebaseUid: (uid) => {
        return loadData().users.find(u => u.firebaseUid === uid);
    },
    
    findUserById: (id) => {
        return loadData().users.find(u => u._id === id);
    },
    
    updateUser: (uid, updates) => {
        const data = loadData();
        const idx = data.users.findIndex(u => u.firebaseUid === uid);
        if (idx === -1) return null;
        data.users[idx] = { ...data.users[idx], ...updates };
        saveData(data);
        return data.users[idx];
    },
    
    addPost: (post) => {
        const data = loadData();
        const newPost = { 
            ...post, 
            _id: Date.now().toString(), 
            likes: [], 
            comments: [], 
            createdAt: new Date().toISOString() 
        };
        data.posts.push(newPost);
        saveData(data);
        return newPost;
    },
    
    getFeed: () => {
        const data = loadData();
        return data.posts.map(post => ({
            ...post,
            userId: data.users.find(u => u._id === post.userId) || { name: 'Unknown User' }
        })).reverse();
    },

    toggleConnection: (currentUserId, targetUserId) => {
        const data = loadData();
        const user = data.users.find(u => u._id === currentUserId);
        const target = data.users.find(u => u._id === targetUserId);

        if (!user || !target) return null;

        if (!user.connections) user.connections = [];
        if (!target.connections) target.connections = [];

        const index = user.connections.indexOf(targetUserId);
        if (index === -1) {
            user.connections.push(targetUserId);
            target.connections.push(currentUserId);
            console.log(`Connected: ${currentUserId} <-> ${targetUserId}`);
        } else {
            user.connections.splice(index, 1);
            const targetIndex = target.connections.indexOf(currentUserId);
            if (targetIndex !== -1) target.connections.splice(targetIndex, 1);
            console.log(`Disconnected: ${currentUserId} <-> ${targetUserId}`);
        }

        saveData(data);
        return user;
    }
};
