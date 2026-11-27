"use strict";

const STORAGE_KEY = "rashody";
const initialCategories = ["Еда", "Транспорт", "Дом"];
const byId = (id) => document.getElementById(id);
const expenseForm = byId("expense-form");
const categoryForm = byId("category-details");
let data = { categories: [...initialCategories], expenses: [], budgets: [] };
let storageReadable = true;
let budgetsExpanded = false;
let expenseDraft = false;
let categoryDraftStarted = false;
let categoryOnly = false;
let categoryPreviewColor = "#1967D2";
let categoryPreviewIcon = "tag";
let expenseScrollTop = 0;
let selectedCategory = "";
let appliedPeriod = { from: "", to: "", label: "Все даты" };
const categoryColors = [
  ["#1967D2", "#E8F0FE"], ["#137333", "#E6F4EA"], ["#A85B00", "#FEF7E0"],
  ["#8430CE", "#F3E8FD"], ["#00757D", "#E0F2F1"]
];

const categoryPalette = [
  { name: "Синий", color: "#1967D2" }, { name: "Зелёный", color: "#137333" },
  { name: "Янтарный", color: "#A85B00" }, { name: "Фиолетовый", color: "#8430CE" },
  { name: "Бирюзовый", color: "#00757D" }, { name: "Индиго", color: "#3F51B5" },
  { name: "Розовый", color: "#AD1457" }, { name: "Коричневый", color: "#795548" },
  { name: "Оливковый", color: "#657A18" }, { name: "Серо-синий", color: "#455A64" }
];

const categoryIcons = {
  food: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-4 9 0 9"/>',
  transport: '<rect x="4" y="4" width="16" height="14" rx="3"/><path d="M4 11h16M7 21v-3M17 21v-3M8 15h.01M16 15h.01"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7" cy="7" r="1"/>',
  shopping: '<path d="M5 8h14l-1 13H6zM9 9a3 3 0 0 1 6 0"/>', health: '<path d="M12 21s-8-5-8-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-6 11-6 11z"/>',
  sport: '<circle cx="12" cy="5" r="2"/><path d="m8 21 2-8 2 2 3-4 3 2M10 9l-3 4 3 2"/>', cafe: '<path d="M5 8h11v8a4 4 0 0 1-8 0V8zM16 10h2a2 2 0 0 1 0 4h-2M4 21h13"/>',
  education: '<path d="m3 9 9-5 9 5-9 5zM7 12v5c3 2 7 2 10 0v-5"/>', fun: '<path d="M5 5h14v14H5zM8 10h.01M16 10h.01M8 15c2 2 6 2 8 0"/>',
  travel: '<path d="M3 13h18M12 3v18M5 7h14M5 19h14"/><circle cx="12" cy="12" r="9"/>', phone: '<path d="M7 3h3l2 5-2 2c1 2 3 4 5 5l2-2 4 2v3c0 2-2 3-4 3C9 21 3 15 3 7c0-2 2-4 4-4z"/>',
  pets: '<circle cx="12" cy="14" r="5"/><circle cx="6" cy="8" r="2"/><circle cx="11" cy="5" r="2"/><circle cx="16" cy="5" r="2"/><circle cx="19" cy="9" r="2"/>', gifts: '<path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6c-4 0-5-5-1-4l1 4c4 0 5-5 1-4l-1 4"/>',
  clothes: '<path d="m8 4 4 3 4-3 5 4-3 4-2-1v10H8V11l-2 1-3-4z"/>', beauty: '<path d="m8 3 8 8M5 20l5-9 3 3-8 6zM14 4l2-2 6 6-2 2z"/>',
  work: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>', tools: '<path d="m14 6 4-4 2 2-4 4M13 7 4 16l4 4 9-9M5 5l4 4"/>',
  family: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2"/><path d="M3 21c0-4 3-7 6-7s6 3 6 7M14 21c0-3 1-5 4-5s3 2 3 5"/>', groceries: '<path d="M4 5h2l2 11h10l2-8H7M9 21h.01M17 21h.01"/>',
  utilities: '<path d="M12 2c4 5 6 8 6 12a6 6 0 0 1-12 0c0-4 2-7 6-12z"/>', subscriptions: '<path d="M4 7h16v10H4zM8 11h8M8 15h5"/>',
  wallet: '<path d="M4 6h14a2 2 0 0 1 2 2v11H4zM4 6V4h12M15 13h5"/>', other: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/>'
};
const categoryIconOptions = [
  ["tag", "Метка"], ["food", "Еда"], ["transport", "Транспорт"], ["home", "Дом"], ["shopping", "Покупки"], ["health", "Здоровье"],
  ["sport", "Спорт"], ["cafe", "Кафе"], ["education", "Образование"], ["fun", "Развлечения"], ["travel", "Путешествия"], ["phone", "Связь"],
  ["pets", "Питомцы"], ["gifts", "Подарки"], ["clothes", "Одежда"], ["beauty", "Красота"], ["work", "Работа"], ["tools", "Инструменты"],
  ["family", "Семья"], ["groceries", "Продукты"], ["utilities", "Коммунальные"], ["subscriptions", "Подписки"], ["wallet", "Кошелёк"], ["other", "Другое"]
];

