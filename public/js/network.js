// Initialize Firebase (same pattern as other pages)
const configRes = await fetch('/api/config/firebase');
const firebaseConfig = await configRes.json();
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

let currentUser = null;
let currentProfile = null;

// Initialize
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await fetchMyInfo();
        await fetchSuggestions();
    } else {
        window.location.href = '/';
    }
});

async function fetchMyInfo() {
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/profile/me/info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentProfile = await res.json();
        document.getElementById('connectionsTotalCount').textContent = (currentProfile.connections || []).length;
    } catch (err) {
        console.error('Error fetching my info:', err);
    }
}

async function fetchSuggestions() {
    const list = document.getElementById('suggestionsList');
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/profile/network/suggestions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        
        if (users.length === 0) {
            list.innerHTML = `
                <div class="text-center col-span-full py-16">
                    <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg font-medium">No suggestions found</p>
                    <p class="text-gray-400 text-sm mt-1">Check back later for new people to connect with</p>
                </div>`;
            return;
        }

        list.innerHTML = users.map((user, index) => {
            const isConnected = currentProfile.connections && currentProfile.connections.includes(user._id);
            const mutualCount = Math.floor(Math.random() * 15);
            return `
                <div class="card suggestion-card flex flex-col items-center animate-fade-in" style="animation-delay: ${index * 0.08}s">
                    <div class="banner w-full rounded-t-lg"></div>
                    <img src="${user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0a66c2&color=fff&bold=true`}" 
                         class="w-20 h-20 rounded-full border-3 border-white z-10 relative -mt-10 object-cover shadow-md cursor-pointer"
                         onclick="window.location.href='/profile?id=${user._id}'" 
                         style="border: 3px solid white;" />
                    <h4 class="font-semibold text-gray-900 mt-2 text-center truncate w-full px-3 cursor-pointer hover:underline hover:text-[#0a66c2] transition-colors"
                        onclick="window.location.href='/profile?id=${user._id}'">${user.name}</h4>
                    <p class="text-xs text-gray-500 text-center line-clamp-2 h-8 px-3 mt-1">${user.bio || 'Professional at LinkedIn'}</p>
                    ${mutualCount > 0 ? `<p class="text-xs text-gray-400 mt-1 flex items-center gap-1"><i class="fas fa-user-friends text-[10px]"></i> ${mutualCount} mutual connections</p>` : ''}
                    <div class="w-full px-4 pb-4 mt-3">
                        <button data-id="${user._id}" class="connect-btn w-full ${isConnected ? 'connected-btn' : 'connect-btn-icon'}">
                            ${isConnected 
                                ? `<span class="connected-text"><i class="fas fa-check-circle"></i> Connected</span><span class="disconnect-text"><i class="fas fa-user-minus"></i> Disconnect</span>` 
                                : `<i class="fas fa-user-plus"></i> Connect`}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to buttons
        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => toggleConnect(e.currentTarget));
        });

    } catch (err) {
        console.error('Error fetching suggestions:', err);
        list.innerHTML = `
            <div class="text-center col-span-full py-16">
                <i class="fas fa-exclamation-circle text-5xl text-red-300 mb-4"></i>
                <p class="text-red-500 text-lg font-medium">Failed to load suggestions</p>
                <p class="text-gray-400 text-sm mt-1">Please try refreshing the page</p>
            </div>`;
    }
}

