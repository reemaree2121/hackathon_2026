// mentor-app.js
// State
let allSeniors = [];
let aiMatches = [];
let myRequests = [];
let refreshesLeft = 3;
const REFRESH_KEY = 'mentor_refreshes';

// Utilities
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
    <div class="toast-message">${message}</div>
    <div class="toast-close" onclick="this.parentElement.remove()">×</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1500;
  const steps = 30;
  const stepTime = Math.abs(Math.floor(duration / steps));
  let current = 0;
  const increment = target / steps;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    
    // For avg score, allow 1 decimal if needed, else round
    if (id === 'stat-avg-score' && !Number.isInteger(target)) {
      el.textContent = current.toFixed(1);
    } else {
      el.textContent = Math.floor(current);
    }
  }, stepTime);
}

// Data loading
async function loadStats() {
  try {
    const stats = await apiRequest('/seniors/stats');
    animateCount('stat-mentors', stats.total_mentors || 0);
    animateCount('stat-pending', stats.pending_requests || 0);
    animateCount('stat-accepted', stats.accepted_requests || 0);
    animateCount('stat-avg-score', stats.avg_match_score || 0);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadAIMatches(refresh = false) {
  const container = document.getElementById('ai-matches-container');
  if (!refresh) {
    container.innerHTML = `
      <div class="match-card-skeleton">
        <div class="skeleton-pulse sk-circle"></div>
        <div style="flex:1">
          <div class="skeleton-pulse sk-line"></div>
          <div class="skeleton-pulse sk-line sk-line-short"></div>
          <div class="skeleton-pulse sk-box"></div>
        </div>
      </div>
    `;
  }
  
  try {
    aiMatches = await apiRequest(`/seniors/match?count=3&refresh=${refresh}`);
    renderAIMatches();
    
    // Track refresh count
    if (refresh) {
      refreshesLeft--;
      updateRefreshCounter();
    }
  } catch (error) {
    console.error('Error loading matches:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load matches</h3>
        <p>There was an error generating AI matches. Please try again later.</p>
        <button class="btn-outline" style="margin-top:16px" onclick="loadAIMatches()">Retry</button>
      </div>
    `;
  }
}

function renderAIMatches() {
  const container = document.getElementById('ai-matches-container');
  if (!aiMatches || aiMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No matches found</h3>
        <p>Try updating your profile interests to get better recommendations.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  
  aiMatches.forEach((match, index) => {
    // Check if already requested
    const hasRequested = myRequests.some(r => r.mentor_id === match.mentor_id);
    
    // Parse strengths if it's a string, otherwise ensure array
    let strengthsHtml = '';
    const strengths = Array.isArray(match.strengths) ? match.strengths : 
                     (typeof match.strengths === 'string' ? match.strengths.split(',').map(s=>s.trim()) : []);
                     
    if (strengths && strengths.length > 0) {
      strengthsHtml = `
        <div class="match-strengths">
          ${strengths.map(s => `<span class="strength-tag">${s}</span>`).join('')}
        </div>
      `;
    }
    
    const card = document.createElement('div');
    card.className = 'match-card';
    card.style.animation = `fadeIn 0.4s ease ${index * 0.1}s forwards`;
    card.style.opacity = '0';
    
    // For CSS variables, the conic gradient expects a percentage
    card.style.setProperty('--score-pct', `${match.score}%`);
    
    card.innerHTML = `
      <div class="match-card-left">
        <div class="match-score-circle">
          <div class="match-score-inner">${match.score}%</div>
        </div>
        <div class="match-score-label">Match Score</div>
      </div>
      <div class="match-card-content">
        <div class="match-header">
          <div class="match-title">
            <h3>${match.mentor_name || 'Senior Mentor'}</h3>
            <p class="match-subtitle">${match.department || 'Department'}</p>
          </div>
          <div class="match-badges">
            ${match.domain ? `<span class="badge badge-domain">${match.domain}</span>` : ''}
          </div>
        </div>
        
        <div class="match-reason">
          ${match.reason || 'AI analysis found strong compatibility between your goals and this mentor\'s experience.'}
        </div>
        
        ${strengthsHtml}
        
        <div class="match-actions">
          <button class="btn-request" 
                  onclick="openRequestModal('${match.mentor_id}', '${match.mentor_name?.replace(/'/g, "\\'")}', ${match.score})"
                  ${hasRequested ? 'disabled' : ''}>
            ${hasRequested ? 'Request Sent' : 'Request Mentorship'}
          </button>
          <button class="btn-outline" onclick="openProfileModal('${match.mentor_id}')">
            View Profile
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function updateRefreshCounter() {
  const btn = document.getElementById('refresh-match-btn');
  const countSpan = document.getElementById('refresh-count');
  
  if (btn && countSpan) {
    if (refreshesLeft > 0) {
      btn.disabled = false;
      countSpan.textContent = `${refreshesLeft} refreshes remaining today`;
    } else {
      btn.disabled = true;
      countSpan.textContent = 'No refreshes left today (resets tomorrow)';
    }
    
    // Persist to local storage
    const today = new Date().toDateString();
    localStorage.setItem(REFRESH_KEY, JSON.stringify({ date: today, left: refreshesLeft }));
  }
}

async function refreshMatches() {
  if (refreshesLeft <= 0) {
    showToast('No refreshes left for today.', 'error');
    return;
  }
  
  await loadAIMatches(true);
  showToast('AI matches refreshed successfully!', 'success');
}

async function loadAllMentors() {
  const container = document.getElementById('all-mentors-list');
  container.innerHTML = '<div class="empty-state">Loading mentors...</div>';
  
  try {
    allSeniors = await apiRequest('/seniors');
    filterMentors();
  } catch (error) {
    console.error('Error loading mentors:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load mentors</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

function filterMentors() {
  const searchInput = document.getElementById('mentor-search');
  const domainSelect = document.getElementById('mentor-domain');
  
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const domain = domainSelect ? domainSelect.value : '';
  
  const container = document.getElementById('all-mentors-list');
  
  if (!allSeniors || allSeniors.length === 0) {
    container.innerHTML = '<div class="empty-state">No mentors found.</div>';
    return;
  }
  
  const filtered = allSeniors.filter(s => {
    const matchSearch = !search || 
                       (s.name && s.name.toLowerCase().includes(search)) || 
                       (s.department && s.department.toLowerCase().includes(search));
    const matchDomain = !domain || s.domain === domain;
    return matchSearch && matchDomain;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No mentors found</h3>
        <p>Try adjusting your search filters.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  filtered.forEach(s => {
    // Check if requested
    const hasRequested = myRequests.some(r => r.mentor_id === s.id);
    
    // Parse skills
    let skillsHtml = '';
    if (s.skills) {
      const skillArr = Array.isArray(s.skills) ? s.skills : 
                      (typeof s.skills === 'string' ? s.skills.split(',').map(x=>x.trim()) : []);
      if (skillArr.length > 0) {
        skillsHtml = `
          <div class="mentor-skills">
            ${skillArr.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            ${skillArr.length > 4 ? `<span class="skill-tag">+${skillArr.length - 4}</span>` : ''}
          </div>
        `;
      }
    }
    
    const card = document.createElement('div');
    card.className = 'mentor-grid-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>
          <h3 class="mentor-name">${s.name || 'Anonymous Mentor'}</h3>
          <p class="mentor-dept">${s.department || 'Unknown Dept'}</p>
        </div>
        ${s.hackathons_won > 0 ? `<div title="${s.hackathons_won} Hackathons Won" style="font-size:1.5rem">🏆</div>` : ''}
      </div>
      
      ${s.domain ? `<div style="margin-bottom:12px"><span class="badge badge-domain">${s.domain}</span></div>` : ''}
      
      ${skillsHtml}
      
      <div style="display:flex; gap:8px; margin-top:16px">
        <button class="btn-outline" style="flex:1; padding:8px" onclick="openProfileModal('${s.id}')">Profile</button>
        <button class="btn-request" style="flex:1; padding:8px" 
                onclick="openRequestModal('${s.id}', '${s.name?.replace(/'/g, "\\'")}', null)"
                ${hasRequested ? 'disabled' : ''}>
          ${hasRequested ? 'Sent' : 'Request'}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function loadMyRequests() {
  const container = document.getElementById('my-requests-list');
  const badge = document.getElementById('requests-badge');
  
  container.innerHTML = '<div class="empty-state">Loading requests...</div>';
  
  try {
    myRequests = await apiRequest('/seniors/my-requests');
    
    if (badge) {
      if (myRequests.length > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = myRequests.length;
      } else {
        badge.style.display = 'none';
      }
    }
    
    if (!myRequests || myRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No requests yet</h3>
          <p>Find a mentor in the AI Recommended or All Mentors tabs.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    myRequests.forEach(req => {
      const card = document.createElement('div');
      card.className = 'request-card';
      
      let statusClass = 'pending';
      let statusText = 'Pending';
      if (req.status === 'accepted') { statusClass = 'accepted'; statusText = 'Accepted'; }
      if (req.status === 'declined') { statusClass = 'declined'; statusText = 'Declined'; }
      if (req.status === 'cancelled') { statusClass = 'cancelled'; statusText = 'Cancelled'; }
      
      let actionsHtml = '';
      if (req.status === 'pending') {
        actionsHtml = `<button class="btn-outline" onclick="cancelRequest('${req.id}')">Cancel Request</button>`;
      } else if (req.status === 'accepted') {
        actionsHtml = `<button class="btn-outline" onclick="openFeedbackModal('${req.mentor_id}', '${req.mentor_name?.replace(/'/g, "\\'")}')">Leave Feedback</button>`;
      }
      
      card.innerHTML = `
        <div class="request-card-info">
          <h4>${req.mentor_name || 'Mentor'}</h4>
          <p>Request sent on ${new Date(req.created_at || Date.now()).toLocaleDateString()}</p>
          ${req.ai_match_score ? `<p style="font-size:0.8rem; margin-top:4px; color:var(--text-muted)">AI Match Score: ${req.ai_match_score}%</p>` : ''}
        </div>
        <div class="request-status ${statusClass}">${statusText}</div>
        ${actionsHtml ? `<div style="margin-left:12px">${actionsHtml}</div>` : ''}
      `;
      
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error('Error loading requests:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load requests</h3>
      </div>
    `;
  }
}

// Tab navigation
let allMentorsLoaded = false;
let requestsLoaded = false;

function switchTab(tabName) {
  // Update tabs
  document.querySelectorAll('.mentor-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${tabName}`).classList.add('active');
  
  // Lazy load
  if (tabName === 'all' && !allMentorsLoaded) {
    loadAllMentors();
    allMentorsLoaded = true;
  }
  if (tabName === 'requests' && !requestsLoaded) {
    // requests are already loaded once on init, but we can refresh here
    loadMyRequests();
    requestsLoaded = true;
  }
}

// Modals
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Click outside modal to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

function openRequestModal(mentorId, mentorName, matchScore) {
  document.getElementById('req-mentor-name').textContent = mentorName || 'this mentor';
  document.getElementById('req-mentor-id').value = mentorId;
  document.getElementById('req-match-score').value = matchScore || '';
  document.getElementById('req-message').value = '';
  openModal('modal-request');
}

async function submitRequest() {
  const mentorId = document.getElementById('req-mentor-id').value;
  const message = document.getElementById('req-message').value;
  const matchScore = document.getElementById('req-match-score').value;
  
  const payload = {
    mentor_id: mentorId,
    message: message
  };
  
  if (matchScore) {
    payload.ai_match_score = parseFloat(matchScore);
  }
  
  try {
    await apiRequest('/seniors/request', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    closeModal('modal-request');
    showToast('Mentorship request sent successfully!', 'success');
    
    // Refresh requests and update UI state
    await loadMyRequests();
    if (aiMatches.length > 0) renderAIMatches();
    if (allSeniors.length > 0) filterMentors();
    
    // Animate stats
    const pendingStat = document.getElementById('stat-pending');
    if (pendingStat) {
      pendingStat.textContent = parseInt(pendingStat.textContent) + 1;
    }
    
  } catch (error) {
    showToast('Failed to send request. ' + (error.message || ''), 'error');
  }
}

function openProfileModal(mentorId) {
  // Try to find in allSeniors first, then aiMatches
  let mentor = allSeniors.find(s => s.id === mentorId) || 
               allSeniors.find(s => s.mentor_id === mentorId);
               
  if (!mentor) {
    // If not found in allSeniors, we might need to fetch it or we can't show full profile
    // But typically we load allSeniors in background or we have basic info
    showToast('Could not load full profile.', 'error');
    return;
  }
  
  document.getElementById('prof-name').textContent = mentor.name || 'Anonymous';
  document.getElementById('prof-dept').textContent = mentor.department || 'Unknown Dept';
  document.getElementById('prof-domain').textContent = mentor.domain || '-';
  document.getElementById('prof-email').textContent = mentor.contact_email || 'Contact via request';
  document.getElementById('prof-bio').textContent = mentor.bio || 'No bio available.';
  
  const skillsContainer = document.getElementById('prof-skills');
  skillsContainer.innerHTML = '';
  if (mentor.skills) {
    const skillArr = Array.isArray(mentor.skills) ? mentor.skills : 
                    (typeof mentor.skills === 'string' ? mentor.skills.split(',').map(x=>x.trim()) : []);
    skillArr.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'skill-tag';
      span.textContent = skill;
      skillsContainer.appendChild(span);
    });
  }
  
  openModal('modal-profile');
}

function openFeedbackModal(mentorId, mentorName) {
  document.getElementById('fb-mentor-name').textContent = mentorName || 'this mentor';
  document.getElementById('fb-mentor-id').value = mentorId;
  document.getElementById('fb-message').value = '';
  // Reset stars
  document.querySelectorAll('input[name="rating"]').forEach(el => el.checked = false);
  openModal('modal-feedback');
}

async function submitFeedback() {
  const mentorId = document.getElementById('fb-mentor-id').value;
  const feedback = document.getElementById('fb-message').value;
  
  let rating = 0;
  const selectedStar = document.querySelector('input[name="rating"]:checked');
  if (selectedStar) {
    rating = parseInt(selectedStar.value);
  }
  
  if (rating === 0) {
    showToast('Please select a rating.', 'error');
    return;
  }
  
  try {
    await apiRequest('/seniors/feedback', {
      method: 'POST',
      body: JSON.stringify({
        mentor_id: mentorId,
        rating: rating,
        feedback: feedback
      })
    });
    
    closeModal('modal-feedback');
    showToast('Feedback submitted successfully. Thank you!', 'success');
  } catch (error) {
    showToast('Failed to submit feedback. ' + (error.message || ''), 'error');
  }
}

async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this mentorship request?')) return;
  
  try {
    await apiRequest(`/seniors/request/${requestId}/cancel`, {
      method: 'PUT'
    });
    
    showToast('Request cancelled.', 'info');
    await loadMyRequests();
    
    // Update UI state in other tabs
    if (aiMatches.length > 0) renderAIMatches();
    if (allSeniors.length > 0) filterMentors();
    
    // Update stats
    const pendingStat = document.getElementById('stat-pending');
    if (pendingStat && parseInt(pendingStat.textContent) > 0) {
      pendingStat.textContent = parseInt(pendingStat.textContent) - 1;
    }
    
  } catch (error) {
    showToast('Failed to cancel request.', 'error');
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Check login
  if (typeof requireLoginOrRedirect === 'function') {
    requireLoginOrRedirect();
  }
  
  // Setup logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof clearToken === 'function') clearToken();
      window.location.href = 'index.html';
    });
  }
  
  // Check daily refresh count
  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem(REFRESH_KEY) || '{}');
  if (stored.date === today) {
    refreshesLeft = stored.left;
  } else {
    refreshesLeft = 3;
    localStorage.setItem(REFRESH_KEY, JSON.stringify({ date: today, left: 3 }));
  }
  updateRefreshCounter();
  
  // Load initial data
  // We want my requests loaded first so we know what buttons to disable
  try {
    myRequests = await apiRequest('/seniors/my-requests').catch(() => []);
  } catch (e) {
    console.error("Could not load initial requests", e);
  }
  
  await Promise.all([
    loadAIMatches(),
    loadStats()
  ]);
  
  // Load domains for filter
  try {
    const domains = await apiRequest('/domains');
    const select = document.getElementById('mentor-domain');
    if (select && domains && domains.length > 0) {
      domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name; 
        opt.textContent = d.name;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.log("Could not load domains", e);
  }
  
  // Preload all mentors in background
  setTimeout(() => {
    if (!allMentorsLoaded) {
      loadAllMentors().then(() => {
        allMentorsLoaded = true;
      });
    }
  }, 1000);
});

// Export to window for inline onclick handlers
window.switchTab = switchTab;
window.refreshMatches = refreshMatches;
window.openRequestModal = openRequestModal;
window.openProfileModal = openProfileModal;
window.openFeedbackModal = openFeedbackModal;
window.submitRequest = submitRequest;
window.submitFeedback = submitFeedback;
window.cancelRequest = cancelRequest;
window.filterMentors = filterMentors;
window.closeModal = closeModal;
window.loadAIMatches = loadAIMatches;
