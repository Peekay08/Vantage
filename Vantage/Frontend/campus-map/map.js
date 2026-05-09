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
function generateFakeData(feature){

 const id = feature.properties["@id"];

 const totalClasses = Math.floor(Math.random() * 10) + 5;

 let classes = [];
 let used = 0;

 for(let i = 1; i <= totalClasses; i++){
  const inUse = Math.random() > 0.5;
  if(inUse) used++;

  classes.push({
   id: String(i).padStart(3,"0"),
   status: inUse ? "in-use" : "free"
  });
 }

 buildingData[id] = {
  occupancy: Math.floor(Math.random() * 300),
  totalClasses,
  usedClasses: used,
  freeClasses: totalClasses - used,
  classes,

  entries: Array.from({length:5},()=>({
   id: String(Math.floor(Math.random()*999999)).padStart(6,"0"),
   time: `${Math.floor(Math.random()*12)+1}:${Math.floor(Math.random()*60).toString().padStart(2,'0')} pm`
  })),

  exits: Array.from({length:5},()=>({
   id: String(Math.floor(Math.random()*999999)).padStart(6,"0"),
   time: `${Math.floor(Math.random()*12)+1}:${Math.floor(Math.random()*60).toString().padStart(2,'0')} pm`
  }))
 };
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

 const id = feature.properties["@id"];
 const data = buildingData[id];

 // default state
 let borderColor = "#2f4156";
 let glow = "rgba(47, 65, 86, 0.2)";
 let weight = 1.5;

 if(data){
  const occ = data.occupancy;

  if(occ > 200){
   borderColor = "#bf4059"; // 🔴 high #e74c3c
   glow = "rgba(231, 76, 60, 0.35)";
   weight = 2.5;
  }
  else if(occ > 100){
   borderColor = "#bf8040"; // 🟠 medium #f39c12
   glow = "rgba(243, 156, 18, 0.35)";
   weight = 2;
  }
  else{
   borderColor = "#206052"; // 🟢 low #2ecc71
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
  className: `building-${id}`
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
 const id = props["@id"];
 const data = buildingData[id];

 // TITLE
 document.getElementById("popup-title").innerText =
  props.name || "Unknown Building";

 // NUMBERS
 document.getElementById("people-count").innerText = data.occupancy;
 document.getElementById("free-count").innerText = data.freeClasses;
 document.getElementById("used-count").innerText = data.usedClasses;

 // CLASSES
 const classList = document.getElementById("class-list");
 classList.innerHTML = "";

 data.classes.forEach(cls=>{
  classList.innerHTML += `
   <li>
    <span class="class-id">${cls.id}</span>
    <span class="use-status ${cls.status}">
     ${cls.status === "free" ? "free" : "in use"}
    </span>
   </li>
  `;
 });

 // ENTRIES
 const entryList = document.getElementById("entry-list");
 entryList.innerHTML = "";

 data.entries.forEach(entry=>{
  entryList.innerHTML += `
   <li class="entry">
    <span class="person-id">${entry.id}</span>
    <span class="time">${entry.time}</span>
   </li>
  `;
 });

 // EXITS
 const exitList = document.getElementById("exit-list");
 exitList.innerHTML = "";

 data.exits.forEach(exit=>{
  exitList.innerHTML += `
   <li class="exit">
    <span class="person-id">${exit.id}</span>
    <span class="time">${exit.time}</span>
   </li>
  `;
 });

 // SHOW POPUP
 showPopup();
}


// Attach interactions to each building

function onEachBuilding(feature, layer){

 const props = feature.properties;
 const id = props["@id"];
 const data = buildingData[id] || { occupancy: 0 };

 const shortName = props.name
   ? props.name.split(",")[0]
   : "Unknown Building";

 function getCompactLabel(){
   return `
     <div class="building-label compact">
       <strong>${shortName}</strong>
     </div>
   `;
 }

 function getExpandedLabel(){
   return `
     <div class="building-label expanded">
       <strong>${shortName}</strong>
       <div class="stats">
         <p>👥 ${data.occupancy} students</p>
         <p>⚡ ${data.occupancy > 200 ? "High Activity" : "Normal Activity"}</p>
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

fetch("nile_buildings.geojson")
.then(res => res.json())
.then(data => {

 data.features.forEach(feature => {
  generateFakeData(feature);
 });

 geojson = L.geoJSON(data,{
  style: buildingStyle,
  onEachFeature: onEachBuilding
 }).addTo(map);

 map.fitBounds(geojson.getBounds());

})
.catch(err => {
 console.error("Error loading GeoJSON:", err);
});
