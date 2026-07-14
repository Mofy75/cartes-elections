// --- CONFIGURATION DES NUANCES ---
const NOMS_NUANCES = {
  "EXG": "Extrême gauche",
  "DXG": "Extrême gauche",
  "LFI": "La France Insoumise",
  "FI": "La France Insoumise",
  "NUP": "NUPES",
  "UG": "Union de la Gauche / NFP",
  "SOC": "Parti Socialiste",
  "PS": "Parti Socialiste",
  "RDG": "Parti Radical de Gauche",
  "DVG": "Divers gauche",
  "VEC": "Les Écologistes / EELV",
  "EELV": "Europe Écologie Les Verts",
  "ECO": "Écologistes",
  "ENS": "Ensemble (Majorité Pres.)",
  "LREM": "La République En Marche",
  "LREM Buzyn": "LREM (A. Buzyn)",
  "LREM Villani": "LREM (C. Villani)",
  "RE": "Renaissance",
  "UDI": "UDI",
  "UC": "Union du Centre",
  "DVC": "Divers centre",
  "LR": "Les Républicains",
  "DVD": "Divers droite",
  "DSV": "Droite souverainiste",
  "REC": "Reconquête!",
  "RN": "Rassemblement National",
  "EXD": "Extrême droite",
  "DXD": "Extrême droite",
  "DIV": "Divers",
  "REG": "Régionalistes",
  "SE": "Sans étiquette",
  "LUG": "Union de la Gauche",
  "LUD": "Union de la Droite",
  "LUC": "Union du Centre",
  "LDVG": "Divers gauche",
  "LDVD": "Divers droite",
  "LDVC": "Divers centre",
  "LECO": "Écologistes",
  "LREC": "Reconquête!",
  "LRN": "Rassemblement National",
  "LEXG": "Extrême gauche",
  "LEXD": "Extrême droite",
  "LREG": "Régionalistes",
  "LDSV": "Droite souverainiste"
};

const COULEURS_NUANCES = {
  "EXG": "#9b0000", "DXG": "#9b0000",
  "LFI": "#cc2443", "FI": "#cc2443", "NUP": "#cc2443",
  "UG": "#E40046", "SOC": "#E40046", "PS": "#E40046",
  "RDG": "#ff7400", "DVG": "#ff80a0",
  "VEC": "#00a650", "EELV": "#00a650", "ECO": "#00a650",
  "ENS": "#ffc20e", "LREM": "#ffc20e", "LREM Buzyn": "#ffc20e", "LREM Villani": "#ffaa00", "RE": "#ffc20e",
  "ALLI": "#ffcc00", "UDI": "#00d2ff", "UC": "#00d2ff", "DVC": "#ffeb80",
  "LR": "#0066cc", "DVD": "#80c0ff", "DSV": "#4080ff", "REC": "#8a2be2",
  "RN": "#002e66", "EXD": "#000020", "DXD": "#000020",
  "DIV": "#808080", "REG": "#c0c0c0", "SE": "#808080",
  "LUG": "#E40046", "LUD": "#0066cc", "LUC": "#ffc20e",
  "LDVG": "#ff80a0", "LDVD": "#80c0ff", "LDVC": "#ffeb80",
  "LECO": "#00a650", "LREC": "#8a2be2", "LRN": "#002e66",
  "LEXG": "#9b0000", "LEXD": "#000020", "LREG": "#c0c0c0",
  "LDSV": "#4080ff"
};

// --- CONFIGURATION DES OPTIONS VALIDES ---
const VALID_OPTIONS = {
  "2020": {
    types: ["municipales"],
    tours: ["t1", "t2"]
  },
  "2022": {
    types: ["presidentielles", "legislatives"],
    tours: ["t1", "t2"]
  },
  "2024": {
    types: ["europeennes", "legislatives"],
    tours: {
      "europeennes": ["t1"],
      "legislatives": ["t1", "t2"]
    }
  },
  "2026": {
    types: ["municipales"],
    tours: ["t1", "t2"]
  }
};

// State Variables
let selectedYear = "2026";
let selectedType = "municipales";
let selectedTour = "t1";
let myChart = null;

// DOM Elements
const yearPills = document.getElementById("year-pills");
const typePills = document.getElementById("type-pills");
const tourPills = document.getElementById("tour-pills");
const mapIframe = document.getElementById("map-iframe");
const loaderOverlay = document.getElementById("loader-overlay");

// Stats DOM Elements
const statWinnerName = document.getElementById("stat-winner-name");
const statWinnerScore = document.getElementById("stat-winner-score");
const statTurnout = document.getElementById("stat-turnout");
const statExprimes = document.getElementById("stat-exprimes");
const statTotalInscrits = document.getElementById("stat-total-inscrits");
const resultsList = document.getElementById("results-list");

function getElectionId(year, type, tour) {
  if (type === "europeennes") {
    return "europeennes_2024";
  }
  return `${type}_${year}_${tour}`;
}

