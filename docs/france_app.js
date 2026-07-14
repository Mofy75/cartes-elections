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
  "Autre": "Autres candidats"
};

// Variables d'état
let selectedElection = "pres_2022_t1";
let activeInsee = null;
let map = null;
let polygonLayer = null;
let myChart = null;

// Éléments du DOM
const searchInput = document.getElementById("commune-search");
const autocompleteList = document.getElementById("autocomplete-list");
const electionPills = document.getElementById("election-pills");
const infoCard = document.getElementById("commune-info-card");
const infoName = document.getElementById("info-commune-name");
const infoDep = document.getElementById("info-commune-dep");

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

// Sélectionner une commune et charger sa géométrie + statistiques
async function selectCommune(insee) {
  if (!insee) return;

  // 1. Tracer le polygone géométrique de la commune
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
    const electionData = stats ? stats[selectedElection] : null;
    let winnerColor = "#808080";
    
    if (electionData && electionData.vt) {
      const sorted = Object.entries(electionData.vt).sort((a,b) => b[1] - a[1]);
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

  // 2. Afficher les statistiques
  updateStatsUI();
}

// Mettre à jour l'affichage des statistiques et le graphique
function updateStatsUI() {
  if (!activeInsee || !FRANCE_STATS[activeInsee]) return;

  const stats = FRANCE_STATS[activeInsee];
  const electionData = stats[selectedElection];

  if (!electionData) {
    displayEmptyStats();
    return;
  }

  const inscrits = electionData.i;
  const votants = electionData.v;
  const exprimes = electionData.e;
  
  const turnoutRate = inscrits > 0 ? (votants / inscrits) * 100 : 0.0;
  const abstentionRate = 100.0 - turnoutRate;

  statTurnout.textContent = `${turnoutRate.toFixed(1)} %`;
  statAbstention.textContent = `${abstentionRate.toFixed(1)} %`;
  statTotalInscrits.textContent = formatNumber(inscrits);
  statExprimes.textContent = formatNumber(exprimes);

  // Trier les partis par nombre de voix
  const sortedParties = Object.entries(electionData.vt)
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

    // Mettre à jour la couleur du polygone si présent
    if (polygonLayer) {
      polygonLayer.setStyle({ fillColor: winnerColor });
    }
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

  // Filtrer les forces représentatives pour le graphique
  const labels = sortedParties.map(p => p.party);
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
    // Recharger la commune active avec la nouvelle élection
    if (activeInsee) {
      selectCommune(activeInsee);
    }
  };
});

// Lancement au chargement de la page
window.onload = () => {
  initMap();
  initSearch();
};
