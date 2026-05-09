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

// In future: fetch from backend
let myClasses = [
  { day:"Monday", time:"9-11", course:"COS 202", title:"Programming II", lecturer:"Hauwa", venue:"E026" },
  { day:"Tuesday", time:"11-13", course:"MTH 201", title:"Discrete Math", lecturer:"Dr. Musa", venue:"S001" }
];

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const times = ["9-11","11-13","13-15","15-17"];

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

      let cls = myClasses.find(c => c.day === d && c.time === t);

      if (cls) {
        grid.innerHTML += `
        <div class="grid-cell">
          <div class="class-block">
            <strong>${cls.course}</strong><br>
            ${cls.title}<br>
            <small>${cls.venue} • ${cls.lecturer}</small>
          </div>
        </div>`;
      } else {
        grid.innerHTML += `
        <div class="grid-cell empty">
          Free
        </div>`;
      }

    });
  });
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

renderTimetable();