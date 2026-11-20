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
    data = { categories: [...initialCategories], expenses: [] };
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

  const legacy = JSON.stringify({ categories: [...initialCategories], expenses: [{ amount: 5000, category: "Еда", date: localDate(), comment: "Старая запись" }] });
  localStorage.setItem("rashody", legacy);
  load();
  render();
  check(byId("month-total").textContent === "5 000 ₸" && byId("month-total-usd").textContent === "0,00 $" &&
    localStorage.getItem("rashody") === legacy, "Старые записи читаются как тенге без перезаписи");
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
