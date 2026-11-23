"use strict";

const STORAGE_KEY = "rashody";
const initialCategories = ["Еда", "Транспорт", "Дом"];
const byId = (id) => document.getElementById(id);
const expenseForm = byId("expense-form");
let data = { categories: [...initialCategories], expenses: [], budgets: [] };
let storageReadable = true;
let budgetsExpanded = false;
let expenseDraft = false;
let selectedCategory = "";
let appliedPeriod = { from: "", to: "", label: "Все даты" };
const categoryColors = [
  ["#1967D2", "#E8F0FE"], ["#137333", "#E6F4EA"], ["#A85B00", "#FEF7E0"],
  ["#8430CE", "#F3E8FD"], ["#00757D", "#E0F2F1"]
];

function categoryIcon(category, container) {
  const index = data.categories.indexOf(category);
  const [color, tint] = categoryColors[index % categoryColors.length];
  container.style.setProperty("--category-color", color);
  container.style.setProperty("--category-tint", tint);
  const icon = document.createElement("span");
  icon.className = "category-icon";
  icon.setAttribute("aria-hidden", "true");
  const paths = [
    '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-4 9 0 9"/>',
    '<rect x="4" y="4" width="16" height="14" rx="3"/><path d="M4 11h16M7 21v-3M17 21v-3M8 15h.01M16 15h.01"/>',
    '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>'
  ];
  icon.innerHTML = `<svg viewBox="0 0 24 24">${paths[index] || '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7" cy="7" r="1"/>'}</svg>`;
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
  });
}

byId("open-expense").addEventListener("click", () => {
  if (!storageReadable || document.querySelector("dialog[open]")) return;
  if (!expenseDraft && selectedCategory) byId("category").value = selectedCategory;
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
    document.querySelectorAll("#expense-form input, #expense-form select, #expense-form textarea, #expense-form button, #budget-list button, #budget-form input, #budget-form button, #open-expense, #add-expense, #budget-save")
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
      row.querySelector(".category-icon").replaceWith(categoryIcon(category, row));
      const edit = row.querySelector("button");
      edit.setAttribute("aria-label", `Изменить лимит: ${category}`);
      edit.addEventListener("click", () => openBudget(category));
      list.append(row);
    }
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
  const [color, tint] = category ? categoryColors[data.categories.indexOf(category) % categoryColors.length] : ["#7C203A", "#F8EDF1"];
  button.style.setProperty("--category-color", color);
  button.style.setProperty("--category-tint", tint);
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

function renderCategories(selected = byId("category").value) {
  byId("category").value = data.categories.includes(selected) ? selected : data.categories[0];
  byId("category-filters").replaceChildren(...["", ...data.categories].map((category) =>
    categoryChip(category, selectedCategory === category, () => { selectedCategory = category; render(); })));
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
  byId("new-category-toggle").setAttribute("aria-expanded", String(!byId("category-details").hidden));
  byId("new-category-toggle").disabled = !storageReadable;
  updateExpenseForm();
}

byId("new-category-toggle").addEventListener("click", () => {
  const details = byId("category-details");
  details.hidden = !details.hidden;
  byId("new-category-toggle").setAttribute("aria-expanded", String(!details.hidden));
  if (!details.hidden) byId("new-category").focus();
});

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
    item.append(categoryIcon(expense.category, item), details, amount);
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
  if (!byId("expense-dialog").open || !storageReadable) return;
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
  byId("category-details").hidden = true;
  byId("new-category-toggle").setAttribute("aria-expanded", "false");
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

byId("save-category").addEventListener("click", () => {
  const name = byId("new-category").value.trim();
  fieldError("new-category", name ? "" : "Введите название категории.");
  if (!name) {
    byId("new-category").focus();
    return;
  }
  const existing = data.categories.find((category) => category.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU"));
  if (!existing && !save({ ...data, categories: [...data.categories, name] })) {
    fieldError("new-category", byId("storage-error").textContent);
    return;
  }
  byId("category-details").hidden = true;
  expenseDraft = true;
  renderCategories(existing || name);
  renderBudgets();
  fieldError("category", "");
  byId("new-category").value = "";
  byId("new-category-toggle").setAttribute("aria-expanded", "false");
  byId("amount").focus();
});

byId("new-category").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    byId("save-category").click();
  }
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

load();
renderCategories();
byId("date").value = localDate();
updateExpenseForm();
render();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
