const BUREAU_SOURCE_LAYER = "repertoire-unique-electoral-polygons";
const BUREAU_PMTILES_URL = "https://object.files.data.gouv.fr/data-pipeline-open/reu/reu-france-entiere-2022-06-01-v2.pmtiles";

const BUREAU_ELECTIONS = {
  pres_2022_t1: {
    key: "p1",
    parties: ["LO", "PCF", "ENS", "DVD", "RN", "REC", "LFI", "PS", "VEC", "LR", "NPA", "DSV"]
  },
  pres_2022_t2: { key: "p2", parties: ["ENS", "RN"] },
  euro_2024: { key: "eu", parties: ["LRN", "LENS", "LUG", "LFI", "LLR", "LVEC", "LREC", "LCOM", "Autre"] }
};

const BUREAU_PARTY_NAMES = {
  LO: "Nathalie Arthaud", PCF: "Fabien Roussel", ENS: "Emmanuel Macron / Ensemble",
  DVD: "Jean Lassalle", RN: "Marine Le Pen / RN", REC: "Éric Zemmour / Reconquête",
  LFI: "Jean-Luc Mélenchon / LFI", PS: "Anne Hidalgo / PS", VEC: "Yannick Jadot / Écologistes",
  LR: "Valérie Pécresse / LR", NPA: "Philippe Poutou", DSV: "Nicolas Dupont-Aignan",
  LRN: "Rassemblement National", LENS: "Besoin d’Europe", LUG: "Réveiller l’Europe",
  LLR: "Les Républicains", LVEC: "Les Écologistes", LREC: "Reconquête !",
  LCOM: "Gauche Unie – PCF", Autre: "Autres listes"
};

const BUREAU_PARTY_COLORS = {
  LO: "#aa0000", PCF: "#dd0000", ENS: "#ffc20e", DVD: "#80c0ff", RN: "#0d385b",
  REC: "#800080", LFI: "#cc2443", PS: "#e40046", VEC: "#00a650", LR: "#0066cc",
  NPA: "#bb0000", DSV: "#4080ff", LRN: "#0d385b", LENS: "#ffc20e", LUG: "#e40046",
  LLR: "#0066cc", LVEC: "#00a650", LREC: "#800080", LCOM: "#dd0000", Autre: "#808080"
};

const routeParams = new URLSearchParams(window.location.search);
let selectedBureauElection = BUREAU_ELECTIONS[routeParams.get("election")]
  ? routeParams.get("election")
  : "pres_2022_t1";
const initialLat = Number(routeParams.get("lat")) || 46.2276;
const initialLng = Number(routeParams.get("lng")) || 2.2137;
const initialZoom = Number(routeParams.get("zoom")) || 13;

const departmentData = {};
const loadingDepartments = new Set();
let selectedOfficeId = null;
let initialSelectionAttempted = false;

const detailsPanel = document.getElementById("bureau-details");
const loadingMessage = document.getElementById("bureau-loading");
const electionPills = document.getElementById("bureau-election-pills");

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
protocol.add(new pmtiles.PMTiles(BUREAU_PMTILES_URL));

const bureauMap = new maplibregl.Map({
  container: "bureau-map",
  center: [initialLng, initialLat],
  zoom: Math.max(12, initialZoom),
  maxZoom: 19,
  style: {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap © CARTO"
      },
      reu: {
        type: "vector",
        url: `pmtiles://${BUREAU_PMTILES_URL}`,
        promoteId: "id_bv",
        attribution: "Contours estimés : Insee / data.gouv.fr"
      }
    },
    layers: [
      { id: "basemap", type: "raster", source: "basemap" },
      {
        id: "reu-fill", type: "fill", source: "reu", "source-layer": BUREAU_SOURCE_LAYER, minzoom: 12,
        paint: {
          "fill-color": ["coalesce", ["feature-state", "color"], "#64748b"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hasData"], false], 0.72, 0.28]
        }
      },
      {
        id: "reu-lines", type: "line", source: "reu", "source-layer": BUREAU_SOURCE_LAYER, minzoom: 12,
        paint: {
          "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#f59e0b", "rgba(255,255,255,0.65)"],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, ["interpolate", ["linear"], ["zoom"], 12, 0.4, 17, 1.5]]
        }
      }
    ]
  }
});

bureauMap.addControl(new maplibregl.NavigationControl(), "top-right");

function normalizeDepartmentCode(value) {
  const code = String(value || "").toUpperCase();
  return /^\d$/.test(code) ? code.padStart(2, "0") : code;
}

function getElectionData(office) {
  return office && office[BUREAU_ELECTIONS[selectedBureauElection].key];
}

function getOfficeColor(office) {
  const electionData = getElectionData(office);
  if (!electionData || !electionData[3].length) return "#64748b";
  const winnerIndex = electionData[3].reduce((best, value, index, values) => value > values[best] ? index : best, 0);
  const party = BUREAU_ELECTIONS[selectedBureauElection].parties[winnerIndex];
  return BUREAU_PARTY_COLORS[party] || "#64748b";
}

function applyDepartmentColors(depCode) {
  const offices = departmentData[depCode];
  if (!offices || !bureauMap.isStyleLoaded()) return;
  Object.entries(offices).forEach(([id, office]) => {
    bureauMap.setFeatureState(
      { source: "reu", sourceLayer: BUREAU_SOURCE_LAYER, id },
      { color: getOfficeColor(office), hasData: Boolean(getElectionData(office)) }
    );
  });
}

