"use strict";

const STORAGE_KEY = "rashody";
const initialCategories = ["Еда", "Транспорт", "Дом"];
const byId = (id) => document.getElementById(id);
const expenseForm = byId("expense-form");
let data = { categories: [...initialCategories], expenses: [], budgets: [] };
let storageReadable = true;

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
    document.querySelectorAll("#expense-form input, #expense-form select, #expense-form textarea, #expense-form button, #budget-list input, #budget-list button")
      .forEach((field) => { field.disabled = true; });
  }
}

function updateBudget(form, remove = false) {
  byId("budget-status").textContent = "";
  if (form.dataset.month !== localDate().slice(0, 7)) {
    renderBudgets();
    byId("budget-status").textContent = "Начался новый месяц. Задайте лимит заново.";
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
  if (!save({ ...data, budgets })) return;
  input.value = remove ? "" : String(amount);
  renderBudgets();
  byId("budget-status").textContent = remove ? "Лимит убран" : "Лимит сохранён";
  input.focus();
}

function renderBudgets() {
  const list = byId("budget-list");
  const month = localDate().slice(0, 7);
  byId("budget-month").textContent = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  if (list.dataset.month !== month || [...list.children].some((form, index) => form.dataset.category !== data.categories[index])) {
    list.replaceChildren();
    list.dataset.month = month;
    byId("budget-status").textContent = "";
  }
  data.categories.forEach((category, index) => {
    let form = list.children[index];
    if (!form) {
      form = byId("budget-row").content.firstElementChild.cloneNode(true);
      form.dataset.month = month;
      form.dataset.category = category;
      form.querySelector("h3").id = `budget-category-${index}`;
      form.querySelector("h3").textContent = category;
      form.setAttribute("aria-labelledby", `budget-category-${index}`);
      const id = `budget-limit-${index}`;
      form.querySelector("label").htmlFor = id;
      form.querySelector("input").id = id;
      form.querySelector("input").setAttribute("aria-describedby", `${id}-error`);
      form.querySelector(".error").id = `${id}-error`;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        updateBudget(form);
      });
      form.querySelector('button[type="button"]').addEventListener("click", () => updateBudget(form, true));
      list.append(form);
    }
    const amount = data.budgets.find((budget) => budget.month === month && budget.category === category)?.amount;
    const spent = data.expenses.filter((expense) => expense.currency === "KZT" &&
      expense.category === category && expense.date.slice(0, 7) === month)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const overBudget = amount !== undefined && spent > amount;
    form.querySelector(".budget-spent").textContent = `Потрачено: ${money(spent, "KZT")}`;
    const remaining = form.querySelector(".budget-remaining");
    remaining.textContent = amount === undefined ? "Осталось: —" : overBudget
      ? `Перерасход: ${money(spent - amount, "KZT")}` : `Осталось: ${money(amount - spent, "KZT")}`;
    remaining.classList.toggle("over-budget", overBudget);
    const saved = amount === undefined ? "" : String(amount);
    if (form.dataset.amount !== saved) {
      form.querySelector("input").value = saved;
      form.dataset.amount = saved;
      form.querySelector(".budget-saved").textContent = `Лимит: ${amount === undefined ? "Не задан" : money(amount, "KZT")}`;
    }
    form.querySelectorAll("input, button").forEach((field) => { field.disabled = !storageReadable; });
    form.querySelector('button[type="button"]').disabled = !storageReadable || amount === undefined;
  });
}

function renderCategories(selected = byId("category").value) {
  byId("category").replaceChildren(...data.categories.map((name) => new Option(name, name)));
  byId("category").value = data.categories.includes(selected) ? selected : data.categories[0];
}

function render() {
  const today = localDate();
  byId("month-label").textContent = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  renderTotals("month", data.expenses.filter((expense) => expense.date.slice(0, 7) === today.slice(0, 7)));
  renderBudgets();

  const from = byId("period-from").value;
  const to = byId("period-to").value;
  const invalidFrom = Boolean(from) && !validDate(from);
  const invalidTo = Boolean(to) && !validDate(to);
  const reversed = from && to && from > to;
  const invalidPeriod = invalidFrom || invalidTo || reversed;
  byId("period-error").textContent = reversed ? "Дата «С» должна быть не позже даты «По»." : "Укажите корректные даты периода.";
  byId("period-error").hidden = !invalidPeriod;
  byId("period-from").setAttribute("aria-invalid", String(Boolean(invalidFrom || reversed)));
  byId("period-to").setAttribute("aria-invalid", String(Boolean(invalidTo || reversed)));
  byId("period-summary").hidden = invalidPeriod || !(from || to);

  const expenses = data.expenses.filter((expense) => invalidPeriod ||
    ((!from || expense.date >= from) && (!to || expense.date <= to)))
    .sort((a, b) => b.date.localeCompare(a.date));
  renderTotals("period", expenses);
  byId("empty-state").hidden = expenses.length > 0;
  byId("empty-state").textContent = data.expenses.length ? "За этот период трат нет" : "Пока нет трат";
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
    item.append(category, amount, date);
    if (expense.comment) {
      const comment = document.createElement("p");
      comment.className = "expense-comment";
      comment.textContent = expense.comment;
      item.append(comment);
    }
    return item;
  }));
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  byId("save-status").textContent = "";
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
    firstInvalid.focus();
    return;
  }
  const expense = { amount, currency, category, date, comment: byId("comment").value.trim() };
  if (!save({ ...data, expenses: [expense, ...data.expenses] })) return;
  byId("amount").value = "";
  byId("comment").value = "";
  render();
  byId("save-status").textContent = "Трата добавлена";
  byId("amount").focus();
});

byId("currency").addEventListener("change", () => {
  byId("amount").inputMode = byId("currency").value === "USD" ? "decimal" : "numeric";
  byId("amount").placeholder = byId("currency").value === "USD" ? "12,50" : "5 000";
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
  if (!existing && !save({ ...data, categories: [...data.categories, name] })) return;
  renderCategories(existing || name);
  renderBudgets();
  fieldError("category", "");
  byId("new-category").value = "";
  byId("category-details").open = false;
  byId("category").focus();
});

byId("new-category").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    byId("save-category").click();
  }
});

byId("period-from").addEventListener("change", render);
byId("period-to").addEventListener("change", render);
byId("reset-period").addEventListener("click", () => {
  byId("period-from").value = "";
  byId("period-to").value = "";
  render();
});

document.querySelectorAll("[data-days]").forEach((button) => {
  button.addEventListener("click", () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Number(button.dataset.days) + 1);
    byId("period-from").value = localDate(start);
    byId("period-to").value = localDate(end);
    render();
  });
});

load();
renderCategories();
byId("date").value = localDate();
render();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
