const configRes = await fetch('/api/config/firebase');
const firebaseConfig = await configRes.json();
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

import { enhanceBio } from './ai.js';

let currentUserToken = null;
let currentUserId = null;
let profileId = new URLSearchParams(window.location.search).get('id');

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/';
  } else {
    currentUserToken = await user.getIdToken();
    const res = await fetch('/api/profile/me/info', {
      headers: { 'Authorization': `Bearer ${currentUserToken}` }
    });
    const loggedInUser = await res.json();
    currentUserId = loggedInUser._id;
    
    if (!profileId) profileId = currentUserId; // Viewing own profile
    
    await loadProfile();
  }
});

async function loadProfile() {
  try {
    const res = await fetch(`/api/profile/${profileId}`);
    if (!res.ok) return alert('Profile not found');
    const user = await res.json();

    document.getElementById('profileName').innerText = user.name;
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('profileBio').innerText = user.bio || 'No bio yet.';
    document.getElementById('profilePic').src = user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=random&size=128`;
    
    // Show connections count
    const connectionsCount = document.getElementById('connectionsCount');
    if (connectionsCount) {
      const count = (user.connections || []).length;
      connectionsCount.textContent = `${count} connection${count !== 1 ? 's' : ''}`;
    }
    
    const skillsList = document.getElementById('skillsList');
    if (user.skills && user.skills.length > 0) {
      skillsList.innerHTML = user.skills.map(s => 
        `<span class="bg-gray-200 text-gray-800 px-3 py-1 font-semibold rounded-full">${s}</span>`
      ).join('');
    }

    if (currentUserId === profileId) {
      // Own profile: show edit buttons
      document.getElementById('editProfileBtn').classList.remove('hidden');
      document.getElementById('editAvatarWrapper').classList.remove('hidden');
    } else {
      // Other user's profile: show connect button
      await setupConnectButton(profileId);
    }
  } catch (err) {
    console.error(err);
  }
}

// Connect button on profile page
async function setupConnectButton(targetUserId) {
  const connectBtn = document.getElementById('connectProfileBtn');
  if (!connectBtn) return;
  
  // Fetch current user's info to check connection status
  const meRes = await fetch('/api/profile/me/info', {
    headers: { 'Authorization': `Bearer ${currentUserToken}` }
  });
  const me = await meRes.json();
  const isConnected = me.connections && me.connections.includes(targetUserId);
  
  updateConnectBtnState(connectBtn, isConnected);
  connectBtn.classList.remove('hidden');
  
  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
      const res = await fetch(`/api/profile/connect/${targetUserId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUserToken}` }
      });
      const data = await res.json();
      
      if (data.message === 'Success') {
        const nowConnected = data.connections.includes(targetUserId);
        updateConnectBtnState(connectBtn, nowConnected);
        
        // Update the connections count on the profile
        const connectionsCount = document.getElementById('connectionsCount');
        if (connectionsCount) {
          // Refresh the profile to get updated count
          const profileRes = await fetch(`/api/profile/${targetUserId}`);
          const profileData = await profileRes.json();
          const count = (profileData.connections || []).length;
          connectionsCount.textContent = `${count} connection${count !== 1 ? 's' : ''}`;
        }
      }
    } catch (err) {
      console.error('Connect error:', err);
    } finally {
      connectBtn.disabled = false;
    }
  });
}

function updateConnectBtnState(btn, isConnected) {
  if (isConnected) {
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
    btn.className = 'btn-connected-profile';
  } else {
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
    btn.className = 'btn-connect';
  }
}

// Edit Profile logic
const editProfileBtn = document.getElementById('editProfileBtn');
const editFormSection = document.getElementById('editFormSection');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', async () => {
    editFormSection.classList.remove('hidden');
    // fetch current
    const res = await fetch(`/api/profile/${profileId}`);
    const user = await res.json();
    document.getElementById('editName').value = user.name;
    document.getElementById('editBio').value = user.bio || '';
    document.getElementById('editSkills').value = user.skills ? user.skills.join(', ') : '';
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', () => {
    editFormSection.classList.add('hidden');
  });
}

if (saveEditBtn) {
  saveEditBtn.addEventListener('click', async () => {
    saveEditBtn.disabled = true;
    saveEditBtn.innerText = 'Saving...';
    try {
      const name = document.getElementById('editName').value;
      const bio = document.getElementById('editBio').value;
      const skillsStr = document.getElementById('editSkills').value;
      const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

      let profilePicture = document.getElementById('profilePic').src;
      const avatarInput = document.getElementById('avatarInput');
      if (avatarInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', avatarInput.files[0]);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        profilePicture = uploadData.url;
      }

      await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserToken}`
        },
        body: JSON.stringify({ name, bio, skills, profilePicture })
      });
      
      editFormSection.classList.add('hidden');
      loadProfile();
    } catch (err) {
      alert('Failed to save profile');
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.innerText = 'Save';
    }
  });
}

const enhanceBioBtn = document.getElementById('enhanceBioBtn');
if (enhanceBioBtn) {
  enhanceBioBtn.addEventListener('click', async () => {
    const editBio = document.getElementById('editBio');
    const originalText = editBio.value.trim();
    if (!originalText) return alert("Write an intro first!");
    
    enhanceBioBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enhancing...';
    try {
      const enhanced = await enhanceBio(originalText, currentUserToken);
      editBio.value = enhanced;
    } catch (error) {
      console.log('Error enhancing bio');
    }
    enhanceBioBtn.innerHTML = '<i class="fas fa-magic"></i> AI Enhance';
  });
}
