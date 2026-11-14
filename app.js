const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "chroniques_groq_save_v1";
const SETTINGS_KEY = "chroniques_groq_settings_v1";

const THEMES = {
  fantasy: "Fantasy épique : royaumes anciens, magie merveilleuse, créatures mythiques, exploration et grands choix moraux.",
  dark: "Fantasy mystérieuse : atmosphère inquiétante mais non graphique, secrets, ruines, mystères et tension.",
  comedy: "Fantasy décalée : aventure chaleureuse, humour, personnages hauts en couleur et rebondissements absurdes.",
  pirates: "Pirates fantastiques : mers étranges, îles mystérieuses, équipages, cartes et trésors légendaires.",
  scifi: "Science-fiction : exploration spatiale, stations abandonnées, civilisations inconnues et technologie étrange."
};
const CLASSES = ["Guerrier", "Mage", "Voleur", "Prêtre", "Rôdeur", "Barde", "Paladin", "Alchimiste", "Autre"];

let game = null;
let settings = loadSettings();
let busy = false;
let toastTimer = null;

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { apiKey: "", model: "openai/gpt-oss-20b" }; }
  catch { return { apiKey: "", model: "openai/gpt-oss-20b" }; }
}
function persistSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function saveGame() {
  if (!game) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  $("saveStatus").textContent = "Sauvegardé localement";
}
function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function setBusy(value, message = "Le maître du jeu réfléchit...") {
  busy = value;
  $("busyText").textContent = message;
  $("busyOverlay").hidden = !value;
  $("resolveBtn").disabled = value;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function clamp(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;
}
function makeId() { return Math.random().toString(36).slice(2, 10); }

function addSetupPlayer(name = "", characterClass = "Guerrier") {
  const row = document.createElement("div");
  row.className = "player-setup-row";
  row.innerHTML = `<input class="setup-name" maxlength="28" placeholder="Nom du joueur" value="${escapeHTML(name)}">
    <select class="setup-class">${CLASSES.map(c => `<option ${c === characterClass ? "selected" : ""}>${c}</option>`).join("")}</select>
    <button class="remove-player" type="button" title="Retirer">×</button>`;
  row.querySelector(".remove-player").addEventListener("click", () => {
    if ($("playersSetup").children.length <= 1) return showToast("Il faut au moins un joueur.");
    row.remove();
  });
  $("playersSetup").append(row);
}
function readSetupPlayers() {
  return [...$("playersSetup").querySelectorAll(".player-setup-row")].map((row, i) => ({
    id: makeId(),
    name: row.querySelector(".setup-name").value.trim() || `Joueur ${i + 1}`,
    class: row.querySelector(".setup-class").value,
    hp: 20, maxHp: 20, level: 1, xp: 0, gold: 10, inventory: ["Sac de voyage", "Rations (3)"], conditions: []
  }));
}
function themePrompt() {
  if ($("themeSelect").value === "custom") return $("customPrompt").value.trim() || "Fantasy d'aventure classique.";
  return THEMES[$("themeSelect").value];
}

function openSettings() {
  $("apiKey").value = settings.apiKey || "";
  $("modelSelect").value = settings.model || "openai/gpt-oss-20b";
  $("settingsMessage").textContent = "";
  $("settingsDialog").showModal();
}
async function groqRequest(messages, options = {}) {
  if (!settings.apiKey) throw new Error("Ajoute d'abord ta clé API Groq dans les paramètres.");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model || "openai/gpt-oss-20b",
      messages,
      temperature: options.temperature ?? 0.75,
      max_completion_tokens: options.maxTokens ?? 1800
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Erreur Groq (${response.status})`;
    throw new Error(message);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq a renvoyé une réponse vide.");
  return content;
}
function extractJSON(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error("La réponse du maître du jeu n'est pas un JSON valide. Réessaie le tour.");
}
function systemPrompt() {
  return `Tu es le maître du jeu d'un jeu de rôle narratif multijoueur, dans l'ambiance suivante : ${game.themePrompt}

RÈGLES :
- Écris en français, avec une narration immersive, claire, vivante et adaptée à des joueurs adolescents. Pas de gore, de descriptions graphiques ou de contenu sexuel.
- Fais respecter la cohérence du monde, les capacités, les objets, les blessures, les ressources et les conséquences.
- Ne décide jamais à la place des personnages. Les joueurs décrivent leurs intentions.
- Les actions risquées peuvent demander des dés. Demande seulement les jets utiles. Utilise des dés classiques (d20, d12, d10, d8, d6, d4) et un modificateur entier.
- Pour une attaque fictive, une esquive, une négociation, une exploration ou un sort, choisis un jet cohérent. Un d20 est généralement adapté.
- Le programme lance réellement les dés après ta demande. Ne prétends jamais avoir lancé un dé toi-même.
- Ne donne pas automatiquement la réussite : interprète le résultat du jet et le contexte.
- Ne tue pas un personnage joueur sans laisser de choix narratif raisonnable. À 0 PV, le personnage est hors de combat et le groupe peut chercher une solution.
- Les objets gagnés/perdus et les changements de PV/or/XP doivent être justifiés dans le récit. Ne crée pas d'objets dans les inventaires sans l'indiquer dans le texte.
- Garde les valeurs raisonnables. Les PV ne dépassent pas maxHp. Pas de changement arbitraire des noms/classes.
- La situation doit avancer et proposer des possibilités, sans imposer une liste de choix obligatoire.
- Réponds STRICTEMENT avec un objet JSON valide, sans Markdown ni texte avant/après.

FORMAT EXACT :
{
  "narrative": "Texte de la scène et conséquences, 2 à 5 paragraphes courts",
  "location": "Nom précis du lieu actuel",
  "scene_status": "Exploration, Rencontre, Combat, Repos...",
  "summary": "Résumé persistant de la situation en 2 à 4 phrases",
  "dice_requests": [
    {"player_id":"ID exact", "label":"Test de perception", "sides":20, "count":1, "modifier":2, "reason":"Repérer le mécanisme"}
  ],
  "player_updates": [
    {"player_id":"ID exact", "hp":18, "xp":5, "gold":10, "conditions":["Fatigué"], "inventory_add":["Clé rouillée"], "inventory_remove":["Rations (1)"]}
  ],
  "round_note": "Résumé très court du tour pour le journal"
}
Pour les champs de mise à jour non modifiés, omets-les. Pour un inventaire inchangé, omets inventory_add et inventory_remove. Les dés doivent être demandés dans dice_requests lors de la première phase. Lors de la seconde phase, conserve les résultats fournis et renvoie dice_requests: [].`;
}
function recentHistory() {
  return game.history.slice(-5).map(h => ({ role: "assistant", content: h.text }));
}
function compactState() {
  return {
    round: game.round, location: game.location, summary: game.summary,
    players: game.players.map(p => ({
      id: p.id, name: p.name, class: p.class, hp: p.hp, maxHp: p.maxHp,
      level: p.level, xp: p.xp, gold: p.gold, conditions: p.conditions, inventory: p.inventory
    }))
  };
}
function buildUserContext(decisions, phase, rolls = []) {
  return JSON.stringify({
    phase,
    campaign: game.campaignName,
    theme: game.themePrompt,
    current_state: compactState(),
    last_five_messages: recentHistory(),
    latest_player_decisions: decisions,
    dice_results: rolls,
    instructions: phase === "opening"
      ? "Présente le prologue et lance l'aventure. Aucun jet n'est nécessaire pour cette introduction : dice_requests et player_updates doivent être []."
      : phase === "request_dice"
        ? "Analyse toutes les décisions. Demande les jets nécessaires dans dice_requests. Donne une courte narration provisoire. Ne modifie pas encore les statistiques : player_updates doit être []."
        : "Voici les résultats réellement tirés par le programme. Raconte les conséquences et mets à jour précisément les statistiques/inventaires. Ne demande aucun autre dé : dice_requests doit être []."
  }, null, 2);
}
function rollDice(requests) {
  const results = [];
  for (const req of requests.slice(0, 20)) {
    const player = game.players.find(p => p.id === req.player_id);
    if (!player) continue;
    const sides = clamp(req.sides, 2, 100);
    const count = clamp(req.count, 1, 10);
    const modifier = clamp(req.modifier ?? 0, -30, 30);
    const rolls = [];
    for (let i = 0; i < count; i++) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      rolls.push((array[0] % sides) + 1);
    }
    results.push({
      player_id: player.id, player_name: player.name,
      label: String(req.label || "Jet de dés").slice(0, 80),
      reason: String(req.reason || "").slice(0, 140),
      sides, rolls, modifier, total: rolls.reduce((a, b) => a + b, 0) + modifier
    });
  }
  return results;
}
function validateAndApply(updates) {
  for (const update of (Array.isArray(updates) ? updates : [])) {
    const player = game.players.find(p => p.id === update.player_id);
    if (!player) continue;
    if (update.hp !== undefined) player.hp = clamp(update.hp, 0, player.maxHp);
    if (update.xp !== undefined) player.xp = clamp(update.xp, 0, 1000000);
    if (update.gold !== undefined) player.gold = clamp(update.gold, 0, 1000000);
    if (Array.isArray(update.conditions)) player.conditions = update.conditions.map(x => String(x).slice(0, 40)).slice(0, 8);
    if (Array.isArray(update.inventory_add)) {
      for (const item of update.inventory_add.slice(0, 12)) {
        const clean = String(item).trim().slice(0, 70);
        if (clean && player.inventory.length < 40) player.inventory.push(clean);
      }
    }
    if (Array.isArray(update.inventory_remove)) {
      for (const item of update.inventory_remove) {
        const index = player.inventory.indexOf(String(item));
        if (index !== -1) player.inventory.splice(index, 1);
      }
    }
    while (player.xp >= player.level * 100 && player.level < 20) {
      player.xp -= player.level * 100;
      player.level++;
      player.maxHp += 4;
      player.hp = Math.min(player.maxHp, player.hp + 4);
      game.history.push({ round: game.round, text: `${player.name} passe au niveau ${player.level} !` });
    }
  }
}
function addHistory(text) {
  game.history.push({ round: game.round, text: String(text || "Le groupe poursuit son aventure.").slice(0, 1200) });
  if (game.history.length > 100) game.history = game.history.slice(-100);
}
function renderDice(rolls) {
  const box = $("diceLog");
  box.hidden = !rolls.length;
  box.innerHTML = rolls.map(r => `<span class="die">🎲 ${escapeHTML(r.player_name)} · ${escapeHTML(r.label)} : ${r.rolls.join(" + ")}${r.modifier ? ` ${r.modifier > 0 ? "+" : "−"} ${Math.abs(r.modifier)}` : ""} = <b>${r.total}</b></span>`).join("");
}
function renderGame() {
  if (!game) return;
  $("setupScreen").hidden = true;
  $("gameScreen").hidden = false;
  $("campaignTitle").textContent = game.campaignName;
  $("roundNumber").textContent = game.round;
  $("locationLabel").textContent = game.location || "Lieu inconnu";
  $("sceneStatus").textContent = game.sceneStatus || "Exploration";
  $("storyText").textContent = game.story || "L'aventure commence...";
  $("summaryText").textContent = game.summary || "Aucun résumé pour le moment.";
  $("partyCount").textContent = game.players.length;
  $("partyStats").innerHTML = game.players.map(p => {
    const hpPercent = Math.max(0, Math.min(100, p.hp / p.maxHp * 100));
    return `<div class="character">
      <div class="character-name"><span>${escapeHTML(p.name)} <span class="character-class">· ${escapeHTML(p.class)}</span></span><span>Niv. ${p.level}</span></div>
      <div class="hp-line"><span>PV</span><span>${p.hp} / ${p.maxHp}</span></div>
      <div class="hp-track"><div class="hp-fill" style="width:${hpPercent}%"></div></div>
      <div class="character-meta"><span>✦ ${p.xp} XP</span><span>◈ ${p.gold} or</span><span>${p.conditions.length ? escapeHTML(p.conditions.join(", ")) : "En forme"}</span></div>
    </div>`;
  }).join("");
  $("inventories").innerHTML = game.players.map(p => `<div class="inventory-group"><div class="inventory-name">${escapeHTML(p.name)}</div><div class="inventory-items">${p.inventory.length ? p.inventory.map(escapeHTML).join(" · ") : "Inventaire vide"}</div></div>`).join("");
  $("historyList").innerHTML = game.history.slice(-8).reverse().map(h => `<div class="history-entry"><time>TOUR ${h.round}</time><p>${escapeHTML(h.text)}</p></div>`).join("") || `<p class="small-hint">Le journal est vide.</p>`;
  $("decisions").innerHTML = game.players.map((p, i) => `<div class="decision-card">
    <div class="decision-top"><strong>${escapeHTML(p.name)}</strong><span>${escapeHTML(p.class)} · ${p.hp} PV</span></div>
    <textarea data-player="${p.id}" placeholder="${escapeHTML(p.name)}, que fais-tu ? (décris ton action...)"></textarea>
  </div>`).join("");
  saveGame();
}
function showSetup() {
  $("gameScreen").hidden = true;
  $("setupScreen").hidden = false;
}
function startGame() {
  const players = readSetupPlayers();
  if (players.length < 1) return showToast("Ajoute au moins un joueur.");
  if (!settings.apiKey) { openSettings(); return showToast("Ajoute ta clé Groq pour commencer."); }
  game = {
    version: 1, campaignName: $("campaignName").value.trim() || "Les Chroniques oubliées",
    themePrompt: themePrompt(), round: 1, location: "À déterminer", sceneStatus: "Prologue",
    story: "Le maître du jeu prépare votre aventure...", summary: "Le groupe vient de se réunir. Son histoire reste à écrire.",
    players, history: []
  };
  renderGame();
  resolveOpening();
}
async function resolveOpening() {
  setBusy(true, "Le monde prend forme...");
  try {
    const content = await groqRequest([
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildUserContext([], "opening") }
    ]);
    const result = extractJSON(content);
    game.story = String(result.narrative || "Votre aventure commence.").slice(0, 6000);
    game.location = String(result.location || "Lieu inconnu").slice(0, 100);
    game.sceneStatus = String(result.scene_status || "Exploration").slice(0, 60);
    game.summary = String(result.summary || "").slice(0, 1200);
    addHistory(result.round_note || "L'aventure commence.");
    renderGame();
  } catch (error) { showToast(error.message); }
  finally { setBusy(false); }
}
async function resolveTurn() {
  if (!game || busy) return;
  const decisions = [...$("decisions").querySelectorAll("textarea")].map(area => ({
    player_id: area.dataset.player,
    player_name: game.players.find(p => p.id === area.dataset.player)?.name,
    decision: area.value.trim()
  })).filter(d => d.decision);
  if (!decisions.length) return showToast("Les joueurs doivent écrire au moins une action.");
  setBusy(true, "Le maître du jeu examine vos actions...");
  try {
    const first = extractJSON(await groqRequest([
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildUserContext(decisions, "request_dice") }
    ], { maxTokens: 1200 }));
    const rolls = rollDice(Array.isArray(first.dice_requests) ? first.dice_requests : []);
    setBusy(true, rolls.length ? "Les dés roulent..." : "Le maître du jeu raconte la suite...");
    const second = extractJSON(await groqRequest([
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildUserContext(decisions, "resolve", rolls) }
    ], { maxTokens: 1800 }));
    game.story = String(second.narrative || first.narrative || "Le tour se termine.").slice(0, 6000);
    game.location = String(second.location || game.location).slice(0, 100);
    game.sceneStatus = String(second.scene_status || "Exploration").slice(0, 60);
    game.summary = String(second.summary || game.summary).slice(0, 1200);
    validateAndApply(second.player_updates);
    addHistory(second.round_note || decisions.map(d => `${d.player_name} : ${d.decision}`).join(" | "));
    game.round++;
    renderDice(rolls);
    renderGame();
    // renderGame rebuilds decision fields; show the actual dice from this turn afterwards.
    renderDice(rolls);
  } catch (error) {
    showToast(error.message);
  } finally { setBusy(false); }
}

$("addPlayerBtn").addEventListener("click", () => {
  if ($("playersSetup").children.length >= 8) return showToast("Maximum : 8 joueurs.");
  addSetupPlayer();
});
$("themeSelect").addEventListener("change", () => { $("customPromptField").hidden = $("themeSelect").value !== "custom"; });
$("startBtn").addEventListener("click", startGame);
$("settingsBtn").addEventListener("click", openSettings);
$("saveSettingsBtn").addEventListener("click", () => {
  settings.apiKey = $("apiKey").value.trim();
  settings.model = $("modelSelect").value;
  persistSettings();
  $("settingsMessage").textContent = "Paramètres enregistrés sur cet appareil.";
  showToast("Paramètres Groq enregistrés.");
});
$("testKeyBtn").addEventListener("click", async () => {
  const old = settings;
  settings = { apiKey: $("apiKey").value.trim(), model: $("modelSelect").value };
  $("settingsMessage").textContent = "Test en cours...";
  try {
    const answer = await groqRequest([{ role: "user", content: "Réponds uniquement : connexion réussie." }], { maxTokens: 30, temperature: 0 });
    $("settingsMessage").textContent = `✓ ${answer.slice(0, 100)}`;
  } catch (e) { $("settingsMessage").textContent = `Erreur : ${e.message}`; }
  finally { settings = old; }
});
$("resolveBtn").addEventListener("click", resolveTurn);
$("newGameBtn").addEventListener("click", () => {
  if (!confirm("Créer une nouvelle partie ? La partie actuelle restera disponible dans le fichier exporté uniquement.")) return;
  game = null; localStorage.removeItem(STORAGE_KEY); showSetup();
});
$("exportBtn").addEventListener("click", () => {
  if (!game) return;
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${game.campaignName.replace(/[^a-z0-9-_]/gi, "_")}.json`; a.click();
  URL.revokeObjectURL(url);
});
$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.players) || !imported.players.length || !imported.players.every(p => p.id && p.name && Array.isArray(p.inventory))) throw new Error("Fichier de sauvegarde invalide.");
    game = imported; renderGame(); showToast("Sauvegarde importée.");
  } catch (e) { showToast(e.message || "Impossible d'importer ce fichier."); }
  event.target.value = "";
});

addSetupPlayer("Joueur 1", "Guerrier");
addSetupPlayer("Joueur 2", "Mage");
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved?.players?.length) { game = saved; renderGame(); }
} catch {}