function colorRgb(color) {
  return color.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
}

function contrastRatio(first, second) {
  const luminance = (color) => colorRgb(color).map((channel) => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const [low, high] = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (high + .05) / (low + .05);
}

function categoryAppearance(category) {
  const index = data.categories.indexOf(category);
  const [color, tint] = categoryColors[index % categoryColors.length] || categoryColors[0];
  const legacy = {
    color, tint, label: color, border: color,
    "icon-color": color, "icon-background": tint, "icon-border": "transparent",
    "progress-color": color, track: tint,
    icon: ["food", "transport", "home"][index] || "tag"
  };
  const matches = Array.isArray(data.categoryStyles)
    ? data.categoryStyles.filter((style) => style && style.category === category) : [];
  if (matches.length !== 1) return legacy;
  const style = matches[0];
  const icon = typeof style.icon === "string" && Object.hasOwn(categoryIcons, style.icon) ? style.icon : "tag";
  if (typeof style.color !== "string" || !/^#[0-9a-f]{6}$/i.test(style.color)) return { ...legacy, icon };
  return colorAppearance(style.color, icon);
}

function colorAppearance(color, icon = "tag") {
  const chosen = color.toUpperCase();
  const toHex = (channels) => "#" + channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase();
  let progress = chosen;
  while (contrastRatio(progress, "#E5E6E8") < 3) {
    progress = toHex(colorRgb(progress).map((channel) => Math.floor(channel * .9)));
  }
  return {
    color: chosen,
    tint: toHex(colorRgb(chosen).map((channel) => Math.round(.15 * channel + .85 * 255))),
    label: "#202124", border: "#5F6368", icon,
    "icon-color": contrastRatio(chosen, "#000000") >= contrastRatio(chosen, "#FFFFFF") ? "#000000" : "#FFFFFF",
    "icon-background": chosen, "icon-border": "#5F6368",
    "progress-color": progress, track: "#E5E6E8"
  };
}

function applyAppearance(appearance, container) {
  const { icon, ...colors } = appearance;
  for (const [name, value] of Object.entries(colors)) container.style.setProperty(`--category-${name}`, value);
  return icon;
}

function appearanceIcon(appearance, container) {
  const name = applyAppearance(appearance, container);
  const icon = document.createElement("span");
  icon.className = "category-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<svg viewBox="0 0 24 24">${categoryIcons[name]}</svg>`;
  return icon;
}

function setupDialog(dialog) {
  let opener;
  let scrollY = 0;
  dialog.addEventListener("close", () => {
    if (document.querySelector("dialog[open]")) return;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const fields = [...dialog.querySelectorAll("button, input, select, textarea, [tabindex]")]
      .filter((field) => !field.disabled && field.tabIndex >= 0 && field.getClientRects().length);
    const first = fields[0];
    const last = fields.at(-1);
    if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  });
  let startedOnBackdrop = false;
  const outside = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener("pointerdown", (event) => { startedOnBackdrop = event.target === dialog && outside(event); });
  dialog.addEventListener("click", (event) => {
    if (startedOnBackdrop && event.target === dialog && outside(event)) dialog.close();
    startedOnBackdrop = false;
  });
  const header = dialog.querySelector(".modal-header");
  let swipe;
  header.addEventListener("pointerdown", (event) => {
    if (!matchMedia("(max-width: 600px)").matches || event.target.closest("button") || !event.isPrimary) return;
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", (event) => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dy = event.clientY - swipe.y;
    const dx = event.clientX - swipe.x;
    if (dy > 0 && dy > Math.abs(dx)) {
      dialog.classList.add("swiping");
      dialog.style.transform = `translateY(${dy}px)`;
    }
  });
  function endSwipe(event) {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dy = event.clientY - swipe.y;
    const dismiss = event.type === "pointerup" && dy >= 60 && dy > Math.abs(event.clientX - swipe.x);
    swipe = null;
    dialog.classList.remove("swiping");
    dialog.style.transform = "";
    if (dismiss) dialog.close();
  }
  header.addEventListener("pointerup", endSwipe);
  header.addEventListener("pointercancel", endSwipe);
  return () => {
    if (document.querySelector("dialog[open]")) return;
    opener = document.activeElement;
    scrollY = window.scrollY;
    dialog.showModal();
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  };
}
const showBudgetDialog = setupDialog(byId("budget-dialog"));
const showPeriodDialog = setupDialog(byId("period-dialog"));
const showExpenseDialog = setupDialog(byId("expense-dialog"));
byId("expense-dialog").addEventListener("close", () => {
  categoryOnly = false;
  setCategoryScreen(false);
});

if (window.visualViewport) {
  const fitDialogs = () => {
    document.documentElement.style.setProperty("--visible-height", `${visualViewport.height}px`);
    document.documentElement.style.setProperty("--viewport-top", `${visualViewport.offsetTop}px`);
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (focused.matches("input, select, textarea") && focused.closest("dialog[open]")) {
        focused.scrollIntoView({ block: "nearest" });
      }
    });
  };
  visualViewport.addEventListener("resize", fitDialogs);
  visualViewport.addEventListener("scroll", fitDialogs);
  fitDialogs();
}

