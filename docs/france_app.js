// Nuances et couleurs politiques
const COULEURS_NUANCES = {
  "ENS": "#ffc20e",
  "RN": "#0d385b",
  "LRN": "#0d385b",
  "LENS": "#ffc20e",
  "LFI": "#cc2443",
  "LUG": "#e40046",
  "LLR": "#0066cc",
  "LR": "#0066cc",
  "LVEC": "#00a650",
  "VEC": "#00a650",
  "LREC": "#800080",
  "REC": "#800080",
  "LCOM": "#dd0000",
  "PCF": "#dd0000",
  "PS": "#e40046",
  "DVD": "#adc1fd",
  "DSV": "#000080",
  "NPA": "#bb0000",
  "LO": "#aa0000",
  "Autre": "#808080"
};

const NOMS_NUANCES = {
  // Européennes 2024
  "LRN": "Rassemblement National (J. Bardella)",
  "LENS": "Besoin d'Europe (V. Hayer)",
  "LUG": "Réveiller l'Europe (R. Glucksmann)",
  "LFI": "LFI - Union Populaire (M. Aubry)",
  "LLR": "Les Républicains (F.-X. Bellamy)",
  "LVEC": "Les Écologistes (M. Toussaint)",
  "LREC": "Reconquête ! (M. Maréchal)",
  "LCOM": "Gauche Unie - PCF (L. Deffontaines)",
  
  // Présidentielle 2022
  "ENS": "Emmanuel Macron (ENS)",
  "RN": "Marine Le Pen (RN)",
  "LFI": "Jean-Luc Mélenchon (LFI)",
  "REC": "Éric Zemmour (REC)",
  "LR": "Valérie Pécresse (LR)",
  "VEC": "Yannick Jadot (VEC)",
  "PCF": "Fabien Roussel (PCF)",
  "PS": "Anne Hidalgo (PS)",
  "DVD": "Jean Lassalle (DVD)",
  "DSV": "N. Dupont-Aignan (DSV)",
  "NPA": "Philippe Poutou (NPA)",
  "LO": "Nathalie Arthaud (LO)",
  "Autre": "Autres candidats / listes"
};

// Mappages d'ordres fixes
const ORDER_PRES_2022_T1 = ["LO", "PCF", "ENS", "DVD", "RN", "REC", "LFI", "PS", "VEC", "LR", "NPA", "DSV"];
const ORDER_PRES_2022_T2 = ["ENS", "RN"];
const ORDER_EURO_2024 = ["LRN", "LENS", "LUG", "LFI", "LLR", "LVEC", "LREC", "LCOM", "Autre"];

// Variables d'état
let selectedElection = "pres_2022_t1";
let activeInsee = "00000"; // France entière par défaut
let map = null;
let polygonLayer = null;
let myChart = null;

// Caches de tracé
let departmentsGeoJSON = null; // Cache pour les départements
const departmentCommunesCache = {}; // Cache pour les communes par département (depCode -> GeoJSON)
const depCentroids = {}; // Cache des centroïdes de départements pour la proximité
let currentDisplayedDep = null; // Code du département actuellement tracé à l'écran
let routeSyncSuspended = false;
let parisRedirectPending = false;
let nationalBureauRedirectPending = false;

const DEPARTMENT_ZOOM = 8;
const VOTING_OFFICE_ZOOM = 12;

// Centres approximatifs des arrondissements, utilisés uniquement pour transmettre
// le bon code INSEE à la carte des bureaux de vote lorsque Paris (75056) est actif.
const PARIS_ARRONDISSEMENT_CENTERS = [
  ["75101", 48.8626, 2.3363], ["75102", 48.8683, 2.3428],
  ["75103", 48.8630, 2.3591], ["75104", 48.8543, 2.3576],
  ["75105", 48.8444, 2.3502], ["75106", 48.8491, 2.3329],
  ["75107", 48.8565, 2.3124], ["75108", 48.8763, 2.3173],
  ["75109", 48.8769, 2.3375], ["75110", 48.8761, 2.3611],
  ["75111", 48.8591, 2.3780], ["75112", 48.8352, 2.4198],
  ["75113", 48.8284, 2.3622], ["75114", 48.8331, 2.3264],
  ["75115", 48.8413, 2.3003], ["75116", 48.8637, 2.2769],
  ["75117", 48.8873, 2.3075], ["75118", 48.8926, 2.3444],
  ["75119", 48.8871, 2.3848], ["75120", 48.8635, 2.4012]
];

