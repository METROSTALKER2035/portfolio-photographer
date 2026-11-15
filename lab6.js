// Конвертер обсягу даних
const units = {
    "Б": 1,
    "КБ": 1024,
    "МБ": 1048576,
    "ГБ": 1073741824,
    "ТБ": 1099511627776
};

function convert(value, from, to) {
    const inBase = value * units[from];
    return inBase / units[to];
}

// Перевірка конвертера в консолі
console.log("Тест конвертера 1:", convert(1024, "Б", "КБ"));
console.log("Тест конвертера 2:", convert(1, "ГБ", "МБ"));

function parseValue(text) {
    const normalized = text.trim().replace(",", ".");
    if (normalized === "") {
        return { error: "Введіть значення." };
    }
    const number = Number(normalized);
    if (!Number.isFinite(number)) {
        return { error: "Введіть коректне число, наприклад 5,5." };
    }
    if (number < 0) {
        return { error: "Значення не може бути від'ємним." };
    }
    return { number: number };
}

// П'ять обов'язкових тестів parseValue у консолі
console.log('parseValue("5,5"):', parseValue("5,5"));
console.log('parseValue(""):', parseValue(""));
console.log('parseValue("abc"):', parseValue("abc"));
console.log('parseValue("-3"):', parseValue("-3"));
console.log('parseValue(" 12 "):', parseValue(" 12 "));

const form = document.querySelector("#converter");
const valueInput = document.querySelector("#value");
const fromSelect = document.querySelector("#from");
const toSelect = document.querySelector("#to");
const resultBox = document.querySelector("#conv-result");

for (const name in units) {
    fromSelect.add(new Option(name, name));
    toSelect.add(new Option(name, name));
}
toSelect.selectedIndex = 2; // обираємо третю одиницю за замовчуванням

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const parsed = parseValue(valueInput.value);
    if (parsed.error) {
        resultBox.textContent = parsed.error;
        return;
    }
    const result = convert(parsed.number, fromSelect.value, toSelect.value);
    const pretty = result.toLocaleString("uk-UA", { maximumFractionDigits: 4 });
    resultBox.textContent = `${parsed.number} ${fromSelect.value} = ${pretty} ${toSelect.value}`;
});
// Каталог товарів
const PRICE_LIMIT = 400; // грн
const DISCOUNT = 10;     // %
const LOW_STOCK = 4;     // шт.

const products = [
    { id: 1, name: "Повнокадрова бездзеркальна камера", category: "Камери", price: 38500, qty: 3, rating: 4.9 },
    { id: 2, name: "Об'єктив 50mm f/1.8", category: "Об'єктиви", price: 8900, qty: 12, rating: 4.8 },
    { id: 3, name: "Швидка карта пам'яті 128GB", category: "Аксесуари", price: 350, qty: 0, rating: 4.6 },
    { id: 4, name: "Студійний софтбокс 60x90 см", category: "Світло", price: 1450, qty: 5, rating: 4.7 },
    { id: 5, name: "Зовнішній спалах TTL", category: "Світло", price: 4200, qty: 2, rating: 4.5 },
    { id: 6, name: "Карта пам'яті 64GB", category: "Аксесуари", price: 280, qty: 3, rating: 4.4 },
    { id: 7, name: "Штатний зум-об'єктив 24-70mm", category: "Об'єктиви", price: 29800, qty: 1, rating: 4.9 },
    { id: 8, name: "Світловідбивач 5-в-1 (80 см)", category: "Аксесуари", price: 390, qty: 8, rating: 4.3 },
    { id: 9, name: "Професійний штатив із карбону", category: "Опора", price: 6100, qty: 4, rating: 4.8 },
    { id: 10, name: "Набір для чищення оптики", category: "Аксесуари", price: 220, qty: 15, rating: 4.7 }
];

function formatMoney(amount) {
    return amount.toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " грн";
}

function priceWithDiscount(price) {
    return price * (100 - DISCOUNT) / 100;
}

function getStatus(qty) {
    if (qty === 0) {
        return "немає в наявності";
    } else if (qty <= LOW_STOCK) {
        return "закінчується";
    } else {
        return "є в наявності";
    }
}

function addDiscount(product) {
    return {
        ...product,
        discounted: priceWithDiscount(product.price)
    };
}

const catalog = products.map(addDiscount);
console.table(catalog);

const tbody = document.querySelector("#products-body");
const summary = document.querySelector("#summary");

function renderTable(list) {
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Нічого не знайдено</td></tr>';
        return;
    }
    let rows = "";
    for (const item of list) {
        rows += `<tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${formatMoney(item.price)}</td>
            <td>${formatMoney(item.discounted)}</td>
            <td>${item.qty}</td>
            <td>${getStatus(item.qty)}</td>
        </tr>`;
    }
    tbody.innerHTML = rows;
}

function renderSummary(list) {
    if (list.length === 0) {
        summary.textContent = "Немає товарів для розрахунку підсумків.";
        return;
    }
    const totalValue = list.reduce((sum, item) => sum + item.price * item.qty, 0);
    const avgRating = list.reduce((sum, item) => sum + item.rating, 0) / list.length;
    const maxPrice = list.reduce((max, item) => (item.price > max ? item.price : max), 0);

    summary.textContent = 
        `Товарів: ${list.length}. ` +
        `Вартість залишків: ${formatMoney(totalValue)}. ` +
        `Середній рейтинг: ${avgRating.toFixed(2)}. ` +
        `Найвища ціна: ${formatMoney(maxPrice)}.`;
}

function show(list) {
    renderTable(list);
    renderSummary(list);
}

// Перший показ каталогу під час завантаження
show(catalog);

const toolbar = document.querySelector(".toolbar");
toolbar.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

    let list = catalog;
    if (action === "expensive") {
        list = catalog.filter((item) => item.price > PRICE_LIMIT);
    } else if (action === "available") {
        list = catalog.filter((item) => item.qty > 0);
    } else if (action === "sort-asc") {
        list = catalog.slice().sort((a, b) => a.price - b.price);
    } else if (action === "sort-desc") {
        list = catalog.slice().sort((a, b) => b.price - a.price);
    }
    show(list);
});

const countByCategory = catalog.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
}, {});
console.log("Кількість товарів за категоріями:", countByCategory);