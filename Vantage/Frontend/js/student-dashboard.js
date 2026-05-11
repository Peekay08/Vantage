/* =========================
   SIDEBAR CONTROL (FIXED)
========================= */

const sidebar = document.getElementById("sidebar");
const collapseBtn = document.getElementById("collapseBtn");

collapseBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});


/* =========================
   TIME + GREETING
========================= */

function updateTime() {
    const now = new Date();

    const hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, "0");
    
    // 12-hour format with AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12) || 12;

    // Greeting logic
    const greeting =
        hours < 12 ? "Good morning" :
        hours < 17 ? "Good afternoon" :
        "Good evening";

    // Date formatting (e.g., Monday, May 11)
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);

    const greetEl = document.getElementById("timeGreeting");
    const timeEl = document.getElementById("liveTime");

    if (greetEl) greetEl.textContent = greeting;
    if (timeEl) timeEl.textContent = `${dateStr} • ${displayHours}:${mins} ${ampm}`;
}

setInterval(updateTime, 1000);
updateTime();


/* =========================
   QUICK ACTION ANIMATION
   (FIXED TO MATCH YOUR CSS)
========================= */

function pulse(el) {
    el.classList.remove("pulsing");
    void el.offsetWidth; // restart animation
    el.classList.add("pulsing");

    setTimeout(() => {
        el.classList.remove("pulsing");
    }, 300);
}


/* =========================
   ACTIVE NAV LINK HANDLING
========================= */

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link")
            .forEach(a => a.classList.remove("active"));

        link.classList.add("active");
    });
});


/* =========================
   LOGOUT MODAL
========================= */

const logoutBtn = document.getElementById("logout-btn");
const logoutOverlay = document.getElementById("logout-overlay");
const cancelLogout = document.getElementById("cancel-logout");
const confirmLogout = document.getElementById("confirm-logout");

logoutBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    logoutOverlay.classList.remove("hidden");
});

cancelLogout.addEventListener("click", ()=>{
    logoutOverlay.classList.add("hidden");
});

logoutOverlay.addEventListener("click", (e)=>{
    if(e.target === logoutOverlay){
        logoutOverlay.classList.add("hidden");
    }
});

confirmLogout.addEventListener("click", async ()=>{
    try {
        await fetch("http://localhost:8080/api/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("user");
    window.location.href = "../pages/login.html";
});


/* =========================
   QUICK ACTION MODAL
========================= */

const qaOverlay = document.getElementById("qa-overlay");
const qaModalTitle = document.getElementById("qa-modal-title");
const qaModalBody = document.getElementById("qa-modal-body");
const qaCloseBtn = document.getElementById("qa-close-btn");

function showQAModal(title, bodyHTML) {
    qaModalTitle.textContent = title;
    qaModalBody.innerHTML = bodyHTML;
    qaOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function hideQAModal() {
    qaOverlay.classList.add("hidden");
    document.body.style.overflow = ""; // Restore background scrolling
}

qaCloseBtn?.addEventListener("click", hideQAModal);
qaOverlay?.addEventListener("click", (e) => {
    if (e.target === qaOverlay) hideQAModal();
});

// ESC key to close
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        hideQAModal();
        logoutOverlay.classList.add("hidden");
    }
});


/* =========================
   CACHED BUILDING DATA
========================= */

let cachedBuildings = [];

async function fetchBuildingsData() {
    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
        }

        const res = await fetch("http://localhost:8080/api/buildings/student", { headers });
        cachedBuildings = await res.json();
        return cachedBuildings;
    } catch (err) {
        console.error("Failed to fetch buildings", err);
        return [];
    }
}


/* =========================
   QUICK ACTION: FIND FREE ROOM
========================= */