// Éléments du DOM
const loaderOverlay = document.getElementById("loader-overlay");
const searchInput = document.getElementById("commune-search");
const autocompleteList = document.getElementById("autocomplete-list");
const electionPills = document.getElementById("election-pills");
const infoCard = document.getElementById("commune-info-card");
const infoName = document.getElementById("info-commune-name");
const infoDep = document.getElementById("info-commune-dep");
const btnResetFrance = document.getElementById("btn-reset-france");
const btnParisBureau = document.getElementById("btn-goto-paris-bureau");

const statWinnerName = document.getElementById("stat-winner-name");
const statWinnerScore = document.getElementById("stat-winner-score");
const statTurnout = document.getElementById("stat-turnout");
const statAbstention = document.getElementById("stat-abstention");
const statExprimes = document.getElementById("stat-exprimes");
const statTotalInscrits = document.getElementById("stat-total-inscrits");
const resultsList = document.getElementById("results-list");

// Formateur de nombres
function formatNumber(num) {
  if (num === null || num === undefined) return "--";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function showLoader(show) {
  if (loaderOverlay) {
    loaderOverlay.classList.toggle("active", show);
  }
}

// Reconstituer l'objet de votes depuis le tableau compressé
function getElectionVotes(communeStats, electionKey) {
  const key = electionKey === "pres_2022_t1" ? "p1" : (electionKey === "pres_2022_t2" ? "p2" : "eu");
  const rawData = communeStats[key];
  if (!rawData) return null;
  
  const inscrits = rawData[0];
  const votants = rawData[1];
  const exprimes = rawData[2];
  const votesArray = rawData[3];
  
  const votesObj = {};
  let candidatesOrder = [];
  if (key === "p1") {
    candidatesOrder = ORDER_PRES_2022_T1;
  } else if (key === "p2") {
    candidatesOrder = ORDER_PRES_2022_T2;
  } else {
    candidatesOrder = ORDER_EURO_2024;
  }
  
  candidatesOrder.forEach((c, idx) => {
    votesObj[c] = votesArray[idx] || 0;
  });
  
  return {
    inscrits,
    votants,
    exprimes,
    votes: votesObj
  };
}

// Agréger les données par département à partir des communes
function getDepartmentVotes(depCode, electionKey) {
  let inscrits = 0;
  let votants = 0;
  let exprimes = 0;
  
  const key = electionKey === "pres_2022_t1" ? "p1" : (electionKey === "pres_2022_t2" ? "p2" : "eu");
  let listSize = key === "p1" ? ORDER_PRES_2022_T1.length : (key === "p2" ? ORDER_PRES_2022_T2.length : ORDER_EURO_2024.length);
  const votesArray = new Array(listSize).fill(0);
  
  for (const [insee, stats] of Object.entries(FRANCE_STATS)) {
    if (insee === "00000") continue;
    if (stats.d === depCode && stats[key]) {
      inscrits += stats[key][0];
      votants += stats[key][1];
      exprimes += stats[key][2];
      stats[key][3].forEach((v, idx) => {
        votesArray[idx] += v;
      });
    }
  }
  
  const votesObj = {};
  let candidatesOrder = [];
  if (key === "p1") {
    candidatesOrder = ORDER_PRES_2022_T1;
  } else if (key === "p2") {
    candidatesOrder = ORDER_PRES_2022_T2;
  } else {
    candidatesOrder = ORDER_EURO_2024;
  }
  
  candidatesOrder.forEach((c, idx) => {
    votesObj[c] = votesArray[idx];
  });
  
  return {
    inscrits,
    votants,
    exprimes,
    votes: votesObj
  };
}

// Trouver le département le plus proche du centre de la carte
function getClosestDepartment(center) {
  if (!departmentsGeoJSON) return null;
  let closestDep = null;
  let minDist = Infinity;
  
  departmentsGeoJSON.features.forEach(feature => {
    const depCode = feature.properties.code;
    let centroid = depCentroids[depCode];
    
    if (!centroid) {
      // Calculer le centre de la boîte englobante (bbox center)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const processCoords = (coords) => {
        coords.forEach(pt => {
          if (Array.isArray(pt[0])) {
            processCoords(pt);
          } else {
            const x = pt[0];
            const y = pt[1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        });
      };
      
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        processCoords(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(poly => processCoords(poly));
      }
      
      centroid = L.latLng((minY + maxY) / 2, (minX + maxX) / 2);
      depCentroids[depCode] = centroid;
    }
    
    const dist = center.distanceTo(centroid);
    if (dist < minDist) {
      minDist = dist;
      closestDep = depCode;
    }
  });
  
  return closestDep;
}

// Initialisation de la carte Leaflet
function initMap() {
  map = L.map('leaflet-map', {
    zoomControl: true,
    attributionControl: false
  }).setView([46.2276, 2.2137], 6); // Centré sur la France

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  // Mettre à jour l'affichage dynamique lors du zoom ou du déplacement de carte
  map.on('zoomend', updateMapLayers);
  map.on('moveend', updateMapLayers);
  // Après un retour navigateur depuis une vue bureau conservée dans le bfcache,
  // une nouvelle interaction utilisateur doit pouvoir déclencher une navigation.
  const armVotingOfficeNavigation = () => {
    parisRedirectPending = false;
    nationalBureauRedirectPending = false;
  };
  map.on('zoomstart', armVotingOfficeNavigation);
  map.on('movestart', armVotingOfficeNavigation);
}

function isParisInsee(insee) {
  return insee === "75056" || /^751\d{2}$/.test(insee || "");
}

function getClosestParisArrondissement(center) {
  let closest = "75056";
  let minDistance = Infinity;
  PARIS_ARRONDISSEMENT_CENTERS.forEach(([insee, lat, lng]) => {
    const distance = center.distanceTo(L.latLng(lat, lng));
    if (distance < minDistance) {
      minDistance = distance;
      closest = insee;
    }
  });
  return closest;
}

function geometryContainsPoint(geometry, center) {
  if (!geometry) return false;
  const pointInRing = ring => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersects = ((yi > center.lat) !== (yj > center.lat))
        && (center.lng < ((xj - xi) * (center.lat - yi)) / (yj - yi) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };
  const pointInPolygon = polygon => pointInRing(polygon[0])
    && !polygon.slice(1).some(pointInRing);

  if (geometry.type === "Polygon") return pointInPolygon(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some(pointInPolygon);
  return false;
}

function isCenterInsideDepartment(depCode, center) {
  const feature = departmentsGeoJSON && departmentsGeoJSON.features.find(item => item.properties.code === depCode);
  return Boolean(feature && geometryContainsPoint(feature.geometry, center));
}

function buildRoute(params = {}) {
  const url = new URL(window.location.href);
  url.search = "";
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
}

function getParisElectionParams() {
  if (selectedElection === "pres_2022_t1") return { year: "2022", type: "presidentielles", tour: "t1" };
  if (selectedElection === "pres_2022_t2") return { year: "2022", type: "presidentielles", tour: "t2" };
  return { year: "2024", type: "europeennes", tour: "t1" };
}

function buildParisURL(insee) {
  const params = new URLSearchParams({ insee, ...getParisElectionParams() });
  return `paris.html?${params.toString()}`;
}

function buildBureauURL(insee) {
  const center = map.getCenter();
  const params = new URLSearchParams({
    insee,
    election: selectedElection,
    lat: center.lat.toFixed(6),
    lng: center.lng.toFixed(6),
    zoom: String(Math.max(13, map.getZoom()))
  });
  return `bureau.html?${params.toString()}`;
}

function getCommuneAtCenter(depCode, center) {
  const geojson = departmentCommunesCache[depCode];
  const feature = geojson && geojson.features.find(item => geometryContainsPoint(item.geometry, center));
  return feature ? feature.properties.code : null;
}

function updateParisButton(insee) {
  if (!btnParisBureau) return;
  if (isParisInsee(insee)) {
    btnParisBureau.href = buildParisURL(insee);
    btnParisBureau.style.display = "flex";
  } else {
    btnParisBureau.style.display = "none";
  }
}

function syncDepartmentRoute(depCode) {
  if (routeSyncSuspended) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("insee")) return;

  const previousDep = params.get("dep");
  if (previousDep === depCode) return;

  const state = { dep: depCode };
  const url = buildRoute({ dep: depCode });
  // La première entrée dans un département reste accessible via Retour. Les
  // changements dus au panoramique remplacent ensuite cette unique entrée.
  if (previousDep) {
    history.replaceState(state, "", url);
  } else {
    history.pushState(state, "", url);
  }
}

function clearDepartmentRoute() {
  if (routeSyncSuspended) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("dep") && !params.get("insee")) {
    history.replaceState({ insee: "00000" }, "", buildRoute());
  }
}

function suspendRouteSyncForMapMove(moveMap) {
  routeSyncSuspended = true;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    routeSyncSuspended = false;
  };
  map.once("moveend", release);
  moveMap();
  // Certains appels Leaflet ne déclenchent aucun événement si la vue demandée
  // est déjà active.
  window.setTimeout(release, 1000);
}

