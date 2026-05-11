/* =========================
   SIDEBAR CONTROL (FIXED)
========================= */

const sidebar = document.getElementById("sidebar");
const collapseBtn = document.getElementById("collapseBtn");

collapseBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

// ----------------------
// 🎓 STUDENT DATA
// ----------------------

let myClasses = [];

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const times = ["9-11","11-13","13-15","15-17"];

// ----------------------
// ⚡ FETCH LIVE DATA
// ----------------------

async function loadTimetable() {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        
        const userObj = JSON.parse(userStr);
        const headers = { "Authorization": userObj.token || "" };
        const studentId = userObj.user?.id || "u102";

        // Update sidebar user info
        const nameEl = document.querySelector(".user-mini-name");
        const deptEl = document.querySelector(".user-mini-dept");
        const avatarEl = document.querySelector(".avatar-sm");
        if (nameEl && userObj.user) nameEl.textContent = userObj.user.name;
        if (deptEl && userObj.user) deptEl.textContent = userObj.user.department;
        if (avatarEl && userObj.user) avatarEl.textContent = userObj.user.name.charAt(0);

        // Fetch using the specific student ID
        const res = await fetch(`http://localhost:8080/api/timetable/student/${studentId}`, { headers });
        const data = await res.json();

        myClasses = data.map((item) => {
            let t = item.time;
            if (t.startsWith("09")) t = "9-11";
            else if (t.startsWith("11")) t = "11-13";
            else if (t.startsWith("13")) t = "13-15";
            else if (t.startsWith("15")) t = "15-17";

            const rawDay = item.day || "";
            const normalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();

            return {
                day: normalizedDay,
                time: t,
                course: item.course,
                title: "",
                lecturer: "",
                venue: item.venue
            };
        });

        renderTimetable();
    } catch (err) {
        console.error("Failed to load student timetable", err);
    }
}

// ----------------------
// 🎨 RENDER
// ----------------------

function renderTimetable() {
    const grid = document.getElementById("timetableGrid");
    grid.innerHTML = "";

    // headers
    grid.innerHTML += `<div class="grid-header"></div>`;
    days.forEach(d => grid.innerHTML += `<div class="grid-header">${d}</div>`);

    // rows
    times.forEach(t => {
        grid.innerHTML += `<div class="time-cell">${t}</div>`;

        days.forEach(d => {
            let classesInSlot = myClasses.filter(c => c.day === d && c.time === t);

            if (classesInSlot.length > 0) {
                let cellHtml = `<div class="grid-cell">`;
                classesInSlot.forEach(cls => {
                    cellHtml += `
                    <div class="class-block" style="margin-bottom: 5px;">
                        <strong>${cls.course}</strong><br>
                        <small>${cls.venue}</small>
                    </div>`;
                });
                cellHtml += `</div>`;
                grid.innerHTML += cellHtml;
            } else {
                grid.innerHTML += `<div class="grid-cell empty">Free</div>`;
            }
        });
    });
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
        }
    } catch (e) {
        console.error("Error parsing user data", e);
    }
}

populateUserInfo();

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

loadTimetable();