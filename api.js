"use strict";

// Клас для HTTP-помилок
class HttpError extends Error {
    constructor(status) {
        super(`HTTP ${status}`);
        this.name = "HttpError";
        this.status = status;
    }
}

// Універсальна функція запиту JSON із тайм-аутом
async function fetchJson(url, options = {}) {
    const { timeoutMs = 8000, signal } = options;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;

    let response;
    try {
        response = await fetch(url, { signal: combinedSignal });
    } catch (error) {
        if (error.name === "AbortError") throw error;
        if (error.name === "TimeoutError") {
            throw new Error("Сервер не відповів вчасно. Спробуйте ще раз.");
        }
        throw new Error("Немає з'єднання з сервером. Перевірте інтернет.");
    }

    if (!response.ok) {
        throw new HttpError(response.status);
    }

    try {
        return await response.json();
    } catch {
        throw new Error("Сервер повернув некоректні дані.");
    }
}

// Опис помилок для користувача
function describeError(error) {
    if (error instanceof HttpError) {
        if (error.status === 404) return "Нічого не знайдено (код 404).";
        if (error.status === 429) return "Забагато запитів. Зачекайте хвилину.";
        if (error.status >= 500) return "Помилка на серверах Rick and Morty.";
    }
    return error.message || "Сталася невідома помилка.";
}

// Посилання на DOM-елементи та стан
const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query-input");
const formError = document.querySelector("#form-error");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const loadMoreBtn = document.querySelector("#load-more-btn");

const state = { status: "idle", message: "" };
let lastAction = null;
let currentQuery = "";
let nextPageUrl = null;

function setStatus(status, message = "") {
    state.status = status;
    state.message = message;
    renderStatus();
}

function renderStatus() {
    statusBox.replaceChildren();
    if (state.status === "loading") {
        statusBox.textContent = "Завантаження...";
    } else if (state.status === "empty") {
        statusBox.textContent = state.message;
    } else if (state.status === "error") {
        const text = document.createElement("p");
        text.textContent = state.message;
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.textContent = "Повторити";
        retryBtn.addEventListener("click", () => {
            if (lastAction) lastAction();
        });
        statusBox.append(text, retryBtn);
    }
}

// Робота з Rick and Morty API та пагінацією
const API_BASE = "https://rickandmortyapi.com/api/character/";

async function searchCharacters(query, url = null, append = false) {
    currentQuery = query;
    lastAction = () => searchCharacters(query, url, append);

    setStatus("loading");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!append) {
        resultBox.replaceChildren();
        loadMoreBtn.hidden = true;
    }
    if (!append) {
        resultBox.replaceChildren();
        loadMoreBtn.hidden = true;
    }

    try {
        const targetUrl = url || `${API_BASE}?${new URLSearchParams({ name: query })}`;
        const data = await fetchJson(targetUrl);

        setStatus("success");
        nextPageUrl = data.info.next;
        renderCharacters(data.results, append);

        if (nextPageUrl) {
            loadMoreBtn.hidden = false;
        } else {
            loadMoreBtn.hidden = true;
        }
    } catch (error) {
        if (error.name === "AbortError") return;
        if (error instanceof HttpError && error.status === 404) {
            setStatus("empty", `За запитом «${query}» персонажів не знайдено.`);
            return;
        }
        setStatus("error", describeError(error));
    }
}

function renderCharacters(characters, append = false) {
    let grid = resultBox.querySelector(".api-grid");
    if (!grid || !append) {
        grid = document.createElement("div");
        grid.className = "api-grid";
        if (!append) resultBox.replaceChildren(grid);
    }

    for (const char of characters) {
        const card = document.createElement("article");
        card.className = "api-card";

        const img = document.createElement("img");
        img.src = char.image;
        img.alt = `Портрет персонажа ${char.name}`;
        img.loading = "lazy";

        const title = document.createElement("h3");
        title.textContent = char.name;

        const info = document.createElement("p");
        info.textContent = `Статус: ${char.status} | Раса: ${char.species}`;

        const origin = document.createElement("p");
        origin.textContent = `Походження: ${char.origin.name}`;

        card.append(img, title, info, origin);
        grid.append(card);
    }

    if (!resultBox.contains(grid)) {
        resultBox.append(grid);
    }
}

// Обробники подій форми та кнопки пагінації
form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (query.length < 2) {
        formError.textContent = "Введіть щонайменше 2 символи для пошуку.";
        queryInput.focus();
        return;
    }
    formError.textContent = "";
    searchCharacters(query);
});

loadMoreBtn.addEventListener("click", () => {
    if (nextPageUrl) {
        searchCharacters(currentQuery, nextPageUrl, true);
    }
});

// Завантаження для демонстрації
searchCharacters("rick");