function redirectToParisVotingOffices(forcedInsee = null) {
  if (parisRedirectPending || (!forcedInsee && !isParisInsee(activeInsee))) return;
  parisRedirectPending = true;
  const targetInsee = forcedInsee || (activeInsee === "75056"
    ? getClosestParisArrondissement(map.getCenter())
    : activeInsee);
  window.location.assign(buildParisURL(targetInsee));
}

function redirectToNationalVotingOffices(insee) {
  if (nationalBureauRedirectPending || !insee) return;
  nationalBureauRedirectPending = true;
  window.location.assign(buildBureauURL(insee));
}

// Gérer l'affichage multiniveau dynamique basé sur le niveau de zoom
async function updateMapLayers() {
  if (activeInsee !== "00000") {
    // À Paris, le niveau de zoom suivant ouvre la carte réellement disponible
    // à l'échelle des bureaux de vote.
    if (map.getZoom() >= VOTING_OFFICE_ZOOM && isParisInsee(activeInsee)) {
      redirectToParisVotingOffices();
    } else if (map.getZoom() >= VOTING_OFFICE_ZOOM) {
      redirectToNationalVotingOffices(activeInsee);
    }
    return;
  }
  
  const zoom = map.getZoom();
  if (zoom < DEPARTMENT_ZOOM) {
    clearDepartmentRoute();
    // Échelle Nationale : Départements
    if (currentDisplayedDep !== null || !polygonLayer) {
      currentDisplayedDep = null;
      await loadDepartmentsLayer();
    }
  } else {
    // Échelle Intermédiaire : Communes du département sous le centre de la carte
    const center = map.getCenter();
    const closestDep = getClosestDepartment(center);
    if (closestDep) {
      syncDepartmentRoute(closestDep);
      // Paris est le seul territoire actuellement doté de contours de bureaux.
      // Le zoom seul suffit : aucun clic préalable sur la commune n'est requis.
      if (zoom >= VOTING_OFFICE_ZOOM && closestDep === "75" && isCenterInsideDepartment("75", center)) {
        redirectToParisVotingOffices(getClosestParisArrondissement(center));
        return;
      }
      if (closestDep !== currentDisplayedDep) {
        currentDisplayedDep = closestDep;
        await loadCommunesLayer(closestDep);
      }
      if (zoom >= VOTING_OFFICE_ZOOM) {
        redirectToNationalVotingOffices(getCommuneAtCenter(closestDep, center));
      }
    }
  }
}