async function showFreeRooms() {
    const buildings = cachedBuildings.length > 0 ? cachedBuildings : await fetchBuildingsData();

    // Only show buildings that actually have free rooms
    const filtered = buildings.filter(b => b.freeClasses > 0);

    if (filtered.length === 0) {
        showQAModal("🟢 Find Free Room", `
            <div class="qa-empty-state">
                <div class="qa-empty-icon">😅</div>
                <p>All buildings are pretty full right now. Try again later!</p>
            </div>
        `);
        return;
    }

    const items = filtered.map(b => {
        const pct = b.capacity > 0 ? Math.round((b.currentOccupancy / b.capacity) * 100) : 0;
        // Uniform thresholds: Red > 70, Amber 40-70, Green < 40
        const badgeClass = pct >= 70 ? "red" : pct >= 40 ? "amber" : "green";
        const icon = pct >= 70 ? "🟠" : pct >= 40 ? "🟡" : "🟢";
        return `
            <div class="qa-result-item" onclick="showBuildingFreeRooms('${b.name.replace(/'/g, "\\'")}')" style="cursor: pointer;">
                <div class="qa-result-icon">${icon}</div>
                <div class="qa-result-info">
                    <div class="qa-result-name">${b.name}</div>
                    <div class="qa-result-detail">${b.freeClasses} free rooms available</div>
                </div>
                <div class="qa-result-badge ${badgeClass}">${pct}% full</div>
            </div>
        `;
    }).join("");

    showQAModal("🟢 Find Free Room", `
        <p style="font-size: 12px; color: var(--dark-accent-clr); margin-bottom: 16px; padding-left: 4px;">Select a building to see available rooms:</p>
        ${items}
    `);
}

function showBuildingFreeRooms(buildingName) {
    const building = cachedBuildings.find(b => b.name === buildingName);
    if (!building) return;

    // Filter rooms where status is FREE
    const freeRooms = (building.rooms || []).filter(r => r.status === "FREE");

    let content = `
        <button class="qa-back-btn" onclick="showFreeRooms()">
            ← Back to buildings
        </button>
        <div class="qa-building-header" style="margin-bottom: 20px; padding-left: 4px;">
            <h3 style="font-family: 'Sora', sans-serif; font-size: 15px; color: var(--base-clr); margin-bottom: 4px;">${buildingName}</h3>
            <p style="font-size: 12px; color: var(--dark-accent-clr);">${freeRooms.length} free rooms found</p>
        </div>
    `;

    if (freeRooms.length === 0) {
        content += `
            <div class="qa-empty-state">
                <div class="qa-empty-icon">😕</div>
                <p>No free rooms available in this building right now.</p>
            </div>
        `;
    } else {
        content += `
            <div class="qa-room-grid">
                ${freeRooms.map(r => `
                    <div class="qa-room-pill">
                        Room ${r.id}
                    </div>
                `).join("")}
            </div>
        `;
    }

    showQAModal("🟢 Available Rooms", content);
}


/* =========================
   QUICK ACTION: NAVIGATE TO NEXT CLASS
========================= */

let cachedNextClass = null;

async function showNextClassNav() {
    if (cachedNextClass) {
        renderNextClassModal(cachedNextClass);
        return;
    }

    showQAModal("🧭 Navigate to Next Class", `
        <div class="qa-empty-state">
            <div class="qa-empty-icon">⏳</div>
            <p>Loading next class info...</p>
        </div>
    `);

    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
        }

        const res = await fetch("http://localhost:8080/api/dashboard/student", { headers });
        const data = await res.json();

        if (data.nextClass) {
            cachedNextClass = data.nextClass;
            renderNextClassModal(data.nextClass);
        } else {
            showQAModal("🧭 Navigate to Next Class", `
                <div class="qa-empty-state">
                    <div class="qa-empty-icon">🎉</div>
                    <p>No more classes today! You're free.</p>
                </div>
            `);
        }
    } catch (err) {
        showQAModal("🧭 Navigate to Next Class", `
            <div class="qa-empty-state">
                <div class="qa-empty-icon">⚠️</div>
                <p>Could not load class info. Is the backend running?</p>
            </div>
        `);
    }
}

function renderNextClassModal(nc) {
    showQAModal("🧭 Navigate to Next Class", `
        <div class="qa-nav-card">
            <div class="qa-nav-icon">📍</div>
            <div class="qa-nav-title">${nc.course}</div>
            <div class="qa-nav-meta">⏰ ${nc.time}</div>
            <div class="qa-nav-meta">📍 ${nc.venue}</div>
            <button class="qa-nav-btn" onclick="window.location.href='../student-map/map.html'">
                Open Campus Map →
            </button>
        </div>
    `);
}


/* =========================
   QUICK ACTION: LEAST CROWDED
========================= */