async function loadDepartment(depCode) {
  if (!depCode || departmentData[depCode] || loadingDepartments.has(depCode)) return;
  loadingDepartments.add(depCode);
  loadingMessage.classList.add("active");
  try {
    const response = await fetch(`bureaux_data/${encodeURIComponent(depCode)}.json`);
    if (!response.ok) throw new Error(`Données indisponibles pour le département ${depCode}`);
    departmentData[depCode] = await response.json();
    applyDepartmentColors(depCode);
  } catch (error) {
    console.warn(error.message);
    departmentData[depCode] = {};
  } finally {
    loadingDepartments.delete(depCode);
    if (loadingDepartments.size === 0) loadingMessage.classList.remove("active");
  }
}

function getVisibleOfficeFeatures(point = null) {
  const options = { layers: ["reu-fill"] };
  return point ? bureauMap.queryRenderedFeatures(point, options) : bureauMap.queryRenderedFeatures(options);
}

async function loadVisibleDepartments() {
  if (!bureauMap.isStyleLoaded()) return;
  const departments = new Set(getVisibleOfficeFeatures().map(feature => normalizeDepartmentCode(feature.properties.codeDepartement)));
  await Promise.all(Array.from(departments, loadDepartment));

  if (!initialSelectionAttempted && !selectedOfficeId) {
    initialSelectionAttempted = true;
    const centerFeatures = getVisibleOfficeFeatures(bureauMap.project(bureauMap.getCenter()));
    const feature = centerFeatures[0];
    if (feature) {
      selectOffice(String(feature.properties.id_bv || feature.id));
    }
  }
}

function findOffice(id) {
  for (const offices of Object.values(departmentData)) {
    if (offices[id]) return offices[id];
  }
  return null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value || 0);
}

function getCommuneOfficeCount(insee) {
  return Object.values(departmentData).reduce((count, offices) => (
    count + Object.values(offices).filter(office => office.c === insee).length
  ), 0);
}

function selectOffice(id) {
  if (selectedOfficeId) {
    bureauMap.setFeatureState(
      { source: "reu", sourceLayer: BUREAU_SOURCE_LAYER, id: selectedOfficeId },
      { selected: false }
    );
  }
  selectedOfficeId = id;
  bureauMap.setFeatureState(
    { source: "reu", sourceLayer: BUREAU_SOURCE_LAYER, id: selectedOfficeId },
    { selected: true }
  );
  renderOfficeDetails(selectedOfficeId);
}

function renderOfficeDetails(id) {
  const office = findOffice(id);
  const electionData = getElectionData(office);
  if (!office || !electionData) {
    detailsPanel.innerHTML = `<p class="empty-state">Résultats indisponibles pour ce secteur ou identifiant non raccordé au REU.</p>`;
    return;
  }

  const [registered, voters, expressed, votes] = electionData;
  const communeOfficeCount = getCommuneOfficeCount(office.c);
  const parties = BUREAU_ELECTIONS[selectedBureauElection].parties;
  const rows = votes.map((value, index) => ({
    party: parties[index], value, pct: expressed ? value / expressed * 100 : 0
  })).sort((a, b) => b.value - a.value);

  detailsPanel.innerHTML = `
    <h2>${office.n}</h2>
    <p class="bureau-meta">Bureau ${office.b} · INSEE ${office.c} · Secteur REU ${id}</p>
    <div class="scope-badge ${communeOfficeCount === 1 ? "single" : "multiple"}">
      ${communeOfficeCount === 1
        ? "Commune à bureau unique : ce secteur recouvre donc toute la commune."
        : `${formatNumber(communeOfficeCount)} bureaux dans cette commune · secteur ${office.b} sélectionné.`}
    </div>
    <div class="metrics">
      <div class="metric"><span>Inscrits</span><strong>${formatNumber(registered)}</strong></div>
      <div class="metric"><span>Participation</span><strong>${registered ? (voters / registered * 100).toFixed(1) : "0.0"} %</strong></div>
      <div class="metric"><span>Exprimés</span><strong>${formatNumber(expressed)}</strong></div>
    </div>
    ${rows.map(row => `
      <div class="result-row">
        <div class="result-heading">
          <span class="result-name">${BUREAU_PARTY_NAMES[row.party] || row.party}</span>
          <strong>${row.pct.toFixed(1)} %</strong>
        </div>
        <div class="result-bar"><div class="result-fill" style="width:${row.pct}%;background:${BUREAU_PARTY_COLORS[row.party] || "#808080"}"></div></div>
      </div>
    `).join("")}
  `;
}

bureauMap.on("idle", loadVisibleDepartments);
bureauMap.on("mousemove", "reu-fill", () => { bureauMap.getCanvas().style.cursor = "pointer"; });
bureauMap.on("mouseleave", "reu-fill", () => { bureauMap.getCanvas().style.cursor = ""; });
bureauMap.on("click", "reu-fill", async event => {
  const feature = event.features && event.features[0];
  if (!feature) return;
  const depCode = normalizeDepartmentCode(feature.properties.codeDepartement);
  await loadDepartment(depCode);
  selectOffice(String(feature.properties.id_bv || feature.id));
});

Array.from(electionPills.children).forEach(button => {
  button.classList.toggle("active", button.dataset.election === selectedBureauElection);
  button.onclick = () => {
    selectedBureauElection = button.dataset.election;
    Array.from(electionPills.children).forEach(item => item.classList.toggle("active", item === button));
    Object.keys(departmentData).forEach(applyDepartmentColors);
    if (selectedOfficeId) renderOfficeDetails(selectedOfficeId);
    const url = new URL(window.location.href);
    url.searchParams.set("election", selectedBureauElection);
    history.replaceState({}, "", `${url.pathname}${url.search}`);
  };
});

document.getElementById("btn-back").onclick = () => {
  if (history.length > 1) history.back();
  else window.location.href = "france.html";
};
