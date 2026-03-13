const configRes = await fetch('/api/config/firebase');
const firebaseConfig = await configRes.json();
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

import { enhanceCaption } from './ai.js';

let currentUserToken = null;
let currentUserId = null;
let currentUserConnections = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/';
  } else {
    currentUserToken = await user.getIdToken();
    loadProfileInfo();
    loadFeed();
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  auth.signOut().then(() => window.location.href = '/');
});

async function loadProfileInfo() {
  const res = await fetch('/api/profile/me/info', {
    headers: { 'Authorization': `Bearer ${currentUserToken}` }
  });
  if (res.status === 401) {
      auth.signOut().then(() => window.location.href = '/');
      return;
  }
  if (res.ok) {
    const user = await res.json();
    currentUserId = user._id;
    currentUserConnections = user.connections || [];
    if(document.getElementById('sidebarName')) document.getElementById('sidebarName').innerText = user.name;
    if(document.getElementById('sidebarBio')) document.getElementById('sidebarBio').innerText = user.bio || 'Add a bio...';
    if(document.getElementById('sidebarPic')) document.getElementById('sidebarPic').src = user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=random`;
    if(document.getElementById('createPostPic')) document.getElementById('createPostPic').src = user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=random`;
  }
}

async function loadFeed() {
  const container = document.getElementById('feedContainer');
  try {
    const res = await fetch('/api/posts/feed');
    const posts = await res.json();
    container.innerHTML = '';
    
    if (posts.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 mt-10">No posts yet. Be the first to post!</p>';
    }

    posts.forEach(post => {
      const isLiked = post.likes.includes(currentUserId);
      const isOwnPost = post.userId?._id === currentUserId;
      const isConnected = currentUserConnections && currentUserConnections.includes(post.userId?._id);
      const html = `
        <div class="card p-4">
          <div class="flex gap-3 mb-3">
            <img src="${post.userId?.profilePicture || `https://ui-avatars.com/api/?name=${post.userId?.name || 'User'}&background=random`}" class="w-12 h-12 rounded-full object-cover">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-sm hover:underline cursor-pointer" onclick="window.location.href='/profile?id=${post.userId?._id}'">${post.userId?.name || 'Unknown User'}</h4>
                ${!isOwnPost ? `
                  <button data-id="${post.userId?._id}" class="feed-connect-action ${isConnected ? 'feed-connected-btn' : 'feed-connect-btn'}" onclick="feedConnect(this)">
                    ${isConnected ? '<i class="fas fa-check-circle"></i> Connected' : '<i class="fas fa-user-plus"></i> Connect'}
                  </button>
                ` : ''}
              </div>
              <p class="text-xs text-gray-500">${post.userId?.bio || ''}</p>
              <p class="text-xs text-gray-400 mt-1">${new Date(post.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <p class="text-sm mb-3 whitespace-pre-line">${post.caption}</p>
          ${post.imageUrl ? `<img src="${post.imageUrl}" class="w-full rounded mb-3 max-h-96 object-cover">` : ''}
          <div class="flex justify-between items-center text-xs text-gray-500 py-2 border-b">
            <span>${post.likes.length} Likes</span>
            <span>${post.comments.length} Comments</span>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="likePost('${post._id}')" class="flex-1 py-2 rounded btn-ghost font-semibold ${isLiked ? 'text-blue-600' : ''}">
              <i class="fas fa-thumbs-up mr-1 text-lg"></i> Like
            </button>
            <button onclick="toggleCommentSection('${post._id}')" class="flex-1 py-2 rounded btn-ghost font-semibold">
              <i class="fas fa-comment mr-1 text-lg"></i> Comment
            </button>
          </div>
          <div id="comments-${post._id}" class="hidden mt-3 pt-3 border-t">
            <div class="flex gap-2 mb-3">
               <input type="text" id="commentInput-${post._id}" class="flex-1 w-full border rounded-full px-4 py-1 text-sm outline-none focus:border-gray-400" placeholder="Add a comment..." />
               <button onclick="submitComment('${post._id}')" class="btn-primary px-4 py-1 rounded-full text-sm font-semibold">Post</button>
            </div>
            <div class="space-y-3" id="commentsList-${post._id}">
              ${post.comments.map(c => `
                <div class="flex gap-2">
                  <img src="${c.userId?.profilePicture || `https://ui-avatars.com/api/?name=${c.userId?.name || 'User'}&background=random`}" class="w-8 h-8 rounded-full object-cover">
                  <div class="bg-gray-100 p-2 rounded w-full">
                    <h5 class="font-bold text-xs">${c.userId?.name || 'User'}</h5>
                    <p class="text-sm mt-1">${c.text}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      container.innerHTML += html;
    });
  } catch (err) {
    container.innerHTML = '<p class="text-center text-red-500 mt-10">Failed to load feed</p>';
  }
}

// Connect from feed
window.feedConnect = async (btn) => {
  const targetUserId = btn.getAttribute('data-id');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  try {
    const res = await fetch(`/api/profile/connect/${targetUserId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentUserToken}` }
    });
    const data = await res.json();
    
    if (data.message === 'Success') {
      currentUserConnections = data.connections;
      const isConnectedNow = data.connections.includes(targetUserId);
      
      // Update ALL connect buttons for this user on the page
      document.querySelectorAll(`.feed-connect-action[data-id="${targetUserId}"]`).forEach(b => {
        if (isConnectedNow) {
          b.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
          b.className = `feed-connect-action feed-connected-btn`;
        } else {
          b.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
          b.className = `feed-connect-action feed-connect-btn`;
        }
      });
    }
  } catch (err) {
    console.error('Feed connect error:', err);
    btn.innerHTML = originalHTML;
  } finally {
    btn.disabled = false;
  }
};

// Global functions for inline onclick
window.likePost = async (postId) => {
  await fetch(`/api/posts/like/${postId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${currentUserToken}` }
  });
  loadFeed();
};

