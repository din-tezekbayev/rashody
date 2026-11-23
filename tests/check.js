// Выполнять в консоли index.html только в пустом тестовом профиле браузера.
(() => {
  if (localStorage.getItem("rashody") !== null) throw new Error("Нужен пустой тестовый профиль: сохранённые данные не изменены.");
  const passed = [];
  function check(condition, name) {
    if (!condition) throw new Error(name);
    passed.push(name);
  }
  const rows = () => [...document.querySelectorAll(".expense")];
  function add(amount, currency = "KZT", date = localDate(), category = "Еда", comment = "") {
    byId("amount").value = amount;
    byId("currency").value = currency;
    byId("category").value = category;
    byId("date").value = date;
    byId("comment").value = comment;
    expenseForm.requestSubmit();
  }
  function reset() {
    localStorage.removeItem("rashody");
    data = { categories: [...initialCategories], expenses: [], budgets: [] };
    renderCategories();
    byId("reset-period").click();
  }
  function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return localDate(date);
  }

  check(byId("date").value === localDate() && byId("month-total").textContent === "0 ₸" &&
    byId("month-total-usd").textContent === "0,00 $" && !byId("empty-state").hidden, "Пустой список и сегодняшняя дата");
  check(!validDate("2026-02-29") && validDate("2024-02-29") && !validDate("0000-01-01"), "Проверка календарной даты");
  for (const amount of ["", "0", "-100", "12,5", "12.50", "abc", "NaN", "Infinity", "1e3", "9007199254740992"]) {
    add(amount, "KZT", localDate(), "Еда", "Не терять");
    check(rows().length === 0 && !byId("amount-error").hidden && byId("comment").value === "Не терять", `Отклонена сумма KZT: ${amount}`);
  }
  add("100", "KZT", "");
  check(rows().length === 0 && !byId("date-error").hidden, "Обязательная дата");
  add("100", "KZT", localDate(), "");
  check(rows().length === 0 && !byId("category-error").hidden, "Обязательная категория");
  add("5 000");
  add("2 500", "KZT", localDate(), "Транспорт");
  add("12 000", "KZT", localDate(), "Дом", "Последняя запись");
  check(byId("month-total").textContent === "19 500 ₸" && rows()[0].textContent.includes("Последняя запись"), "19 500 ₸ и новая запись за тот же день сверху");
  check(byId("amount").value === "" && byId("comment").value === "" && byId("category").value === "Дом" &&
    byId("date").value === localDate(), "Сброс суммы и комментария, сохранение категории и даты");
  const previousMonth = new Date();
  previousMonth.setDate(0);
  add("1000", "KZT", localDate(previousMonth));
  add("1000", "KZT", `${new Date().getFullYear() - 1}${localDate().slice(4)}`);
  check(byId("month-total").textContent === "19 500 ₸" && rows().length === 5, "Другой месяц и год не входят в месячный итог");
  const dates = rows().map((row) => row.querySelector("time").dateTime);
  check(dates.every((date, index) => index === 0 || dates[index - 1] >= date), "Сортировка по дате");
  for (const amount of ["0.001", "12,345", "-0.01", "0,00", "1.2.3", "90071992547409.92"]) {
    add(amount, "USD");
    check(rows().length === 5 && !byId("amount-error").hidden, `Отклонена сумма USD: ${amount}`);
  }
  add("12,50", "USD");
  add("0.10", "USD");
  check(byId("month-total-usd").textContent === "12,60 $" && byId("month-total").textContent === "19 500 ₸" &&
    byId("currency").value === "USD", "Центы точны, валюты не складываются, выбор валюты остаётся");
  check(parseAmount("90 071 992 547 409,91", "USD") === Number.MAX_SAFE_INTEGER &&
    money(Number.MAX_SAFE_INTEGER, "USD") === "90 071 992 547 409,91 $", "Точный ввод и вывод у границы безопасного диапазона");

  byId("category-details").open = true;
  byId("new-category").value = "   ";
  byId("save-category").click();
  check(!byId("new-category-error").hidden, "Пустая категория отклоняется");
  byId("new-category").value = " Здоровье ";
  byId("save-category").click();
  byId("new-category").value = "ЗДОРОВЬЕ";
  byId("save-category").click();
  check(byId("category").options.length === 4 && byId("category").value === "Здоровье", "Категория обрезана, выбрана и не дублируется");
  const persistenceFixture = localStorage.getItem("rashody");
  byId("new-category").value = "<img src=x>";
  byId("save-category").click();
  add("1", "KZT", localDate(), "<img src=x>", "<script>alert(1)</script>");
  check(rows()[0].textContent.includes("<img src=x>") && rows()[0].textContent.includes("<script>") &&
    !byId("expense-list").querySelector("img, script"), "HTML категории и комментария выводится текстом");

  const originalSet = Storage.prototype.setItem;
  const savedBeforeFailure = localStorage.getItem("rashody");
  const countBeforeFailure = rows().length;
  try {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    add("123", "KZT", localDate(), "Еда", "Остаться в форме");
    check(rows().length === countBeforeFailure && byId("amount").value === "123" &&
      byId("comment").value === "Остаться в форме" && !byId("storage-error").hidden, "При отказе записи форма и список не теряют данные");
  } finally {
    Storage.prototype.setItem = originalSet;
  }
  check(localStorage.getItem("rashody") === savedBeforeFailure, "Отказ записи не изменяет хранилище");

  reset();
  add(String(Number.MAX_SAFE_INTEGER));
  add("1");
  check(rows().length === 1 && !byId("amount-error").hidden, "Переполнение итога отклоняется");
  add("0.01", "USD");
  check(rows().length === 2 && byId("month-total-usd").textContent === "0,01 $", "Лимит тенге не мешает долларам");

  reset();
  [0, 6, 7, 13, 14, 29, 30].forEach((days) => add("100", "KZT", daysAgo(days)));
  const monthBeforeFilter = byId("month-total").textContent;
  for (const [days, count] of [[1, 1], [7, 2], [14, 4], [30, 6]]) {
    document.querySelector(`[data-days="${days}"]`).click();
    check(byId("period-from").value === daysAgo(days - 1) && byId("period-to").value === localDate() &&
      rows().length === count && byId("period-total").textContent === `${count * 100} ₸` &&
      byId("month-total").textContent === monthBeforeFilter, `Период ${days} дней с обеими границами`);
  }
  byId("period-from").value = daysAgo(14);
  byId("period-to").value = daysAgo(6);
  byId("period-to").dispatchEvent(new Event("change"));
  check(rows().length === 4 && byId("period-total").textContent === "400 ₸", "Произвольный период включает обе границы");
  byId("period-from").value = "";
  byId("period-from").dispatchEvent(new Event("change"));
  check(rows().length === 6, "Период с одной границей");
  byId("period-from").value = localDate();
  byId("period-from").dispatchEvent(new Event("change"));
  check(!byId("period-error").hidden && byId("period-summary").hidden && rows().length === 7, "Обратный диапазон показывает ошибку и не фильтрует");
  byId("period-from").value = "1900-01-01";
  byId("period-to").value = "1900-01-02";
  byId("period-to").dispatchEvent(new Event("change"));
  check(rows().length === 0 && byId("empty-state").textContent === "За этот период трат нет" &&
    byId("period-total").textContent === "0 ₸" && byId("period-total-usd").textContent === "0,00 $", "Пустой период и нулевые итоги");
  byId("reset-period").click();
  check(rows().length === 7 && !byId("period-from").value && !byId("period-to").value, "Сброс периода");
  add("12,50", "USD", daysAgo(14));
  add("0.10", "USD", daysAgo(6));
  add("100", "USD", daysAgo(30));
  byId("period-from").value = daysAgo(14);
  byId("period-to").value = daysAgo(6);
  byId("period-to").dispatchEvent(new Event("change"));
  check(byId("period-total").textContent === "400 ₸" && byId("period-total-usd").textContent === "12,60 $", "Итоги периода считают валюты отдельно");
  byId("reset-period").click();

  const budgetForm = () => byId("budget-list").firstElementChild;
  function limit(value, form = budgetForm()) {
    form.querySelector("input").value = value;
    form.requestSubmit();
  }
  check(byId("budget-list").children.length === data.categories.length &&
    budgetForm().querySelector(".budget-saved").textContent === "Лимит: Не задан", "Все категории показаны без лимитов");
  limit("20 000");
  check(data.budgets[0].amount === 20000 && budgetForm().textContent.includes("20 000 ₸"), "Сохранение лимита с пробелами");
  limit("25 000");
  const savedBudget = localStorage.getItem("rashody");
  check(data.budgets.length === 1 && data.budgets[0].amount === 25000, "Изменение заменяет лимит без дубликата");
  for (const value of ["", "0", "-1", "12,5", "12.50", "abc", "NaN", "Infinity", "1e3", "9007199254740992"]) {
    limit(value);
    check(localStorage.getItem("rashody") === savedBudget && budgetForm().querySelector("input").value === value &&
      !budgetForm().querySelector(".error").hidden, `Неверный лимит не сохраняется: ${value}`);
  }
  render();
  check(budgetForm().querySelector("input").value === "9007199254740992", "Перерисовка не стирает несохранённый ввод лимита");
  try {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    limit("30 000");
    check(data.budgets[0].amount === 25000 && budgetForm().querySelector("input").value === "30 000" &&
      !byId("storage-error").hidden, "Отказ записи лимита сохраняет старое значение и введённое");
    budgetForm().querySelector('button[type="button"]').click();
    check(data.budgets[0].amount === 25000, "Отказ удаления лимита не меняет данные");
  } finally {
    Storage.prototype.setItem = originalSet;
  }
  check(localStorage.getItem("rashody") === savedBudget, "Ошибка бюджета не меняет сохранённые траты и лимиты");
  budgetForm().querySelector('button[type="button"]').click();
  check(data.budgets.length === 0 && budgetForm().querySelector("input").value === "" &&
    budgetForm().textContent.includes("Не задан") && data.expenses.length === 10, "Удаление лимита сохраняет траты");
  limit(String(Number.MAX_SAFE_INTEGER));
  limit("1", byId("budget-list").children[1]);
  check(data.budgets.length === 1 && !byId("budget-list").children[1].querySelector(".error").hidden, "Переполнение суммы лимитов отклоняется");
  limit("20 000");
  load();
  render();
  check(data.budgets[0].amount === 20000 && budgetForm().textContent.includes("20 000 ₸"), "Лимит читается из localStorage");
  const otherMonth = localDate(previousMonth).slice(0, 7);
  data.budgets.push({ month: otherMonth, category: "Еда", amount: 9000 });
  limit("25 000");
  check(data.budgets.some((budget) => budget.month === otherMonth && budget.amount === 9000), "Изменение лимита сохраняет бюджет другого месяца");
  const currentMonth = localDate().slice(0, 7);
  budgetForm().dataset.month = otherMonth;
  byId("budget-list").dataset.month = otherMonth;
  limit("1");
  check(!data.budgets.some((budget) => budget.month === currentMonth && budget.amount === 1) &&
    byId("budget-status").textContent.includes("новый месяц"), "Старая форма не записывает лимит в другой месяц");
  byId("budget-list").dataset.month = "";
  renderBudgets();
  byId("new-category").value = "<b>Бюджет</b>";
  byId("save-category").click();
  check(byId("budget-list").lastElementChild.textContent.includes("<b>Бюджет</b>") &&
    byId("budget-list").lastElementChild.textContent.includes("Не задан") && !byId("budget-list").querySelector("b"), "Новая категория без лимита, HTML показан текстом");
  const originalDate = Date;
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  try {
    window.Date = class extends originalDate {
      constructor(...args) { super(...(args.length ? args : [nextMonth.getTime()])); }
    };
    document.dispatchEvent(new Event("visibilitychange"));
    check(budgetForm().textContent.includes("Не задан") && byId("budget-month").textContent ===
      nextMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }), "Новый месяц показан без переноса лимитов");
    limit("7 000");
    check(data.budgets.some((budget) => budget.month === currentMonth && budget.amount === 25000) &&
      data.budgets.some((budget) => budget.month === localDate().slice(0, 7) && budget.amount === 7000), "Лимиты разных месяцев хранятся отдельно");
  } finally {
    window.Date = originalDate;
    render();
  }
  check(budgetForm().textContent.includes("25 000 ₸"), "После возврата месяца показан его прежний лимит");

  const legacy = JSON.stringify({ categories: [...initialCategories], expenses: [{ amount: 5000, category: "Еда", date: localDate(), comment: "Старая запись" }] });
  localStorage.setItem("rashody", legacy);
  load();
  render();
  check(byId("month-total").textContent === "5 000 ₸" && byId("month-total-usd").textContent === "0,00 $" &&
    localStorage.getItem("rashody") === legacy && data.budgets.length === 0 && budgetForm().textContent.includes("Не задан"),
    "Старые записи читаются как тенге без перезаписи, бюджеты не заданы");
  const originalGet = Storage.prototype.getItem;
  try {
    Storage.prototype.getItem = () => { throw new Error("Storage unavailable"); };
    load();
    check(!byId("storage-error").hidden && byId("amount").disabled && budgetForm().querySelector("input").disabled,
      "Отказ чтения блокирует изменения трат и бюджетов");
    limit("100");
  } finally {
    Storage.prototype.getItem = originalGet;
  }
  check(localStorage.getItem("rashody") === legacy, "Отказ чтения не позволяет перезаписать сохранённые данные");
  for (const budgets of [null, {}, [{ month: "2026-13", category: "Еда", amount: 1 }],
    [{ month: currentMonth, category: "Нет такой", amount: 1 }], [{ month: currentMonth, category: "Еда", amount: 0 }],
    [{ month: currentMonth, category: "Еда", amount: 1.5 }], [{ month: currentMonth, category: "Еда", amount: "100" }],
    [{ month: currentMonth, category: "Еда", amount: 1 }, { month: currentMonth, category: "Еда", amount: 2 }],
    [{ month: currentMonth, category: "Еда", amount: Number.MAX_SAFE_INTEGER }, { month: currentMonth, category: "Дом", amount: 1 }]]) {
    const corrupt = JSON.stringify({ ...JSON.parse(legacy), budgets });
    localStorage.setItem("rashody", corrupt);
    load();
    limit("100");
    check(!byId("storage-error").hidden && budgetForm().querySelector("input").disabled &&
      localStorage.getItem("rashody") === corrupt, "Повреждённый бюджет блокирует запись и не затирается");
  }
  localStorage.setItem("rashody", "{");
  load();
  check(!byId("storage-error").hidden && byId("amount").disabled && localStorage.getItem("rashody") === "{", "Повреждённые данные не затираются");
  localStorage.setItem("rashody", persistenceFixture);
  expenseForm.querySelectorAll("input, select, textarea, button").forEach((field) => { field.disabled = false; });
  byId("storage-error").hidden = true;
  load();
  renderCategories();
  render();
  return { passed: passed.length, checks: passed, next: "Обновите страницу: ожидаются 19 500 ₸, 12,60 $, 7 трат и категория Здоровье." };
})();
