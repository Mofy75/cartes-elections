# Cahier des Charges : Extension Cartographique & Routage Dynamique (France Vote / Paris Vote)

Ce document sert de spécification technique pour guider la suite du développement du projet de cartes électorales (2020 - 2026), notamment pour la prise de relais par un autre agent ou développeur.

---

## 🗺️ État Actuel du Projet

L'application est structurée sous forme de site statique dans le dossier `docs/` (hébergé sur GitHub Pages ou exécutable localement en protocole `file://` sans restrictions CORS grâce à la pré-agrégation des données).

1. **Portail d'Accueil (`index.html`)** : Permet de choisir entre le module de Paris (bureau de vote) et le module national (communes).
2. **Paris Vote (`paris.html`)** : Visualisation interactive à l'échelle des **bureaux de vote** parisiens (2020-2026) avec contrôle de couches personnalisé dans la barre latérale.
3. **France Vote (`france.html`)** :
   - Base de données des 35 000 communes optimisée en tableaux compressés (poids total de **5,6 Mo** dans `france_stats_data.js`).
   - Agrégat national cumulé sous le code INSEE `"00000"` affiché par défaut au démarrage.
   - Tracé des polygones communaux récupéré à la volée via l'API géographique de l'État : `https://geo.api.gouv.fr/communes/{code_insee}?format=geojson&geometry=contour`.
   - **Zoom multiniveau dynamique** : Affiche les 96 départements coloriés au zoom < 8. Dès que zoom >= 8, charge et affiche les communes du département le plus proche du centre de la carte via `geo.api.gouv.fr/departements/{code_dep}/communes`.
   - **Routage de base** : Gère l'historique URL `?insee=XXXXX` et l'événement `popstate` (boutons retour/suivant du navigateur).

---

## 🎯 Nouveaux Objectifs & Spécifications

> **État au 14 juillet 2026 :** les objectifs ci-dessous sont désormais implémentés dans
> `docs/france_app.js` et `docs/app.js`. Ce document reste la référence fonctionnelle
> pour les tests et les évolutions futures.

### 🚀 1. Routage URL à l'Échelle Départementale
* **Comportement attendu** : 
  - Lorsque la carte est à l'échelle nationale (sans commune spécifique sélectionnée, soit `activeInsee === "00000"`) et que l'utilisateur zoome à un niveau où les communes d'un département s'affichent (zoom >= 8), l'URL doit se mettre à jour pour refléter ce département.
  - Exemple de paramètre d'URL : `france.html?dep=75` (ou hash).
  - Si l'utilisateur fait glisser la carte (pan) et que le département affiché change, l'URL doit suivre en temps réel (ex: passe de `?dep=75` à `?dep=92`).
  - **Historique & popstate** : Les changements de département via le déplacement/zoom de la carte ne doivent pas encombrer inutilement l'historique de navigation de centaines de mouvements. Utiliser `history.replaceState` pour les déplacements cartographiques fluides, et `history.pushState` uniquement lors d'un choix explicite ou d'une transition majeure (département à commune).
  - Si l'utilisateur clique sur le bouton **Retour** de son navigateur alors que `?dep=75` est actif, la carte doit dézoomer au niveau national (zoom < 8, URL `france.html`).

---

### 🔍 2. Zoom jusqu'au niveau Bureau de Vote (Redirection vers Paris)
* **Contexte** : Il n'existe pas de base de données géographique unifiée nationale représentant les bureaux de vote pour toute la France. La granularité bureau de vote n'est disponible que pour Paris dans le fichier `paris.html`.
* **Comportement attendu** :
  - Si un utilisateur est sur la carte nationale `france.html`, sélectionne Paris (INSEE `75056` ou un arrondissement `751XX`) et continue de zoomer très près (zoom >= 12), l'application doit effectuer une **redirection automatique** vers la carte détaillée de Paris `paris.html`.
  - **Transmission des paramètres** : Lors de la redirection, l'arrondissement sélectionné doit être transmis à `paris.html` dans les paramètres d'URL (ou hash) afin que la carte de Paris s'ouvre directement sur le bon arrondissement et le bon scrutin (ex: `paris.html?insee=75105`).
  - **Bouton Retour** : La navigation entre les deux pages HTML doit préserver l'historique. L'utilisateur doit pouvoir cliquer sur le bouton **Retour** de son navigateur depuis `paris.html` pour revenir instantanément sur la commune de Paris dans `france.html`.

---

## 🛠️ Recommandations d'Implémentation Technique

### A. Écouter le Zoom et le Déplacement dans `france_app.js`
Pour suivre le département ciblé à l'écran :
```javascript
map.on('moveend', () => {
  if (activeInsee === "00000" && map.getZoom() >= 8) {
    const center = map.getCenter();
    const closestDep = getClosestDepartment(center);
    if (closestDep) {
      // Mettre à jour l'URL avec replaceState pour ne pas casser l'historique de retour
      history.replaceState({ dep: closestDep }, "", `?dep=${closestDep}`);
    }
  }
});
```

### B. Intercepter le Zoom maximal
Dans le gestionnaire `zoomend` ou `moveend` :
```javascript
map.on('zoomend', () => {
  const zoom = map.getZoom();
  // Si zoom très élevé sur Paris, rediriger automatiquement vers paris.html
  if (zoom >= 12 && (activeInsee === "75056" || activeInsee.startsWith("751"))) {
    window.location.href = `paris.html?insee=${activeInsee}`;
  }
});
```

### C. Réception du Paramètre dans `paris.html` / `app.js`
Dans `docs/app.js`, à l'initialisation de la page de Paris :
- Lire le paramètre `insee` depuis l'URL.
- Si le paramètre est présent, sélectionner automatiquement l'arrondissement correspondant et focaliser la carte sur celui-ci au démarrage.
