let buildingData = {};
// Initialize the map centered roughly on Nile University
function generateFakeData(feature){

 const id = feature.properties["@id"];

 buildingData[id] = {
  occupancy: Math.floor(Math.random() * 300)
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

 if(!data){
  return {
   color: "#2f4156",
   weight: 1.5,
   fillColor: "#dce8f1",
   fillOpacity: 0.65
  };
 }

 const occ = data.occupancy;

 if(occ > 200){
  return {
   color: "#2f4156",
   fillColor: "#5d778e",
   weight: 2,
   fillOpacity: 0.75
  };
 }

 return {
  color: "#2f4156",
  fillColor: "#dce8f1",
  weight: 1.5,
  fillOpacity: 0.65
 };

}


// Highlight building when hovering

function highlightFeature(e){

 var layer = e.target;

 layer.setStyle({
  color: "#5d778e",
  weight: 3,
  fillOpacity: 0.85
 });

}


// Reset building style when mouse leaves

function resetHighlight(e){
 geojson.resetStyle(e.target);
}


// Click event for buildings

function buildingClick(e){

 const props = e.target.feature.properties;

 document.getElementById("buildingTitle").innerText =
  props.name || "Unknown Building";

 document.getElementById("buildingInfo").innerText =
  "ID: " + (props.id || props["@id"]);

 // show panel
 document.getElementById("infoPanel").classList.add("active");

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
map.on("click", function(e){

 // if click is NOT on a building
 document.getElementById("infoPanel").classList.remove("active");

});