function updateExpenseForm() {
  const currency = byId("currency").value;
  byId("amount-symbol").textContent = currency === "USD" ? "$" : "₸";
  byId("amount").inputMode = currency === "USD" ? "decimal" : "numeric";
  byId("amount").placeholder = currency === "USD" ? "12,50" : "5 000";
  byId("entry-meta").textContent = `${byId("date").value ? byId("date").value.split("-").reverse().join(".") : "Дата не выбрана"} · ${currency === "USD" ? "$" : "₸"}`;
  byId("entry-category-name").textContent = byId("category").value || "Выберите категорию";
  byId("entry-categories").querySelectorAll("[data-category]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === byId("category").value));
    applyAppearance(categoryAppearance(button.dataset.category), button);
  });
}

byId("open-expense").addEventListener("click", () => {
  if (!storageReadable || document.querySelector("dialog[open]")) return;
  if (!expenseDraft && selectedCategory) byId("category").value = selectedCategory;
  setCategoryScreen(false);
  byId("save-notice").hidden = true;
  updateExpenseForm();
  showExpenseDialog();
  byId("amount").focus();
});
expenseForm.addEventListener("input", () => { expenseDraft = true; updateExpenseForm(); });
expenseForm.addEventListener("change", () => { expenseDraft = true; updateExpenseForm(); });
byId("show-expense").addEventListener("click", () => {
  selectedCategory = "";
  appliedPeriod = { from: "", to: "", label: "Все даты" };
  byId("save-notice").hidden = true;
  render();
  byId("open-period").focus();
});

function openBudget(category) {
  const form = byId("budget-form");
  form.dataset.category = category;
  form.dataset.month = localDate().slice(0, 7);
  const amount = data.budgets.find((budget) => budget.month === form.dataset.month && budget.category === category)?.amount;
  byId("budget-category-name").textContent = category;
  byId("budget-current").textContent = `Текущий лимит: ${amount === undefined ? "Не задан" : money(amount, "KZT")}`;
  byId("budget-limit").value = amount === undefined ? "" : String(amount);
  fieldError("budget-limit", "");
  form.querySelectorAll("input, button").forEach((field) => { field.disabled = !storageReadable; });
  byId("remove-budget").disabled = !storageReadable || amount === undefined;
  byId("budget-save").disabled = !storageReadable;
  showBudgetDialog();
  byId("budget-limit").focus();
}

function localDate(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) !== "0000" &&
    localDate(new Date(`${value}T12:00:00`)) === value;
}

function money(amount, currency) {
  const digits = String(amount).padStart(currency === "USD" ? 3 : 1, "0");
  const whole = currency === "USD" ? digits.slice(0, -2) : digits;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "USD" ? `${grouped},${digits.slice(-2)} $` : `${grouped} ₸`;
}

function parseAmount(value, currency) {
  const raw = value.trim().replace(/[ \u00a0\u202f]/g, "");
  if (!(currency === "USD" ? /^\d+([.,]\d{1,2})?$/ : /^\d+$/).test(raw)) return null;
  const [whole, fraction = ""] = raw.split(/[.,]/);
  const amount = Number(currency === "USD" ? whole + fraction.padEnd(2, "0") : whole);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function totals(expenses) {
  return expenses.reduce((sum, expense) => {
    sum[expense.currency] += expense.amount;
    return sum;
  }, { KZT: 0, USD: 0 });
}

function renderTotals(prefix, expenses) {
  const sum = totals(expenses);
  byId(`${prefix}-total`).textContent = money(sum.KZT, "KZT");
  byId(`${prefix}-total-usd`).textContent = money(sum.USD, "USD");
}

function fieldError(id, message) {
  const field = byId(id);
  field.setAttribute("aria-invalid", String(Boolean(message)));
  byId(`${id}-error`).textContent = message;
  byId(`${id}-error`).hidden = !message;
}

function save(next) {
  if (!storageReadable) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    data = next;
    byId("storage-error").hidden = true;
    return true;
  } catch {
    byId("storage-error").textContent = "Не удалось сохранить данные. Проверьте свободное место и разрешение браузера на хранение данных. Введённое осталось в форме.";
    byId("storage-error").hidden = false;
    return false;
  }
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return;
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.expenses) ||
      !initialCategories.every((name) => parsed.categories.includes(name)) ||
      !parsed.categories.every((name) => typeof name === "string" && name.trim()) ||
      !parsed.expenses.every((expense) => expense && Number.isSafeInteger(expense.amount) && expense.amount > 0 &&
        parsed.categories.includes(expense.category) && typeof expense.date === "string" && validDate(expense.date) &&
        typeof expense.comment === "string" && (expense.currency === undefined || ["KZT", "USD"].includes(expense.currency)))) {
      throw new Error("Invalid saved data");
    }
    parsed.expenses = parsed.expenses.map((expense) => ({ ...expense, currency: expense.currency === undefined ? "KZT" : expense.currency }));
    if (!Object.values(totals(parsed.expenses)).every(Number.isSafeInteger)) throw new Error("Invalid saved total");
    if (parsed.budgets === undefined) parsed.budgets = [];
    if (!Array.isArray(parsed.budgets)) throw new Error("Invalid budgets");
    const budgetKeys = new Set();
    const monthTotals = new Map();
    for (const budget of parsed.budgets) {
      if (!budget || typeof budget.month !== "string" || !validDate(`${budget.month}-01`) ||
        !parsed.categories.includes(budget.category) || !Number.isSafeInteger(budget.amount) || budget.amount <= 0) {
        throw new Error("Invalid budget");
      }
      const key = JSON.stringify([budget.month, budget.category]);
      const sum = (monthTotals.get(budget.month) || 0) + budget.amount;
      if (budgetKeys.has(key) || !Number.isSafeInteger(sum)) throw new Error("Invalid budget total");
      budgetKeys.add(key);
      monthTotals.set(budget.month, sum);
    }
    data = parsed;
    storageReadable = true;
  } catch {
    storageReadable = false;
    byId("storage-error").textContent = "Не удалось прочитать сохранённые данные. Они не изменены. Изменения недоступны: проверьте разрешение браузера на хранение данных или восстановите сохранённые записи.";
    byId("storage-error").hidden = false;
    document.querySelectorAll("#expense-form input, #expense-form select, #expense-form textarea, #expense-form button, #category-details input, #category-details button, #save-category, #budget-list button, #budget-form input, #budget-form button, #open-expense, #add-expense, #budget-save")
      .forEach((field) => { field.disabled = true; });
  }
}

