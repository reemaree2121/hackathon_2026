let allEvents = [];
let editingEventId = null;

// Activity log helpers (localStorage)
const ACT_KEY = 'portal_activity_v1';
function logActivity(action, detail) {
  const acts = JSON.parse(localStorage.getItem(ACT_KEY) || '[]');
  acts.unshift({ action, detail, time: new Date().toISOString() });
  localStorage.setItem(ACT_KEY, JSON.stringify(acts.slice(0, 50)));
  // Dispatch storage event so dashboard can update
  window.dispatchEvent(new StorageEvent('storage', { key: ACT_KEY }));
}

function computeStatus(event_date) {
  const now = new Date();
  const eDate = new Date(event_date);
  
  // Basic date-only comparison for simplicity
  const todayStr = now.toISOString().split('T')[0];
  const eDateStr = eDate.toISOString().split('T')[0];

  if (eDateStr > todayStr) return 'Upcoming';
  if (eDateStr === todayStr) return 'Ongoing';
  return 'Completed';
}

function showToast(msg, type='info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  // Simple styling for toast
  t.style.padding = '12px 20px';
  t.style.margin = '8px 0';
  t.style.borderRadius = 'var(--r-md)';
  t.style.background = type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--surface)');
  t.style.color = type === 'info' ? 'var(--text)' : '#fff';
  if(type === 'info') t.style.border = '1px solid var(--border)';
  t.style.boxShadow = 'var(--shadow-md)';
  t.style.transition = 'opacity 0.3s ease';
  
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

async function loadEvents() {
  try {
    const events = await apiRequest('/events');
    allEvents = events.map(e => ({
      ...e,
      // Ensure ISO date string format is parsed predictably
      event_date: new Date(e.event_date).toISOString().split('T')[0],
      registration_deadline: new Date(e.registration_deadline).toISOString().split('T')[0]
    }));
    applyFilters();
  } catch (err) {
    document.getElementById('events-list').textContent = 'Failed to load events: ' + err.message;
  }
}

function renderEvents(events) {
  const container = document.getElementById('events-list');
  
  if (!events.length) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:var(--sp-6) 0;">
        <div style="font-size:3rem; margin-bottom:var(--sp-3)">🎈</div>
        <div style="font-size:1.2rem; font-weight:600; color:var(--text)">No events found</div>
        <div style="color:var(--text-muted); margin-top:var(--sp-2)">Try adjusting your filters or create a new event.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(e => {
    const status = computeStatus(e.event_date);
    const statusClass = status.toLowerCase();
    
    // Seats formatting
    const isFull = e.seats_remaining <= 0;
    const isLow = e.seats_remaining > 0 && e.seats_remaining <= 5;
    const seatClass = isFull ? 'full' : (isLow ? 'low' : 'ok');
    
    // Format date beautifully
    const dateFormatted = new Date(e.event_date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
    const deadlineFormatted = new Date(e.registration_deadline).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });

    const isPastDeadline = new Date(e.registration_deadline) < new Date(new Date().toDateString());
    const disableRegister = isFull || isPastDeadline || status === 'Completed';
    let registerLabel = 'Register';
    if (isFull) registerLabel = 'Full';
    else if (isPastDeadline || status === 'Completed') registerLabel = 'Closed';

    return `
      <div class="card card-interactive event-card">
        <div class="event-card-header">
          <div>
            <span class="badge status-${statusClass}">${status}</span>
            <h3 style="margin-top:8px; margin-bottom:4px">${e.name}</h3>
          </div>
          <div class="event-card-actions">
            <button class="btn btn-outline btn-sm" onclick="openEditModal(${e.id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${e.id}, '${e.name.replace(/'/g, "\\'")}')">🗑️</button>
          </div>
        </div>
        <p style="color:var(--text-muted); margin-bottom:12px">${e.description || 'No description provided.'}</p>
        
        <div class="event-meta-grid">
          <div class="event-meta-item"><span>📅</span> ${dateFormatted}</div>
          <div class="event-meta-item"><span>🕐</span> ${e.start_time.slice(0,5)}–${e.end_time.slice(0,5)}</div>
          <div class="event-meta-item"><span>📍</span> ${e.venue}</div>
          <div class="event-meta-item"><span>🏷️</span> ${e.organizing_club || 'General'}</div>
          <div class="event-meta-item"><span>🎯</span> ${e.difficulty || 'Beginner'}</div>
          <div class="event-meta-item">
            <span>💺</span> 
            <span style="color: ${isFull ? 'var(--danger)' : isLow ? 'var(--warning)' : 'inherit'}">
              ${e.seats_remaining} / ${e.total_seats} seats
            </span>
          </div>
        </div>
        
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border); display:flex; gap:12px; align-items:center">
          <button class="btn btn-sm" ${disableRegister ? 'disabled' : ''} onclick="registerForEvent(${e.id}, this)">
            ${registerLabel}
          </button>
          <span style="font-size:0.8rem;color:var(--text-muted)">
            ${isPastDeadline ? 'Registration closed' : `Deadline: ${deadlineFormatted}`}
          </span>
        </div>
        <div id="clash-warning-${e.id}" style="margin-top:8px; font-size:0.85rem; color:var(--warning)"></div>
      </div>
    `;
  }).join('');
}

async function registerForEvent(eventId, btn) {
  try {
    const event = allEvents.find(e => e.id === eventId);
    
    // Check for timetable clash first
    const clash = await apiRequest(`/events/${eventId}/clash-check`);
    if (clash.hasClash) {
      const proceed = confirm(
        `Heads up — this clashes with your class: ${clash.clashes.map(c => c.subject).join(', ')}. Register anyway?`
      );
      if (!proceed) return;
    }

    await apiRequest(`/events/${eventId}/register`, { method: 'POST' });
    btn.textContent = 'Registered ✓';
    btn.disabled = true;
    showToast(`Successfully registered for ${event.name}`, 'success');
    logActivity('event-register', event.name);
    await loadEvents();
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  }
}