async function showLeastCrowded() {
    const buildings = cachedBuildings.length > 0 ? cachedBuildings : await fetchBuildingsData();

    const sorted = [...buildings]
        .map(b => ({
            ...b,
            pct: b.capacity > 0 ? Math.round((b.currentOccupancy / b.capacity) * 100) : 0,
            freeSeats: b.freeClasses || 0
        }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3); // Top 3 only

    if (sorted.length === 0) {
        showQAModal("🪑 Least Crowded Buildings", `
            <div class="qa-empty-state">
                <div class="qa-empty-icon">🏗️</div>
                <p>No building data available right now.</p>
            </div>
        `);
        return;
    }

    const items = sorted.map((b, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏢";
        // Uniform thresholds: Red > 70, Amber 40-70, Green < 40
        const badgeClass = b.pct >= 70 ? "red" : b.pct >= 40 ? "amber" : "green";
        return `
            <div class="qa-result-item">
                <div class="qa-result-icon">${medal}</div>
                <div class="qa-result-info">
                    <div class="qa-result-name">${b.name}</div>
                    <div class="qa-result-detail">${b.freeSeats} free rooms · Capacity ${b.capacity}</div>
                </div>
                <div class="qa-result-badge ${badgeClass}">${b.pct}%</div>
            </div>
        `;
    }).join("");

    showQAModal("🪑 Least Crowded Buildings", items);
}


/* =========================
   LIVE CAMPUS STATUS
========================= */

async function updateCampusStatus() {
    const buildings = cachedBuildings.length > 0 ? cachedBuildings : await fetchBuildingsData();

    if (!buildings || buildings.length === 0) return;

    let totalOccupancy = 0;
    let totalCapacity = 0;
    let freeCount = 0;

    buildings.forEach(b => {
        const occ = b.currentOccupancy || 0;
        const cap = b.capacity || 0;
        totalOccupancy += occ;
        totalCapacity += cap;

        const pct = cap > 0 ? (occ / cap) * 100 : 0;
        if (pct < 20) freeCount++;
    });

    const overallPct = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
    const availableSeats = Math.max(0, totalCapacity - totalOccupancy);

    // Campus Traffic
    const trafficEl = document.getElementById("campus-traffic");
    const trafficIndicator = document.getElementById("traffic-indicator");
    if (trafficEl) {
        if (overallPct >= 70) {
            trafficEl.textContent = "High";
            trafficIndicator.className = "status-indicator red";
            trafficIndicator.style.background = "#ef4444";
            trafficIndicator.style.boxShadow = "0 0 8px rgba(239,68,68,0.5)";
        } else if (overallPct >= 40) {
            trafficEl.textContent = "Moderate";
            trafficIndicator.className = "status-indicator amber";
            trafficIndicator.style.background = "#f59e0b";
            trafficIndicator.style.boxShadow = "0 0 8px rgba(245,158,11,0.5)";
        } else {
            trafficEl.textContent = "Low";
            trafficIndicator.className = "status-indicator green";
            trafficIndicator.style.background = "#22c55e";
            trafficIndicator.style.boxShadow = "0 0 8px rgba(34,197,94,0.5)";
        }
    }

    // Free Buildings
    const freeBldgEl = document.getElementById("free-buildings");
    if (freeBldgEl) freeBldgEl.textContent = freeCount;

    // Available Seats
    const seatsEl = document.getElementById("available-seats");
    if (seatsEl) {
        seatsEl.textContent = availableSeats > 999 ? Math.floor(availableSeats / 100) * 100 + "+" : availableSeats;
    }
}


/* =========================
   BEST PLACES RIGHT NOW
========================= */

const buildingIcons = ["🏛️", "📚", "🔬", "💻", "🏢", "🎓", "⚙️", "🧪", "🏫", "📐"];

async function updateBestPlaces() {
    const buildings = cachedBuildings.length > 0 ? cachedBuildings : await fetchBuildingsData();
    const container = document.getElementById("best-places-list");
    if (!container || !buildings || buildings.length === 0) return;

    const sorted = [...buildings]
        .map(b => ({
            ...b,
            pct: b.capacity > 0 ? Math.round((b.currentOccupancy / b.capacity) * 100) : 0
        }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 5); // Top 5 least occupied

    container.innerHTML = sorted.map((b, i) => {
        const icon = buildingIcons[i % buildingIcons.length];
        const pctColor = b.pct >= 70 ? "#ef4444" : b.pct >= 40 ? "#f59e0b" : "#22c55e";
        return `
            <div class="space-row">
                <div class="space-name">
                    <span class="space-icon">${icon}</span>
                    <span>${b.name}</span>
                </div>
                <div class="space-bar-wrap">
                    <div class="space-bar" style="--fill: ${b.pct}%; --color: ${pctColor};"></div>
                </div>
                <div class="space-pct" style="color:${pctColor}">${b.pct}% full</div>
                <button class="space-go" onclick="window.location.href='../student-map/map.html'">Go →</button>
            </div>
        `;
    }).join("");
}


/* =========================
   FETCH LIVE DATA
========================= */

async function fetchStudentDashboard() {
    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
            
            // Populate sidebar user
            const nameEl = document.querySelector(".user-mini-name");
            const deptEl = document.querySelector(".user-mini-dept");
            const avatarEl = document.querySelector(".avatar-sm");
            if (nameEl && userObj.user) nameEl.textContent = userObj.user.name;
            if (deptEl && userObj.user) deptEl.textContent = userObj.user.department;
            if (avatarEl && userObj.user) avatarEl.textContent = userObj.user.name.charAt(0);
        }

        const res = await fetch("http://localhost:8080/api/dashboard/student", { headers });
        const data = await res.json();

        if (data.student) {
            document.querySelector(".greeting-name").innerHTML = `${data.student.name} <span class="wave">👋</span>`;
        }

        if (data.nextClass) {
            const nc = data.nextClass;
            cachedNextClass = nc;
            document.querySelector(".next-class-title").textContent = nc.course;
            document.querySelector(".next-class-time").textContent = `⏰ ${nc.time}`;
            document.querySelector(".next-class-loc").textContent = `📍 ${nc.venue}`;
        } else {
            document.querySelector(".next-class-title").textContent = "No more classes today";
            document.querySelector(".next-class-time").textContent = "";
            document.querySelector(".next-class-loc").textContent = "";
            document.getElementById("countdown").textContent = "";
        }

        if (data.todayClasses) {
            const scheduleList = document.querySelector(".schedule-list");
            if (scheduleList) {
                scheduleList.innerHTML = data.todayClasses.map((c, i) => `
                  <div class="sched-item ${i===0 ? 'now' : 'upcoming'}">
                    <div class="sched-time">${c.time}</div>
                    <div class="sched-line"><div class="sched-dot ${i===0 ? 'pulse-dot' : ''}"></div></div>
                    <div class="sched-info">
                      <div class="sched-course">${c.course}</div>
                      <div class="sched-room">📍 ${c.venue}</div>
                    </div>
                    <div class="sched-status ${i===0 ? 'now-tag' : 'upcoming-tag'}">${i===0 ? 'Now' : 'Soon'}</div>
                  </div>
                `).join("");
            }
        }
    } catch (err) {
        console.error("Failed to fetch dashboard", err);
    }
}