function updateBudget(form, remove = false) {
  byId("budget-status").textContent = "";
  if (form.dataset.month !== localDate().slice(0, 7)) {
    openBudget(form.dataset.category);
    renderBudgets();
    fieldError("budget-limit", "Начался новый месяц. Задайте лимит заново.");
    return;
  }
  const input = form.querySelector("input");
  const amount = parseAmount(input.value, "KZT");
  const budgets = data.budgets.filter((budget) => budget.month !== form.dataset.month || budget.category !== form.dataset.category);
  const sum = budgets.filter((budget) => budget.month === form.dataset.month).reduce((total, budget) => total + budget.amount, 0);
  const error = remove ? "" : amount === null ? "Введите положительный лимит в целых тенге, например 20 000."
    : !Number.isSafeInteger(sum + amount) ? "Общий бюджет слишком велик для точного расчёта." : "";
  fieldError(input.id, error);
  if (error) {
    input.focus();
    return;
  }
  if (!remove) budgets.push({ month: form.dataset.month, category: form.dataset.category, amount });
  if (!save({ ...data, budgets })) {
    fieldError(input.id, byId("storage-error").textContent);
    input.focus();
    return;
  }
  renderBudgets();
  byId("budget-status").textContent = remove ? "Лимит убран" : "Лимит сохранён";
  byId("budget-dialog").close();
}

function renderBudgetSummary(container, amount, spent) {
  const overBudget = amount !== undefined && spent > amount;
  const remaining = container.querySelector(".budget-remaining");
  remaining.textContent = amount === undefined ? "Осталось: —" : overBudget
    ? `Перерасход: ${money(spent - amount, "KZT")}` : `Осталось: ${money(amount - spent, "KZT")}`;
  remaining.classList.toggle("over-budget", overBudget);
}

function renderBudgets() {
  const list = byId("budget-list");
  const month = localDate().slice(0, 7);
  const budgets = data.budgets.filter((budget) => budget.month === month);
  const expenses = data.expenses.filter((expense) => expense.currency === "KZT" && expense.date.slice(0, 7) === month);
  const totalLimit = budgets.length ? budgets.reduce((sum, budget) => sum + budget.amount, 0) : undefined;
  byId("budget-total").textContent = `Общий бюджет: ${totalLimit === undefined ? "Не задан" : money(totalLimit, "KZT")}`;
  renderBudgetSummary(byId("budget-overview"), totalLimit, expenses.reduce((sum, expense) => sum + expense.amount, 0));
  byId("budget-missing").hidden = budgets.length === data.categories.length;
  byId("budget-month").textContent = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  if (list.dataset.month !== month || [...list.children].some((row, index) => row.dataset.category !== data.categories[index])) {
    list.replaceChildren();
    list.dataset.month = month;
    byId("budget-status").textContent = "";
  }
  let hiddenOverspend = false;
  data.categories.forEach((category, index) => {
    let row = list.children[index];
    if (!row) {
      row = byId("budget-row").content.firstElementChild.cloneNode(true);
      row.dataset.category = category;
      row.querySelector("h3").textContent = category;
      const edit = row.querySelector("button");
      edit.setAttribute("aria-label", `Изменить лимит: ${category}`);
      edit.addEventListener("click", () => openBudget(category));
      list.append(row);
    }
    row.querySelector(".category-icon").replaceWith(appearanceIcon(categoryAppearance(category), row));
    const amount = budgets.find((budget) => budget.category === category)?.amount;
    const spent = expenses.filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const overBudget = amount !== undefined && spent > amount;
    renderBudgetSummary(row, amount, spent);
    row.querySelector(".budget-ratio").textContent = `${money(spent, "KZT")} / ${amount === undefined ? "Лимит не задан" : money(amount, "KZT")}`;
    const meter = row.querySelector(".budget-meter");
    const percentage = amount === undefined ? 0 : Math.min(100, spent / amount * 100);
    meter.style.setProperty("--progress", `${percentage}%`);
    meter.setAttribute("aria-valuenow", String(percentage));
    meter.setAttribute("aria-label", `Бюджет: ${category}`);
    meter.setAttribute("aria-valuetext", `${money(spent, "KZT")}${amount === undefined ? "; лимит не задан" : ` из ${money(amount, "KZT")}`}${overBudget ? "; перерасход" : ""}`);
    meter.classList.toggle("over-budget", overBudget);
    meter.classList.toggle("no-limit", amount === undefined);
    row.hidden = !budgetsExpanded && index >= 3;
    if (index >= 3 && overBudget) hiddenOverspend = true;
    row.querySelector("button").disabled = !storageReadable;
  });
  const more = byId("budget-more");
  more.hidden = data.categories.length <= 3;
  more.setAttribute("aria-expanded", String(budgetsExpanded));
  more.textContent = budgetsExpanded ? "Свернуть" : `Ещё ${data.categories.length - 3}${hiddenOverspend ? " · есть перерасход" : ""}`;
  if (byId("budget-dialog").open && byId("budget-form").dataset.month !== month) {
    openBudget(byId("budget-form").dataset.category);
    fieldError("budget-limit", "Начался новый месяц. Задайте лимит заново.");
  }
}