async function fetchMyConnections() {
    const list = document.getElementById('connectionsList');
    try {
        const token = await currentUser.getIdToken();
        
        if (!currentProfile || !currentProfile.connections || currentProfile.connections.length === 0) {
            list.innerHTML = `
                <div class="text-center col-span-full py-16">
                    <i class="fas fa-link text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg font-medium">No connections yet</p>
                    <p class="text-gray-400 text-sm mt-1">Start connecting with people to grow your network!</p>
                    <button onclick="window.switchTab('suggestions')" class="mt-4 connect-btn-icon">
                        <i class="fas fa-user-plus"></i> Find People
                    </button>
                </div>`;
            return;
        }

        const res = await fetch('/api/profile/all/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allUsers = await res.json();
        const myConnections = allUsers.filter(u => currentProfile.connections.includes(u._id));

        if (myConnections.length === 0) {
            list.innerHTML = `
                <div class="text-center col-span-full py-16">
                    <i class="fas fa-link text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg font-medium">No connections yet</p>
                    <p class="text-gray-400 text-sm mt-1">Start connecting with people to grow your network!</p>
                </div>`;
            return;
        }

        list.innerHTML = myConnections.map((user, index) => `
            <div class="card connection-card flex items-center gap-4 p-4 animate-fade-in" style="animation-delay: ${index * 0.06}s">
                <img src="${user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0a66c2&color=fff&bold=true`}"
                     class="w-14 h-14 rounded-full object-cover shadow-sm cursor-pointer flex-shrink-0"
                     onclick="window.location.href='/profile?id=${user._id}'"
                     style="border: 2px solid #e0e0e0;" />
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-gray-900 truncate cursor-pointer hover:underline hover:text-[#0a66c2] transition-colors"
                        onclick="window.location.href='/profile?id=${user._id}'">${user.name}</h4>
                    <p class="text-xs text-gray-500 truncate">${user.bio || 'Professional at LinkedIn'}</p>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <a href="/profile?id=${user._id}" class="connect-btn-icon text-xs px-3 py-1">
                        <i class="fas fa-eye"></i> View
                    </a>
                    <button data-id="${user._id}" class="connected-btn text-xs px-3 py-1" onclick="window.disconnectUser(this)">
                        <span class="connected-text"><i class="fas fa-check-circle"></i> Connected</span>
                        <span class="disconnect-text"><i class="fas fa-user-minus"></i> Remove</span>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error fetching connections:', err);
        list.innerHTML = '<p class="text-center text-red-500 col-span-full py-10">Failed to load connections.</p>';
    }
}

async function toggleConnect(btn) {
    const targetUserId = btn.getAttribute('data-id');
    const originalHTML = btn.innerHTML;
    const originalClass = btn.className;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.className = 'connect-btn w-full connect-btn-icon opacity-70';

    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/profile/connect/${targetUserId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.message === 'Success') {
            const isConnectedNow = data.connections.includes(targetUserId);
            
            if (isConnectedNow) {
                btn.innerHTML = '<span class="connected-text"><i class="fas fa-check-circle"></i> Connected</span><span class="disconnect-text"><i class="fas fa-user-minus"></i> Disconnect</span>';
                btn.className = 'connect-btn w-full connected-btn';
                btn.style.transform = 'scale(1.05)';
                setTimeout(() => btn.style.transform = '', 300);
            } else {
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
                btn.className = 'connect-btn w-full connect-btn-icon';
            }
            
            currentProfile.connections = data.connections;
            document.getElementById('connectionsTotalCount').textContent = data.connections.length;
        }
    } catch (err) {
        console.error('Connect error:', err);
        btn.innerHTML = originalHTML;
        btn.className = originalClass;
    } finally {
        btn.disabled = false;
    }
}

// Disconnect from connections tab
window.disconnectUser = async (btn) => {
    const targetUserId = btn.getAttribute('data-id');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/profile/connect/${targetUserId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.message === 'Success') {
            currentProfile.connections = data.connections;
            document.getElementById('connectionsTotalCount').textContent = data.connections.length;
            await fetchMyConnections();
        }
    } catch (err) {
        console.error('Disconnect error:', err);
        btn.innerHTML = '<span class="connected-text"><i class="fas fa-check-circle"></i> Connected</span><span class="disconnect-text"><i class="fas fa-user-minus"></i> Remove</span>';
    } finally {
        btn.disabled = false;
    }
};

// Tab switching - must be on window so onclick in HTML can find it
window.switchTab = (tab) => {
    const suggestionsTab = document.getElementById('suggestionsTab');
    const connectionsTab = document.getElementById('connectionsTab');
    const tabSuggestions = document.getElementById('tabSuggestions');
    const tabConnections = document.getElementById('tabConnections');
    
    if (tab === 'suggestions') {
        suggestionsTab.classList.remove('hidden');
        connectionsTab.classList.add('hidden');
        tabSuggestions.classList.add('active');
        tabConnections.classList.remove('active');
    } else {
        suggestionsTab.classList.add('hidden');
        connectionsTab.classList.remove('hidden');
        tabSuggestions.classList.remove('active');
        tabConnections.classList.add('active');
        fetchMyConnections();
    }
};

// Sidebar connections click
document.getElementById('sidebarConnections')?.addEventListener('click', () => {
    window.switchTab('connections');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '/');
});