// Charger et tracer les départements français
async function loadDepartmentsLayer() {
  if (polygonLayer) {
    map.removeLayer(polygonLayer);
    polygonLayer = null;
  }
  
  if (!departmentsGeoJSON) {
    try {
      const res = await fetch("departements.geojson");
      departmentsGeoJSON = await res.json();
    } catch (e) {
      console.error("Échec du chargement du GeoJSON des départements :", e);
      return;
    }
  }
  
  polygonLayer = L.geoJSON(departmentsGeoJSON, {
    style: function(feature) {
      const depCode = feature.properties.code;
      const stats = getDepartmentVotes(depCode, selectedElection);
      let winnerColor = "#808080";
      if (stats && stats.exprimes > 0) {
        const sorted = Object.entries(stats.votes).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) {
          winnerColor = COULEURS_NUANCES[sorted[0][0]] || "#808080";
        }
      }
      return {
        fillColor: winnerColor,
        color: "rgba(255, 255, 255, 0.15)",
        weight: 1,
        fillOpacity: 0.65
      };
    },
    onEachFeature: function(feature, layer) {
      const depCode = feature.properties.code;
      const depName = feature.properties.nom;
      const stats = getDepartmentVotes(depCode, selectedElection);
      
      let tooltipHtml = `<b>Département :</b> ${depName} (${depCode})`;
      if (stats && stats.exprimes > 0) {
        const sorted = Object.entries(stats.votes)
          .map(([party, votes]) => ({
            party,
            votes,
            pct: (votes / stats.exprimes) * 100
          }))
          .sort((a,b) => b.votes - a.votes);
          
        if (sorted.length > 0) {
          const winnerName = NOMS_NUANCES[sorted[0].party] || sorted[0].party;
          tooltipHtml += `<br><hr><b>Gagnant :</b> ${winnerName}<br><b>Score :</b> ${sorted[0].pct.toFixed(1)} %<br><b>Participation :</b> ${(stats.votants / stats.inscrits * 100).toFixed(1)} %`;
        }
      }
      
      layer.bindTooltip(tooltipHtml, { sticky: true });
      
      // Zoomer au clic sur le département
      layer.on("click", () => {
        map.fitBounds(layer.getBounds());
        if (map.getZoom() < DEPARTMENT_ZOOM) map.setZoom(DEPARTMENT_ZOOM);
      });
    }
  }).addTo(map);
}