byId("budget-more").addEventListener("click", () => {
  budgetsExpanded = !budgetsExpanded;
  renderBudgets();
});
byId("budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  updateBudget(event.currentTarget);
});
byId("remove-budget").addEventListener("click", () => updateBudget(byId("budget-form"), true));

function categoryChip(category, selected, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "category-chip";
  button.dataset.category = category;
  if (category) applyAppearance(categoryAppearance(category), button);
  else {
    button.style.setProperty("--category-color", "#7C203A");
    button.style.setProperty("--category-tint", "#F8EDF1");
  }
  const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  check.setAttribute("viewBox", "0 0 24 24");
  check.setAttribute("aria-hidden", "true");
  check.innerHTML = '<path d="m5 12 4 4L19 6"/>';
  button.append(check, document.createTextNode(category || "Все"));
  button.setAttribute("aria-pressed", String(selected));
  button.addEventListener("click", () => {
    onSelect();
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  return button;
}

function newCategoryChip() {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "new-dashboard-category";
  button.className = "category-chip";
  button.textContent = "+ Категория";
  button.disabled = !storageReadable;
  button.addEventListener("click", () => {
    if (document.querySelector("dialog[open]")) return;
    categoryOnly = true;
    setCategoryScreen(false);
    showExpenseDialog();
    byId("new-category-toggle").click();
  });
  return button;
}

function renderCategories(selected = byId("category").value) {
  byId("category").value = data.categories.includes(selected) ? selected : data.categories[0];
  byId("category-filters").replaceChildren(...["", ...data.categories].map((category) =>
    categoryChip(category, selectedCategory === category, () => { selectedCategory = category; render(); })), newCategoryChip());
  byId("entry-categories").replaceChildren(...data.categories.map((category) => {
    const button = categoryChip(category, byId("category").value === category, () => {
      byId("category").value = category;
      expenseDraft = true;
      fieldError("category", "");
      updateExpenseForm();
    });
    button.disabled = !storageReadable;
    return button;
  }));
  byId("new-category-toggle").disabled = !storageReadable;
  byId("save-category").disabled = !storageReadable;
  updateExpenseForm();
}

function setCategoryScreen(editing) {
  expenseForm.hidden = editing;
  categoryForm.hidden = !editing;
  byId("category-back").hidden = !editing;
  byId("add-expense").hidden = editing;
  byId("save-category").hidden = !editing;
  byId("entry-heading").textContent = editing ? "Новая категория" : "Добавить трату";
}

function normalizedCategoryName(name) {
  return name.normalize("NFC").trim().replace(/\s+/gu, " ");
}

function categoryHex() {
  const value = byId("category-hex").value.trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null;
}

function updateCategoryPreview() {
  const preview = byId("category-preview");
  const appearance = colorAppearance(categoryPreviewColor, categoryPreviewIcon);
  byId("category-preview-icon").replaceChildren(appearanceIcon(appearance, preview));
  byId("category-preview-name").textContent = normalizedCategoryName(byId("new-category").value) || "Название категории";
  const preset = categoryPalette.find((option) => option.color === categoryPreviewColor);
  byId("category-color-label").textContent = `${byId("category-color-custom").checked ? "Свой цвет" : preset.name} · ${categoryPreviewColor}`;
  byId("category-icon-label").textContent = `Выбрано: ${categoryIconOptions.find(([icon]) => icon === categoryPreviewIcon)[1]}`;
}

function renderCategoryIcons() {
  const query = byId("category-icon-search").value.trim().toLocaleLowerCase("ru-RU");
  const options = categoryIconOptions.filter(([, name]) => name.toLocaleLowerCase("ru-RU").includes(query));
  byId("category-icon-empty").hidden = options.length > 0;
  byId("category-icons").replaceChildren(...options.map(([icon, name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-option";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(icon === categoryPreviewIcon));
    button.dataset.icon = icon;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${categoryIcons[icon]}</svg><span>${name}</span>`;
    button.addEventListener("click", () => { categoryPreviewIcon = icon; renderCategoryIcons(); updateCategoryPreview(); });
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...byId("category-icons").querySelectorAll("button")];
      const index = buttons.indexOf(button);
      buttons[(index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length].focus();
    });
    return button;
  }));
}

function chooseCategoryColor() {
  const selected = categoryForm.querySelector('[name="category-color"]:checked');
  const custom = selected.value === "custom";
  byId("category-custom-color").hidden = !custom;
  if (!custom) {
    categoryPreviewColor = selected.value;
    byId("category-hex").value = categoryPreviewColor;
    byId("category-color-picker").value = categoryPreviewColor;
    fieldError("category-hex", "");
  }
  updateCategoryPreview();
}

function renderCategoryPalette() {
  byId("category-palette").replaceChildren(...categoryPalette.map(({ name, color }) => {
    const label = document.createElement("label");
    label.className = "palette-option";
    label.style.setProperty("--swatch-color", color);
    label.style.setProperty("--swatch-ink", colorAppearance(color)["icon-color"]);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "category-color";
    input.value = color;
    input.setAttribute("aria-label", `${name}, ${color}`);
    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
    label.append(input, swatch);
    return label;
  }));
}

byId("new-category-toggle").addEventListener("click", () => {
  if (!storageReadable) return;
  expenseScrollTop = expenseForm.scrollTop;
  const resumed = categoryDraftStarted;
  if (!resumed) {
    const colors = data.categories.map((category) => categoryAppearance(category).color);
    const counts = categoryPalette.map(({ color }) => colors.filter((used) => used === color).length);
    categoryPreviewColor = categoryPalette[counts.indexOf(Math.min(...counts))].color;
    categoryPreviewIcon = "tag";
    byId("new-category").value = "";
    byId("category-hex").value = categoryPreviewColor;
    byId("category-color-picker").value = categoryPreviewColor;
    categoryForm.querySelectorAll('[name="category-color"]').forEach((input) => { input.checked = input.value === categoryPreviewColor; });
    byId("category-custom-color").hidden = true;
    byId("category-icon-options").hidden = true;
    byId("category-icon-toggle").setAttribute("aria-expanded", "false");
    byId("category-icon-search").value = "";
    byId("select-existing-category").hidden = true;
    byId("category-storage-error").hidden = true;
    fieldError("new-category", "");
    fieldError("category-hex", "");
    categoryForm.scrollTop = 0;
  }
  categoryDraftStarted = true;
  byId("category-draft-note").hidden = !resumed;
  categoryForm.querySelectorAll("input, button").forEach((control) => { control.disabled = false; });
  updateCategoryPreview();
  renderCategoryIcons();
  setCategoryScreen(true);
  byId("new-category").focus();
});
byId("category-back").addEventListener("click", () => {
  setCategoryScreen(false);
  expenseForm.scrollTop = expenseScrollTop;
  byId("new-category-toggle").focus();
});
categoryForm.addEventListener("change", (event) => {
  if (event.target.name === "category-color") chooseCategoryColor();
});
byId("new-category").addEventListener("input", () => {
  byId("select-existing-category").hidden = true;
  fieldError("new-category", "");
  updateCategoryPreview();
});
byId("category-hex").addEventListener("input", () => {
  const color = categoryHex();
  if (color) {
    categoryPreviewColor = color;
    byId("category-color-picker").value = color;
    fieldError("category-hex", "");
    updateCategoryPreview();
  }
});
byId("category-hex").addEventListener("blur", () => {
  if (!byId("category-color-custom").checked) return;
  const color = categoryHex();
  fieldError("category-hex", color ? "" : "Введите цвет в формате #RRGGBB, например #1967D2.");
  if (color) byId("category-hex").value = color;
});
function pickerHex(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
  if (!CSS.supports("color", value)) return null;
  const context = document.createElement("canvas").getContext("2d");
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return alpha === 255 ? "#" + [red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase() : null;
}

function syncCategoryPicker() {
  const value = byId("category-color-picker").value;
  byId("category-hex").value = pickerHex(value) || value;
  byId("category-hex").dispatchEvent(new Event("input"));
  if (!categoryHex()) fieldError("category-hex", "Выберите непрозрачный цвет в формате #RRGGBB.");
}
byId("category-color-picker").addEventListener("input", syncCategoryPicker);
byId("category-color-picker").addEventListener("change", syncCategoryPicker);
byId("category-icon-toggle").addEventListener("click", () => {
  const options = byId("category-icon-options");
  options.hidden = !options.hidden;
  byId("category-icon-toggle").setAttribute("aria-expanded", String(!options.hidden));
  if (!options.hidden) byId("category-icon-search").focus();
});
byId("category-icon-search").addEventListener("input", renderCategoryIcons);

function render() {
  byId("open-expense").disabled = !storageReadable;
  byId("add-expense").disabled = !storageReadable;
  const today = localDate();
  renderTotals("month", data.expenses.filter((expense) => expense.date.slice(0, 7) === today.slice(0, 7)));
  renderBudgets();

  const { from, to, label } = appliedPeriod;
  const dateLabel = (date) => date.split("-").reverse().join(".");
  const periodText = from && to ? from === to ? dateLabel(from) : `${dateLabel(from)}–${dateLabel(to)}`
    : from ? `С ${dateLabel(from)}` : to ? `По ${dateLabel(to)}` : "Все даты";
  const crossesYear = from && to && from.slice(0, 4) !== to.slice(0, 4);
  const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", ...(!crossesYear && date.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" })
  }).replace(/ г\.$/, "");
  let shortPeriod = "Все даты";
  if (from && to) {
    shortPeriod = from === to ? shortDate(from) : from.slice(0, 7) === to.slice(0, 7)
      ? `${Number(from.slice(8))}–${shortDate(to)}` : `${shortDate(from)} – ${shortDate(to)}`;
  } else if (from) shortPeriod = `С ${shortDate(from)}`;
  else if (to) shortPeriod = `По ${shortDate(to)}`;
  const periodLabel = label && (!to || to === today) ? label : shortPeriod;
  byId("period-label").textContent = periodLabel;
  byId("open-period").setAttribute("aria-label", `Период трат: ${periodLabel}${periodLabel === periodText ? "" : `; ${periodText}`}`);
  byId("open-period").title = periodText;
  byId("reset-period").hidden = !(from || to);
  byId("period-summary").hidden = !(from || to || selectedCategory);
  byId("category-filters").querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
    if (button.dataset.category) applyAppearance(categoryAppearance(button.dataset.category), button);
  });

  const expenses = data.expenses.filter((expense) => (!selectedCategory || expense.category === selectedCategory) &&
    (!from || expense.date >= from) && (!to || expense.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date));
  renderTotals("period", expenses);
  byId("period-usd").hidden = !expenses.some((expense) => expense.currency === "USD");
  byId("empty-state").hidden = expenses.length > 0;
  byId("empty-state").textContent = data.expenses.length ? "По выбранным фильтрам трат нет" : "Пока нет трат. Нажмите +, чтобы добавить";
  byId("expense-list").replaceChildren(...expenses.map((expense) => {
    const item = document.createElement("li");
    item.className = "expense";
    const category = document.createElement("p");
    category.className = "expense-category";
    category.textContent = expense.category;
    const amount = document.createElement("p");
    amount.className = "expense-amount";
    amount.textContent = money(expense.amount, expense.currency);
    const date = document.createElement("time");
    date.className = "expense-date";
    date.dateTime = expense.date;
    date.textContent = expense.date.split("-").reverse().join(".");
    const details = document.createElement("div");
    details.className = "expense-details";
    details.append(category, date);
    item.append(appearanceIcon(categoryAppearance(expense.category), item), details, amount);
    if (expense.comment) {
      const comment = document.createElement("p");
      comment.className = "expense-comment";
      comment.textContent = expense.comment;
      details.append(comment);
    }
    return item;
  }));
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (expenseForm.hidden || !byId("expense-dialog").open || !storageReadable) return;
  byId("expense-storage-error").hidden = true;
  const currency = byId("currency").value;
  const amount = parseAmount(byId("amount").value, currency);
  const category = byId("category").value;
  const date = byId("date").value;
  const amountError = amount === null
    ? currency === "USD" ? "Введите положительную сумму в долларах, не более двух знаков после запятой." : "Введите положительную сумму в целых тенге, например 5 000."
    : !Number.isSafeInteger(totals(data.expenses)[currency] + amount)
      ? "Сумма слишком велика для точного расчёта итога." : "";
  fieldError("amount", amountError);
  fieldError("currency", ["KZT", "USD"].includes(currency) ? "" : "Выберите валюту.");
  fieldError("category", data.categories.includes(category) ? "" : "Выберите категорию.");
  fieldError("date", validDate(date) ? "" : "Укажите корректную дату.");
  const firstInvalid = expenseForm.querySelector('[aria-invalid="true"]:not(#new-category)');
  if (firstInvalid) {
    if (["date", "currency"].includes(firstInvalid.id)) byId("expense-details").open = true;
    if (firstInvalid.id === "category") byId("entry-categories").querySelector("button").focus();
    else firstInvalid.focus();
    return;
  }
  const expense = { amount, currency, category, date, comment: byId("comment").value.trim() };
  if (!save({ ...data, expenses: [expense, ...data.expenses] })) {
    byId("expense-storage-error").textContent = byId("storage-error").textContent;
    byId("expense-storage-error").hidden = false;
    byId("expense-storage-error").scrollIntoView({ block: "nearest" });
    return;
  }
  byId("amount").value = "";
  byId("comment").value = "";
  expenseDraft = false;
  byId("expense-details").open = false;
  setCategoryScreen(false);
  updateExpenseForm();
  render();
  const hiddenByFilters = selectedCategory && category !== selectedCategory ||
    appliedPeriod.from && date < appliedPeriod.from || appliedPeriod.to && date > appliedPeriod.to;
  byId("save-status").textContent = hiddenByFilters ? "Трата добавлена. Скрыта фильтрами." : "Трата добавлена";
  byId("show-expense").hidden = !hiddenByFilters;
  byId("save-notice").hidden = false;
  byId("expense-dialog").close();
});

byId("currency").addEventListener("change", () => {
  updateExpenseForm();
  fieldError("amount", "");
  fieldError("currency", "");
});

function finishCategoryCreation(name) {
  categoryDraftStarted = false;
  byId("new-category").value = "";
  if (categoryOnly) {
    categoryOnly = false;
    renderCategories();
    renderBudgets();
    render();
    byId("expense-dialog").close();
    return;
  }
  expenseDraft = true;
  renderCategories(name);
  renderBudgets();
  fieldError("category", "");
  setCategoryScreen(false);
  expenseForm.scrollTop = expenseScrollTop;
  byId("amount").focus();
}

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (categoryForm.hidden || !byId("expense-dialog").open || !storageReadable) return;
  const raw = byId("new-category").value;
  const name = normalizedCategoryName(raw);
  const nameError = !name ? "Введите название категории." : /[\u0000-\u001F\u007F]/u.test(raw)
    ? "Название не должно содержать управляющие символы." : Array.from(name).length > 40 ? "Название должно быть не длиннее 40 символов." : "";
  const existing = data.categories.find((category) => normalizedCategoryName(category).toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU"));
  const color = byId("category-color-custom").checked ? categoryHex() : categoryPreviewColor;
  fieldError("new-category", nameError || (existing ? `Категория «${existing}» уже есть.` : ""));
  fieldError("category-hex", color ? "" : "Введите цвет в формате #RRGGBB, например #1967D2.");
  byId("select-existing-category").hidden = !existing || Boolean(nameError);
  byId("select-existing-category").dataset.category = existing || "";
  byId("category-storage-error").hidden = true;
  if (nameError || existing || !color) {
    byId(nameError || existing ? "new-category" : "category-hex").focus();
    return;
  }
  const categoryStyles = Array.isArray(data.categoryStyles)
    ? data.categoryStyles.filter((style) => !style || style.category !== name) : [];
  if (!save({ ...data, categories: [...data.categories, name], categoryStyles: [...categoryStyles, { category: name, color, icon: categoryPreviewIcon }] })) {
    byId("category-storage-error").textContent = byId("storage-error").textContent;
    byId("category-storage-error").hidden = false;
    byId("category-storage-error").scrollIntoView({ block: "nearest" });
    return;
  }
  finishCategoryCreation(name);
});
byId("select-existing-category").addEventListener("click", () => {
  const button = byId("select-existing-category");
  if (categoryForm.hidden || button.hidden || !storageReadable || !data.categories.includes(button.dataset.category)) return;
  finishCategoryCreation(button.dataset.category);
});

function periodError(message = "", invalidFrom = false, invalidTo = false) {
  byId("period-error").textContent = message;
  byId("period-error").hidden = !message;
  byId("period-from").setAttribute("aria-invalid", String(invalidFrom));
  byId("period-to").setAttribute("aria-invalid", String(invalidTo));
}

function applyPeriod(from, to, label = "") {
  appliedPeriod = { from, to, label };
  render();
  byId("period-dialog").close();
}

byId("open-period").addEventListener("click", () => {
  byId("period-from").value = appliedPeriod.from;
  byId("period-to").value = appliedPeriod.to;
  periodError();
  showPeriodDialog();
});
byId("period-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const from = byId("period-from").value;
  const to = byId("period-to").value;
  const invalidFrom = byId("period-from").validity.badInput || Boolean(from) && !validDate(from);
  const invalidTo = byId("period-to").validity.badInput || Boolean(to) && !validDate(to);
  const reversed = from && to && from > to;
  if (invalidFrom || invalidTo || reversed) {
    periodError(reversed ? "Дата «С» должна быть не позже даты «По»." : "Укажите корректные даты периода.",
      Boolean(invalidFrom || reversed), Boolean(invalidTo || reversed));
    byId(invalidTo && !invalidFrom && !reversed ? "period-to" : "period-from").focus();
    return;
  }
  periodError();
  applyPeriod(from, to);
});
byId("reset-period").addEventListener("click", () => {
  appliedPeriod = { from: "", to: "", label: "Все даты" };
  render();
  byId("open-period").focus({ preventScroll: true });
});

document.querySelectorAll("[data-days]").forEach((button) => {
  button.addEventListener("click", () => {
    const days = Number(button.dataset.days);
    if (!days) {
      applyPeriod("", "", "Все даты");
      return;
    }
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    applyPeriod(localDate(start), localDate(end), button.textContent);
  });
});

renderCategoryPalette();
load();
renderCategories();
byId("date").value = localDate();
updateExpenseForm();
render();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
