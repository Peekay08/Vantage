// SIDEBAR
const button = document.getElementById('toggle');
const menubar = document.querySelector('.menu-bar');
button.onclick = () => menubar.classList.toggle('close');

// ----------------------
// 🧠 DATABASE SIMULATION
// ----------------------

let timetable = [];

async function loadTimetable() {
    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
        }
        
        const res = await fetch("http://localhost:8080/api/timetable/admin", { headers });
        const data = await res.json();
        
        timetable = data.map((item, index) => {
            let t = item.time;
            if (t.startsWith("09")) t = "9-11";
            else if (t.startsWith("11")) t = "11-13";
            else if (t.startsWith("13")) t = "13-15";
            else if (t.startsWith("15")) t = "15-17";

            // Normalize day capitalization (DB might store "monday" vs "Monday")
            const rawDay = item.day || "";
            const normalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();

            return {
                id: index + 1,
                day: normalizedDay,
                time: t,
                course: item.course,
                title: "",
                lecturer: "",
                venue: item.venue,
                color: item.course.split(" ")[0].toLowerCase() || "cos"
            };
        });
        
        renderTimetable();
    } catch (e) {
        console.error("Failed to load timetable", e);
    }
}

// Buildings → venues
const buildings = {
    Engineering: ["E026","E020","E101"],
    Science: ["S001","S002"],
    Admin: ["A001","A002"]
};

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const times = ["9-11","11-13","13-15","15-17"];

let editingId = null;

// ----------------------
// 🎯 POPULATE VENUES
// ----------------------

function loadVenues() {
    const venueSelect = document.getElementById("venue");
    venueSelect.innerHTML = "";

    Object.keys(buildings).forEach(building => {
        let group = document.createElement("optgroup");
        group.label = building;

        buildings[building].forEach(room => {
            let opt = document.createElement("option");
            opt.value = room;
            opt.textContent = room;
            group.appendChild(opt);
        });

        venueSelect.appendChild(group);
    });
}

// ----------------------
// 🎨 RENDER
// ----------------------

function renderTimetable() {
    const grid = document.getElementById("timetableGrid");
    grid.innerHTML = "";

    grid.innerHTML += `<div class="grid-header"></div>`;
    days.forEach(d => grid.innerHTML += `<div class="grid-header">${d}</div>`);

    times.forEach(t => {
        grid.innerHTML += `<div class="time-cell">${t}</div>`;

        days.forEach(d => {

            let classesInSlot = timetable.filter(x => x.day === d && x.time === t);
            
            if (classesInSlot.length > 0) {
                let cellHtml = `<div class="grid-cell">`;
                classesInSlot.forEach(cls => {
                    cellHtml += `
                    <div class="class-block ${cls.color}"
                        draggable="true"
                        onclick="openEdit(${cls.id})"
                        ondragstart="drag(event, ${cls.id})"
                        style="margin-bottom: 5px;">
                        <strong>${cls.course}</strong><br>
                        <small>${cls.venue}</small>
                    </div>`;
                });
                cellHtml += `</div>`;
                grid.innerHTML += cellHtml;
            } else {
                grid.innerHTML += `
                <div class="grid-cell empty"
                    ondragover="allowDrop(event)"
                    ondrop="drop(event,'${d}','${t}')">
                    Free
                </div>`;
            }
        });
    });
}

// ----------------------
// 🧲 DRAG + CONFLICT
// ----------------------

let dragged = null;

function drag(e, id) {
    dragged = timetable.find(c => c.id === id);
}

function allowDrop(e) { e.preventDefault(); }

function drop(e, newDay, newTime) {
    e.preventDefault();

    if (!dragged) return;

    let conflict = timetable.find(c =>
        c.day === newDay &&
        c.time === newTime &&
        (
            c.venue === dragged.venue ||
            c.lecturer === dragged.lecturer
        )
    );

    if (conflict) {
        alert("⚠️ Clash detected (Room or Lecturer busy)");
        return;
    }

    dragged.day = newDay;
    dragged.time = newTime;

    renderTimetable();
}

// ----------------------
// 🧾 MODAL LOGIC
// ----------------------

const modal = document.getElementById("classModal");

document.getElementById("addClassBtn").onclick = () => {
    editingId = null;
    document.getElementById("modalTitle").textContent = "Add Class";
    document.getElementById("deleteBtn").classList.add("hidden");
    modal.classList.remove("hidden");
};

function openEdit(id) {
    let cls = timetable.find(c => c.id === id);
    editingId = id;

    document.getElementById("modalTitle").textContent = "Edit Class";

    courseCode.value = cls.course;
    courseTitle.value = cls.title;
    lecturer.value = cls.lecturer;
    venue.value = cls.venue;
    day.value = cls.day;
    time.value = cls.time;

    document.getElementById("deleteBtn").classList.remove("hidden");
    modal.classList.remove("hidden");
}

function closeModal() {
    modal.classList.add("hidden");
}

// ----------------------
// 💾 SAVE
// ----------------------

document.getElementById("saveBtn").onclick = () => {

    let data = {
        course: courseCode.value,
        title: courseTitle.value,
        lecturer: lecturer.value,
        venue: venue.value,
        day: day.value,
        time: time.value
    };

    // conflict check
    let conflict = timetable.find(c =>
        c.day === data.day &&
        c.time === data.time &&
        c.id !== editingId &&
        (
            c.venue === data.venue ||
            c.lecturer === data.lecturer
        )
    );

    if (conflict) {
        alert("⚠️ Clash detected!");
        return;
    }

    if (editingId) {
        let cls = timetable.find(c => c.id === editingId);
        Object.assign(cls, data);
    } else {
        timetable.push({
            id: Date.now(),
            ...data,
            color: data.course.split(" ")[0].toLowerCase()
        });
    }

    closeModal();
    renderTimetable();
};

// ----------------------
// 🗑️ DELETE
// ----------------------

document.getElementById("deleteBtn").onclick = () => {
    timetable = timetable.filter(c => c.id !== editingId);
    closeModal();
    renderTimetable();
};

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

// ----------------------
// 🚀 INIT
// ----------------------

loadVenues();
loadTimetable();