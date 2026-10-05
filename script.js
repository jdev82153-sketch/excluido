"use strict";


/* =========================================================
   LEADBR
   Configuração
========================================================= */


const STORAGE_KEY = "leadbr_api_config_v3";

const defaultConfig = {

    url: "",

    method: "GET",

    authType: "none",

    token: "",

    headerName: "x-api-key",

    segmentParam: "segment",

    cityParam: "city",

    stateParam: "state",

    limitParam: "limit",

    responsePath: ""

};


let config = loadConfig();

let leads = [];

let favorites = JSON.parse(
    localStorage.getItem("leadbr_favorites_v3") || "[]"
);

let apiConnected = false;

let lastTest = "Nenhum teste realizado";


/* =========================================================
   HELPERS
========================================================= */


function $(id) {

    return document.getElementById(id);

}


function loadConfig() {

    try {

        return {

            ...defaultConfig,

            ...(JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || {})

        };

    } catch {

        return {
            ...defaultConfig
        };

    }

}


function saveConfig() {

    config = {

        url:
            $("apiUrl").value.trim(),

        method:
            $("apiMethod").value,

        authType:
            $("authType").value,

        token:
            $("apiToken").value.trim(),

        headerName:
            $("headerName").value.trim() ||
            "x-api-key",

        segmentParam:
            $("segmentParam").value.trim() ||
            "segment",

        cityParam:
            $("cityParam").value.trim() ||
            "city",

        stateParam:
            $("stateParam").value.trim() ||
            "state",

        limitParam:
            $("limitParam").value.trim() ||
            "limit",

        responsePath:
            $("responsePath").value.trim()

    };


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(config)
    );

}


/* =========================================================
   NAVIGATION
========================================================= */


document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openPage(
                    button.dataset.page
                );

            }
        );

    });


document
    .querySelectorAll("[data-page]")
    .forEach(button => {

        if (
            !button.classList.contains("nav-item")
        ) {

            button.addEventListener(
                "click",
                () => {

                    openPage(
                        button.dataset.page
                    );

                }
            );

        }

    });


function openPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    $(pageId)
        ?.classList
        .add("active");


    document
        .querySelector(
            `.nav-item[data-page="${pageId}"]`
        )
        ?.classList
        .add("active");


    const titles = {

        searchPage: [

            "Encontrar novos clientes",

            "Pesquise empresas e encontre oportunidades comerciais em todo o Brasil."

        ],

        favoritesPage: [

            "Seus leads favoritos",

            "Empresas salvas para sua prospecção."

        ],

        apiPage: [

            "Integração da API",

            "Conecte sua fonte de dados ao LeadBR."

        ]

    };


    if (titles[pageId]) {

        $("pageTitle").textContent =
            titles[pageId][0];

        $("pageDescription").textContent =
            titles[pageId][1];

    }


    if (pageId === "favoritesPage") {

        renderFavorites();

    }

}


/* =========================================================
   API FORM
========================================================= */


function loadForm() {

    $("apiUrl").value =
        config.url;

    $("apiMethod").value =
        config.method;

    $("authType").value =
        config.authType;

    $("apiToken").value =
        config.token;

    $("headerName").value =
        config.headerName;

    $("segmentParam").value =
        config.segmentParam;

    $("cityParam").value =
        config.cityParam;

    $("stateParam").value =
        config.stateParam;

    $("limitParam").value =
        config.limitParam;

    $("responsePath").value =
        config.responsePath;


    updateAuth();

    updateConnectionUI();

}


$("authType")
    .addEventListener(
        "change",
        updateAuth
    );


function updateAuth() {

    const type =
        $("authType").value;


    $("authArea")
        .classList
        .toggle(
            "hidden",
            type === "none"
        );


    $("headerArea")
        .classList
        .toggle(
            "hidden",
            type !== "header"
        );

}


/* =========================================================
   CONNECTION UI
========================================================= */


