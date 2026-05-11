let buildingData = {};
/* =========================
   POPUP CONTROL
========================= */

const overlay = document.getElementById('overlay');
const popup = document.getElementById('pop-up');
const closeBtn = document.getElementById('close-popup');
const body = document.body;

function showPopup() {
    popup.classList.remove('hidden');
    overlay.classList.remove('hidden');
    body.classList.add('no-scroll');
}

function hidePopup() {
    popup.classList.add('hidden');
    overlay.classList.add('hidden');
    body.classList.remove('no-scroll');
}

// close events
closeBtn?.addEventListener('click', hidePopup);
overlay?.addEventListener('click', hidePopup);

// Initialize the map centered roughly on Nile University

async function fetchBuildingData() {
    try {
        const userStr = localStorage.getItem("user");
        const headers = {};
        if (userStr) {
            const userObj = JSON.parse(userStr);
            headers["Authorization"] = userObj.token || "";
        }
        
        const res = await fetch("http://localhost:8080/api/buildings/admin", { headers });
        const data = await res.json();
        
        data.forEach(b => {
            buildingData[b.name] = {
                occupancy: b.currentOccupancy,
                capacity: b.capacity,
                status: b.status,
                recentEntries: b.recentEntries || [],
                recentExits: b.recentExits || [],
                classes: b.classes || [],
                rooms: b.rooms || [],
                activeClasses: b.activeClasses || 0,
                freeClasses: b.freeClasses || 0
            };
        });
        
        if (geojson) {
            geojson.eachLayer(layer => {
                layer.setStyle(buildingStyle(layer.feature));
            });
        }
    } catch (err) {
        console.error("Error fetching building data", err);
    }
}

var map = L.map('map').setView([9.0145, 7.3968], 17);

// Add OpenStreetMap tiles

var normalMap = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
);

var satelliteMap = L.tileLayer(
 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
 {
  maxZoom: 20,
  subdomains:['mt0','mt1','mt2','mt3']
 }
);

normalMap.addTo(map);

L.control.layers({
 "Normal Map": normalMap,
 "Satellite": satelliteMap
}).addTo(map);

// Style for buildings

function buildingStyle(feature){

 const name = feature.properties.name;
 const data = buildingData[name];

 // default state
 let borderColor = "#2f4156";
 let glow = "rgba(47, 65, 86, 0.2)";
 let weight = 1.5;

 if(data){
  const pct = data.capacity > 0 ? (data.occupancy / data.capacity) * 100 : 0;

  if(pct >= 70){
   borderColor = "#bf4059"; // 🔴 high
   glow = "rgba(231, 76, 60, 0.35)";
   weight = 2.5;
  }
  else if(pct >= 40){
   borderColor = "#bf8040"; // 🟠 medium
   glow = "rgba(243, 156, 18, 0.35)";
   weight = 2;
  }
  else{
   borderColor = "#206052"; // 🟢 low
   glow = "rgba(46, 204, 113, 0.3)";
   weight = 2;
  }
 }

 return {
  color: borderColor,
  weight: weight,
  fillColor: "#dce8f1",
  fillOpacity: 0.55,

  // custom property we’ll use later
  className: `building-${feature.properties["@id"]}`
 };
}

function highlightFeature(e){

 var layer = e.target;

 const color = layer.options.color;

 layer.setStyle({
  weight: 3,
  color: color,
  opacity: 1
 });

 layer._path.style.filter = `
  drop-shadow(0 0 6px ${color})
  drop-shadow(0 0 10px ${color})
 `;
}
// Reset building style when mouse leaves

function resetHighlight(e){
 geojson.resetStyle(e.target);

 e.target._path.style.filter = "none";
}


// Click event for buildings