// Charger et tracer les communes d'un département donné
async function loadCommunesLayer(depCode) {
  if (polygonLayer) {
    map.removeLayer(polygonLayer);
    polygonLayer = null;
  }
  
  let geojson = departmentCommunesCache[depCode];
  if (!geojson) {
    showLoader(true);
    try {
      const geoUrl = `https://geo.api.gouv.fr/departements/${depCode}/communes?format=geojson&geometry=contour`;
      const res = await fetch(geoUrl);
      if (!res.ok) throw new Error("Communes introuvables");
      geojson = await res.json();
      departmentCommunesCache[depCode] = geojson;
    } catch (e) {
      console.error(`Failed to load communes for department ${depCode}:`, e);
      showLoader(false);
      return;
    }
    showLoader(false);
  }
  
  polygonLayer = L.geoJSON(geojson, {
    style: function(feature) {
      const insee = feature.properties.code;
      const stats = FRANCE_STATS[insee];
      let winnerColor = "#808080";
      
      if (stats) {
        const electionData = getElectionVotes(stats, selectedElection);
        if (electionData && electionData.votes) {
          const sorted = Object.entries(electionData.votes).sort((a,b) => b[1] - a[1]);
          if (sorted.length > 0) {
            winnerColor = COULEURS_NUANCES[sorted[0][0]] || "#808080";
          }
        }
      }
      
      return {
        fillColor: winnerColor,
        color: "rgba(255, 255, 255, 0.15)",
        weight: 1,
        fillOpacity: 0.65
      };
    },
    onEachFeature: function(feature, layer) {
      const insee = feature.properties.code;
      const comName = feature.properties.nom;
      const stats = FRANCE_STATS[insee];
      
      let tooltipHtml = `<b>Commune :</b> ${comName} (${insee})`;
      if (stats) {
        const electionData = getElectionVotes(stats, selectedElection);
        if (electionData && electionData.votes) {
          const sorted = Object.entries(electionData.votes)
            .map(([party, votes]) => ({
              party,
              votes,
              pct: electionData.exprimes > 0 ? (votes / electionData.exprimes) * 100 : 0.0
            }))
            .sort((a,b) => b.votes - a.votes);
            
          if (sorted.length > 0) {
            const winnerName = NOMS_NUANCES[sorted[0].party] || sorted[0].party;
            tooltipHtml += `<br><hr><b>Gagnant :</b> ${winnerName}<br><b>Score :</b> ${sorted[0].pct.toFixed(1)} %<br><b>Participation :</b> ${(electionData.votants / electionData.inscrits * 100).toFixed(1)} %`;
          }
        }
      } else {
        tooltipHtml += "<br><i>Données non disponibles</i>";
      }
      
      layer.bindTooltip(tooltipHtml, { sticky: true });
      
      layer.on("click", () => {
        activeInsee = insee;
        searchInput.value = `${comName} (${depCode})`;
        infoCard.classList.remove("hidden");
        infoName.textContent = comName;
        infoDep.textContent = `Département : ${depCode} | Code INSEE : ${insee}`;
        
        selectCommune(insee);
      });
    }
  }).addTo(map);
}

