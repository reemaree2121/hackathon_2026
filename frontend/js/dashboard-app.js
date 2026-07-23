// ============================================================================
// DASHBOARD APP — Freshers Portal
// All dashboard feature logic: stats, notes, calendar, notifications,
// upcoming widget, activity timeline, progress, quick actions, dark mode.
// Data: Events from API, Notes/Activity from localStorage.
// ============================================================================

const API_BASE = 'http://localhost:5000/api';
const SK = { // storage keys
  notes: 'portal_notes_v1',
  activity: 'portal_activity_v1',
  darkMode: 'portal_dark_mode'
};

// ---- API Helpers ----
function getToken() { return localStorage.getItem('token'); }
function clearToken() { localStorage.removeItem('token'); }
function requireLoginOrRedirect() { if (!getToken()) window.location.href = 'index.html'; }
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---- Utilities ----
function getEventStatus(event_date) {
  const now = new Date();
  const eDate = new Date(event_date);
  const todayStr = now.toISOString().split('T')[0];
  const eDateStr = eDate.toISOString().split('T')[0];
  if (eDateStr > todayStr) return 'Upcoming';
  if (eDateStr === todayStr) return 'Ongoing';
  return 'Completed';
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eDate = new Date(dateStr);
  eDate.setHours(0, 0, 0, 0);
  const diffTime = eDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function showToast(msg, type='info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ---- Dark Mode Manager ----
const DarkMode = {
  init() {
    const isDark = localStorage.getItem(SK.darkMode) === 'true';
    this.apply(isDark);
  },
  toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.apply(!isDark);
    localStorage.setItem(SK.darkMode, (!isDark).toString());
  },
  apply(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('darkmode-btn');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  }
};
window.DarkModeToggle = () => DarkMode.toggle();

// ---- Activity Manager ----
const Activity = {
  log(action, detail) {
    const acts = this.getAll();
    acts.unshift({ action, detail, time: new Date().toISOString() });
    localStorage.setItem(SK.activity, JSON.stringify(acts.slice(0, 50)));
    this.render();
  },
  getAll() {
    return JSON.parse(localStorage.getItem(SK.activity) || '[]');
  },
  clear() {
    localStorage.setItem(SK.activity, '[]');
    this.render();
  },
  render() {
    const list = document.getElementById('activity-list');
    if (!list) return;
    const acts = this.getAll();
    if (!acts.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem">No activity yet.</div>';
      return;
    }
    
    list.innerHTML = acts.map(act => {
      let iconClass = '';
      let text = '';
      
      if (act.action === 'event-create') { iconClass = 'event-create'; text = `Created event "${act.detail}"`; }
      else if (act.action === 'event-update') { iconClass = 'event-update'; text = `Updated event "${act.detail}"`; }
      else if (act.action === 'event-delete') { iconClass = 'event-delete'; text = `Deleted event "${act.detail}"`; }
      else if (act.action === 'event-register') { iconClass = 'event-register'; text = `Registered for "${act.detail}"`; }
      else if (act.action === 'note-add') { iconClass = 'note-add'; text = `Added note "${act.detail}"`; }
      else if (act.action === 'note-edit') { iconClass = 'note-edit'; text = `Edited note "${act.detail}"`; }
      else if (act.action === 'note-delete') { iconClass = 'note-delete'; text = `Deleted note "${act.detail}"`; }
      else { iconClass = 'note-add'; text = `${act.action}: ${act.detail}`; }
      
      const time = new Date(act.time);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + time.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return `
        <div class="timeline-item">
          <div class="timeline-dot ${iconClass}"></div>
          <div class="timeline-text">${text}</div>
          <div class="timeline-time">${timeStr}</div>
        </div>
      `;
    }).join('');
  }
};
window.clearActivity = () => Activity.clear();

// ---- Notes Manager ----
const Notes = {
  editingId: null,
  getAll() { return JSON.parse(localStorage.getItem(SK.notes) || '[]'); },
  save(notes) { localStorage.setItem(SK.notes, JSON.stringify(notes)); },
  create(title, body, color) {
    const notes = this.getAll();
    notes.unshift({ id: generateId(), title, body, color, pinned: false, created: new Date().toISOString() });
    this.save(notes);
    Activity.log('note-add', title);
    this.render();
    Stats.renderNotes(); // update stats
  },
  update(id, title, body, color) {
    const notes = this.getAll();
    const idx = notes.findIndex(n => n.id === id);
    if (idx > -1) {
      notes[idx].title = title;
      notes[idx].body = body;
      notes[idx].color = color;
      this.save(notes);
      Activity.log('note-edit', title);
      this.render();
    }
  },
  delete(id) {
    if (!confirm('Delete this note?')) return;
    let notes = this.getAll();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    notes = notes.filter(n => n.id !== id);
    this.save(notes);
    Activity.log('note-delete', note.title);
    this.render();
    Stats.renderNotes();
  },
  togglePin(id) {
    const notes = this.getAll();
    const idx = notes.findIndex(n => n.id === id);
    if (idx > -1) {
      notes[idx].pinned = !notes[idx].pinned;
      this.save(notes);
      this.render();
    }
  },
  render() {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;
    const notes = this.getAll();
    if (!notes.length) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem">No notes yet.</div>';
      return;
    }
    
    // Sort: pinned first, then by date
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created) - new Date(a.created);
    });
    
    grid.innerHTML = notes.map(n => {
      const dateStr = new Date(n.created).toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `
        <div class="note-card ${n.color} ${n.pinned ? 'pinned' : ''}">
          <button class="pin-btn ${n.pinned ? 'pinned' : ''}" onclick="window.togglePin('${n.id}')" title="Pin Note">📌</button>
          <div class="note-title">${n.title}</div>
          <div class="note-body">${n.body}</div>
          <div class="note-footer">
            <span>${dateStr}</span>
            <div class="note-actions">
              <button onclick="window.editNote('${n.id}')" title="Edit">✏️</button>
              <button onclick="window.deleteNote('${n.id}')" title="Delete">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },
  openModal(id = null) {
    const titleInp = document.getElementById('note-input-title');
    const bodyInp = document.getElementById('note-input-body');
    const colorInp = document.getElementById('note-input-color');
    const titleEl = document.getElementById('note-modal-title');
    
    this.editingId = id;
    
    if (id) {
      const notes = this.getAll();
      const n = notes.find(x => x.id === id);
      if (n) {
        titleInp.value = n.title;
        bodyInp.value = n.body;
        colorInp.value = n.color;
        titleEl.textContent = 'Edit Note';
      }
    } else {
      titleInp.value = '';
      bodyInp.value = '';
      colorInp.value = 'note-yellow';
      titleEl.textContent = 'Add Note';
    }
    document.getElementById('note-modal').classList.add('open');
  },
  submitModal() {
    const title = document.getElementById('note-input-title').value.trim();
    const body = document.getElementById('note-input-body').value.trim();
    const color = document.getElementById('note-input-color').value;
    
    if (!title || !body) {
      showToast('Title and body are required', 'error');
      return;
    }
    
    if (this.editingId) {
      this.update(this.editingId, title, body, color);
    } else {
      this.create(title, body, color);
    }
    
    window.closeModal('note-modal');
  }
};

window.openNoteModal = (id=null) => Notes.openModal(id);
window.editNote = (id) => Notes.openModal(id);
window.deleteNote = (id) => Notes.delete(id);
window.togglePin = (id) => Notes.togglePin(id);
window.submitNote = () => Notes.submitModal();
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

// ---- Stats Manager ----
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 600;
  const start = parseInt(el.textContent) || 0;
  const range = target - start;
  const startTime = performance.now();
  
  function update(time) {
    const elapsed = time - startTime;
    if (elapsed >= duration) {
      el.textContent = target;
    } else {
      const progress = elapsed / duration;
      // ease out quad
      const ease = 1 - (1 - progress) * (1 - progress);
      el.textContent = Math.round(start + range * ease);
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

const Stats = {
  events: [],
  render(events) {
    this.events = events;
    const total = events.length;
    const upcoming = events.filter(e => getEventStatus(e.event_date) === 'Upcoming').length;
    const completed = events.filter(e => getEventStatus(e.event_date) === 'Completed').length;
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sun
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sat
    
    const thisWeek = events.filter(e => {
      const d = new Date(e.event_date);
      return d >= startOfWeek && d <= endOfWeek;
    }).length;
    
    animateCount('stat-total', total);
    animateCount('stat-upcoming', upcoming);
    animateCount('stat-completed', completed);
    animateCount('stat-week', thisWeek);
    this.renderNotes();
  },
  renderNotes() {
    const notes = Notes.getAll().length;
    animateCount('stat-notes', notes);
  }
};

// ---- Upcoming Widget ----
const UpcomingWidget = {
  render(events) {
    const container = document.getElementById('upcoming-widget');
    if (!container) return;
    
    const upcomingEvents = events
      .filter(e => getEventStatus(e.event_date) === 'Upcoming' || getEventStatus(e.event_date) === 'Ongoing')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5);
      
    if (!upcomingEvents.length) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:10px">No upcoming events.</div>';
      return;
    }
    
    container.innerHTML = upcomingEvents.map(e => {
      const d = new Date(e.event_date);
      const day = d.getDate();
      const month = d.toLocaleDateString([], { month: 'short' });
      const days = daysUntil(e.event_date);
      
      let cdClass = 'countdown-upcoming';
      let cdText = `In ${days} days`;
      if (days === 0) { cdClass = 'countdown-today'; cdText = 'Today'; }
      else if (days < 0) { cdClass = 'countdown-today'; cdText = 'Ongoing'; }
      else if (days <= 3) { cdClass = 'countdown-soon'; }
      
      return `
        <div class="upcoming-card">
          <div class="upcoming-date-box">
            <span class="upcoming-date-month">${month}</span>
            <span class="upcoming-date-day">${day}</span>
          </div>
          <div class="upcoming-info">
            <h4 class="upcoming-title">${e.name}</h4>
            <div class="upcoming-meta">${formatTime(e.start_time)} · ${e.venue}</div>
            <span class="upcoming-countdown ${cdClass}">${cdText}</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="window.viewEventDetails(${e.id})" style="padding:4px 8px;font-size:0.75rem">View</button>
        </div>
      `;
    }).join('');
  }
};

window.viewEventDetails = (id) => {
  const e = EventsSync.allEvents.find(x => x.id === id);
  if (!e) return;
  const modal = document.getElementById('event-modal');
  const content = document.getElementById('event-modal-content');
  
  content.innerHTML = `
    <h3 style="margin-top:0">${e.name}</h3>
    <p>${e.description || 'No description provided.'}</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px;">
      <div><strong>Date:</strong> ${formatDate(e.event_date)}</div>
      <div><strong>Time:</strong> ${formatTime(e.start_time)} - ${formatTime(e.end_time)}</div>
      <div><strong>Venue:</strong> ${e.venue}</div>
      <div><strong>Club:</strong> ${e.organizing_club || '-'}</div>
      <div><strong>Seats:</strong> ${e.seats_remaining} / ${e.total_seats}</div>
      <div><strong>Difficulty:</strong> ${e.difficulty || '-'}</div>
    </div>
  `;
  
  modal.classList.add('open');
};

// ---- Calendar Manager ----
const Calendar = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  eventsByDate: {},
  
  init(events) {
    this.eventsByDate = {};
    events.forEach(e => {
      const dStr = e.event_date.split('T')[0]; // assuming YYYY-MM-DD form
      if (!this.eventsByDate[dStr]) this.eventsByDate[dStr] = [];
      this.eventsByDate[dStr].push(e);
    });
    this.render();
  },
  
  render() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;
    
    const d = new Date(this.year, this.month, 1);
    label.textContent = d.toLocaleDateString([], { month: 'long', year: 'numeric' });
    
    // day names
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    let html = dayNames.map(n => `<div class="cal-day-name">${n}</div>`).join('');
    
    const firstDay = d.getDay();
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    // blanks before 1st
    for (let i = 0; i < firstDay; i++) {
      html += `<div></div>`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(this.year, this.month, i);
      // to local YYYY-MM-DD
      const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
      
      const isToday = dateStr === todayStr;
      const dayEvents = this.eventsByDate[dateStr] || [];
      const hasEvent = dayEvents.length > 0;
      
      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (hasEvent) cls += ' has-event';
      
      html += `<div class="${cls}" onclick="window.calSelectDate('${dateStr}')">${i}</div>`;
    }
    
    grid.innerHTML = html;
  },
  
  prev() {
    this.month--;
    if (this.month < 0) { this.month = 11; this.year--; }
    this.render();
    document.getElementById('cal-popover').classList.remove('active');
  },
  
  next() {
    this.month++;
    if (this.month > 11) { this.month = 0; this.year++; }
    this.render();
    document.getElementById('cal-popover').classList.remove('active');
  },
  
  selectDate(dateStr) {
    const popover = document.getElementById('cal-popover');
    const evs = this.eventsByDate[dateStr] || [];
    if (evs.length === 0) {
      popover.classList.remove('active');
      return;
    }
    
    let html = `<div style="font-weight:700;margin-bottom:8px">${formatDate(dateStr)}</div>`;
    html += evs.map(e => `
      <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></div>
        <div style="font-weight:600">${e.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-left:auto">${formatTime(e.start_time)}</div>
      </div>
    `).join('');
    
    popover.innerHTML = html;
    popover.classList.add('active');
  }
};
window.calPrev = () => Calendar.prev();
window.calNext = () => Calendar.next();
window.calSelectDate = (dateStr) => Calendar.selectDate(dateStr);

// ---- Notifications ----
const Notifications = {
  init(events) {
    const evts = events.filter(e => {
      const days = daysUntil(e.event_date);
      return days >= 0 && days <= 7;
    }).slice(0, 3);
    
    const notifs = [];
    evts.forEach(e => {
      notifs.push({
        title: `Upcoming: ${e.name}`,
        sub: `In ${daysUntil(e.event_date)} days at ${formatTime(e.start_time)}`,
        icon: '📅',
        time: new Date() // pseudo time
      });
    });
    
    const act = Activity.getAll().slice(0, 3);
    act.forEach(a => {
      let icon = '🔔';
      if (a.action.startsWith('note')) icon = '📝';
      else if (a.action.startsWith('event')) icon = '🎉';
      notifs.push({
        title: `Activity: ${a.action}`,
        sub: a.detail,
        icon,
        time: new Date(a.time)
      });
    });
    
    // sort by time desc
    notifs.sort((a, b) => b.time - a.time);
    
    const countEl = document.getElementById('notif-count');
    if (countEl) {
      if (notifs.length > 0) {
        countEl.style.display = 'block';
        countEl.textContent = notifs.length;
      } else {
        countEl.style.display = 'none';
      }
    }
    
    const container = document.getElementById('notif-content');
    if (container) {
      if (notifs.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);margin-top:20px;">No notifications.</div>';
      } else {
        container.innerHTML = notifs.map(n => `
          <div class="notif-item">
            <div class="notif-icon">${n.icon}</div>
            <div>
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-sub">${n.sub}</div>
            </div>
          </div>
        `).join('');
      }
    }
  },
  open() {
    document.getElementById('notif-overlay').classList.add('open');
    document.getElementById('notif-panel').classList.add('open');
  },
  close() {
    document.getElementById('notif-overlay').classList.remove('open');
    document.getElementById('notif-panel').classList.remove('open');
  }
};
window.openNotif = () => Notifications.open();
window.closeNotif = () => Notifications.close();

// ---- Progress Manager ----
const Progress = {
  render(events) {
    const totalEvents = events.length;
    const completedEvents = events.filter(e => getEventStatus(e.event_date) === 'Completed').length;
    const pct = totalEvents === 0 ? 0 : Math.round((completedEvents / totalEvents) * 100);
    
    animateCount('prog-pct', pct);
    
    const ring = document.getElementById('prog-ring-fill');
    if (ring) {
      const r = 32;
      const c = 2 * Math.PI * r;
      // 201 is approx circumference.
      const offset = c * ((100 - pct) / 100);
      ring.style.strokeDashoffset = offset;
    }
    
    // monthly
    const now = new Date();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();
    const monthlyEvents = events.filter(e => {
      const d = new Date(e.event_date);
      return d.getMonth() === currMonth && d.getFullYear() === currYear;
    }).length;
    
    animateCount('prog-monthly', monthlyEvents);
    
    // weekly chart
    const chart = document.getElementById('weekly-chart');
    const labels = document.getElementById('weekly-labels');
    if (!chart || !labels) return;
    
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    
    events.forEach(e => {
      const d = new Date(e.event_date);
      if (d >= startOfWeek && d <= endOfWeek) {
        let dayIdx = d.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6; // Sunday
        counts[dayIdx]++;
      }
    });
    
    const max = Math.max(...counts, 1);
    
    chart.innerHTML = counts.map((c, i) => {
      const h = Math.max((c / max) * 100, 5); // min 5% height
      const activeCls = c > 0 ? 'active' : '';
      return `<div class="week-bar ${activeCls}" style="height:${h}%" title="${c} events"></div>`;
    }).join('');
    
    labels.innerHTML = dayNames.map(n => `<div class="week-label">${n}</div>`).join('');
  }
};

// ---- Events Sync ----
const EventsSync = {
  allEvents: [],
  render(events) {
    this.allEvents = events;
    this.filter();
  },
  filter() {
    const list = document.getElementById('dash-events-list');
    if (!list) return;
    
    const search = (document.getElementById('ev-search')?.value || '').toLowerCase();
    const status = document.getElementById('ev-status')?.value || '';
    const sort = document.getElementById('ev-sort')?.value || 'asc';
    
    let filtered = this.allEvents.filter(e => {
      const matchS = !search || e.name.toLowerCase().includes(search) || (e.venue||'').toLowerCase().includes(search);
      const matchSt = !status || getEventStatus(e.event_date) === status;
      return matchS && matchSt;
    });
    
    if (sort === 'desc') {
      filtered.sort((a,b) => new Date(b.event_date) - new Date(a.event_date));
    } else {
      filtered.sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
    }
    
    if (!filtered.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No events match filters.</div>';
      return;
    }
    
    list.innerHTML = filtered.map(e => {
      const st = getEventStatus(e.event_date);
      const stCls = `status-${st.toLowerCase()}`;
      return `
        <div class="event-row">
          <div class="event-row-name">
            <div style="margin-bottom:4px">${e.name}</div>
            <div class="event-row-meta">📍 ${e.venue}</div>
          </div>
          <div style="flex:1;min-width:120px" class="event-row-meta">
            📅 ${formatDate(e.event_date)}<br>🕐 ${formatTime(e.start_time)}
          </div>
          <div><span class="${stCls}">${st}</span></div>
        </div>
      `;
    }).join('');
  }
};

window.applyFilters = () => EventsSync.filter();
window.resetFilters = () => {
  if (document.getElementById('ev-search')) document.getElementById('ev-search').value = '';
  if (document.getElementById('ev-status')) document.getElementById('ev-status').value = '';
  if (document.getElementById('ev-sort')) document.getElementById('ev-sort').value = 'asc';
  EventsSync.filter();
};

// ---- Quick Actions ----
const QuickActions = {
  init() {
    document.getElementById('qa-create-event')?.addEventListener('click', () => {
      window.location.href = 'events.html';
    });
    
    document.getElementById('qa-add-note')?.addEventListener('click', () => {
      Notes.openModal();
    });
    
    document.getElementById('qa-export')?.addEventListener('click', () => {
      const events = EventsSync.allEvents;
      if (!events.length) {
        showToast('No events to export', 'error');
        return;
      }
      
      const header = ['Name', 'Date', 'Start', 'End', 'Venue', 'Club', 'Status', 'Seats'];
      const rows = events.map(e => [
        `"${e.name.replace(/"/g, '""')}"`,
        e.event_date,
        e.start_time,
        e.end_time,
        `"${e.venue}"`,
        `"${e.organizing_club||''}"`,
        getEventStatus(e.event_date),
        `${e.seats_remaining}/${e.total_seats}`
      ]);
      
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      Activity.log('exported-events', `Exported ${events.length} events to CSV`);
      showToast('Events exported successfully', 'success');
    });
    
    document.getElementById('qa-refresh')?.addEventListener('click', () => {
      window.location.reload();
    });
  }
};

