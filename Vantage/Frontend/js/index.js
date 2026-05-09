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
// 🔥 SIMULATED DATABASE
// ======================
let data = {
    totalBuildings: 7,
    totalRooms: 1120,
    activeClasses: 140,
    availableRooms: 650,
    buildings: [
        { name: "Engineering", occupancy: 82 },
        { name: "Science Hall", occupancy: 78 },
        { name: "Library", occupancy: 45 },
        { name: "Business Center", occupancy: 33 },
        { name: "Gym", occupancy: 12 },
        { name: "Art Center", occupancy: 18 },
        { name: "Auditorium", occupancy: 20 }
    ],
    activity: []
};


// ======================
// 🎨 COLOR LOGIC
// ======================
function getColor(value) {
    if (value > 70) return "#ff4d4d";
    if (value > 40) return "#ffaa00";
    return "#00cc66";
}


// ======================
// 📊 RENDER STATS
// ======================
function renderStats() {
    const el1 = document.getElementById("totalBuildings");
    const el2 = document.getElementById("totalRooms");
    const el3 = document.getElementById("activeClasses");
    const el4 = document.getElementById("availableRooms");

    if (!el1 || !el2 || !el3 || !el4) return;

    el1.innerText = data.totalBuildings;
    el2.innerText = data.totalRooms;
    el3.innerText = data.activeClasses;
    el4.innerText = data.availableRooms;
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
    container.innerHTML = logs.map(a => `<p>${a}</p>`).join("");
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
            label: "Occupancy %",
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
// ⚡ SIMULATION ENGINE
// ======================
function simulate() {

    // update buildings randomly
    data.buildings.forEach(b => {
        let change = Math.floor(Math.random() * 10 - 5);
        b.occupancy = Math.max(5, Math.min(100, b.occupancy + change));
    });

    // update stats
    data.availableRooms = Math.floor(Math.random() * 800);

    // activity log
    const messages = [
        "students entered",
        "students left",
        "room became available",
        "lecture started"
    ];

    const randomBuilding =
        data.buildings[Math.floor(Math.random() * data.buildings.length)];

    data.activity.push(
        `${Math.floor(Math.random() * 50)} ${messages[Math.floor(Math.random() * messages.length)]} ${randomBuilding.name}`
    );

    // chart update
    const time = new Date().toLocaleTimeString();

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(randomBuilding.occupancy);

    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();

    // re-render UI
    renderStats();
    renderBuildings();
    renderActivity();
}

/* =========================
   LOGOUT MODAL
========================= */

const logoutBtn = document.getElementById("logout-btn");

const logoutOverlay =
document.getElementById("logout-overlay");

const cancelLogout =
document.getElementById("cancel-logout");

const confirmLogout =
document.getElementById("confirm-logout");

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

confirmLogout.addEventListener("click", ()=>{

    // redirect to login page
    window.location.href = "../pages/login.html";

});

// ======================
// 🚀 INIT
// ======================
renderStats();
renderBuildings();
renderActivity();

setInterval(simulate, 3000);