// Recherche & Autocomplétion locale
function initSearch() {
  searchInput.addEventListener("input", function() {
    const query = this.value.trim().toLowerCase();
    autocompleteList.innerHTML = "";
    if (!query || query.length < 2) return;

    const matches = [];
    for (const [insee, data] of Object.entries(FRANCE_STATS)) {
      if (insee === "00000") continue;
      const name = data.n.toLowerCase();
      if (name.includes(query) || insee.startsWith(query)) {
        matches.push({ insee, name: data.n, dep: data.d });
        if (matches.length >= 10) break;
      }
    }

    matches.forEach(item => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.innerHTML = `<strong>${item.name}</strong> (${item.dep}) — Code INSEE : ${item.insee}`;
      div.addEventListener("click", function() {
        searchInput.value = `${item.name} (${item.dep})`;
        autocompleteList.innerHTML = "";
        
        activeInsee = item.insee;
        infoCard.classList.remove("hidden");
        infoName.textContent = item.name;
        infoDep.textContent = `Département : ${item.dep} | Code INSEE : ${item.insee}`;
        
        selectCommune(item.insee);
      });
      autocompleteList.appendChild(div);
    });
  });

  document.addEventListener("click", function(e) {
    if (e.target !== searchInput) {
      autocompleteList.innerHTML = "";
    }
  });
}

// Gérer la mise à jour de l'adresse URL
function updateURL(insee, push = true) {
  if (push) {
    const url = insee === "00000" ? buildRoute() : buildRoute({ insee });
    history.pushState({ insee }, "", url);
  }
}

