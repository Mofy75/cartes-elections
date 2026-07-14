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
let departmentsGeoJSON = null; // Cache pour le tracé de la France

// Éléments du DOM
const loaderOverlay = document.getElementById("loader-overlay");
const searchInput = document.getElementById("commune-search");
const autocompleteList = document.getElementById("autocomplete-list");
const electionPills = document.getElementById("election-pills");
const infoCard = document.getElementById("commune-info-card");
const infoName = document.getElementById("info-commune-name");
const infoDep = document.getElementById("info-commune-dep");
const btnResetFrance = document.getElementById("btn-reset-france");

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
    // Certains codes de départements peuvent différer ou être à 2/3 caractères (Corse, DOM)
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

// Initialisation de la carte Leaflet
function initMap() {
  map = L.map('leaflet-map', {
    zoomControl: true,
    attributionControl: false
  }).setView([46.2276, 2.2137], 6); // Centré sur la France

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);
}

// Recherche & Autocomplétion locale
function initSearch() {
  searchInput.addEventListener("input", function() {
    const query = this.value.trim().toLowerCase();
    autocompleteList.innerHTML = "";
    if (!query || query.length < 2) return;

    // Filtrer les communes correspondantes dans FRANCE_STATS
    const matches = [];
    for (const [insee, data] of Object.entries(FRANCE_STATS)) {
      if (insee === "00000") continue; // Exclure l'agrégat France
      const name = data.n.toLowerCase();
      if (name.includes(query) || insee.startsWith(query)) {
        matches.push({ insee, name: data.n, dep: data.d });
        if (matches.length >= 10) break; // Limiter à 10 propositions
      }
    }

    // Afficher les résultats de la recherche
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

  // Fermer la liste si clic en dehors
  document.addEventListener("click", function(e) {
    if (e.target !== searchInput) {
      autocompleteList.innerHTML = "";
    }
  });
}

// Charger et dessiner la couche des départements français
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
      
      // zoomer au clic sur le département
      layer.on("click", () => {
        map.fitBounds(layer.getBounds());
      });
    }
  }).addTo(map);
}

// Sélectionner une commune (ou la France entière) et charger sa géométrie + statistiques
async function selectCommune(insee) {
  if (!insee) return;

  if (insee === "00000") {
    // Mode France Entière (Afficher la carte coloriée par département)
    btnResetFrance.style.display = "none";
    infoCard.classList.remove("hidden");
    infoName.textContent = "France entière";
    infoDep.textContent = "Échelle Nationale (Données Consolidées)";
    
    await loadDepartmentsLayer();
    
    // Zoomer à l'échelle de la France
    map.setView([46.2276, 2.2137], 6);
  } else {
    // Mode Commune spécifique
    btnResetFrance.style.display = "flex";
    
    try {
      const geoUrl = `https://geo.api.gouv.fr/communes/${insee}?format=geojson&geometry=contour`;
      const res = await fetch(geoUrl);
      if (!res.ok) throw new Error("Géométrie introuvable");
      const geojson = await res.json();

      if (polygonLayer) {
        map.removeLayer(polygonLayer);
      }

      // Récupérer la couleur du gagnant
      const stats = FRANCE_STATS[insee];
      const electionData = getElectionVotes(stats, selectedElection);
      let winnerColor = "#808080";
      
      if (electionData && electionData.votes) {
        const sorted = Object.entries(electionData.votes).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) {
          winnerColor = COULEURS_NUANCES[sorted[0][0]] || "#808080";
        }
      }

      // Créer la couche vectorielle de la commune
      polygonLayer = L.geoJSON(geojson, {
        style: {
          fillColor: winnerColor,
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 0.6
        }
      }).addTo(map);

      // Zoomer sur la commune
      map.fitBounds(polygonLayer.getBounds(), { padding: [30, 30] });

    } catch (error) {
      console.warn("Impossible de charger la géométrie du contour :", error);
    }
  }

  // 2. Afficher les statistiques
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

  // Trier les partis par nombre de voix
  const sortedParties = Object.entries(electionData.votes)
    .map(([party, votes]) => {
      const pct = exprimes > 0 ? (votes / exprimes) * 100 : 0.0;
      return { party, votes, pct };
    })
    .sort((a, b) => b.votes - a.votes);

  // Affichage du gagnant
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

  // Rendu de la liste
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

  // Mettre à jour le graphique en anneau
  renderChart(sortedParties);
}

// Afficher un état vide si pas de données
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

// Dessiner le graphique en anneau (Doughnut Chart.js)
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

// Initialisation des boutons d'élections
Array.from(electionPills.children).forEach(btn => {
  btn.onclick = () => {
    selectedElection = btn.dataset.election;
    Array.from(electionPills.children).forEach(b => {
      b.classList.toggle("active", b.dataset.election === selectedElection);
    });
    if (activeInsee) {
      selectCommune(activeInsee);
    }
  };
});

// Bouton de réinitialisation à la France entière
btnResetFrance.onclick = () => {
  activeInsee = "00000";
  searchInput.value = "";
  selectCommune("00000");
};

// Lancement au chargement de la page
window.onload = () => {
  initMap();
  initSearch();
  
  // Charger la France entière par défaut à l'ouverture
  activeInsee = "00000";
  selectCommune("00000");
  
  // Masquer le loader de chargement initial
  showLoader(false);
};
