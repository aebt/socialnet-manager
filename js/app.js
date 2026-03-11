// ================================================================
// Section 1: Supabase Client Initialization
// ================================================================

const { createClient } = supabase;

const SUPABASE_URL = 'https://evtndesnxsaohrazezsv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_z9EeIizeYARZu9Be9qx8Wg_CrDZxDIY';

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ================================================================
// Section 2: Application State
// ================================================================
let currentProfileId = null;

// ================================================================
// Section 3: Helper Functions
// ================================================================
function setStatus(message, isError = false) {
  const bar = document.getElementById('status-message');
  const footer = document.getElementById('status-bar');
  bar.textContent = message;
  // Adjusted colors slightly to match the theme
  footer.style.background = isError ? '#8b0000' : 'var(--clr-header-bg)';
  footer.style.color = isError ? '#ffcccc' : '#ffffff';
}

function clearCentrePanel() {
  document.getElementById('profile-pic').src = 'resources/images/default.png';
  document.getElementById('profile-name').textContent = 'No Profile Selected';
  document.getElementById('profile-status').innerHTML = '&mdash;';
  document.getElementById('profile-quote').innerHTML = '&mdash;';
  document.getElementById('friends-list').innerHTML = '';
  currentProfileId = null;
}

function displayProfile(profile, friends = []) {
  document.getElementById('profile-pic').src = profile.picture || 'resources/images/default.png';
  document.getElementById('profile-name').textContent = profile.name;
  document.getElementById('profile-status').textContent = profile.status || '(no status)';
  document.getElementById('profile-quote').textContent = profile.quote || '(no quote)';
  currentProfileId = profile.id;
  renderFriendsList(friends);
  setStatus(`Displaying ${profile.name}.`);
}

function renderFriendsList(friends) {
  const list = document.getElementById('friends-list');
  list.innerHTML = '';
  if (friends.length === 0) {
    list.innerHTML = '<p class="empty-state text-muted small p-2">No friends yet.</p>';
    return;
  }
  friends.forEach(f => {
    const p = document.createElement('p');
    p.className = 'mb-1'; // Keeps it compact like the screenshot
    p.textContent = f.name || f.profiles?.name; 
    list.appendChild(p);
  });
}

// ================================================================
// Section 4: CRUD Functions
// ================================================================

async function addProfile() {
  const name = document.getElementById('input-name').value.trim();
  if (!name) return setStatus('Error: Profile name field is empty.', true);

  try {
    const { error } = await db.from('profiles').insert([{ name: name }]);
    if (error) throw error;
    
    document.getElementById('input-name').value = '';
    await loadProfileList();
    setStatus(`Profile "${name}" added successfully.`);
  } catch (err) {
    setStatus(`Error adding profile: ${err.message}`, true);
  }
}