async function deleteEvent(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
  
  try {
    await apiRequest(`/events/${id}`, { method: 'DELETE' });
    showToast(`Event "${name}" deleted.`, 'success');
    logActivity('event-delete', name);
    await loadEvents();
  } catch (err) {
    showToast('Failed to delete event: ' + err.message, 'error');
  }
}

function openCreateModal() {
  editingEventId = null;
  document.getElementById('form-modal-title').textContent = 'Create Event';
  document.getElementById('form-submit-btn').textContent = 'Create Event';
  
  // Clear form
  document.getElementById('ev-name').value = '';
  document.getElementById('ev-desc').value = '';
  document.getElementById('ev-date').value = '';
  document.getElementById('ev-start').value = '';
  document.getElementById('ev-end').value = '';
  document.getElementById('ev-venue').value = '';
  document.getElementById('ev-club').value = '';
  document.getElementById('ev-diff').value = 'Beginner';
  document.getElementById('ev-seats').value = '50';
  document.getElementById('ev-elig').value = '';
  document.getElementById('ev-prereq').value = '';
  document.getElementById('ev-deadline').value = '';
  
  document.getElementById('event-form-modal').classList.add('active');
}

function openEditModal(id) {
  editingEventId = id;
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('form-modal-title').textContent = 'Edit Event';
  document.getElementById('form-submit-btn').textContent = 'Save Changes';
  
  document.getElementById('ev-name').value = ev.name || '';
  document.getElementById('ev-desc').value = ev.description || '';
  document.getElementById('ev-date').value = ev.event_date || '';
  document.getElementById('ev-start').value = (ev.start_time || '').slice(0,5);
  document.getElementById('ev-end').value = (ev.end_time || '').slice(0,5);
  document.getElementById('ev-venue').value = ev.venue || '';
  document.getElementById('ev-club').value = ev.organizing_club || '';
  document.getElementById('ev-diff').value = ev.difficulty || 'Beginner';
  document.getElementById('ev-seats').value = ev.total_seats || 50;
  document.getElementById('ev-elig').value = ev.eligibility || '';
  document.getElementById('ev-prereq').value = ev.prerequisites || '';
  document.getElementById('ev-deadline').value = ev.registration_deadline || '';

  document.getElementById('event-form-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('event-form-modal').classList.remove('active');
  editingEventId = null;
}

async function submitEventForm() {
  const payload = {
    name: document.getElementById('ev-name').value.trim(),
    description: document.getElementById('ev-desc').value.trim(),
    event_date: document.getElementById('ev-date').value,
    start_time: document.getElementById('ev-start').value,
    end_time: document.getElementById('ev-end').value,
    venue: document.getElementById('ev-venue').value.trim(),
    organizing_club: document.getElementById('ev-club').value.trim(),
    difficulty: document.getElementById('ev-diff').value,
    total_seats: parseInt(document.getElementById('ev-seats').value) || 50,
    eligibility: document.getElementById('ev-elig').value.trim(),
    prerequisites: document.getElementById('ev-prereq').value.trim(),
    registration_deadline: document.getElementById('ev-deadline').value || document.getElementById('ev-date').value
  };

  if (!payload.name || !payload.event_date || !payload.start_time || !payload.end_time || !payload.venue) {
    showToast('Please fill in all required fields (*)', 'error');
    return;
  }

  try {
    const btn = document.getElementById('form-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    if (editingEventId) {
      await apiRequest(`/events/${editingEventId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Event updated successfully', 'success');
      logActivity('event-update', payload.name);
    } else {
      await apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Event created successfully', 'success');
      logActivity('event-create', payload.name);
    }

    closeModal();
    await loadEvents();
  } catch (err) {
    showToast(err.message || 'Failed to save event', 'error');
  } finally {
    const btn = document.getElementById('form-submit-btn');
    btn.disabled = false;
    btn.textContent = editingEventId ? 'Save Changes' : 'Create Event';
  }
}

function applyFilters() {
  const search = document.getElementById('f-search').value.toLowerCase();
  const status = document.getElementById('f-status').value;
  const sort = document.getElementById('f-sort').value;
  
  let filtered = allEvents.filter(e => {
    const matchSearch = !search || 
                        e.name.toLowerCase().includes(search) || 
                        (e.venue || '').toLowerCase().includes(search) ||
                        (e.organizing_club || '').toLowerCase().includes(search);
    const matchStatus = !status || computeStatus(e.event_date) === status;
    return matchSearch && matchStatus;
  });
  
  if (sort === 'desc') {
    filtered.sort((a,b) => new Date(b.event_date) - new Date(a.event_date));
  } else {
    filtered.sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
  }
  
  renderEvents(filtered);
}

function resetFilters() {
  document.getElementById('f-search').value = '';
  document.getElementById('f-status').value = '';
  document.getElementById('f-sort').value = 'asc';
  applyFilters();
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  requireLoginOrRedirect();
  
  const logoutBtn = document.querySelector('.logout-link') || document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      clearToken();
      window.location.href = 'index.html';
    };
  }
  
  await loadEvents();
  
  document.getElementById('f-search')?.addEventListener('input', applyFilters);
  document.getElementById('f-status')?.addEventListener('change', applyFilters);
  document.getElementById('f-sort')?.addEventListener('change', applyFilters);
});

// Expose global functions
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.submitEventForm = submitEventForm;
window.deleteEvent = deleteEvent;
window.registerForEvent = registerForEvent;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;