function updateConnectionUI() {

    const configured =
        Boolean(config.url);


    $("connectionPill")
        .classList
        .toggle(
            "connected",
            apiConnected
        );


    $("connectionPill").innerHTML = `

        <i></i>

        ${apiConnected
            ? "API conectada"
            : configured
                ? "API configurada"
                : "API não conectada"}

    `;


    $("sidebarConnection")
        .textContent =

        apiConnected
            ? "API conectada"
            : configured
                ? "API configurada"
                : "API não conectada";


    $("sidebarIndicator")
        .classList
        .toggle(
            "connected",
            apiConnected
        );


    $("apiBannerTitle")
        .textContent =

        apiConnected
            ? "API conectada com sucesso"
            : configured
                ? "API configurada"
                : "Nenhuma API configurada";


    $("apiBannerDescription")
        .textContent =

        apiConnected
            ? "O LeadBR conseguiu consultar seu endpoint."
            : configured
                ? "Teste a conexão antes de começar a pesquisar."
                : "Configure seu endpoint para habilitar a pesquisa de empresas.";


    $("apiCircle")
        .classList
        .toggle(
            "connected",
            apiConnected
        );


    $("apiStatusText")
        .textContent =

        apiConnected
            ? "Conectada"
            : configured
                ? "Configurada"
                : "Não conectada";


    $("apiLastTest")
        .textContent =
        lastTest;

}


/* =========================================================
   API HEADERS
========================================================= */


function buildHeaders() {

    const headers = {

        "Accept":
            "application/json"

    };


    if (
        config.method === "POST"
    ) {

        headers[
            "Content-Type"
        ] =
            "application/json";

    }


    if (
        config.authType === "bearer" &&
        config.token
    ) {

        headers[
            "Authorization"
        ] =
            `Bearer ${config.token}`;

    }


    if (
        config.authType === "header" &&
        config.token
    ) {

        headers[
            config.headerName
        ] =
            config.token;

    }


    return headers;

}


/* =========================================================
   QUERY
========================================================= */


function buildSearchParams() {

    const params = {};

    const segment =
        $("segment")
            .value
            .trim();

    const city =
        $("city")
            .value
            .trim();

    const state =
        $("state")
            .value;

    const limit =
        $("limit")
            .value;


    if (
        config.segmentParam &&
        segment
    ) {

        params[
            config.segmentParam
        ] =
            segment;

    }


    if (
        config.cityParam &&
        city
    ) {

        params[
            config.cityParam
        ] =
            city;

    }


    if (
        config.stateParam &&
        state
    ) {

        params[
            config.stateParam
        ] =
            state;

    }


    if (
        config.limitParam
    ) {

        params[
            config.limitParam
        ] =
            limit;

    }


    return params;

}


/* =========================================================
   RESPONSE PARSER
========================================================= */


function getResponseList(data) {

    if (
        config.responsePath
    ) {

        return config
            .responsePath
            .split(".")
            .reduce(
                (current, key) =>
                    current?.[key],
                data
            );

    }


    if (
        Array.isArray(data)
    ) {

        return data;

    }


    const possible = [

        data?.leads,

        data?.results,

        data?.data,

        data?.businesses,

        data?.items

    ];


    for (
        const item
        of possible
    ) {

        if (
            Array.isArray(item)
        ) {

            return item;

        }

    }


    return null;

}


/* =========================================================
   API REQUEST
========================================================= */


