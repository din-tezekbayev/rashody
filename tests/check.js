// Выполнять в консоли index.html только в пустом тестовом профиле браузера.
(() => {
  if (localStorage.getItem("rashody") !== null) throw new Error("Нужен пустой тестовый профиль: сохранённые данные не изменены.");
  const passed = [];
  function check(condition, name) {
    if (!condition) throw new Error(name);
    passed.push(name);
  }
  const rows = () => [...document.querySelectorAll(".expense")];
  function openEntry() {
    if (byId("expense-dialog").open) return;
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    byId("open-expense").focus();
    byId("open-expense").click();
  }
  function newCategory(value) {
    openEntry();
    if (byId("category-details").hidden) byId("new-category-toggle").click();
    byId("new-category").value = value;
    byId("save-category").click();
    byId("expense-dialog").close();
  }
  function add(amount, currency = "KZT", date = localDate(), category = "Еда", comment = "") {
    openEntry();
    byId("amount").value = amount;
    byId("currency").value = currency;
    byId("category").value = category;
    byId("date").value = date;
    byId("comment").value = comment;
    byId("amount").dispatchEvent(new Event("input", { bubbles: true }));
    expenseForm.requestSubmit();
  }
  function reset() {
    localStorage.removeItem("rashody");
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    data = { categories: [...initialCategories], expenses: [], budgets: [] };
    selectedCategory = "";
    expenseDraft = false;
    expenseForm.reset();
    byId("date").value = localDate();
    byId("expense-details").open = false;
    byId("category-details").hidden = true;
    byId("save-notice").hidden = true;
    renderCategories();
    byId("reset-period").click();
  }
  function period(from, to) {
    if (!byId("period-dialog").open) {
      document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      byId("open-period").focus();
      byId("open-period").click();
    }
    byId("period-from").value = from;
    byId("period-to").value = to;
    byId("period-form").requestSubmit();
  }
  function quickPeriod(days) {
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    byId("open-period").click();
    document.querySelector(`[data-days="${days}"]`).click();
  }
  const chip = (category = "") => [...byId("category-filters").children].find((button) => button.dataset.category === category);
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

  newCategory("   ");
  check(!byId("new-category-error").hidden, "Пустая категория отклоняется");
  newCategory(" Здоровье ");
  newCategory("ЗДОРОВЬЕ");
  check(byId("entry-categories").querySelectorAll("[data-category]").length === 4 && byId("category").value === "Здоровье", "Категория обрезана, выбрана и не дублируется");
  const persistenceFixture = localStorage.getItem("rashody");
  newCategory("<img src=x>");
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
    quickPeriod(days);
    check(appliedPeriod.from === daysAgo(days - 1) && appliedPeriod.to === localDate() && !byId("period-dialog").open &&
      rows().length === count && byId("period-total").textContent === `${count * 100} ₸` &&
      byId("month-total").textContent === monthBeforeFilter, `Период ${days} дней с обеими границами`);
  }
  period(daysAgo(14), daysAgo(6));
  check(rows().length === 4 && byId("period-total").textContent === "400 ₸", "Произвольный период включает обе границы");
  period("", daysAgo(6));
  check(rows().length === 6, "Период с одной границей");
  period(localDate(), daysAgo(6));
  check(!byId("period-error").hidden && byId("period-dialog").open && rows().length === 6 &&
    appliedPeriod.from === "" && appliedPeriod.to === daysAgo(6), "Обратный диапазон не меняет применённый период и остаётся в окне");
  period("1900-01-01", "1900-01-02");
  check(rows().length === 0 && byId("empty-state").textContent === "По выбранным фильтрам трат нет" &&
    byId("period-total").textContent === "0 ₸" && byId("period-total-usd").textContent === "0,00 $", "Пустой период и нулевые итоги");
  byId("reset-period").click();
  check(rows().length === 7 && !appliedPeriod.from && !appliedPeriod.to, "Сброс периода");
  add("12,50", "USD", daysAgo(14));
  add("0.10", "USD", daysAgo(6));
  add("100", "USD", daysAgo(30));
  period(daysAgo(14), daysAgo(6));
  check(byId("period-total").textContent === "400 ₸" && byId("period-total-usd").textContent === "12,60 $", "Итоги периода считают валюты отдельно");
  byId("reset-period").click();

  const budgetForm = () => byId("budget-list").firstElementChild;
  function editLimit(row = budgetForm()) {
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    row.querySelector("button").focus();
    row.querySelector("button").click();
  }
  function limit(value, row = budgetForm()) {
    if (!byId("budget-dialog").open || byId("budget-form").dataset.category !== row.dataset.category) editLimit(row);
    byId("budget-limit").value = value;
    byId("budget-form").requestSubmit();
  }
  function removeLimit(row = budgetForm()) {
    editLimit(row);
    byId("remove-budget").click();
  }
  check(byId("budget-list").children.length === data.categories.length &&
    budgetForm().querySelector(".budget-ratio").textContent.endsWith(" / Лимит не задан"), "Все категории показаны без лимитов");
  limit("20 000");
  check(data.budgets[0].amount === 20000 && budgetForm().textContent.includes("20 000 ₸"), "Сохранение лимита с пробелами");
  limit("25 000");
  const savedBudget = localStorage.getItem("rashody");
  check(data.budgets.length === 1 && data.budgets[0].amount === 25000, "Изменение заменяет лимит без дубликата");
  for (const value of ["", "0", "-1", "12,5", "12.50", "abc", "NaN", "Infinity", "1e3", "9007199254740992"]) {
    limit(value);
    check(localStorage.getItem("rashody") === savedBudget && byId("budget-limit").value === value &&
      !byId("budget-limit-error").hidden && byId("budget-dialog").open, `Неверный лимит не сохраняется: ${value}`);
  }
  render();
  check(byId("budget-limit").value === "9007199254740992", "Перерисовка не стирает несохранённый ввод лимита");
  try {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    limit("30 000");
    check(data.budgets[0].amount === 25000 && byId("budget-limit").value === "30 000" &&
      !byId("storage-error").hidden && byId("budget-dialog").open && !byId("budget-limit-error").hidden, "Отказ записи лимита сохраняет старое значение и введённое");
    removeLimit();
    check(data.budgets[0].amount === 25000, "Отказ удаления лимита не меняет данные");
  } finally {
    Storage.prototype.setItem = originalSet;
  }
  check(localStorage.getItem("rashody") === savedBudget, "Ошибка бюджета не меняет сохранённые траты и лимиты");
  removeLimit();
  check(data.budgets.length === 0 && !byId("budget-dialog").open &&
    budgetForm().textContent.toLowerCase().includes("не задан") && data.expenses.length === 10, "Удаление лимита сохраняет траты");
  limit(String(Number.MAX_SAFE_INTEGER));
  limit("1", byId("budget-list").children[1]);
  check(data.budgets.length === 1 && !byId("budget-limit-error").hidden, "Переполнение суммы лимитов отклоняется");
  limit("20 000");
  load();
  render();
  check(data.budgets[0].amount === 20000 && budgetForm().textContent.includes("20 000 ₸"), "Лимит читается из localStorage");
  const otherMonth = localDate(previousMonth).slice(0, 7);
  data.budgets.push({ month: otherMonth, category: "Еда", amount: 9000 });
  limit("25 000");
  check(data.budgets.some((budget) => budget.month === otherMonth && budget.amount === 9000), "Изменение лимита сохраняет бюджет другого месяца");
  const currentMonth = localDate().slice(0, 7);
  editLimit();
  byId("budget-form").dataset.month = otherMonth;
  byId("budget-list").dataset.month = otherMonth;
  limit("1");
  check(!data.budgets.some((budget) => budget.month === currentMonth && budget.amount === 1) &&
    byId("budget-limit-error").textContent.includes("новый месяц"), "Старая форма не записывает лимит в другой месяц");
  byId("budget-list").dataset.month = "";
  renderBudgets();
  newCategory("<b>Бюджет</b>");
  check(byId("budget-list").lastElementChild.textContent.includes("<b>Бюджет</b>") &&
    byId("budget-list").lastElementChild.textContent.toLowerCase().includes("не задан") && !byId("budget-list").querySelector("b"), "Новая категория без лимита, HTML показан текстом");
  const originalDate = Date;
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  try {
    window.Date = class extends originalDate {
      constructor(...args) { super(...(args.length ? args : [nextMonth.getTime()])); }
    };
    document.dispatchEvent(new Event("visibilitychange"));
    check(budgetForm().textContent.toLowerCase().includes("не задан") && byId("budget-month").textContent ===
      nextMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }), "Новый месяц показан без переноса лимитов");
    check(byId("budget-total").textContent === "Общий бюджет: Не задан" && byId("budget-spent").textContent === "Потрачено: 0 ₸" &&
      byId("budget-remaining").textContent === "Осталось: —", "Общие суммы нового месяца не включают старые лимиты и траты");
    limit("7 000");
    check(data.budgets.some((budget) => budget.month === currentMonth && budget.amount === 25000) &&
      data.budgets.some((budget) => budget.month === localDate().slice(0, 7) && budget.amount === 7000), "Лимиты разных месяцев хранятся отдельно");
  } finally {
    window.Date = originalDate;
    render();
  }
  check(budgetForm().textContent.includes("25 000 ₸"), "После возврата месяца показан его прежний лимит");

  reset();
  const spentText = () => `Потрачено: ${budgetForm().querySelector(".budget-ratio").textContent.split(" / ")[0]}`;
  const remainingText = () => budgetForm().querySelector(".budget-remaining").textContent;
  const overBudget = () => budgetForm().querySelector(".budget-remaining").classList.contains("over-budget");
  check(spentText() === "Потрачено: 0 ₸" && remainingText() === "Осталось: —" && !overBudget(), "Без лимита видны нулевые расходы и прочерк остатка");
  limit("20 000");
  check(remainingText() === "Осталось: 20 000 ₸", "Сохранение лимита сразу обновляет остаток");
  add("5 000");
  add("2 500");
  check(spentText() === "Потрачено: 7 500 ₸" && remainingText() === "Осталось: 12 500 ₸" && !overBudget(), "Расходы категории и остаток обновляются после траты");
  add("12 500");
  check(spentText() === "Потрачено: 20 000 ₸" && remainingText() === "Осталось: 0 ₸" && !overBudget(), "Точное достижение лимита без предупреждения");
  add("1 000");
  check(budgetForm().querySelector(".budget-meter").getAttribute("aria-valuenow") === "100" &&
    budgetForm().querySelector(".budget-meter").classList.contains("over-budget"), "Перерасход ограничен полной красной полосой");
  check(spentText() === "Потрачено: 21 000 ₸" && remainingText() === "Перерасход: 1 000 ₸" && overBudget(), "Перерасход показан текстом и цветом");
  add("12,50", "USD");
  add("100", "KZT", localDate(previousMonth));
  add("100", "KZT", `${new Date().getFullYear() - 1}${localDate().slice(4)}`);
  add("300", "KZT", localDate(), "Транспорт");
  check(spentText() === "Потрачено: 21 000 ₸" && remainingText() === "Перерасход: 1 000 ₸", "Другая валюта, месяц, год и категория не меняют расчёт категории");
  check(byId("budget-list").children[1].querySelector(".budget-ratio").textContent.startsWith("300 ₸ /") &&
    byId("budget-list").children[1].querySelector(".budget-remaining").textContent === "Осталось: —", "Расходы категории без лимита тоже видны");
  period("1900-01-01", "1900-01-02");
  check(rows().length === 0 && spentText() === "Потрачено: 21 000 ₸" && remainingText() === "Перерасход: 1 000 ₸", "Фильтр списка не меняет расходы и перерасход категории");
  byId("reset-period").click();
  limit("30 000");
  check(remainingText() === "Осталось: 9 000 ₸" && !overBudget(), "Увеличение лимита убирает предупреждение");
  removeLimit();
  check(spentText() === "Потрачено: 21 000 ₸" && remainingText() === "Осталось: —" && !overBudget(), "Удаление лимита сохраняет расходы и убирает остаток");
  check(budgetForm().querySelector(".budget-meter").getAttribute("aria-valuenow") === "0" &&
    budgetForm().querySelector(".budget-meter").classList.contains("no-limit"), "После удаления лимита полоса пустая и нейтральная");
  reset();
  limit("1");
  add(String(Number.MAX_SAFE_INTEGER));
  check(spentText() === "Потрачено: 9 007 199 254 740 991 ₸" &&
    remainingText() === "Перерасход: 9 007 199 254 740 990 ₸", "Расходы и разница точны у границы безопасного диапазона");
  check(byId("budget-spent").textContent === spentText() && byId("budget-remaining").textContent === remainingText(), "Общий перерасход точен у границы безопасного диапазона");

  reset();
  check(byId("budget-total").textContent === "Общий бюджет: Не задан" && byId("budget-spent").textContent === "Потрачено: 0 ₸" &&
    byId("budget-remaining").textContent === "Осталось: —" && !byId("budget-remaining").classList.contains("over-budget"), "Без лимитов общий бюджет не задан, расходы нулевые, остаток прочерк");
  limit("20 000");
  limit("10 000", byId("budget-list").children[1]);
  limit("30 000", byId("budget-list").children[2]);
  add("5 000");
  add("2 500", "KZT", localDate(), "Транспорт");
  add("12 000", "KZT", localDate(), "Дом");
  check(byId("budget-total").textContent === "Общий бюджет: 60 000 ₸" && byId("budget-spent").textContent === "Потрачено: 19 500 ₸" &&
    byId("budget-remaining").textContent === "Осталось: 40 500 ₸" && byId("budget-missing").hidden, "Общий бюджет 60 000 ₸, расходы 19 500 ₸, остаток 40 500 ₸; все лимиты заданы");
  const overview = byId("budget-overview").textContent;
  add("12,50", "USD");
  add("100", "KZT", localDate(previousMonth));
  add("100", "KZT", `${new Date().getFullYear() - 1}${localDate().slice(4)}`);
  period("1900-01-01", "1900-01-02");
  check(rows().length === 0 && byId("budget-overview").textContent === overview, "Общий бюджет не зависит от валюты, другого месяца, года и фильтра периода");
  byId("reset-period").click();
  newCategory("Здоровье");
  check(!byId("budget-missing").hidden && byId("budget-total").textContent === "Общий бюджет: 60 000 ₸", "Новая категория сразу показывает пояснение о незаданном лимите");
  for (const index of [1, 2]) removeLimit(byId("budget-list").children[index]);
  check(byId("budget-total").textContent === "Общий бюджет: 20 000 ₸" && byId("budget-spent").textContent === "Потрачено: 19 500 ₸" &&
    byId("budget-remaining").textContent === "Осталось: 500 ₸" && !byId("budget-missing").hidden, "Частичный бюджет учитывает расходы категорий без лимита");
  add("1 000", "KZT", localDate(), "Дом");
  check(byId("budget-remaining").textContent === "Перерасход: 500 ₸" && byId("budget-remaining").classList.contains("over-budget"), "Трата без лимита сразу увеличивает общий перерасход");
  limit("20 500");
  check(byId("budget-remaining").textContent === "Осталось: 0 ₸" && !byId("budget-remaining").classList.contains("over-budget"), "При равенстве общего бюджета и расходов предупреждения нет");
  limit("30 000");
  check(byId("budget-remaining").textContent === "Осталось: 9 500 ₸", "Изменение лимита пересчитывает общий остаток");
  removeLimit();
  check(byId("budget-total").textContent === "Общий бюджет: Не задан" && byId("budget-spent").textContent === "Потрачено: 20 500 ₸" &&
    byId("budget-remaining").textContent === "Осталось: —" && !byId("budget-remaining").classList.contains("over-budget"), "Удаление последнего лимита сохраняет расходы и убирает общий перерасход");

  reset();
  newCategory("Здоровье");
  const fourth = byId("budget-list").children[3];
  check(fourth.hidden && byId("budget-more").textContent === "Ещё 1", "Четвёртая категория скрыта за Ещё 1");
  byId("budget-more").click();
  check(!fourth.hidden && byId("budget-more").getAttribute("aria-expanded") === "true", "Ещё раскрывает категории");
  limit("100", fourth);
  add("200", "KZT", localDate(), "Здоровье");
  check(fourth.style.getPropertyValue("--category-color") === rows()[0].style.getPropertyValue("--category-color") &&
    fourth.style.getPropertyValue("--category-color") === "#8430CE", "Одинаковый постоянный цвет бюджета и траты");
  byId("budget-more").click();
  check(fourth.hidden && byId("budget-more").textContent === "Ещё 1 · есть перерасход", "Скрытый перерасход отмечен на кнопке");
  byId("budget-more").click();
  editLimit(fourth);
  const dialog = byId("budget-dialog");
  const closeButton = dialog.querySelector("[data-close]");
  byId("budget-save").focus();
  byId("budget-save").dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  check(document.activeElement === closeButton, "Tab замыкает обход внутри окна");
  closeButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  check(document.activeElement === byId("budget-save"), "Shift+Tab замыкает обратный обход");
  byId("amount").focus();
  check(dialog.contains(document.activeElement), "Модальное окно блокирует фокус на фоне");
  byId("budget-limit").value = "999";
  closeButton.click();
  check(data.budgets[0].amount === 100 && !byId("budget-dialog").open, "Закрытие окна не сохраняет ввод");
  editLimit(fourth);
  dialog.dispatchEvent(new PointerEvent("pointerdown", { clientX: -1, clientY: -1 }));
  dialog.dispatchEvent(new MouseEvent("click", { clientX: -1, clientY: -1 }));
  check(!dialog.open && data.budgets[0].amount === 100, "Нажатие фона закрывает окно без сохранения");
  reset();
  check(byId("category-filters").children.length === 4 && chip().getAttribute("aria-pressed") === "true", "Все и каждая исходная категория доступны в чипах");
  add("5000");
  add("2500", "KZT", daysAgo(6), "Транспорт");
  add("12000", "KZT", daysAgo(14), "Дом");
  add("12.50", "USD", daysAgo(6), "Транспорт");
  add("0.10", "USD");
  const unchangedBudget = byId("budget-overview").textContent;
  chip("Транспорт").click();
  check(rows().length === 2 && byId("period-total").textContent === "2 500 ₸" &&
    byId("period-total-usd").textContent === "12,50 $" && !byId("period-summary").hidden, "Категория сразу фильтрует записи и оба итога");
  check(chip("Транспорт").getAttribute("aria-pressed") === "true" && chip().getAttribute("aria-pressed") === "false" &&
    chip("Транспорт").style.getPropertyValue("--category-color") === byId("budget-list").children[1].style.getPropertyValue("--category-color"), "Выбрана одна категория, цвет совпадает с бюджетом");
  quickPeriod(7);
  check(rows().length === 2 && byId("period-label").textContent === "7 дней" && !byId("reset-period").hidden, "Быстрый период сохраняет категорию и показывает сброс");
  chip("Транспорт").click();
  check(rows().length === 2 && appliedPeriod.from === daysAgo(6), "Повторный выбор категории сохраняет период");
  period(daysAgo(6), daysAgo(6));
  check(rows().length === 2 && byId("open-period").getAttribute("aria-label").includes(daysAgo(6).split("-").reverse().join(".")), "Один день включает обе границы и имеет полную доступную подпись");
  chip().click();
  check(rows().length === 2 && appliedPeriod.from === daysAgo(6), "Все возвращает категории и сохраняет даты");
  chip("Еда").click();
  check(rows().length === 0 && byId("period-total").textContent === "0 ₸" && byId("period-usd").hidden, "Пересечение категории и даты может быть пустым, нулевые доллары скрыты");
  byId("reset-period").click();
  check(selectedCategory === "Еда" && rows().length === 2 && byId("reset-period").hidden && document.activeElement === byId("open-period"), "Один сброс очищает только даты и сохраняет доступный фокус");
  byId("open-period").click();
  byId("period-from").value = "1900-01-01";
  byId("period-to").value = "1900-01-02";
  byId("period-to").dispatchEvent(new Event("change"));
  render();
  check(rows().length === 2 && !appliedPeriod.from, "Ввод дат и перерисовка не применяют черновик");
  byId("period-dialog").querySelector("[data-close]").click();
  byId("open-period").click();
  check(!byId("period-from").value && !byId("period-to").value && byId("period-error").hidden, "Отмена забывает черновик дат и ошибку");
  byId("period-dialog").close();
  period(daysAgo(6), "");
  check(rows().length === 2 && byId("period-label").textContent.startsWith("С "), "Диапазон с одной начальной границей");
  quickPeriod(0);
  check(selectedCategory === "Еда" && rows().length === 2 && !appliedPeriod.from && !appliedPeriod.to, "Все даты в окне сохраняет категорию");
  check(byId("budget-overview").textContent === unchangedBudget, "Все сочетания категории и периода не меняют бюджет месяца");
  const thisYear = String(new Date().getFullYear());
  const lastYear = String(new Date().getFullYear() - 1);
  period(`${lastYear}-12-31`, `${thisYear}-01-01`);
  check(byId("period-label").textContent.includes(lastYear) && byId("period-label").textContent.includes(thisYear), "Диапазон через новый год показывает оба года");
  period(`${thisYear}-11-10`, `${thisYear}-11-16`);
  check(byId("period-label").textContent.startsWith("10–16"), "Дни одного месяца показаны компактно");
  quickPeriod(0);
  const longCategory = "Очень длинная категория <b>для проверки переноса</b>";
  newCategory(longCategory);
  check(chip(longCategory).textContent === longCategory && !chip(longCategory).querySelector("b"), "Новая длинная категория добавляется в чипы как текст");
  chip(longCategory).click();
  add("150", "KZT", localDate(), longCategory);
  check(rows().length === 1 && byId("period-total").textContent === "150 ₸" &&
    chip(longCategory).style.getPropertyValue("--category-color") === rows()[0].style.getPropertyValue("--category-color"), "Новая категория фильтрует траты и сохраняет цвет");
  chip().click();
  check(byId("period-summary").hidden && rows().length === 6, "Возврат ко всем записям убирает дополнительный итог");
  check(!Object.keys(JSON.parse(localStorage.getItem("rashody"))).some((key) => /period|filter|selected/i.test(key)), "Фильтры не сохраняются в localStorage");
  reset();
  chip("Транспорт").click();
  openEntry();
  check(byId("category").value === "Транспорт" && byId("amount").inputMode === "numeric" &&
    byId("date").value === localDate() && byId("currency").value === "KZT" && document.activeElement === byId("amount"), "Плюс сразу открывает сумму с категорией фильтра и сегодняшними тенге");
  check(!byId("expense-details").open && byId("entry-meta").textContent.includes(localDate().split("-").reverse().join(".")) &&
    byId("entry-meta").textContent.includes("₸"), "Дата и валюта видны при закрытом Дополнительно");
  byId("amount").value = "2500";
  byId("amount").dispatchEvent(new Event("input", { bubbles: true }));
  byId("add-expense").click();
  check(data.expenses.length === 1 && !byId("expense-dialog").open && !byId("save-notice").hidden &&
    byId("show-expense").hidden && byId("amount").value === "", "Два нажатия добавляют трату, закрывают окно и показывают сообщение");
  byId("add-expense").click();
  expenseForm.requestSubmit();
  check(data.expenses.length === 1, "Быстрое повторное подтверждение не создаёт дубликат");
  chip().click();
  openEntry();
  check(byId("category").value === "Транспорт", "При Все новая форма помнит последнюю категорию");
  byId("amount").value = "1300";
  byId("comment").value = "Черновик";
  byId("currency").value = "USD";
  byId("date").value = daysAgo(6);
  byId("currency").dispatchEvent(new Event("change", { bubbles: true }));
  byId("expense-dialog").querySelector("[data-close]").click();
  chip("Дом").click();
  openEntry();
  check(byId("amount").value === "1300" && byId("comment").value === "Черновик" && byId("category").value === "Транспорт" &&
    byId("date").value === daysAgo(6) && byId("amount-symbol").textContent === "$" && byId("amount").inputMode === "decimal", "Повторное открытие сохраняет весь черновик и не заменяет его категорию фильтром");
  check(byId("entry-meta").textContent.includes(daysAgo(6).split("-").reverse().join(".")) &&
    byId("entry-meta").textContent.includes("$"), "Скрытые дополнительные поля показывают действующие значения");
  byId("date").value = "";
  byId("expense-details").open = false;
  expenseForm.requestSubmit();
  check(byId("expense-dialog").open && byId("expense-details").open && !byId("date-error").hidden &&
    byId("amount").value === "1300", "Ошибка скрытой даты раскрывает поле без потери суммы");
  byId("date").value = localDate();
  byId("new-category-toggle").click();
  byId("new-category").value = "Категория формы";
  byId("save-category").click();
  check(byId("category").value === "Категория формы" && byId("category-details").hidden &&
    byId("amount").value === "1300" && document.activeElement === byId("amount") && document.querySelectorAll("dialog[open]").length === 1,
    "Новая категория создаётся внутри формы и возвращает к прежней сумме");
  expenseForm.requestSubmit();
  check(data.expenses.length === 2 && selectedCategory === "Дом" && rows().length === 0 && !byId("show-expense").hidden &&
    byId("save-status").textContent.includes("Скрыта фильтрами"), "Скрытая категорией трата сохраняется с пояснением без сброса фильтра");
  byId("show-expense").click();
  check(rows().length === 2 && selectedCategory === "" && !appliedPeriod.from && byId("save-notice").hidden,
    "Показать одним нажатием сбрасывает фильтры и возвращает запись");
  period("1900-01-01", "1900-01-02");
  add("100", "KZT", localDate(), "Еда");
  check(rows().length === 0 && appliedPeriod.from === "1900-01-01" && !byId("show-expense").hidden, "Скрытая датами трата не сбрасывает период без Показать");
  byId("show-expense").click();
  openEntry();
  byId("amount").value = "0";
  expenseForm.requestSubmit();
  check(byId("expense-dialog").open && !byId("amount-error").hidden && data.expenses.length === 3, "Неверная сумма оставляет окно и запись без изменений");
  try {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    byId("amount").value = "500";
    byId("comment").value = "Не потерять при отказе";
    expenseForm.requestSubmit();
    check(byId("expense-dialog").open && !byId("expense-storage-error").hidden && byId("amount").value === "500" &&
      byId("comment").value === "Не потерять при отказе" && data.expenses.length === 3, "Отказ хранения виден внутри окна и сохраняет черновик");
  } finally {
    Storage.prototype.setItem = originalSet;
  }
  const header = byId("expense-dialog").querySelector(".modal-header");
  const originalCapture = header.setPointerCapture;
  const originalMedia = window.matchMedia;
  try {
    header.setPointerCapture = () => {};
    window.matchMedia = (query) => query === "(max-width: 600px)" ? { matches: true } : originalMedia(query);
    function gesture(target, dx, dy, end = "pointerup") {
      const start = { pointerId: 1, isPrimary: true, clientX: 100, clientY: 100, bubbles: true };
      target.dispatchEvent(new PointerEvent("pointerdown", start));
      target.dispatchEvent(new PointerEvent("pointermove", { ...start, clientX: 100 + dx, clientY: 100 + dy }));
      target.dispatchEvent(new PointerEvent(end, { ...start, clientX: 100 + dx, clientY: 100 + dy }));
    }
    gesture(header, 0, 59);
    check(byId("expense-dialog").open && !byId("expense-dialog").style.transform, "Короткий свайп возвращает панель на место");
    gesture(header, 100, 70);
    check(byId("expense-dialog").open, "Преимущественно горизонтальный жест не закрывает панель");
    gesture(header, 0, 100, "pointercancel");
    check(byId("expense-dialog").open && !byId("expense-dialog").style.transform, "Отменённый жест оставляет панель открытой");
    gesture(byId("amount"), 0, 100);
    check(byId("expense-dialog").open, "Жест в поле не закрывает панель");
    gesture(header, 0, 60);
    check(!byId("expense-dialog").open && data.expenses.length === 3 && byId("amount").value === "500", "Свайп за заголовок от 60px закрывает панель и сохраняет черновик без записи");
  } finally {
    header.setPointerCapture = originalCapture;
    window.matchMedia = originalMedia;
  }
  reset();
  const legacy = JSON.stringify({ categories: [...initialCategories], expenses: [{ amount: 5000, category: "Еда", date: localDate(), comment: "Старая запись" }] });
  localStorage.setItem("rashody", legacy);
  load();
  render();
  check(byId("month-total").textContent === "5 000 ₸" && byId("month-total-usd").textContent === "0,00 $" &&
    localStorage.getItem("rashody") === legacy && data.budgets.length === 0 && budgetForm().textContent.toLowerCase().includes("не задан"),
    "Старые записи читаются как тенге без перезаписи, бюджеты не заданы");
  const originalGet = Storage.prototype.getItem;
  try {
    Storage.prototype.getItem = () => { throw new Error("Storage unavailable"); };
    load();
    check(!byId("storage-error").hidden && byId("amount").disabled && byId("budget-limit").disabled &&
      byId("open-expense").disabled && byId("add-expense").disabled && byId("budget-save").disabled,
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
    check(!byId("storage-error").hidden && byId("budget-limit").disabled &&
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
  limit("20 000");
  limit("10 000", byId("budget-list").children[1]);
  limit("30 000", byId("budget-list").children[2]);
  check(byId("budget-total").textContent === "Общий бюджет: 60 000 ₸" && byId("budget-remaining").textContent === "Осталось: 40 500 ₸",
    "Итоговые тестовые данные готовы к проверке F5 с бюджетом");
  return { passed: passed.length, checks: passed, next: "Обновите страницу: ожидаются 19 500 ₸, 12,60 $, 7 трат, категория Здоровье, бюджет 60 000 ₸ и остаток 40 500 ₸." };
})();