/* =========================
   POPULATE USER INFO
 ========================= */

function populateUserInfo() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    try {
        const userObj = JSON.parse(userStr);
        if (userObj.user) {
            const u = userObj.user;
            
            // Sidebar
            const nameEl = document.querySelector(".user-mini-name");
            const deptEl = document.querySelector(".user-mini-dept");
            const avatarEl = document.querySelector(".avatar-sm");
            if (nameEl) nameEl.textContent = u.name;
            if (deptEl) deptEl.textContent = u.department || "Student";
            if (avatarEl) avatarEl.textContent = u.name.charAt(0).toUpperCase();

            // Greeting
            const greetNameEl = document.querySelector(".greeting-name");
            if (greetNameEl) greetNameEl.innerHTML = `${u.name} <span class="wave">👋</span>`;
        }
    } catch (e) {
        console.error("Error parsing user data", e);
    }
}


/* =========================
   INIT + POLLING
========================= */

async function init() {
    // Populate UI from local storage immediately
    populateUserInfo();

    // Fetch everything on load
    await Promise.all([
        fetchStudentDashboard(),
        fetchBuildingsData()
    ]);

    // Update live sections with fetched data
    updateCampusStatus();
    updateBestPlaces();

    // Poll building data every 10 seconds to keep live sections updated
    setInterval(async () => {
        await fetchBuildingsData();
        updateCampusStatus();
        updateBestPlaces();
    }, 10000);
}

init();