window.toggleCommentSection = (postId) => {
  const el = document.getElementById(`comments-${postId}`);
  el.classList.toggle('hidden');
};

window.submitComment = async (postId) => {
  const text = document.getElementById(`commentInput-${postId}`).value;
  if(!text) return;
  await fetch(`/api/posts/comment/${postId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${currentUserToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });
  loadFeed();
};

// Post creation logic
const postCaption = document.getElementById('postCaption');
const submitPostBtn = document.getElementById('submitPostBtn');
const postImageInput = document.getElementById('postImageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

if(postCaption) {
  postCaption.addEventListener('input', () => {
    if (postCaption.value.trim().length > 0) {
      submitPostBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      submitPostBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  });
}

if(postImageInput) {
  postImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        imagePreview.src = ev.target.result;
        imagePreviewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('removeImageBtn').addEventListener('click', () => {
    postImageInput.value = '';
    imagePreviewContainer.classList.add('hidden');
    imagePreview.src = '';
  });
}

if(submitPostBtn) {
  submitPostBtn.addEventListener('click', async () => {
    const caption = postCaption.value.trim();
    if (!caption) return;
    submitPostBtn.disabled = true;
    submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      let imageUrl = '';
      if (postImageInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', postImageInput.files[0]);
        try {
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.details || 'Cloudinary upload failed');
            }
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
        } catch (uploadErr) {
            console.error('Upload Error:', uploadErr);
            alert('Failed to upload image. You can still post without it, or try a different file.');
            // Optional: return or continue without image
        }
      }

      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({ caption, imageUrl })
      });
      
      if (res.status === 401) {
          alert('Session expired or invalid. Logging out...');
          auth.signOut().then(() => window.location.href = '/');
          return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');
      
      if (data.matchNotifications && data.matchNotifications.length > 0) {
        const notifArea = document.getElementById('notificationsArea');
        data.matchNotifications.forEach(notif => {
          notifArea.innerHTML += `
            <div class="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-2 text-sm flex gap-2 items-start animate-pulse">
              <i class="fas fa-lightbulb text-yellow-500 mt-1"></i>
              <span>${notif}</span>
            </div>
          `;
        });
        setTimeout(() => notifArea.innerHTML = '', 10000);
      }

      postCaption.value = '';
      if(postImageInput) postImageInput.value = '';
      imagePreviewContainer.classList.add('hidden');
      submitPostBtn.classList.add('opacity-50', 'cursor-not-allowed');
      loadFeed();
      alert('Post created successfully!');
    } catch (error) {
      console.error('Posting Error:', error);
      alert('Error creating post: ' + error.message);
    } finally {
      submitPostBtn.disabled = false;
      submitPostBtn.innerText = 'Post';
    }
  });
}

const enhanceCaptionBtn = document.getElementById('enhanceCaptionBtn');
if (enhanceCaptionBtn) {
  enhanceCaptionBtn.addEventListener('click', async () => {
    const originalText = postCaption.value.trim();
    if (!originalText) return alert("Please write a caption first!");
    enhanceCaptionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enhancing...';
    try {
      const enhanced = await enhanceCaption(originalText, currentUserToken);
      postCaption.value = enhanced;
    } catch (error) {
      console.log('Error enhancing caption');
    }
    enhanceCaptionBtn.innerHTML = '<i class="fas fa-magic text-purple-500"></i> AI Enhance';
  });
}