// Sélectionner une commune (ou la France entière) et charger sa géométrie + statistiques
async function selectCommune(insee, pushToHistory = true) {
  if (!insee) return;
  activeInsee = insee;

  updateURL(insee, pushToHistory);

  if (insee === "00000") {
    // Mode France Entière
    btnResetFrance.style.display = "none";
    updateParisButton("00000");
    
    infoCard.classList.remove("hidden");
    infoName.textContent = "France entière";
    infoDep.textContent = "Échelle Nationale (Données Consolidées)";
    
    await updateMapLayers();
  } else {
    // Mode Commune spécifique
    btnResetFrance.style.display = "flex";
    currentDisplayedDep = null; // Forcer la suppression de la couche départementale/communale
    
    // Activer le bouton de redirection vers Paris si applicable
    updateParisButton(insee);

    try {
      const geoUrl = `https://geo.api.gouv.fr/communes/${insee}?format=geojson&geometry=contour`;
      const res = await fetch(geoUrl);
      if (!res.ok) throw new Error("Géométrie introuvable");
      const geojson = await res.json();

      if (polygonLayer) {
        map.removeLayer(polygonLayer);
      }

      const stats = FRANCE_STATS[insee];
      const electionData = getElectionVotes(stats, selectedElection);
      let winnerColor = "#808080";
      
      if (electionData && electionData.votes) {
        const sorted = Object.entries(electionData.votes).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) {
          winnerColor = COULEURS_NUANCES[sorted[0][0]] || "#808080";
        }
      }

      polygonLayer = L.geoJSON(geojson, {
        style: {
          fillColor: winnerColor,
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 0.6
        }
      }).addTo(map);

      map.fitBounds(polygonLayer.getBounds(), { padding: [30, 30] });

    } catch (error) {
      console.warn("Impossible de charger la géométrie du contour :", error);
    }
  }

  updateStatsUI();
}

// Mettre à jour l'affichage des statistiques et le graphique
function updateStatsUI() {
  if (!activeInsee || !FRANCE_STATS[activeInsee]) return;

  const stats = FRANCE_STATS[activeInsee];
  const electionData = getElectionVotes(stats, selectedElection);

  if (!electionData) {
    displayEmptyStats();
    return;
  }

  const inscrits = electionData.inscrits;
  const votants = electionData.votants;
  const exprimes = electionData.exprimes;
  
  const turnoutRate = inscrits > 0 ? (votants / inscrits) * 100 : 0.0;
  const abstentionRate = 100.0 - turnoutRate;

  statTurnout.textContent = `${turnoutRate.toFixed(1)} %`;
  statAbstention.textContent = `${abstentionRate.toFixed(1)} %`;
  statTotalInscrits.textContent = formatNumber(inscrits);
  statExprimes.textContent = formatNumber(exprimes);

  const sortedParties = Object.entries(electionData.votes)
    .map(([party, votes]) => {
      const pct = exprimes > 0 ? (votes / exprimes) * 100 : 0.0;
      return { party, votes, pct };
    })
    .sort((a, b) => b.votes - a.votes);

  if (sortedParties.length > 0) {
    const winner = sortedParties[0];
    const winnerName = NOMS_NUANCES[winner.party] || winner.party;
    const winnerColor = COULEURS_NUANCES[winner.party] || "#808080";
    
    statWinnerName.textContent = winnerName;
    statWinnerName.style.color = winnerColor;
    statWinnerScore.textContent = `${winner.pct.toFixed(1)} %`;
  } else {
    statWinnerName.textContent = "Aucun";
    statWinnerName.style.color = "inherit";
    statWinnerScore.textContent = "-- %";
  }

  resultsList.innerHTML = "";
  sortedParties.forEach(item => {
    const color = COULEURS_NUANCES[item.party] || "#808080";
    const name = NOMS_NUANCES[item.party] || item.party;
    
    const row = document.createElement("div");
    row.className = "party-row";
    row.innerHTML = `
      <div class="party-row-info">
        <div class="party-name-container">
          <span class="party-color-dot" style="background-color: ${color}"></span>
          <span class="party-label">${name}</span>
          <span class="party-votes">(${formatNumber(item.votes)} voix)</span>
        </div>
        <div class="party-percentage">${item.pct.toFixed(1)} %</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${item.pct}%; background-color: ${color}"></div>
      </div>
    `;
    resultsList.appendChild(row);
  });

  renderChart(sortedParties);
}

function displayEmptyStats() {
  statWinnerName.textContent = "Aucun";
  statWinnerName.style.color = "inherit";
  statWinnerScore.textContent = "-- %";
  statTurnout.textContent = "-- %";
  statAbstention.textContent = "-- %";
  statExprimes.textContent = "--";
  statTotalInscrits.textContent = "--";
  resultsList.innerHTML = "<div style='color: var(--text-muted); font-size: 0.85rem;'>Pas de données disponibles pour cette commune.</div>";
  if (myChart) {
    myChart.destroy();
    myChart = null;
  }
}