function updateControlsUI() {
  // 1. Mettre à jour l'année active
  Array.from(yearPills.children).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.year === selectedYear);
  });

  // 2. Filtrer et reconstruire les boutons électoraux
  const allowedTypes = VALID_OPTIONS[selectedYear].types;
  if (!allowedTypes.includes(selectedType)) {
    selectedType = allowedTypes[0];
  }
  
  typePills.innerHTML = "";
  allowedTypes.forEach(type => {
    const btn = document.createElement("button");
    btn.className = `pill-btn ${type === selectedType ? 'active' : ''}`;
    btn.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    btn.dataset.type = type;
    btn.onclick = () => {
      selectedType = type;
      updateControlsUI();
      loadDashboard();
    };
    typePills.appendChild(btn);
  });

  // 3. Filtrer et reconstruire les boutons des tours
  let allowedTours = [];
  const yearTours = VALID_OPTIONS[selectedYear].tours;
  if (Array.isArray(yearTours)) {
    allowedTours = yearTours;
  } else {
    allowedTours = yearTours[selectedType] || ["t1"];
  }

  if (!allowedTours.includes(selectedTour)) {
    selectedTour = allowedTours[0];
  }

  tourPills.innerHTML = "";
  allowedTours.forEach(tour => {
    const btn = document.createElement("button");
    btn.className = `pill-btn ${tour === selectedTour ? 'active' : ''}`;
    btn.textContent = tour === "t1" ? "1er Tour" : "2nd Tour";
    btn.dataset.tour = tour;
    btn.onclick = () => {
      selectedTour = tour;
      updateControlsUI();
      loadDashboard();
    };
    tourPills.appendChild(btn);
  });
}

function showLoader(show) {
  loaderOverlay.classList.toggle("active", show);
}

function loadDashboard() {
  showLoader(true);
  const electionId = getElectionId(selectedYear, selectedType, selectedTour);
  
  // Mettre à jour l'iframe
  mapIframe.src = `outputs/${electionId}.html`;
  
  // Charger et traiter les données JSON
  const jsonPath = `../data/processed/${electionId}.json`;
  
  fetch(jsonPath)
    .then(res => {
      if (!res.ok) throw new Error("Impossible de charger les données électorales");
      return res.json();
    })
    .then(data => {
      processAndDisplayStats(data);
    })
    .catch(err => {
      console.error(err);
      displayEmptyStats();
    });
}

mapIframe.onload = () => {
  showLoader(false);
};

function processAndDisplayStats(data) {
  let totalInscrits = 0;
  let totalVotants = 0;
  let totalExprimes = 0;
  const partyVotesSum = {};

  data.forEach(bv => {
    totalInscrits += bv.inscrits;
    totalVotants += bv.votants;
    totalExprimes += bv.exprimes;

    if (bv.votes) {
      for (const [party, votes] of Object.entries(bv.votes)) {
        partyVotesSum[party] = (partyVotesSum[party] || 0) + votes;
      }
    }
  });

  const turnoutRate = totalInscrits > 0 ? (totalVotants / totalInscrits) * 100 : 0.0;
  
  // Trier les partis par nombre de voix global
  const sortedParties = Object.entries(partyVotesSum)
    .map(([party, votes]) => {
      const pct = totalExprimes > 0 ? (votes / totalExprimes) * 100 : 0.0;
      return { party, votes, pct };
    })
    .sort((a, b) => b.votes - a.votes);

  // Affichage des KPIs
  statTurnout.textContent = `${turnoutRate.toFixed(1)}%`;
  statTotalInscrits.textContent = totalInscrits.toLocaleString();
  statExprimes.textContent = totalExprimes.toLocaleString();

  if (sortedParties.length > 0) {
    const winner = sortedParties[0];
    const winnerName = NOMS_NUANCES[winner.party] || winner.party;
    const winnerColor = COULEURS_NUANCES[winner.party] || "#808080";
    
    statWinnerName.textContent = winnerName;
    statWinnerName.style.color = winnerColor;
    statWinnerScore.textContent = `${winner.pct.toFixed(1)}%`;
  } else {
    statWinnerName.textContent = "Aucun";
    statWinnerName.style.color = "inherit";
    statWinnerScore.textContent = "N/A";
  }

  // Liste des résultats
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
          <span class="party-votes">(${item.votes.toLocaleString()} voix)</span>
        </div>
        <div class="party-percentage">${item.pct.toFixed(1)}%</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${item.pct}%; background-color: ${color}"></div>
      </div>
    `;
    resultsList.appendChild(row);
  });

  // Graphique Doughnut
  renderChart(sortedParties);
}

function displayEmptyStats() {
  statTurnout.textContent = "N/A";
  statWinnerName.textContent = "Aucun";
  statWinnerName.style.color = "inherit";
  statWinnerScore.textContent = "N/A";
  statExprimes.textContent = "N/A";
  statTotalInscrits.textContent = "N/A";
  resultsList.innerHTML = "<div style='color: var(--text-muted); font-size: 0.85rem;'>Pas de données disponibles pour cette configuration.</div>";
  if (myChart) {
    myChart.destroy();
    myChart = null;
  }
}

function renderChart(sortedParties) {
  const ctx = document.getElementById("results-chart").getContext("2d");
  
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
        borderWidth: 1,
        borderColor: '#151C2C'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Masqué pour gagner de la place (les étiquettes sont déjà dans la liste)
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw.toFixed(1)}%`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Initialisation des boutons d'année
yearPills.innerHTML = "";
Object.keys(VALID_OPTIONS).sort().reverse().forEach(year => {
  const btn = document.createElement("button");
  btn.className = `pill-btn ${year === selectedYear ? 'active' : ''}`;
  btn.textContent = year;
  btn.dataset.year = year;
  btn.onclick = () => {
    selectedYear = year;
    updateControlsUI();
    loadDashboard();
  };
  yearPills.appendChild(btn);
});

// Lancement initial
updateControlsUI();
loadDashboard();