async function lookupProfile() {
  const searchName = document.getElementById('input-name').value.trim();
  if (!searchName) {
      await loadProfileList(); // If empty, reload all
      return;
  }
  
  try {
    const { data, error } = await db
      .from('profiles')
      .select('id, name, picture')
      .ilike('name', `%${searchName}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    renderProfileList(data);
    setStatus(`Found ${data.length} profile(s) matching "${searchName}".`);
  } catch (err) {
    setStatus(`Error looking up profile: ${err.message}`, true);
  }
}

async function loadProfileList() {
  try {
    const { data, error } = await db
      .from('profiles')
      .select('id, name, picture')
      .order('name', { ascending: true });

    if (error) throw error;
    renderProfileList(data);
  } catch (err) {
    setStatus(`Error loading profiles: ${err.message}`, true);
  }
}

// Helper to render the left panel list items
function renderProfileList(data) {
    const container = document.getElementById('profile-list');
    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<p class="text-muted small fst-italic p-2">No profiles found.</p>';
      return;
    }

    data.forEach(profile => {
      const row = document.createElement('div');
      row.className = 'profile-item list-group-item';
      row.dataset.id = profile.id;
      
      // Added mini avatar to match screenshot
      const img = document.createElement('img');
      img.src = profile.picture || 'resources/images/default.png';
      img.className = 'list-avatar';
      
      const span = document.createElement('span');
      span.textContent = profile.name;
      
      row.appendChild(img);
      row.appendChild(span);
      
      row.addEventListener('click', () => selectProfile(profile.id));
      container.appendChild(row);
    });
}

async function selectProfile(profileId) {
  try {
    document.querySelectorAll('#profile-list .profile-item')
      .forEach(el => {
        el.classList.toggle('active', el.dataset.id === profileId);
      });

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;

    const { data: friends, error: friendsError } = await db
      .from('friends')
      .select('profile_id, friend_id, profiles!friends_friend_id_fkey(name)')
      .or(`profile_id.eq.${profileId},friend_id.eq.${profileId}`);

    if (friendsError) throw friendsError;

    displayProfile(profile, friends);

    if (window.innerWidth < 768) {
        document.getElementById('profile-pic').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    setStatus(`Error selecting profile: ${err.message}`, true);
  }
}

async function deleteProfile() {
  if (!currentProfileId) return setStatus('Error: No profile is selected. Click a profile in the list first.', true);
  
  const name = document.getElementById('profile-name').textContent;
  if (!window.confirm(`Delete the profile for "${name}"? This cannot be undone.`)) {
    setStatus('Deletion cancelled.');
    return;
  }
  
  try {
    const { error } = await db.from('profiles').delete().eq('id', currentProfileId);
    if (error) throw error;
    clearCentrePanel();
    await loadProfileList();
    setStatus(`Profile "${name}" deleted. Friend relationships removed automatically.`);
  } catch (err) {
    setStatus(`Error deleting profile: ${err.message}`, true);
  }
}

async function changeStatus() {
  if (!currentProfileId) return setStatus('Error: No profile is selected.', true);
  const newStatus = document.getElementById('input-status').value.trim();
  if (!newStatus) return setStatus('Error: Status field is empty.', true);

  try {
    const { error } = await db.from('profiles').update({ status: newStatus }).eq('id', currentProfileId);
    if (error) throw error;
    document.getElementById('profile-status').textContent = newStatus;
    document.getElementById('input-status').value = '';
    setStatus('Status updated.');
  } catch (err) {
    setStatus(`Error updating status: ${err.message}`, true);
  }
}

async function changeQuote() {
  if (!currentProfileId) return setStatus('Error: No profile is selected.', true);
  const newQuote = document.getElementById('input-quote').value.trim();
  if (!newQuote) return setStatus('Error: Quote field is empty.', true);

  try {
    const { error } = await db.from('profiles').update({ quote: newQuote }).eq('id', currentProfileId);
    if (error) throw error;
    document.getElementById('profile-quote').textContent = newQuote;
    document.getElementById('input-quote').value = '';
    setStatus('Quote updated.');
  } catch (err) {
    setStatus(`Error updating quote: ${err.message}`, true);
  }
}

async function changePicture() {
  if (!currentProfileId) return setStatus('Error: No profile is selected.', true);
  const newPicture = document.getElementById('input-picture').value.trim();
  if (!newPicture) return setStatus('Error: Picture field is empty.', true);

  try {
    const { error } = await db.from('profiles').update({ picture: newPicture }).eq('id', currentProfileId);
    if (error) throw error;
    document.getElementById('profile-pic').src = newPicture;
    document.getElementById('input-picture').value = '';
    await loadProfileList(); // Refresh list to update mini avatar
    setStatus('Picture updated.');
  } catch (err) {
    setStatus(`Error updating picture: ${err.message}`, true);
  }
}

// ================================================================
// Section 5: Friends Management
// ================================================================
async function addFriend() {
  if (!currentProfileId) return setStatus('Error: No profile is selected.', true);
  const friendName = document.getElementById('input-friend').value.trim();
  if (!friendName) return setStatus('Error: Friend name field is empty.', true);

  try {
    const { data: found, error: findError } = await db.from('profiles').select('id, name').ilike('name', friendName).limit(1);
    if (findError) throw findError;
    if (found.length === 0) return setStatus(`Error: No profile named "${friendName}" exists. Add that profile first.`, true);

    const friendId = found[0].id;
    if (friendId === currentProfileId) return setStatus('Error: A profile cannot be friends with itself.', true);

    const { error: insertError } = await db.from('friends').insert({ profile_id: currentProfileId, friend_id: friendId });
    if (insertError) {
      if (insertError.code === '23505') setStatus(`"${friendName}" is already in the friends list.`, true);
      else throw insertError;
      return;
    }
    
    document.getElementById('input-friend').value = '';
    await selectProfile(currentProfileId);
    setStatus(`"${found[0].name}" added as a friend.`);
  } catch (err) {
    setStatus(`Error adding friend: ${err.message}`, true);
  }
}

async function removeFriend() {
  if (!currentProfileId) return setStatus('Error: No profile is selected.', true);
  const friendName = document.getElementById('input-friend').value.trim(); 
  if (!friendName) return setStatus('Error: Friend name field is empty.', true);

  try {
    const { data: found, error: findError } = await db.from('profiles').select('id, name').ilike('name', friendName).limit(1);
    if (findError) throw findError;
    if (found.length === 0) return setStatus(`Error: No profile named "${friendName}" exists.`, true);

    const friendId = found[0].id;
    const { error: deleteError } = await db.from('friends').delete()
      .eq('profile_id', currentProfileId)
      .eq('friend_id', friendId);

    if (deleteError) throw deleteError;
    document.getElementById('input-friend').value = '';
    await selectProfile(currentProfileId);
    setStatus(`"${found[0].name}" removed from friends list.`);
  } catch (err) {
    setStatus(`Error removing friend: ${err.message}`, true);
  }
}

// ================================================================
// Section 6: Event Listener Setup
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Setup standard listeners
  document.getElementById('btn-add').addEventListener('click', addProfile);
  document.getElementById('btn-lookup').addEventListener('click', lookupProfile);
  document.getElementById('btn-delete').addEventListener('click', deleteProfile);
  
  document.getElementById('btn-status').addEventListener('click', changeStatus);
  document.getElementById('btn-quote').addEventListener('click', changeQuote);
  document.getElementById('btn-picture').addEventListener('click', changePicture);
  
  document.getElementById('btn-add-friend').addEventListener('click', addFriend);
  document.getElementById('btn-remove-friend').addEventListener('click', removeFriend);
  
  // Optional: Exit button functionality
  document.getElementById('btn-exit').addEventListener('click', () => {
      if(confirm('Are you sure you want to exit?')) {
          window.close(); // Note: may not work depending on browser security settings
      }
  });

  // Enter key shortcuts
  document.getElementById('input-name').addEventListener('keydown', e => { if (e.key === 'Enter') lookupProfile() });
  document.getElementById('input-status').addEventListener('keydown', e => { if (e.key === 'Enter') changeStatus() });
  document.getElementById('input-quote').addEventListener('keydown', e => { if (e.key === 'Enter') changeQuote() });
  document.getElementById('input-picture').addEventListener('keydown', e => { if (e.key === 'Enter') changePicture() });
  document.getElementById('input-friend').addEventListener('keydown', e => { if (e.key === 'Enter') addFriend() });

  await loadProfileList();
  setStatus('Ready. Select a profile from the list or add a new one.');
});