function renderChart(sortedParties) {
  const ctx = document.getElementById('results-chart').getContext('2d');
  
  if (myChart) {
    myChart.destroy();
  }

  const labels = sortedParties.map(p => NOMS_NUANCES[p.party] || p.party);
  const data = sortedParties.map(p => p.pct);
  const colors = sortedParties.map(p => COULEURS_NUANCES[p.party] || "#808080");

  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw.toFixed(1)} %`;
            }
          }
        }
      },
      cutout: '75%'
    }
  });
}

// Écouteur sur les boutons d'élection
Array.from(electionPills.children).forEach(btn => {
  btn.onclick = () => {
    selectedElection = btn.dataset.election;
    Array.from(electionPills.children).forEach(b => {
      b.classList.toggle("active", b.dataset.election === selectedElection);
    });
    if (activeInsee) {
      updateParisButton(activeInsee);
      selectCommune(activeInsee, false);
    }
  };
});

// Réinitialiser la vue à l'échelle de la France
btnResetFrance.onclick = () => {
  activeInsee = "00000";
  searchInput.value = "";
  suspendRouteSyncForMapMove(() => map.setView([46.2276, 2.2137], 6));
  selectCommune("00000");
};

// Gérer la navigation par historique du navigateur (Précédent / Suivant)
function showRouteInfo(insee) {
  if (insee === "00000") {
    searchInput.value = "";
    infoCard.classList.remove("hidden");
    infoName.textContent = "France entière";
    infoDep.textContent = "Échelle Nationale (Données Consolidées)";
  } else if (FRANCE_STATS[insee]) {
    const data = FRANCE_STATS[insee];
    searchInput.value = `${data.n} (${data.d})`;
    infoCard.classList.remove("hidden");
    infoName.textContent = data.n;
    infoDep.textContent = `Département : ${data.d} | Code INSEE : ${insee}`;
  }
}

async function focusDepartment(depCode) {
  activeInsee = "00000";
  updateParisButton("00000");
  await loadDepartmentsLayer();
  const feature = departmentsGeoJSON && departmentsGeoJSON.features.find(item => item.properties.code === depCode);
  if (!feature) return false;

  const bounds = L.geoJSON(feature).getBounds();
  currentDisplayedDep = depCode;
  suspendRouteSyncForMapMove(() => {
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 9 });
    if (map.getZoom() < DEPARTMENT_ZOOM) map.setZoom(DEPARTMENT_ZOOM);
  });
  await loadCommunesLayer(depCode);
  return true;
}

window.onpopstate = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const insee = urlParams.get("insee") || "00000";
  const dep = urlParams.get("dep");
  activeInsee = insee;

  showRouteInfo(insee);
  if (dep && insee === "00000") {
    await focusDepartment(dep);
    updateStatsUI();
    return;
  }

  if (insee === "00000") {
    suspendRouteSyncForMapMove(() => map.setView([46.2276, 2.2137], 6));
  }
  await selectCommune(insee, false);
};

// Lancement au chargement de la page
window.onload = async () => {
  initMap();
  initSearch();
  
  // Lire les paramètres INSEE de l'URL au premier chargement
  const urlParams = new URLSearchParams(window.location.search);
  const insee = urlParams.get('insee') || '00000';
  const dep = urlParams.get("dep");
  
  if (insee !== "00000" && FRANCE_STATS[insee]) {
    const data = FRANCE_STATS[insee];
    searchInput.value = `${data.n} (${data.d})`;
    infoCard.classList.remove("hidden");
    infoName.textContent = data.n;
    infoDep.textContent = `Département : ${data.d} | Code INSEE : ${insee}`;
  }
  
  showRouteInfo(insee);
  if (dep && insee === "00000") {
    await focusDepartment(dep);
    updateStatsUI();
  } else {
    await selectCommune(insee, false);
  }
  
  // Masquer le loader
  showLoader(false);
};