async function callAPI(
    testOnly = false
) {

    if (!config.url) {

        throw new Error(
            "Configure a URL de sua API primeiro."
        );

    }


    let url;


    try {

        url =
            new URL(
                config.url
            );

    } catch {

        throw new Error(
            "A URL da API não é válida."
        );

    }


    const params =
        buildSearchParams();


    const options = {

        method:
            config.method,

        headers:
            buildHeaders(),

        signal:
            AbortSignal.timeout(
                20000
            )

    };


    if (
        config.method === "GET"
    ) {

        Object
            .entries(params)
            .forEach(
                ([key, value]) => {

                    url
                        .searchParams
                        .set(
                            key,
                            value
                        );

                }
            );

    } else {

        options.body =
            JSON.stringify(
                params
            );

    }


    const response =
        await fetch(
            url.toString(),
            options
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `A API respondeu HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    const list =
        getResponseList(
            data
        );


    if (
        !Array.isArray(list)
    ) {

        throw new Error(
            "A API respondeu, mas o LeadBR não encontrou uma lista de leads no JSON."
        );

    }


    return list;

}


/* =========================================================
   TEST API
========================================================= */


$("apiForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            saveConfig();

            apiConnected = false;

            lastTest =
                "Configuração salva";

            updateConnectionUI();

            showApiMessage(
                "Configuração salva. Clique em “Testar conexão” para validar.",
                "success"
            );

            toast(
                "Configuração salva."
            );

        }
    );


$("testApi")
    .addEventListener(
        "click",
        async () => {

            saveConfig();


            const button =
                $("testApi");


            button.disabled =
                true;


            button.textContent =
                "Testando...";


            try {

                const list =
                    await callAPI(
                        true
                    );


                apiConnected =
                    true;


                lastTest =
                    `Último teste: ${new Date().toLocaleTimeString("pt-BR")}`;


                updateConnectionUI();


                showApiMessage(
                    `Conexão funcionando. A API retornou ${list.length} registro(s).`,
                    "success"
                );


                toast(
                    "API conectada!"
                );

            } catch (error) {

                apiConnected =
                    false;


                lastTest =
                    "Último teste: falhou";


                updateConnectionUI();


                showApiMessage(
                    `${error.message} Verifique também CORS no seu backend.`,
                    "error"
                );

            } finally {

                button.disabled =
                    false;

                button.textContent =
                    "Testar conexão";

            }

        }
    );


$("clearApi")
    .addEventListener(
        "click",
        () => {

            config = {
                ...defaultConfig
            };


            localStorage.removeItem(
                STORAGE_KEY
            );


            apiConnected =
                false;


            lastTest =
                "Configuração removida";


            loadForm();


            showApiMessage(
                "Configuração da API removida.",
                "success"
            );

        }
    );


function showApiMessage(
    message,
    type
) {

    const box =
        $("apiMessage");


    box.className =
        `api-message show ${type}`;


    box.textContent =
        message;

}


/* =========================================================
   SEARCH
========================================================= */


$("searchForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!config.url) {

                showNoApiMessage();

                return;

            }


            const button =
                $("searchButton");


            button.disabled =
                true;


            button.innerHTML =
                "Consultando API...";


            try {

                const data =
                    await callAPI();


                leads =
                    data.map(
                        normalizeLead
                    );


                apiConnected =
                    true;


                lastTest =
                    `Consulta: ${new Date().toLocaleTimeString("pt-BR")}`;


                updateConnectionUI();


                renderResults();


                toast(
                    `${leads.length} leads encontrados.`
                );

            } catch (error) {

                $("resultsGrid").innerHTML = `

                    <div class="empty-results">

                        <div class="empty-icon">
                            !
                        </div>

                        <h3>
                            Não foi possível consultar a API
                        </h3>

                        <p>
                            ${escapeHTML(
                                error.message
                            )}
                        </p>

                    </div>

                `;

                toast(
                    "Erro ao consultar API."
                );

            } finally {

                button.disabled =
                    false;

                button.innerHTML = `

                    <span>
                        Pesquisar empresas
                    </span>

                    <strong>
                        →
                    </strong>

                `;

            }

        }
    );


function showNoApiMessage() {

    $("resultsGrid").innerHTML = `

        <div class="empty-results">

            <div class="empty-icon">
                ⚡
            </div>

            <h3>
                Conecte sua API primeiro
            </h3>

            <p>
                O LeadBR está pronto para pesquisar empresas,
                mas precisa de uma fonte de dados.
            </p>

            <button
                class="empty-button"
                id="goApiButton"
            >
                Configurar API
            </button>

        </div>

    `;


    $("goApiButton")
        .onclick =
        () => openPage(
            "apiPage"
        );

}


/* =========================================================
   NORMALIZE
========================================================= */


function normalizeLead(raw) {

    const website =
        raw.website ||
        raw.site ||
        raw.url ||
        "";


    const phone =
        raw.phone ||
        raw.telephone ||
        raw.phone_number ||
        "";


    const whatsapp =
        raw.whatsapp ||
        raw.whatsapp_number ||
        phone ||
        "";


    const instagram =
        raw.instagram ||
        raw.instagram_url ||
        "";


    const rating =
        Number(
            raw.rating ||
            raw.google_rating ||
            0
        );


    const reviews =
        Number(
            raw.reviews ||
            raw.review_count ||
            raw.user_ratings_total ||
            0
        );


    /*
        Score comercial.

        Quanto mais sinais de oportunidade,
        maior o score.
    */


    let score = 0;


    if (!website)
        score += 45;


    if (!instagram)
        score += 15;


    if (
        phone ||
        whatsapp
    )
        score += 10;


    if (
        rating > 0 &&
        rating < 4.5
    )
        score += 8;


    if (
        !reviews ||
        reviews < 20
    )
        score += 12;


    score =
        Math.min(
            score,
            100
        );


    let opportunity;


    if (
        score >= 60
    ) {

        opportunity =
            "high";

    } else if (
        score >= 35
    ) {

        opportunity =
            "medium";

    } else {

        opportunity =
            "low";

    }


    return {

        ...raw,

        name:
            raw.name ||
            raw.title ||
            raw.business_name ||
            "Empresa sem nome",

        city:
            raw.city ||
            "",

        state:
            raw.state ||
            raw.uf ||
            "",

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


/* =========================================================
   RENDER
========================================================= */


function renderResults() {

    const filter =
        $("scoreFilter")
            .value;


    const filtered =
        leads.filter(
            lead =>
                filter === "all" ||
                lead.opportunity === filter
        );


    $("resultsInfo")
        .textContent =

        leads.length
            ? `${filtered.length} de ${leads.length} leads`
            : "Nenhum resultado.";


    if (!filtered.length) {

        $("resultsGrid").innerHTML = `

            <div class="empty-results">

                <div class="empty-icon">
                    ⌕
                </div>

                <h3>
                    Nenhum lead encontrado
                </h3>

                <p>
                    Tente alterar os filtros da pesquisa.
                </p>

            </div>

        `;

        return;

    }


    $("resultsGrid").innerHTML =
        filtered
            .map(
                createLeadCard
            )
            .join("");

}


/* =========================================================
   LEAD CARD
========================================================= */


function createLeadCard(
    lead
) {

    const key =
        leadKey(
            lead
        );


    const phone =
        String(
            lead.whatsapp ||
            lead.phone ||
            ""
        )
        .replace(
            /\D/g,
            ""
        );


    const whatsapp =
        phone
            ? `https://wa.me/${phone}`
            : "";


    const website =
        safeURL(
            lead.website
        );


    const instagram =
        safeInstagram(
            lead.instagram
        );


    const favorite =
        isFavorite(
            lead
        );


    const location =
        [
            lead.city,
            lead.state
        ]
        .filter(Boolean)
        .join(" / ") ||
        "Localização não informada";


    return `

        <article
            class="lead-card"
        >

            <div class="lead-top">

                <div>

                    <h3 class="lead-name">

                        ${escapeHTML(
                            lead.name
                        )}

                    </h3>

                    <div class="lead-location">

                        📍
                        ${escapeHTML(
                            location
                        )}

                    </div>

                </div>


                <button

                    class="favorite-button
                    ${favorite
                        ? "active"
                        : ""}"

                    data-favorite="${encodeURIComponent(
                        key
                    )}"

                >

                    ${favorite
                        ? "★"
                        : "☆"}

                </button>

            </div>


            <div
                class="lead-score
                ${lead.opportunity}"
            >

                ${
                    lead.opportunity === "high"
                        ? "🔥 Alta oportunidade"
                        : lead.opportunity === "medium"
                            ? "⚡ Média oportunidade"
                            : "✓ Baixa oportunidade"
                }

                · ${lead.score}/100

            </div>


            <div class="lead-info">

                <div>

                    ⭐
                    ${
                        lead.rating
                            ? escapeHTML(
                                lead.rating
                            )
                            : "Sem avaliação"
                    }

                    ${
                        lead.reviews
                            ? ` · ${escapeHTML(
                                lead.reviews
                              )} avaliações`
                            : ""
                    }

                </div>


                <div>

                    📞
                    ${
                        lead.phone
                            ? escapeHTML(
                                lead.phone
                              )
                            : "Sem telefone"
                    }

                </div>


                <div>

                    🌐
                    ${
                        website
                            ? "Site disponível"
                            : "Sem site"
                    }

                </div>


                <div>

                    📸
                    ${
                        instagram
                            ? "Instagram disponível"
                            : "Sem Instagram"
                    }

                </div>

            </div>


            <div class="lead-actions">

                ${
                    whatsapp

                    ?

                    `

                    <a
                        class="whatsapp"
                        href="${whatsapp}"
                        target="_blank"
                        rel="noopener"
                    >
                        WhatsApp
                    </a>

                    `

                    : ""

                }


                ${
                    website

                    ?

                    `

                    <a
                        href="${website}"
                        target="_blank"
                        rel="noopener"
                    >
                        Site
                    </a>

                    `

                    : ""

                }


                ${
                    instagram

                    ?

                    `

                    <a
                        href="${instagram}"
                        target="_blank"
                        rel="noopener"
                    >
                        Instagram
                    </a>

                    `

                    : ""

                }


                <button
                    data-approach="${encodeURIComponent(
                        key
                    )}"
                >

                    Abordagem

                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   FAVORITES
========================================================= */


function leadKey(
    lead
) {

    return (

        `${lead.name}|` +

        `${lead.phone || lead.whatsapp || ""}|` +

        `${lead.city || ""}`

    );

}


function isFavorite(
    lead
) {

    return favorites.some(
        item =>
            leadKey(item) ===
            leadKey(lead)
    );

}


function toggleFavorite(
    key
) {

    const lead =
        leads.find(
            item =>
                leadKey(item) === key
        )
        ||
        favorites.find(
            item =>
                leadKey(item) === key
        );


    if (!lead)
        return;


    if (
        isFavorite(
            lead
        )
    ) {

        favorites =
            favorites.filter(
                item =>
                    leadKey(item) !== key
            );


        toast(
            "Lead removido dos favoritos."
        );

    } else {

        favorites.push(
            lead
        );


        toast(
            "Lead salvo nos favoritos."
        );

    }


    localStorage.setItem(
        "leadbr_favorites_v3",
        JSON.stringify(
            favorites
        )
    );


    updateFavoriteCounter();

    renderResults();

    renderFavorites();

}


function updateFavoriteCounter() {

    $("favoriteCounter")
        .textContent =
        favorites.length;

}


function renderFavorites() {

    const grid =
        $("favoritesGrid");


    if (
        !favorites.length
    ) {

        grid.innerHTML = `

            <div class="empty-results">

                <div class="empty-icon">
                    ☆
                </div>

                <h3>
                    Nenhum favorito ainda
                </h3>

                <p>
                    Salve empresas na pesquisa para
                    encontrá-las aqui.
                </p>

            </div>

        `;

        return;

    }


    grid.innerHTML =
        favorites
            .map(
                createLeadCard
            )
            .join("");

}


/* =========================================================
   CLICK ACTIONS
========================================================= */


document.addEventListener(
    "click",
    async event => {


        const favoriteButton =
            event.target.closest(
                "[data-favorite]"
            );


        if (
            favoriteButton
        ) {

            toggleFavorite(
                decodeURIComponent(
                    favoriteButton.dataset.favorite
                )
            );

            return;

        }


        const approachButton =
            event.target.closest(
                "[data-approach]"
            );


        if (
            approachButton
        ) {

            const key =
                decodeURIComponent(
                    approachButton.dataset.approach
                );


            const lead =
                leads.find(
                    item =>
                        leadKey(item) === key
                )
                ||
                favorites.find(
                    item =>
                        leadKey(item) === key
                );


            if (!lead)
                return;


            const message =

                `Olá, ${lead.name}! Tudo bem? ` +

                `Conheci a empresa de vocês e ` +

                `trabalho com soluções digitais ` +

                `para negócios. ` +

                `Gostaria de apresentar uma ideia ` +

                `personalizada para melhorar a presença ` +

                `online da empresa. Posso te mostrar ` +

                `sem compromisso?`;


            try {

                await navigator.clipboard
                    .writeText(
                        message
                    );


                toast(
                    "Mensagem de abordagem copiada."
                );

            } catch {

                window.prompt(
                    "Copie a mensagem:",
                    message
                );

            }

        }

    }
);


/* =========================================================
   FILTER
========================================================= */


$("scoreFilter")
    .addEventListener(
        "change",
        renderResults
    );


/* =========================================================
   CSV
========================================================= */


$("exportButton")
    .addEventListener(
        "click",
        () =>
            exportCSV(
                leads,
                "leadbr-leads.csv"
            )
    );


$("exportFavorites")
    .addEventListener(
        "click",
        () =>
            exportCSV(
                favorites,
                "leadbr-favoritos.csv"
            )
    );


function exportCSV(
    list,
    filename
) {

    if (
        !list.length
    ) {

        toast(
            "Não existem leads para exportar."
        );

        return;

    }


    const columns = [

        ["name", "Empresa"],

        ["city", "Cidade"],

        ["state", "Estado"],

        ["phone", "Telefone"],

        ["whatsapp", "WhatsApp"],

        ["website", "Site"],

        ["instagram", "Instagram"],

        ["rating", "Avaliação"],

        ["reviews", "Avaliações"],

        ["score", "Score"]

    ];


    const rows = [

        columns
            .map(
                column =>
                    `"${column[1]}"`
            )
            .join(";"),


        ...list.map(
            lead =>

                columns
                    .map(
                        ([key]) =>
                            `"${String(
                                lead[key] || ""
                            )
                            .replace(
                                /"/g,
                                '""'
                            )}"`
                    )
                    .join(";")
        )

    ];


    const blob =
        new Blob(
            [
                "\ufeff" +
                rows.join("\r\n")
            ],
            {
                type:
                    "text/csv;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        filename;

    link.click();


    URL.revokeObjectURL(
        url
    );


    toast(
        "CSV exportado."
    );

}


/* =========================================================
   URL SECURITY
========================================================= */


function safeURL(
    value
) {

    if (!value)
        return "";


    let url =
        String(
            value
        )
        .trim();


    if (
        !/^https?:\/\//i.test(
            url
        )
    ) {

        url =
            "https://" +
            url;

    }


    try {

        const parsed =
            new URL(
                url
            );


        if (
            parsed.protocol !==
                "http:" &&

            parsed.protocol !==
                "https:"
        ) {

            return "";

        }


        return parsed.href;

    } catch {

        return "";

    }

}


function safeInstagram(
    value
) {

    if (!value)
        return "";


    let valueClean =
        String(
            value
        ).trim();


    if (
        !/^https?:\/\//i.test(
            valueClean
        )
    ) {

        valueClean =
            "https://instagram.com/" +

            valueClean
                .replace(
                    /^@/,
                    ""
                );

    }


    return safeURL(
        valueClean
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /[&<>"']/g,
        char => ({

            "&": "&amp;",

            "<": "&lt;",

            ">": "&gt;",

            '"': "&quot;",

            "'": "&#039;"

        }[char])
    );

}


/* =========================================================
   TOAST
========================================================= */


function toast(
    message
) {

    const box =
        $("toast");


    box.textContent =
        message;


    box.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                box.classList.remove(
                    "show"
                );

            },

            2800

        );

}


/* =========================================================
   START
========================================================= */


loadForm();

updateFavoriteCounter();
