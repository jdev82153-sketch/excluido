const state = {
  leads: [],
  favorites: JSON.parse(localStorage.getItem("leadbr_favorites") || "[]"),
  apiUrl: localStorage.getItem("leadbr_api_url") || "",
  apiToken: localStorage.getItem("leadbr_api_token") || ""
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function normalizeLead(x){
  const website = x.website || x.site || x.url || "";
  const phone = x.phone || x.telephone || "";
  const whatsapp = x.whatsapp || x.whatsapp_number || phone || "";
  const rating = Number(x.rating || x.google_rating || 0);
  const reviews = Number(x.reviews || x.review_count || 0);
  let score = 0;
  if (!website) score += 45;
  if (!x.instagram) score += 15;
  if (whatsapp) score += 10;
  if (rating && rating < 4.5) score += 8;
  if (!reviews || reviews < 20) score += 12;
  if (x.city) score += 5;
  score = Math.min(100, score);
  const opportunity = score >= 60 ? "high" : score >= 35 ? "medium" : "low";
  return {...x, name:x.name || x.title || "Empresa sem nome", phone, whatsapp, website, instagram:x.instagram || "", rating, reviews, score, opportunity};
}

function saveFavs(){
  localStorage.setItem("leadbr_favorites", JSON.stringify(state.favorites));
  $("favCount").textContent = state.favorites.length;
  $("favorites").textContent = state.favorites.length;
}
function isFav(lead){ return state.favorites.some(x => (x.name+x.phone) === (lead.name+lead.phone)); }
function toggleFav(i){
  const lead = state.leads[i];
  if(isFav(lead)) state.favorites = state.favorites.filter(x => (x.name+x.phone)!==(lead.name+lead.phone));
  else state.favorites.push(lead);
  saveFavs(); renderLeads(state.leads);
}
function scoreLabel(o){return o==="high"?"ðŸ”¥ Alta":o==="medium"?"âš¡ MÃ©dia":"âœ“ Baixa"}

function card(lead, i, favoriteMode=false){
  const phone = String(lead.phone || lead.whatsapp || "").replace(/\D/g,"");
  const wa = String(lead.whatsapp || phone).replace(/\D/g,"");
  const waUrl = wa ? `https://wa.me/${wa}` : "";
  const site = lead.website ? (/^https?:\/\//i.test(lead.website)?lead.website:"https://"+lead.website) : "";
  const insta = lead.instagram ? (/^https?:\/\//i.test(lead.instagram)?lead.instagram:"https://instagram.com/"+lead.instagram.replace(/^@/,"")) : "";
  const fav = isFav(lead);
  return `<article class="lead">
    <div class="lead-top"><div><h3>${esc(lead.name)}</h3><div class="location">ðŸ“ ${esc(lead.city||"")}${lead.state?" / "+esc(lead.state):""}</div></div>
    <button class="favorite ${fav?"on":""}" onclick="toggleFav(${i})">${fav?"â˜…":"â˜†"}</button></div>
    <span class="score ${lead.opportunity}">${scoreLabel(lead.opportunity)} Â· ${lead.score}/100</span>
    <div class="lead-data">
      <div>â­ ${lead.rating ? esc(lead.rating) : "â€”"} ${lead.reviews?`(${esc(lead.reviews)} avaliaÃ§Ãµes)`:""}</div>
      <div>ðŸ“ž ${esc(lead.phone||"NÃ£o informado")}</div>
      <div>ðŸŒ ${site?"Site encontrado":"Sem site"}</div>
      <div>ðŸ“¸ ${insta?"Instagram":"Instagram nÃ£o informado"}</div>
    </div>
    <div class="lead-actions">
      ${waUrl?`<a class="primary" target="_blank" rel="noopener" href="${waUrl}">WhatsApp</a>`:""}
      ${site?`<a target="_blank" rel="noopener" href="${site}">Site</a>`:""}
      ${insta?`<a target="_blank" rel="noopener" href="${insta}">Instagram</a>`:""}
      <button onclick="copyApproach(${i})">Abordagem</button>
    </div>
  </article>`;
}

function renderLeads(list){
  const filter = $("opportunityFilter").value;
  const filtered = filter==="all" ? list : list.filter(x=>x.opportunity===filter);
  $("total").textContent = list.length;
  $("high").textContent = list.filter(x=>x.opportunity==="high").length;
  $("phones").textContent = list.filter(x=>x.phone||x.whatsapp).length;
  $("favorites").textContent = state.favorites.length;
  $("resultTitle").textContent = `${filtered.length} lead${filtered.length===1?"":"s"}`;
  $("resultSubtitle").textContent = list.length ? "Ordenados por potencial comercial." : "Nenhum resultado.";
  const box=$("results");
  if(!filtered.length){box.className="results empty";box.innerHTML='<div class="empty-box"><div>ðŸ”Ž</div><h3>Nenhum lead encontrado</h3><p>Tente outro segmento, cidade ou filtro.</p></div>';return;}
  box.className="results";
  box.innerHTML=filtered.map(x=>card(x,list.indexOf(x))).join("");
}

async function searchLeads(){
  const segment=$("segment").value.trim(), city=$("city").value.trim(), st=$("state").value, limit=$("limit").value;
  if(!segment){toast("Digite um segmento para pesquisar.");return;}
  $("searchBtn").disabled=true; $("searchBtn").textContent="Buscando...";
  try{
    if(!state.apiUrl){
      // Demo local: deixa o layout utilizÃ¡vel antes da API real.
      state.leads = demoLeads(segment,city,st).slice(0,Number(limit));
      toast("API nÃ£o configurada: mostrando dados de demonstraÃ§Ã£o.");
    } else {
      const url=new URL(state.apiUrl);
      url.searchParams.set("segment",segment); if(city)url.searchParams.set("city",city); if(st)url.searchParams.set("state",st); url.searchParams.set("limit",limit);
      const headers={"Accept":"application/json"}; if(state.apiToken)headers.Authorization=`Bearer ${state.apiToken}`;
      const res=await fetch(url,{headers});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const arr=Array.isArray(data)?data:(data.leads||data.results||data.data||[]);
      state.leads=arr.map(normalizeLead);
      toast(`${state.leads.length} leads encontrados.`);
    }
    renderLeads(state.leads);
  }catch(e){
    $("results").className="results empty";
    $("results").innerHTML=`<div class="empty-box"><div>âš ï¸</div><h3>NÃ£o foi possÃ­vel consultar a API</h3><p>${esc(e.message)}<br>Confira a URL/proxy na configuraÃ§Ã£o.</p></div>`;
  }finally{$("searchBtn").disabled=false;$("searchBtn").innerHTML='Buscar leads <span>â†’</span>';}
}

function demoLeads(segment,city,st){
  const names=["Prime SaÃºde","Studio Prime","Bella ClÃ­nica","EspaÃ§o Mais","Nova Vida","Centro Especializado","ClÃ­nica Ideal","Viva Bem","Essencial","Atendimento Plus"];
  return names.map((n,i)=>normalizeLead({name:`${n} ${segment}`,city:city||["SÃ£o Paulo","Campinas","Sorocaba","JundiaÃ­"][i%4],state:st||"SP",phone:i%3?`+55 11 9${String(80000000+i).padStart(8,"0")}`:"",whatsapp:i%2?`55119${String(80000000+i).padStart(8,"0")}`:"",website:i%3===0?"":"",instagram:i%4===0?"":"https://instagram.com/exemplo",rating:4.2+(i%7)/10,reviews:i*11}));
}
function copyApproach(i){
  const l=state.leads[i]; const msg=`OlÃ¡, ${l.name}! Tudo bem? Vi o trabalho de vocÃªs e percebi que existe uma oportunidade de melhorar a presenÃ§a digital da empresa. Eu trabalho com criaÃ§Ã£o de sites e soluÃ§Ãµes digitais para negÃ³cios locais. Posso te mostrar uma ideia rÃ¡pida, sem compromisso?`;
  navigator.clipboard?.writeText(msg); toast("Abordagem copiada!");
}
function exportCSV(){
  if(!state.leads.length){toast("FaÃ§a uma busca primeiro.");return}
  const cols=["name","city","state","phone","whatsapp","website","instagram","rating","reviews","score","opportunity"];
  const csv=[cols.join(","),...state.leads.map(l=>cols.map(k=>`"${String(l[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="leads-leadbr.csv";a.click();URL.revokeObjectURL(a.href);
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2600)}
function renderFavorites(){
  const box=$("favoriteResults");
  if(!state.favorites.length){box.className="results empty";box.innerHTML='<div class="empty-box"><div>â­</div><h3>Nenhum favorito ainda</h3><p>Salve leads na busca para encontrÃ¡-los aqui.</p></div>';return}
  box.className="results";box.innerHTML=state.favorites.map((x,i)=>card(x,i)).join("");
}

document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  $(`${btn.dataset.view}View`).classList.add("active");
  if(btn.dataset.view==="favorites")renderFavorites();
}));
$("searchBtn").onclick=searchLeads;
$("opportunityFilter").onchange=()=>renderLeads(state.leads);
$("exportBtn").onclick=exportCSV;
$("saveSettings").onclick=()=>{
  state.apiUrl=$("apiUrl").value.trim();state.apiToken=$("apiToken").value.trim();
  localStorage.setItem("leadbr_api_url",state.apiUrl);localStorage.setItem("leadbr_api_token",state.apiToken);
  updateApiStatus();$("settingsMessage").textContent="ConfiguraÃ§Ã£o salva neste navegador.";
};
$("apiUrl").value=state.apiUrl;$("apiToken").value=state.apiToken;
function updateApiStatus(){ $("apiStatus").classList.toggle("ok",!!state.apiUrl); $("apiStatus").innerHTML=`<i></i> ${state.apiUrl?"API conectada":"API nÃ£o configurada"}`;}
saveFavs();updateApiStatus();
$("segment").addEventListener("keydown",e=>{if(e.key==="Enter")searchLeads()});
