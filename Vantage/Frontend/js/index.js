// ======================
// 🧭 SIDEBAR (FIXED)
// ======================
const button = document.getElementById('toggle');
const menubar = document.querySelector('.menu-bar');

// ALWAYS start closed (every page)
window.addEventListener('DOMContentLoaded', () => {
    menubar.classList.add('close');
});

// toggle open/close manually
button.onclick = () => {
    menubar.classList.toggle('close');
};


// ======================
// 🔥 LIVE DATABASE
// ======================
let data = {
    totalStudents: 0,
    activeStudents: 0,
    buildings: [],
    activity: []
};

// ======================
// 🎨 COLOR LOGIC
// ======================
function getColor(value) {
    if (value >= 70) return "#ff4d4d"; // Red
    if (value >= 40) return "#ffaa00"; // Orange/Amber
    return "#00cc66"; // Green
}

// ======================
// 📊 RENDER STATS
// ======================
function renderStats() {
    const el1 = document.getElementById("totalBuildings");
    const el2 = document.getElementById("totalRooms");
    const el3 = document.getElementById("activeClasses");
    const el4 = document.getElementById("availableRooms");

    if (el1) el1.innerText = data.totalBuildings;
    if (el2) el2.innerText = data.totalRooms;
    if (el3) el3.innerText = data.activeClasses;
    if (el4) el4.innerText = data.availableRooms;
}

// ======================
// 🏢 RENDER BUILDINGS
// ======================
function renderBuildings() {
    const mostEl = document.getElementById("mostOccupied");
    const leastEl = document.getElementById("leastOccupied");

    if (!mostEl || !leastEl) return;

    const most = [...data.buildings]
        .sort((a, b) => b.occupancy - a.occupancy)
        .slice(0, 3);

    const least = [...data.buildings]
        .sort((a, b) => a.occupancy - b.occupancy)
        .slice(0, 3);

    const create = (arr) => arr.map(b => `
        <div class="building">
            <div class="building-header">
                <span>${b.name}</span>
                <span>${b.occupancy}%</span>
            </div>

            <div class="bar">
                <div class="fill"
                     style="width:${b.occupancy}%;
                            background:${getColor(b.occupancy)}">
                </div>
            </div>
        </div>
    `).join("");

    mostEl.innerHTML = create(most);
    leastEl.innerHTML = create(least);
}

// ======================
// 📡 ACTIVITY FEED
// ======================
function renderActivity() {
    const container = document.getElementById("activityFeed");
    if (!container) return;

    const logs = data.activity.slice(-6).reverse();
    container.innerHTML = logs.map(a => `<p>${a.type ? a.type.replace('_', ' ') : 'Alert'} in ${a.building}</p>`).join("");
}

// ======================
// 📈 CHART
// ======================
const ctx = document.getElementById("occupancyChart");

const chart = new Chart(ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Average Occupancy %",
            data: [],
            borderColor: "#668299",
            backgroundColor: "rgba(102,130,153,0.2)",
            tension: 0.4,
            fill: true
        }]
    },
    options: {
        scales: {
            x: { ticks: { color: "#fff" } },
            y: { ticks: { color: "#fff" } }
        },
        plugins: {
            legend: { labels: { color: "#fff" } }
        }
    }
});

// ======================
// ⚡ FETCH LIVE DATA
// ======================
async function fetchData() {
    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
        }

        const dashboardRes = await fetch("http://localhost:8080/api/dashboard/admin", { headers });
        const dashboardData = await dashboardRes.json();
        
        data.totalBuildings = dashboardData.totalBuildings || 0;
        data.totalRooms = dashboardData.totalRooms || 0;
        data.activeClasses = dashboardData.activeClasses || 0;
        data.availableRooms = dashboardData.availableRooms || 0;
        data.activity = dashboardData.alerts || [];

        const buildingsRes = await fetch("http://localhost:8080/api/buildings/admin", { headers });
        const buildingsData = await buildingsRes.json();
        
        data.buildings = buildingsData.map(b => ({
            name: b.name,
            occupancy: b.capacity > 0 ? Math.floor((b.currentOccupancy / b.capacity) * 100) : 0
        }));

        // chart update
        const time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        
        let avgOcc = 0;
        if (data.buildings.length > 0) {
            avgOcc = data.buildings.reduce((sum, b) => sum + b.occupancy, 0) / data.buildings.length;
        }
        chart.data.datasets[0].data.push(Math.floor(avgOcc));

        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update();

        // re-render UI
        renderStats();
        renderBuildings();
        renderActivity();
    } catch (err) {
        console.error("Error fetching live data", err);
    }
}

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

// ======================
// 🚀 INIT
// ======================
fetchData();
setInterval(fetchData, 3000);