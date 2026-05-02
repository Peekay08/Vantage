/* =============================================
   VANTAGE – STUDENT DASHBOARD
   JS · app.js
============================================= */

/* ─── SIDEBAR COLLAPSE ─── */
document.addEventListener('DOMContentLoaded', () => {
  const sidebar     = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');

  console.log('Sidebar element:', sidebar);
  console.log('Collapse button:', collapseBtn);

  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      console.log('Collapse button clicked');
      sidebar.classList.toggle('collapsed');
      // Persist preference
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', isCollapsed);
      console.log('Sidebar collapsed:', isCollapsed);
    });

    // Restore sidebar state on load
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      sidebar.classList.add('collapsed');
      console.log('Sidebar state restored: collapsed');
    }
  } else {
    console.error('Sidebar elements not found');
  }
});


/* ─── LIVE TIME & GREETING ─── */
function updateTime() {
  const now = new Date();

  // Format time
  const hours   = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm    = hours >= 12 ? 'PM' : 'AM';
  const h12     = ((hours % 12) || 12);
  const timeStr = `${h12}:${minutes} ${ampm}`;

  // Day + date
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  const liveTimeEl = document.getElementById('liveTime');
  if (liveTimeEl) liveTimeEl.textContent = `${dayStr} · ${timeStr}`;

  // Greeting
  const greetEl = document.getElementById('timeGreeting');
  if (greetEl) {
    if (hours < 12)      greetEl.textContent = 'Good morning,';
    else if (hours < 17) greetEl.textContent = 'Good afternoon,';
    else if (hours < 21) greetEl.textContent = 'Good evening,';
    else                 greetEl.textContent = 'Burning midnight oil,';
  }

  // Update countdown
  updateCountdown(now);
}

updateTime();
setInterval(updateTime, 1000);


/* ─── COUNTDOWN TO NEXT CLASS ─── */
function updateCountdown(now) {
  const el = document.getElementById('countdown');
  if (!el) return;

  // Next class fixed at 2:00 PM today (demo)
  const target = new Date(now);
  target.setHours(14, 0, 0, 0);

  const diff = target - now; // ms

  if (diff <= 0) {
    el.textContent = 'In progress';
    el.style.background = 'rgba(10,207,131,0.15)';
    el.style.color = '#0acf83';
    el.style.borderColor = 'rgba(10,207,131,0.3)';
    return;
  }

  const totalMin = Math.floor(diff / 60000);
  const hrs  = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (hrs > 0) {
    el.textContent = `in ${hrs}h ${mins}min`;
  } else {
    el.textContent = `in ${mins} min`;
  }

  // Urgency coloring
  if (totalMin <= 10) {
    el.style.background = 'rgba(255,107,107,0.15)';
    el.style.color = '#ff6b6b';
    el.style.borderColor = 'rgba(255,107,107,0.3)';
  } else if (totalMin <= 30) {
    el.style.background = 'rgba(245,158,11,0.15)';
    el.style.color = '#f59e0b';
    el.style.borderColor = 'rgba(245,158,11,0.3)';
  }
}


/* ─── ACTION CARD PULSE ─── */
function pulse(el) {
  el.classList.remove('pulsing');
  // Trigger reflow
  void el.offsetWidth;
  el.classList.add('pulsing');
  el.addEventListener('animationend', () => el.classList.remove('pulsing'), { once: true });
}


/* ─── LIVE ACTIVITY FEED (auto-append) ─── */
const feedMessages = [
  { dot: 'green',  text: 'Room B4 just opened up — Science Hall',             time: 'just now' },
  { dot: 'yellow', text: 'Engineering Block getting busy — 70% full',          time: 'just now' },
  { dot: 'blue',   text: 'Library quieter on 2nd floor right now',             time: 'just now' },
  { dot: 'green',  text: '5 seats available in the main cafeteria study area', time: 'just now' },
  { dot: 'yellow', text: 'Parking lot near Block A filling up quickly',         time: 'just now' },
  { dot: 'blue',   text: 'ICT Lab D has 8 free terminals',                     time: 'just now' },
];

let feedIndex = 0;

function appendFeedItem() {
  const list = document.getElementById('feedList');
  if (!list) return;

  const msg = feedMessages[feedIndex % feedMessages.length];
  feedIndex++;

  // Age existing items
  list.querySelectorAll('.feed-time').forEach(el => {
    const txt = el.textContent;
    if (txt === 'just now') {
      el.textContent = '1 min ago';
    } else if (txt.startsWith('just')) {
      el.textContent = '1 min ago';
    } else {
      const match = txt.match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1]);
        el.textContent = `${n + 1} min ago`;
      }
    }
  });

  // Create new item
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.style.animation = 'none';
  item.innerHTML = `
    <div class="feed-dot ${msg.dot}"></div>
    <div class="feed-text">${msg.text}</div>
    <div class="feed-time">${msg.time}</div>
  `;

  // Fade-in
  item.style.opacity = '0';
  item.style.transition = 'opacity 0.4s ease';
  list.insertBefore(item, list.firstChild);
  requestAnimationFrame(() => { item.style.opacity = '1'; });

  // Keep max 6 items
  while (list.children.length > 6) {
    list.removeChild(list.lastChild);
  }
}

// New feed item every 18 seconds
setInterval(appendFeedItem, 18000);


/* ─── NAV LINK ACTIVE STATE ─── */
document.querySelectorAll('.nav-link:not(.logout)').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});


/* ─── SPACE ROW CLICK (Go button) ─── */
document.querySelectorAll('.space-go').forEach(btn => {
  btn.addEventListener('click', function() {
    const originalText = this.textContent;
    this.textContent = '📍 Saved';
    this.style.background = 'rgba(10,207,131,0.15)';
    this.style.color = '#0acf83';
    this.style.borderColor = 'rgba(10,207,131,0.3)';
    setTimeout(() => {
      this.textContent = originalText;
      this.style.background = '';
      this.style.color = '';
      this.style.borderColor = '';
    }, 2000);
  });
});


/* ─── SCROLL-TO-SECTION via schedule items ─── */
document.querySelectorAll('.sched-item').forEach(item => {
  item.style.cursor = 'pointer';
  item.addEventListener('click', () => {
    // Could open map in a real app
    const course = item.querySelector('.sched-course')?.textContent;
    if (course) {
      console.log(`Navigate to class: ${course}`);
    }
  });
});