// ---- Original Sections Rendering ----
function renderOriginalDashboardSections(data) {
  // Today's classes
  const classesContainer = document.getElementById('todays-classes');
  if (classesContainer) {
    if (!data.todaysClasses || data.todaysClasses.length === 0) {
      classesContainer.innerHTML = '<p class="text-muted">No classes scheduled for today.</p>';
    } else {
      classesContainer.innerHTML = data.todaysClasses.map(c => `
        <div class="class-row ${c.is_lab ? 'is-lab' : ''}">
          <div class="class-time">${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}</div>
          <div class="class-meta">
            <p class="class-subject">${c.subject}</p>
            <p class="class-detail">${c.faculty} · ${c.classroom}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // Notices
  const noticesContainer = document.getElementById('notices');
  if (noticesContainer) {
    if (!data.notices || data.notices.length === 0) {
      noticesContainer.innerHTML = '<p class="text-muted">No new notices.</p>';
    } else {
      noticesContainer.innerHTML = data.notices.map(n => `
        <div style="margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:12px">
          <div style="font-weight:600; font-size:0.9rem; color:var(--text); margin-bottom:4px">${n.title}</div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px">${n.body}</div>
          <div style="font-size:0.75rem; color:var(--text-faint)">Posted on ${new Date(n.posted_at).toLocaleDateString()}</div>
        </div>
      `).join('');
    }
  }

  // Recommended Clubs
  const clubsContainer = document.getElementById('recommended-clubs');
  if (clubsContainer) {
    if (!data.recommendedClubs || data.recommendedClubs.length === 0) {
      clubsContainer.innerHTML = '<p class="text-muted">No clubs found.</p>';
    } else {
      clubsContainer.innerHTML = data.recommendedClubs.map(c => `
        <div class="card card-interactive" style="border:1px solid var(--border); padding:16px; margin-bottom:0">
          <h4 style="margin:0 0 6px; font-size:0.95rem">${c.name}</h4>
          <span class="badge badge-gray" style="font-size:0.75rem">${c.domain || 'General'}</span>
        </div>
      `).join('');
    }
  }
}

// ---- Main Init ----
async function initDashboard() {
  requireLoginOrRedirect();
  DarkMode.init();
  
  // Set date
  const now = new Date();
  const dEl = document.getElementById('today-date');
  if (dEl) dEl.textContent = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
  
  // Load user profile
  try {
    const profile = await apiGet('/profile');
    if (profile && profile.full_name) {
      const first = profile.full_name.split(' ')[0];
      const wEl = document.getElementById('welcome-text');
      if (wEl) wEl.textContent = `Welcome back, ${first} 👋`;
    }
  } catch(e) {}
  
  // Load dashboard data for classes, notices, clubs
  try {
    const dashData = await apiGet('/dashboard');
    renderOriginalDashboardSections(dashData);
  } catch(e) {
    console.warn('Could not load dashboard data:', e);
  }
  
  // Load events
  let events = [];
  try {
    events = await apiGet('/events');
  } catch(e) {
    showToast('Could not load events from server', 'error');
  }
  
  Stats.render(events);
  UpcomingWidget.render(events);
  Calendar.init(events);
  Notifications.init(events);
  Progress.render(events);
  EventsSync.render(events);
  
  Notes.render();
  Activity.render();
  QuickActions.init();
  
  // Wire logout
  const logoutBtn = document.getElementById('logout-btn') || document.querySelector('.logout-link');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      clearToken();
      window.location.href = 'index.html';
    };
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);

// Re-render when localStorage changes (from events page)
window.addEventListener('storage', (e) => {
  if (e.key === SK.notes) Notes.render();
  if (e.key === SK.activity) Activity.render();
  if (e.key === SK.darkMode) DarkMode.init();
});