function buildingClick(e){

 const props = e.target.feature.properties;
 const name = props.name;
 const data = buildingData[name];

 if(!data) return;

 // TITLE
 document.getElementById("popup-title").innerText = name || "Unknown Building";

  // NUMBERS
  document.getElementById("people-count").innerText = data.occupancy;
  document.getElementById("free-count").innerText = data.freeClasses;
  document.getElementById("used-count").innerText = data.activeClasses;

  // ROOMS / CLASSES (Renamed section for clarity in popup)
  const classList = document.getElementById("class-list");
  if (classList) {
     classList.innerHTML = "";
     if (data.rooms && data.rooms.length > 0) {
         data.rooms.forEach(room => {
             const statusClass = room.status === "FREE" ? "free" : "in-use";
             classList.innerHTML += `
             <li class="class-item">
                 <span class="class-room">Room ${room.id}</span>
                 <span class="class-code ${statusClass}">${room.status}</span>
                 <span class="class-time">${room.course || "No Class"}</span>
             </li>
             `;
         });
     } else {
         classList.innerHTML = "<li class='class-item'>No rooms registered</li>";
     }
  }

 // ENTRIES
 const entryList = document.getElementById("entry-list");
 if (entryList) {
    entryList.innerHTML = "";
    if (data.recentEntries && data.recentEntries.length > 0) {
        data.recentEntries.forEach(entry=>{
             entryList.innerHTML += `
             <li class="entry-item">
                 <span class="person-name">${entry.student}</span>
                 <span class="person-id">${entry.studentId}</span>
                 <span class="time">${new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </li>
             `;
         });
     } else {
         entryList.innerHTML = "<li class='entry-item'>No recent entries</li>";
     }
  }

  // EXITS
  const exitList = document.getElementById("exit-list");
  if (exitList) {
     exitList.innerHTML = "";
     if (data.recentExits && data.recentExits.length > 0) {
         data.recentExits.forEach(exit => {
             exitList.innerHTML += `
             <li class="exit-item">
                 <span class="person-name">${exit.student}</span>
                 <span class="person-id">${exit.studentId}</span>
                 <span class="time">${new Date(exit.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </li>
             `;
         });
     } else {
         exitList.innerHTML = "<li class='exit-item'>No recent exits</li>";
     }
  }

 // SHOW POPUP
 showPopup();
}


// Attach interactions to each building

function onEachBuilding(feature, layer){

 const props = feature.properties;
 const name = props.name;
 const data = buildingData[name] || { occupancy: 0, capacity: 100 };

 const shortName = name
   ? name.split(",")[0]
   : "Unknown Building";

 function getCompactLabel(){
   return `
     <div class="building-label compact">
       <strong>${shortName}</strong>
     </div>
   `;
 }

 function getExpandedLabel(){
   const latestData = buildingData[name] || data;
   const pct = latestData.capacity > 0 ? (latestData.occupancy / latestData.capacity) * 100 : 0;
   return `
     <div class="building-label expanded">
       <strong>${shortName}</strong>
       <div class="stats">
         <p>👥 ${latestData.occupancy} people</p>
         <p>⚡ ${pct > 70 ? "High Activity" : "Normal Activity"}</p>
       </div>
     </div>
   `;
 }

 // initial compact label
 layer.bindTooltip(getCompactLabel(), {
   permanent: true,
   direction: "top",
   className: "custom-tooltip"
 });

 layer.on({
   mouseover: function(e){
     highlightFeature(e);

     layer.setTooltipContent(getExpandedLabel());

     const tooltipEl = layer.getTooltip().getElement();
     if(tooltipEl){
       tooltipEl.classList.add("expanded-anim");
     }
   },

   mouseout: function(e){
     resetHighlight(e);
     layer.setTooltipContent(getCompactLabel());
   },

   click: function(e){
     L.DomEvent.stopPropagation(e);
     buildingClick(e);
   }
 });

}


// Variable to store GeoJSON layer

var geojson;


// Load GeoJSON building data
fetchBuildingData().then(() => {
    fetch("nile_buildings.geojson")
    .then(res => res.json())
    .then(data => {

     geojson = L.geoJSON(data,{
      style: buildingStyle,
      onEachFeature: onEachBuilding
     }).addTo(map);

     map.fitBounds(geojson.getBounds());
     
     // Poll for updates every 5 seconds
     setInterval(fetchBuildingData, 5000);

    })
    .catch(err => {
     console.error("Error loading GeoJSON:", err);
    });
});

/* =========================
   SIDEBAR TOGGLE
========================= */
const sidebarToggle = document.getElementById('toggle');
const menubar = document.querySelector('.menu-bar');

if (sidebarToggle && menubar) {
    sidebarToggle.onclick = () => menubar.classList.toggle('close');
}

/* =========================
   LOGOUT MODAL
========================= */
const logoutBtn = document.getElementById("logout-btn");
const logoutOverlay = document.getElementById("logout-overlay");
const cancelLogout = document.getElementById("cancel-logout");
const confirmLogout = document.getElementById("confirm-logout");

logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutOverlay?.classList.remove("hidden");
});

cancelLogout?.addEventListener("click", () => {
    logoutOverlay?.classList.add("hidden");
});

logoutOverlay?.addEventListener("click", (e) => {
    if (e.target === logoutOverlay) {
        logoutOverlay.classList.add("hidden");
    }
});

confirmLogout?.addEventListener("click", async () => {
    try {
        await fetch("http://localhost:8080/api/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("user");
    window.location.href = "../pages/login.html";
});
