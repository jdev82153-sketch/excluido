```javascript
"use strict";

const $ = id => document.getElementById(id);

const STORAGE = {
  favorites: "leadbr_v2_favorites",
  config: "leadbr_v2_api_config"
};

const defaultConfig = {
  url: "",
  method: "GET",
  authType: "none",
  token: "",
  headerName: "x-api-key",
  resultsParam: "limit",
  queryParam: "segment",
  cityParam: "city",
  stateParam: "state",
  responsePath: ""
};

let config = loadConfig();
let leads = [];
let favorites = loadJSON(STORAGE.favorites, []);
let lastTest = "Nenhum teste realizado";
let connectionGood = false;

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function loadConfig() {
  return { ...defaultConfig, ...loadJSON(STORAGE.config, {}) };
}

function saveConfig() {
  config = {
    url: $("apiUrl").value.trim(),
    method: $("apiMethod").value,
    authType: $("authType").value,
    token: $("apiToken").value.trim(),
    headerName: $("headerName").value.trim() || "x-api-key",
    resultsParam: $("resultsParam").value.trim(),
    queryParam: $("queryParam").value.trim(),
    cityParam: $("cityParam").value.trim(),
    stateParam: $("stateParam").value.trim(),
    responsePath: $("responsePath").value.trim()
  };

  localStorage.setItem(STORAGE.config, JSON.stringify(config));
  updateConnectionUI();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[ch]);
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeLead(raw) {
  const website = raw.website || raw.site || raw.url || "";
  const phone = raw.phone || raw.telephone || raw.phone_number || "";
  const whatsapp = raw.whatsapp || raw.whatsapp_number || phone || "";
  const instagram = raw.instagram || raw.instagram_url || "";
  const rating = Number(raw.rating || raw.google_rating || 0);
  const reviews = Number(raw.reviews || raw.review_count || raw.user_ratings_total || 0);

  // Score heurístico: serve para priorizar prospecção, não é garantia de conversão.
  let score = 0;
  if (!website) score += 45;
  if (!instagram) score += 15;
  if (whatsapp || phone) score += 10;
  if (rating > 0 && rating < 4.5) score += 8;
  if (!reviews || reviews < 20) score += 12;
  if (raw.city || raw.address) score += 5;
  if (raw.email) score += 5;

  score = Math.min(score, 100);
  const opportunity = score >= 60 ? "high" : score >= 35 ? "medium" : "low";

  return {
    ...raw,
    name: raw.name || raw.title || raw.business_name || "Empresa sem nome",
    city: raw.city || "",
    state: raw.state || raw.uf || "",
    phone,
    whatsapp,
    website,
    instagram,
    rating,
    reviews,
    score,
    opportunity
  };
}

function leadKey(lead) {
  return `${lead.name}|${lead.phone || lead.whatsapp || ""}|${lead.city || ""}`;
}

function isFavorite(lead) {
  return favorites.some(item => leadKey(item) === leadKey(lead));
}

function persistFavorites() {
  localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
  $("favCount").textContent = favorites.length;
  $("statFavorites").textContent = favorites.length;
}

function toggleFavorite(key) {
  const lead = leads.find(item => leadKey(item) === key) ||
               favorites.find(item => leadKey(item) === key);

  if (!lead) return;

  if (isFavorite(lead)) {
    favorites = favorites.filter(item => leadKey(item) !== key);
    toast("Lead removido dos favoritos.");
  } else {
    favorites.push(lead);
    toast("Lead salvo nos favoritos.");
  }

  persistFavorites();
  renderLeads();
  renderFavorites();
}

function scoreText(level) {
  return level === "high" ? "🔥 Alta oportunidade" :
         level === "medium" ? "⚡ Média oportunidade" :
         "✓ Baixa oportunidade";
}

function safeExternalURL(value, kind) {
  if (!value) return "";
  let input = String(value).trim();

  if (kind === "instagram" && !/^https?:\/\//i.test(input)) {
    input = "https://instagram.com/" + input.replace(/^@/, "");
  } else if (!/^https?:\/\//i.test(input)) {
    input = "https://" + input;
  }

  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function createCard(lead) {
  const key = leadKey(lead);
  const encodedKey = encodeURIComponent(key);
  const phone = normalizePhone(lead.whatsapp || lead.phone);
  const wa = phone ? `https://wa.me/${phone}` : "";
  const site = safeExternalURL(lead.website);
  const instagram = safeExternalURL(lead.instagram, "instagram");
  const fav = isFavorite(lead);
  const location = [lead.city, lead.state].filter(Boolean).join(" / ") || "Localização não informada";

  return `
    <article class="lead-card">
      <div class="lead-top">
        <div>
          <h3 class="lead-name">${escapeHTML(lead.name)}</h3>
          <div class="lead-location">📍 ${escapeHTML(location)}</div>
        </div>
        <button class="fav-btn ${fav ? "on" : ""}" data-favorite="${encodedKey}" title="Favoritar">${fav ? "★" : "☆"}</button>
      </div>

      <div class="score ${lead.opportunity}">${scoreText(lead.opportunity)} · ${lead.score}/100</div>

      <div class="lead-info">
        <div>⭐ ${lead.rating ? escapeHTML(lead.rating) : "Sem avaliação"}${lead.reviews ? ` · ${escapeHTML(lead.reviews)} avaliações` : ""}</div>
        <div>📞 ${escapeHTML(lead.phone || "Telefone não informado")}</div>
        <div>🌐 ${site ? "Site disponível" : "Sem site informado"}</div>
        <div>📸 ${instagram ? "Instagram disponível" : "Instagram não informado"}</div>
      </div>

      <div class="lead-actions">
        ${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ""}
        ${site ? `<a href="${site}" target="_blank" rel="noopener noreferrer">Site ↗</a>` : ""}
        ${instagram ? `<a href="${instagram}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>` : ""}
        <button data-approach="${encodedKey}">Copiar abordagem</button>
      </div>
    </article>`;
}

function renderLeads() {
  const filter = $("opportunityFilter").value;
  const siteFilter = $("siteFilter").value;

  let shown = leads.filter(lead => {
    const opportunityOK = filter === "all" || lead.opportunity === filter;
    const siteOK = siteFilter === "all" ||
      (siteFilter === "no-site" && !lead.website) ||
      (siteFilter === "has-site" && !!lead.website);
    return opportunityOK && siteOK;
  });

  $("resultsTitle").textContent = `${shown.length} lead${shown.length === 1 ? "" : "s"}`;
  $("resultsSubtitle").textContent = leads.length
    ? "Revise os contatos e priorize as melhores oportunidades."
    : "Faça uma pesquisa para visualizar empresas.";

  $("statTotal").textContent = leads.length;
  $("statHigh").textContent = leads.filter(l => l.opportunity === "high").length;
  $("statPhone").textContent = leads.filter(l => l.phone || l.whatsapp).length;

  const root = $("results");

  if (!shown.length) {
    root.innerHTML = `<div class="empty-state"><span>⌕</span><h3>Nenhuma empresa encontrada</h3><p>Faça uma busca ou altere os filtros.</p></div>`;
    return;
  }

  root.innerHTML = shown.map(createCard).join("");
}

function renderFavorites() {
  const root = $("favoritesResults");

  if (!favorites.length) {
    root.innerHTML = `<div class="empty-state"><span>☆</span><h3>Você ainda não salvou leads.</h3><p>Use a estrela de um resultado para adicioná-lo aqui.</p></div>`;
    return;
  }

  root.innerHTML = favorites.map(createCard).join("");
}

function updateStats() {
  $("statTotal").textContent = leads.length;
  $("statHigh").textContent = leads.filter(l => l.opportunity === "high").length;
  $("statPhone").textContent = leads.filter(l => l.phone || l.whatsapp).length;
  $("statFavorites").textContent = favorites.length;
  $("favCount").textContent = favorites.length;
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(el => el.classList.remove("active"));

  $(`page-${page}`).classList.add("active");
  document.querySelector(`.nav[data-page="${page}"]`)?.classList.add("active");

  const titles = {
    dashboard: ["Seu painel de oportunidades", "Encontre empresas, identifique oportunidades e organize seus contatos."],
    search: ["Encontrar leads", "Pesquise empresas por segmento e localização."],
    favorites: ["Seus favoritos", "Acesse os leads que você salvou."],
    api: ["Configuração da API", "Gerencie a conexão com sua fonte de dados."]
  };

  $("pageTitle").textContent = titles[page][0];
  $("pageSubtitle").textContent = titles[page][1];

  if (page === "favorites") renderFavorites();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});

function setApiMessage(message, type = "success") {
  const box = $("apiMessage");
  box.className = `api-message show ${type}`;
  box.textContent = message;
}

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("show"), 2800);
}

function updateAuthFields() {
  const type = $("authType").value;
  $("tokenFields").classList.toggle("hidden", type === "none");
  $("headerNameField").classList.toggle("hidden", type !== "header");
}

function updateConnectionUI() {
  const configured = Boolean(config.url);
  $("connectionStatus").classList.toggle("connected", connectionGood);
  $("connectionStatus").innerHTML = `<i></i> ${connectionGood ? "API conectada" : configured ? "API configurada" : "Demonstração"}`;
  $("sidebarStatus").textContent = connectionGood ? "API conectada" : configured ? "API configurada" : "Modo demonstração";
  $("apiBannerTitle").textContent = connectionGood ? "API respondendo" : configured ? "API configurada — teste pendente" : "API ainda não configurada";
  $("apiBannerText").textContent = connectionGood ? "O último teste retornou uma resposta válida." : configured ? "Teste a conexão para verificar se o endpoint está acessível." : "Configure o endereço do seu backend para habilitar consultas reais.";
  $("apiLight").className = `status-light ${connectionGood ? "good" : ""}`;
  $("apiStateText").textContent = connectionGood ? "Conectada" : configured ? "Configurada, não testada" : "Não configurada";
  $("apiLastTest").textContent = lastTest;
}

function fillConfigForm() {
  $("apiUrl").value = config.url;
  $("apiMethod").value = config.method;
  $("authType").value = config.authType;
  $("apiToken").value = config.token;
  $("headerName").value = config.headerName;
  $("resultsParam").value = config.resultsParam;
  $("queryParam").value = config.queryParam;
  $("cityParam").value = config.cityParam;
  $("stateParam").value = config.stateParam;
  $("responsePath").value = config.responsePath;
  updateAuthFields();
  updateConnectionUI();
}

function buildQuery() {
  const params = {};
  const segment = $("segment").value.trim();
  const city = $("city").value.trim();
  const state = $("state").value;
  const limit = $("limit").value;

  if (config.queryParam) params[config.queryParam] = segment;
  if (config.cityParam && city) params[config.cityParam] = city;
  if (config.stateParam && state) params[config.stateParam] = state;
  if (config.resultsParam) params[config.resultsParam] = limit;

  return params;
}

function makeHeaders() {
  const headers = { "Accept": "application/json" };

  if (config.method === "POST") headers["Content-Type"] = "application/json";

  if (config.authType === "bearer" && config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  if (config.authType === "header" && config.token) {
    // O nome do cabeçalho é configurado pelo usuário.
    headers[config.headerName || "x-api-key"] = config.token;
  }

  return headers;
}

async function requestApi(testOnly = false) {
  if (!config.url) throw new Error("Informe a URL do endpoint da API.");

  let url;
  try {
    url = new URL(config.url);
  } catch {
    throw new Error("A URL informada não é válida.");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Use um endpoint HTTP ou HTTPS válido.");
  }

  const params = testOnly
    ? Object.fromEntries(Object.entries(buildQuery()).filter(([key]) => key !== config.resultsParam))
    : buildQuery();

  const options = {
    method: config.method,
    headers: makeHeaders(),
    signal: AbortSignal.timeout(20000)
  };

  if (config.method === "GET") {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  } else {
    options.body = JSON.stringify(params);
  }

  const response = await fetch(url.href, options);

  if (!response.ok) {
    throw new Error(`O servidor respondeu HTTP ${response.status}. Verifique a URL, autenticação e disponibilidade.`);
  }

  const data = await response.json();
  let list = data;

  if (config.responsePath) {
    list = config.responsePath.split(".").reduce((obj, key) => obj?.[key], data);
  } else if (!Array.isArray(list)) {
    list = data.leads ?? data.results ?? data.data ?? data.businesses ?? data.items;
    if (list && !Array.isArray(list) && Array.isArray(list.items)) list = list.items;
    if (list && !Array.isArray(list) && Array.isArray(list.leads)) list = list.leads;
  }

  if (!Array.isArray(list)) {
    throw new Error("A API respondeu, mas não foi encontrada uma lista de empresas. Confira o caminho do JSON.");
  }

  return list;
}

$("apiForm").addEventListener("submit", event => {
  event.preventDefault();
  saveConfig();
  connectionGood = false;
  lastTest = "Configuração salva; teste pendente";
  updateConnectionUI();
  setApiMessage("Configuração salva neste navegador. Clique em “Testar conexão” para validar o endpoint.");
  toast("Configuração salva.");
});

$("authType").addEventListener("change", updateAuthFields);

$("testApi").addEventListener("click", async () => {
  saveConfig();
  const button = $("testApi");
  button.disabled = true;
  button.textContent = "Testando...";

  try {
    const list = await requestApi(true);
    connectionGood = true;
    lastTest = `Teste concluído às ${new Date().toLocaleTimeString("pt-BR")}`;
    updateConnectionUI();
    setApiMessage(`Conexão bem-sucedida! A API retornou uma lista válida com ${list.length} registro(s).`, "success");
  } catch (error) {
    connectionGood = false;
    lastTest = `Falha no teste às ${new Date().toLocaleTimeString("pt-BR")}`;
    updateConnectionUI();
    setApiMessage(`${error.message} Se aparecer erro de CORS, configure o backend para permitir a origem do seu site.`, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Testar conexão";
  }
});

$("clearApi").addEventListener("click", () => {
  config = { ...defaultConfig };
  localStorage.removeItem(STORAGE.config);
  connectionGood = false;
  lastTest = "Configuração removida";
  fillConfigForm();
  setApiMessage("Configuração removida. O painel voltou ao modo demonstração.");
});

async function searchRealLeads() {
  const button = $("searchButton");
  button.disabled = true;
  button.textContent = "Pesquisando...";

  try {
    const data = await requestApi(false);
    leads = data.map(normalizeLead);
    connectionGood = true;
    lastTest = `Consulta concluída às ${new Date().toLocaleTimeString("pt-BR")}`;
    updateConnectionUI();
    renderLeads();
    updateStats();
    toast(`${leads.length} empresas recebidas da API.`);
  } catch (error) {
    connectionGood = false;
    lastTest = "Falha na consulta";
    updateConnectionUI();
    $("results").innerHTML = `<div class="empty-state"><span>⚠</span><h3>Não foi possível consultar a API</h3><p>${escapeHTML(error.message)}<br>Verifique sua integração na página Configuração da API.</p></div>`;
    toast("Erro na consulta da API.");
  } finally {
    button.disabled = false;
    button.innerHTML = "Pesquisar leads <span>→</span>";
  }
}

// Dados inteiramente fictícios para demonstrar o layout.
// Não são empresas reais nem resultados de uma busca.
function demoSearch() {
  const segment = $("segment").value.trim();
  const city = $("city").value.trim();
  const state = $("state").value;
  const examples = [
    {name:"Empresa Exemplo A",phone:"",website:"",instagram:"",rating:4.1,reviews:8},
    {name:"Negócio Demonstração B",phone:"+5511999990001",website:"",instagram:"",rating:4.3,reviews:16},
    {name:"Marca Fictícia C",phone:"+5511999990002",website:"https://example.com",instagram:"",rating:4.8,reviews:85},
    {name:"Empresa de Teste D",phone:"",website:"",instagram:"",rating:4.0,reviews:5},
    {name:"Comércio de Demonstração E",phone:"+5511999990003",website:"https://example.com",instagram:"https://instagram.com/",rating:4.7,reviews:44}
  ];

  leads = examples.slice(0, Number($("limit").value)).map((x, i) =>
    normalizeLead({
      ...x,
      name: `${x.name} — ${segment}`,
      city: city || ["São Paulo","Campinas","Sorocaba","Santos","Jundiaí"][i],
      state: state || "SP",
      demo: true
    })
  );

  renderLeads();
  updateStats();
  toast("Exibindo dados fictícios de demonstração.");
}

$("searchForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!config.url) {
    demoSearch();
    $("resultsSubtitle").textContent = "Dados fictícios: configure uma API para consultar empresas reais.";
    return;
  }

  await searchRealLeads();
});

$("opportunityFilter").addEventListener("change", renderLeads);
$("siteFilter").addEventListener("change", renderLeads);

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCSV(list, filename) {
  if (!list.length) {
    toast("Não há leads para exportar.");
    return;
  }

  const columns = [
    ["name","Empresa"], ["city","Cidade"], ["state","Estado"],
    ["phone","Telefone"], ["whatsapp","WhatsApp"], ["website","Site"],
    ["instagram","Instagram"], ["rating","Avaliação"],
    ["reviews","Número de avaliações"], ["score","Score"],
    ["opportunity","Oportunidade"]
  ];

  const rows = [
    columns.map(column => csvEscape(column[1])).join(";"),
    ...list.map(lead => columns.map(([key]) => csvEscape(lead[key])).join(";"))
  ];

  const blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const objectURL = URL.createObjectURL(blob);
  link.href = objectURL;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
  toast("Arquivo CSV exportado.");
}

$("exportButton").addEventListener("click", () => exportCSV(leads, "leads-leadbr.csv"));
$("exportFavorites").addEventListener("click", () => exportCSV(favorites, "favoritos-leadbr.csv"));

document.addEventListener("click", async event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    toggleFavorite(decodeURIComponent(favoriteButton.dataset.favorite));
    return;
  }

  const approachButton = event.target.closest("[data-approach]");
  if (approachButton) {
    const key = decodeURIComponent(approachButton.dataset.approach);
    const lead = leads.find(item => leadKey(item) === key) ||
                 favorites.find(item => leadKey(item) === key);

    if (!lead) return;

    const message = `Olá, ${lead.name}! Tudo bem? Conheci a empresa de vocês e trabalho com soluções digitais para negócios. Gostaria de compartilhar uma ideia personalizada para ajudar a fortalecer a presença online da empresa. Posso te apresentar, sem compromisso?`;

    try {
      await navigator.clipboard.writeText(message);
      toast("Abordagem copiada. Personalize antes de enviar!");
    } catch {
      window.prompt("Copie sua abordagem:", message);
    }
  }
});

const exampleJSON = {
  leads: [{
    name: "Empresa Exemplo",
    city: "Sorocaba",
    state: "SP",
    phone: "+5511999999999",
    website: "",
    instagram: "",
    rating: 4.5,
    reviews: 30
  }]
};

$("copyExample").addEventListener("click", async () => {
  const text = JSON.stringify(exampleJSON, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    toast("Exemplo JSON copiado.");
  } catch {
    window.prompt("Copie o exemplo JSON:", text);
  }
});

fillConfigForm();
persistFavorites();
updateStats();
```
