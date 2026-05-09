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

    const greeting =
        hours < 12 ? "Good morning" :
        hours < 18 ? "Good afternoon" :
        "Good evening";

    const greetEl = document.getElementById("timeGreeting");
    const timeEl = document.getElementById("liveTime");

    if (greetEl) greetEl.textContent = greeting;
    if (timeEl) timeEl.textContent = `${hours}:${mins}`;
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
   OPTIONAL: LIVE FEED SIM (FLAVOR)
========================= */

const feedList = document.getElementById("feedList");

function addFeed(text, color = "blue") {
    if (!feedList) return;

    const item = document.createElement("div");
    item.className = "feed-item";

    item.innerHTML = `
        <div class="feed-dot ${color}"></div>
        <div class="feed-text">${text}</div>
        <div class="feed-time">just now</div>
    `;

    feedList.prepend(item);
}

/* Example simulated update */
setTimeout(() => {
    addFeed("New seat opened in Library study zone", "green");
}, 6000);

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