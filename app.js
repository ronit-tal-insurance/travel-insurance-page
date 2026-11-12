(function () {
  "use strict";

  var MSG = {
    dest: "לאן טסים? בחרו לפחות מדינה אחת.",
    name: "איך נקרא לך?",
    phone: "נראה שחסרה ספרה בנייד. בדקו ונסו שוב.",
    email: "נראה שהכתובת לא מלאה. בדקו ונסו שוב.",
    ret: "תאריך החזרה צריך להיות אחרי תאריך היציאה.",
    past: "אי אפשר לבחור תאריך שעבר.",
    departMissing: "מתי יוצאים? בחרו תאריך.",
    retMissing: "ומתי חוזרים? בחרו תאריך.",
    rate: "שלחתם כמה פניות ברצף. נסו שוב בעוד כמה דקות.",
    consent: "כדי שנוכל לחזור אליכם, צריך לסמן את האישור.",
    fail: "משהו השתבש בשליחה, והפרטים שלכם לא אבדו. נסו שוב בעוד רגע."
  };

  // הטופס של גוגל שמקבל את הפניות (הטבלה והתראה במייל אצל טל).
  var FORM = {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfdH8zO_m6fZYcshUb_KBi0NHFzHn6-HynaMRMTeHgjxTPj0A/formResponse",
    fields: {
      dest: "entry.934509343",
      depart: "entry.1589195111",
      ret: "entry.162987644",
      pax: "entry.1260604748",
      name: "entry.1979357251",
      phone: "entry.2020835684",
      email: "entry.2036634793",
      note: "entry.1161412841"
    }
  };

  function fmtDate(iso) { return iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4); }

  function $(id) { return document.getElementById(id); }

  /* ---------- רשימת מדינות בעברית ---------- */
  var names = new Intl.DisplayNames(["he"], { type: "region" });
  var all = window.COUNTRY_CODES.map(function (c) { return { code: c, name: names.of(c) }; })
    .filter(function (c) { return c.name && c.name !== c.code; });
  all.sort(function (a, b) { return a.name.localeCompare(b.name, "he"); });
  var byCode = {};
  all.forEach(function (c) { byCode[c.code] = c; });
  var popular = window.POPULAR_CODES.map(function (c) { return byCode[c]; }).filter(Boolean);

  var selected = [];
  var active = -1;
  var visible = [];

  var input = $("dest"), list = $("dest-list"), pills = $("pills"), box = $("combo-box");

  function norm(s) { return s.replace(/["'״׳\-\s]/g, "").toLowerCase(); }

  function renderPills() {
    pills.innerHTML = "";
    selected.forEach(function (c) {
      var li = document.createElement("li");
      li.className = "pill";
      li.appendChild(document.createTextNode(c.name));
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "הסרת " + c.name);
      b.textContent = "×";
      b.addEventListener("click", function () { removeCountry(c.code); input.focus(); });
      li.appendChild(b);
      pills.appendChild(li);
    });
    input.placeholder = selected.length ? "" : "בחרו מדינה, אפשר יותר מאחת";
  }

  function isSelected(code) { return selected.some(function (c) { return c.code === code; }); }

  function addCountry(c) {
    if (!isSelected(c.code)) selected.push(c);
    input.value = "";
    renderPills();
    clearError("dest");
    closeList();
  }

  function removeCountry(code) {
    selected = selected.filter(function (c) { return c.code !== code; });
    renderPills();
  }

  function openList() {
    var q = norm(input.value);
    var items;
    var rows = [];
    if (!q) {
      var pop = popular.filter(function (c) { return !isSelected(c.code); });
      var rest = all.filter(function (c) { return !isSelected(c.code) && popular.indexOf(c) === -1; });
      if (pop.length) rows.push({ group: "יעדים פופולריים" });
      pop.forEach(function (c) { rows.push({ c: c }); });
      if (pop.length) rows.push({ group: "כל המדינות" });
      rest.forEach(function (c) { rows.push({ c: c }); });
      items = pop.concat(rest);
    } else {
      var starts = [], contains = [];
      all.forEach(function (c) {
        if (isSelected(c.code)) return;
        var n = norm(c.name);
        if (n.indexOf(q) === 0) starts.push(c);
        else if (n.indexOf(q) > -1) contains.push(c);
      });
      items = starts.concat(contains);
      items.forEach(function (c) { rows.push({ c: c }); });
    }
    visible = items;
    active = items.length && q ? 0 : -1;
    list.innerHTML = "";
    var idx = 0;
    rows.forEach(function (r) {
      var li = document.createElement("li");
      if (r.group) {
        li.className = "group";
        li.setAttribute("role", "presentation");
        li.textContent = r.group;
      } else {
        li.setAttribute("role", "option");
        li.id = "opt-" + r.c.code;
        li.dataset.index = idx++;
        li.setAttribute("aria-selected", "false");
        li.textContent = r.c.name;
        li.addEventListener("mousedown", function (e) { e.preventDefault(); });
        li.addEventListener("click", function () { addCountry(r.c); input.focus(); });
      }
      list.appendChild(li);
    });
    if (!items.length) {
      var e = document.createElement("li");
      e.className = "empty";
      e.setAttribute("role", "presentation");
      e.textContent = "לא מצאנו מדינה בשם הזה";
      list.appendChild(e);
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    markActive();
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function markActive() {
    var opts = list.querySelectorAll('[role="option"]');
    Array.prototype.forEach.call(opts, function (o, i) {
      var on = i === active;
      o.classList.toggle("active", on);
      o.setAttribute("aria-selected", on ? "true" : "false");
      if (on) {
        input.setAttribute("aria-activedescendant", o.id);
        o.scrollIntoView({ block: "nearest" });
      }
    });
    if (active < 0) input.removeAttribute("aria-activedescendant");
  }

  input.addEventListener("focus", openList);
  input.addEventListener("click", function () { if (list.hidden) openList(); });
  input.addEventListener("input", openList);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (list.hidden) openList();
      if (visible.length) { active = (active + 1) % visible.length; markActive(); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visible.length) { active = (active - 1 + visible.length) % visible.length; markActive(); }
    } else if (e.key === "Enter") {
      if (!list.hidden && active > -1 && visible[active]) {
        e.preventDefault();
        addCountry(visible[active]);
      }
    } else if (e.key === "Escape") {
      closeList();
    } else if (e.key === "Backspace" && !input.value && selected.length) {
      removeCountry(selected[selected.length - 1].code);
    }
  });
  input.addEventListener("blur", function () { setTimeout(closeList, 120); });
  box.addEventListener("click", function (e) { if (e.target === box) input.focus(); });

  /* ---------- תאריכים ---------- */
  var depart = $("depart"), ret = $("ret");

  function isoToday() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function nextDay(iso) {
    var d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  depart.min = isoToday();
  ret.min = nextDay(isoToday());
  depart.addEventListener("change", function () {
    ret.min = depart.value ? nextDay(depart.value) : nextDay(isoToday());
    clearError("depart");
    clearError("ret");
  });
  ret.addEventListener("change", function () { clearError("ret"); });

  /* ---------- נוסעים ---------- */
  var pax = 2;
  function renderPax() {
    $("pax-out").textContent = pax === 1 ? "נוסע אחד" : pax + " נוסעים";
    $("pax-minus").disabled = pax <= 1;
    $("pax-plus").disabled = pax >= 12;
  }
  $("pax-minus").addEventListener("click", function () { if (pax > 1) { pax--; renderPax(); } });
  $("pax-plus").addEventListener("click", function () { if (pax < 12) { pax++; renderPax(); } });
  renderPax();

  /* ---------- שגיאות ---------- */
  function setError(key, text) {
    var p = $("err-" + key);
    p.textContent = text;
    p.classList.add("on");
    var f = p.closest(".field");
    if (f) f.classList.add("invalid");
    var el = key === "dest" ? input : $({ depart: "depart", ret: "ret", name: "name", phone: "phone", email: "email", consent: "consent" }[key]);
    if (el) el.setAttribute("aria-invalid", "true");
  }
  function clearError(key) {
    var p = $("err-" + key);
    if (!p) return;
    p.textContent = "";
    p.classList.remove("on");
    var f = p.closest(".field");
    if (f) f.classList.remove("invalid");
    var el = key === "dest" ? input : $({ depart: "depart", ret: "ret", name: "name", phone: "phone", email: "email", consent: "consent" }[key]);
    if (el) el.removeAttribute("aria-invalid");
  }
  ["name", "phone", "email", "consent"].forEach(function (k) {
    $(k).addEventListener("input", function () { clearError(k); });
    $(k).addEventListener("change", function () { clearError(k); });
  });

  /* ---------- בדיקות תקינות ---------- */
  function cleanPhone(v) { return v.replace(/[\s\-().]/g, ""); }
  function validPhone(v) { return /^(\+972|972|0)5\d{8}$/.test(cleanPhone(v)); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function validate() {
    var order = [];
    ["dest", "depart", "ret", "name", "phone", "email", "consent", "form"].forEach(clearError);
    $("err-form").classList.remove("on");

    if (!selected.length) { setError("dest", MSG.dest); order.push(input); }
    if (!depart.value) { setError("depart", MSG.departMissing); order.push(depart); }
    else if (depart.value < isoToday()) { setError("depart", MSG.past); order.push(depart); }
    if (!ret.value) { setError("ret", MSG.retMissing); order.push(ret); }
    else if (depart.value && ret.value <= depart.value) { setError("ret", MSG.ret); order.push(ret); }
    else if (ret.value < isoToday()) { setError("ret", MSG.past); order.push(ret); }
    if ($("name").value.trim().length < 2) { setError("name", MSG.name); order.push($("name")); }
    if (!validPhone($("phone").value)) { setError("phone", MSG.phone); order.push($("phone")); }
    if (!validEmail($("email").value.trim())) { setError("email", MSG.email); order.push($("email")); }
    if (!$("consent").checked) { setError("consent", MSG.consent); order.push($("consent")); }

    if (order.length) { order[0].focus(); return false; }
    return true;
  }

  /* ---------- שליחה ---------- */
  var form = $("lead-form"), btn = $("submit");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    if (!validate()) return;

    btn.disabled = true;
    btn.textContent = "שולחים...";
    var payload = {
      destinations: selected.map(function (c) { return c.name; }),
      depart: depart.value,
      ret: ret.value,
      passengers: pax,
      name: $("name").value.trim(),
      phone: cleanPhone($("phone").value),
      email: $("email").value.trim(),
      note: $("note").value.trim(),
      consent: true,
      website: $("website").value
    };

    // שדה מלכודת: רובוט שמילא אותו רואה "תודה", ושום דבר לא נשלח.
    if (payload.website) { showThanks(); return; }

    var body = new URLSearchParams();
    body.append(FORM.fields.dest, payload.destinations.join(", "));
    body.append(FORM.fields.depart, fmtDate(payload.depart));
    body.append(FORM.fields.ret, fmtDate(payload.ret));
    body.append(FORM.fields.pax, String(payload.passengers));
    body.append(FORM.fields.name, payload.name);
    body.append(FORM.fields.phone, payload.phone);
    body.append(FORM.fields.email, payload.email);
    body.append(FORM.fields.note, payload.note);

    // גוגל לא מחזירה תשובה קריאה לדף אחר (no-cors). שגיאת רשת = כשל, אחרת מניחים שהצליח.
    fetch(FORM.url, { method: "POST", mode: "no-cors", body: body })
    .then(function () {
      showThanks();
    }).catch(function () {
      var p = $("err-form");
      p.textContent = MSG.fail;
      p.classList.add("on");
      btn.disabled = false;
      btn.textContent = "בואו נסדר לי ביטוח נסיעות";
    });
  });

  function showThanks() {
    var line = "נחזור אליכם בקרוב לסגור ביטוח נסיעות. נסיעה טובה מראש ✈️";
    if (selected.length === 1) {
      line = "נחזור אליכם בקרוב לסגור ביטוח נסיעות. נסיעה טובה ל" + selected[0].name + " ✈️";
    }
    $("thanks-line").textContent = line;
    $("form-screen").hidden = true;
    var t = $("thanks-screen");
    t.hidden = false;
    t.focus();
    window.scrollTo(0, 0);
  }
})();
