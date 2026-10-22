(function () {
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function toFa(v) {
    return String(v).replace(/\d/g, function (d) { return FA[d]; });
  }
  window.toFa = toFa;
  window.fmtToman = function (v) {
    if (v == null) return "قیمت نامشخص";
    if (v >= 1e9) {
      var b = Math.round(v / 1e8) / 10;
      return toFa(b).replace(".", "٫") + " میلیارد تومان";
    }
    if (v >= 1e6) {
      var m = Math.round(v / 1e5) / 10;
      return toFa(m).replace(".", "٫") + " میلیون تومان";
    }
    return toFa(String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "٬")) + " تومان";
  };
})();

var state = {
  screen: "home",
  category: "phone",
  area: "فردوسی و شیخ هادی",
  budget: "",
  credit: false,
  sort: "best",
  view: "list",
  openNow: false,
  live: true
};

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

function goto(screen) {
  state.screen = screen;
  $all("[data-screen]").forEach(function (el) { el.hidden = el.getAttribute("data-screen") !== screen; });
  $all(".labbar nav button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-goto") === screen); });
  $("#ctaResults").hidden = screen !== "results";
  $("#ctaAsk").hidden = screen !== "ask";
  window.scrollTo({ top: 0 });
}

$all("[data-goto]").forEach(function (el) {
  el.addEventListener("click", function () { goto(el.getAttribute("data-goto")); });
});

function buildChip(label, active, cls) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "chip-btn" + (cls ? " " + cls : "") + (active ? " active" : "");
  b.textContent = label;
  return b;
}

function renderCategoryChips() {
  var box = $("#categoryChips");
  box.innerHTML = "";
  window.LAB.categories.forEach(function (c) {
    var b = buildChip(c.label, c.id === state.category);
    b.addEventListener("click", function () {
      state.category = c.id;
      var text = $("#request").value.trim();
      if (!text || window.LAB.categories.some(function (x) { return x.example === text; })) {
        $("#request").value = c.example;
      }
      syncSearchBtn();
      renderCategoryChips();
    });
    box.appendChild(b);
  });
}

function renderAreaChips() {
  var box = $("#areaChips");
  box.innerHTML = "";
  window.LAB.areas.forEach(function (a) {
    var b = buildChip(a, a === state.area, "ink");
    b.addEventListener("click", function () {
      state.area = a;
      renderAreaChips();
    });
    box.appendChild(b);
  });
}

function syncSearchBtn() {
  $("#searchBtn").disabled = !$("#request").value.trim();
}

function initHome() {
  renderCategoryChips();
  renderAreaChips();
  $("#request").addEventListener("input", function () {
    var text = this.value;
    var match = window.LAB.categories.find(function (c) { return c.example === text; });
    if (match) state.category = match.id;
    renderCategoryChips();
    syncSearchBtn();
  });
  $("#creditCheckbox").addEventListener("change", function () { state.credit = this.checked; });
  $("#budget").addEventListener("input", function () { state.budget = this.value; });

  $all(".examples .pill").forEach(function (p) {
    p.addEventListener("click", function () {
      var c = window.LAB.categories.find(function (x) { return x.id === p.getAttribute("data-example"); });
      if (!c) return;
      state.category = c.id;
      $("#request").value = c.example;
      renderCategoryChips();
      syncSearchBtn();
    });
  });

  $("#searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("#searchBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> دستیار درخواست را می‌خواند…';
    setTimeout(function () {
      btn.innerHTML = '<span data-icon="search" data-size="17"></span> فروشگاه‌ها را پیدا کن';
      renderIcons(btn);
      renderOffers();
      goto("results");
    }, 700);
  });
}

function stockChip(o) {
  var map = {
    confirmed: '<span class="chip chip--success"><span class="ic" data-size="12">' + window.icon("badge-check", 12) + '</span> موجودی تأیید شد</span>',
    unavailable: '<span class="chip chip--danger">تمام شد</span>',
    pending: '<span class="chip chip--warning">در انتظار پاسخ</span>',
    ambiguous: '<span class="chip chip--warning">پاسخ ناقص</span>',
    unknown: '<span class="chip chip--neutral">موجودی نامشخص</span>'
  };
  return map[o.stock] || map.unknown;
}

function hoursChip(o) {
  var tone = o.hours.tone === "success" ? "success" : o.hours.tone === "warning" ? "warning" : "neutral";
  return '<span class="chip chip--' + tone + '"><span class="ic" data-size="12">' + window.icon("clock", 12) + '</span> ' + o.hours.label + "</span>";
}

function warrantyChip(o) {
  if (o.warranty == null) return "";
  return '<span class="chip chip--info"><span class="ic" data-size="12">' + window.icon("shield-check", 12) + '</span> گارانتی ' + window.toFa(o.warranty) + " ماه</span>";
}

function renderIcons(root) {
  (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
    el.innerHTML = window.icon(el.getAttribute("data-icon"), el.getAttribute("data-size") || 15);
  });
}

function sortedOffers() {
  var list = window.LAB.offers.slice();
  if (state.sort === "cheap") list.sort(function (a, b) { return a.price - b.price; });
  if (state.sort === "near") list.sort(function (a, b) { return a.distance - b.distance; });
  return list;
}

function renderOffers() {
  var box = $("#offersList");
  box.innerHTML = "";
  sortedOffers().forEach(function (o) {
    var el = document.createElement("article");
    el.className = "card offer";
    el.dataset.id = o.id;
    var payments = o.payments
      ? '<span><span class="ic" data-size="11">' + window.icon("credit-card", 11) + "</span> " + o.payments.join("، ") + "</span>"
      : '<span><span class="ic" data-size="11">' + window.icon("credit-card", 11) + "</span> پرداخت اعتباری نامشخص</span>";
    var reasons = (o.reasons || []).map(function (r) {
      return '<span><span class="ic" data-size="11">' + window.icon("check", 11) + "</span> " + r + "</span>";
    }).join("");
    el.innerHTML =
      '<div class="offer-top">' +
        '<div>' +
          '<div class="name-row"><h2>' + o.shop + "</h2><span class=\"loc\">" + o.loc + "</span></div>" +
          '<div class="chiprow">' + stockChip(o) + hoursChip(o) + warrantyChip(o) + "</div>" +
        "</div>" +
        '<div class="pricewrap">' +
          '<div class="price base">' + window.fmtToman(o.price) + "</div>" +
          '<span class="changed">قیمت ثبت‌شده ' + window.toFa(o.changedDaysAgo) + " روز پیش</span>" +
        "</div>" +
      "</div>" +
      '<div class="meta">' +
        '<span><span class="ic" data-size="11">' + window.icon("map-pin", 11) + '</span> ' + window.toFa(String(o.distance).replace(".", "٫")) + " کیلومتر از مرکز محدوده</span>" +
        payments +
      "</div>" +
      (reasons ? '<div class="reasons">' + reasons + "</div>" : "");
    box.appendChild(el);
  });
  renderIcons(box);
  applyMapView();
}

function applyMapView() {
  var box = $("#mapView");
  $all(".map-panel .pin[data-pin]").forEach(function (p) { p.remove(); });
  if (state.view !== "map") { box.hidden = true; $("#offersList").style.display = "flex"; return; }
  box.hidden = false;
  $("#offersList").style.display = "none";
  sortedOffers().forEach(function (o, i) {
    var pin = document.createElement("div");
    pin.className = "pin";
    pin.style.top = 25 + ((i * 11) % 55) + "%";
    pin.style.insetInlineStart = 20 + ((i * 23) % 60) + "%";
    pin.innerHTML = window.icon("navigation", 13);
    pin.title = o.shop;
    pin.addEventListener("click", function () {
      state.view = "list";
      $("#viewList").classList.add("active");
      $("#viewMap").classList.remove("active");
      renderOffers();
      var card = $("#offersList article[data-id='" + o.id + "']");
      if (card) { card.classList.add("selected"); card.scrollIntoView({ behavior: "smooth", block: "center" }); }
    });
    box.appendChild(pin);
  });
}

function initResults() {
  renderOffers();

  $all(".sortrow button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.sort = b.getAttribute("data-sort");
      $all(".sortrow button").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderOffers();
    });
  });

  $("#viewList").addEventListener("click", function () {
    state.view = "list"; this.classList.add("active"); $("#viewMap").classList.remove("active"); applyMapView();
  });
  $("#viewMap").addEventListener("click", function () {
    state.view = "map"; this.classList.add("active"); $("#viewList").classList.remove("active"); applyMapView();
  });

  $("#openNowChip").addEventListener("click", function () {
    state.openNow = !state.openNow;
    this.classList.toggle("active", state.openNow);
  });
  $("#creditChip").addEventListener("click", function () {
    state.credit = !state.credit;
    this.classList.toggle("active", state.credit);
    $("#editCredit").checked = state.credit;
  });

  $("#compareChip").addEventListener("click", function () {
    var body = $("#compareBody");
    body.innerHTML = "";
    window.LAB.offers.slice().sort(function (a, b) { return a.price - b.price; }).slice(0, 3).forEach(function (o) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + o.shop + "</td>" +
        "<td>" + window.fmtToman(o.price) + "</td>" +
        "<td>" + (o.warranty != null ? window.toFa(o.warranty) + " ماه" : "نامشخص") + "</td>" +
        "<td>" + window.toFa(String(o.distance).replace(".", "٫")) + " کیلومتر</td>" +
        "<td>" + o.hours.label + "</td>" +
        "<td>" + (o.payments ? o.payments.join("، ") : "نامشخص") + "</td>";
      body.appendChild(tr);
    });
    $("#compareModal").hidden = false;
  });
  $("#compareClose").addEventListener("click", function () { $("#compareModal").hidden = true; });
  $("#compareModal").addEventListener("click", function (e) {
    if (e.target === this) this.hidden = true;
  });

  $("#editToggle").addEventListener("click", function () {
    var p = $("#editPanel");
    p.hidden = !p.hidden;
  });
  $("#editClose").addEventListener("click", function () { $("#editPanel").hidden = true; });

  var eCategories = ["phone", "watch", "lighting", "home", "tools"];
  var labels = { phone: "گوشی", watch: "ساعت", lighting: "روشنایی", home: "لوازم خانگی", tools: "ابزار و برق" };
  var cat = "phone";
  var area = "فردوسی و شیخ هادی";
  function renderEdit() {
    var cbox = $("#editCategory");
    cbox.innerHTML = "";
    eCategories.forEach(function (c) {
      var b = buildChip(labels[c], c === cat);
      b.addEventListener("click", function () { cat = c; renderEdit(); });
      cbox.appendChild(b);
    });
    var abox = $("#editArea");
    abox.innerHTML = "";
    window.LAB.areas.forEach(function (a) {
      var b = buildChip(a, a === area, "ink");
      b.addEventListener("click", function () { area = a; renderEdit(); });
      abox.appendChild(b);
    });
  }
  renderEdit();
  $("#editApply").addEventListener("click", function () {
    $("#editPanel").hidden = true;
  });

  $("#askCta").addEventListener("click", function () { goto("ask"); });
}

function bubble(m) {
  var role = m.role;
  var who = role === "agent" ? '<span class="who">دستیار: </span>' : "";
  return '<div class="bubble-row ' + role + '"><div class="bubble">' + who + m.text + "</div></div>";
}

function parsedChips(p) {
  var out = "";
  if (p.available === true) out += '<span class="chip chip--success">موجود</span>';
  if (p.available === false) out += '<span class="chip chip--danger">ناموجود</span>';
  if (p.priceToman) out += '<span class="chip chip--info">' + window.fmtToman(p.priceToman) + "</span>";
  if (p.closesAt) out += '<span class="chip chip--neutral">تا ' + window.toFa(p.closesAt) + "</span>";
  if (p.warrantyMonths) out += '<span class="chip chip--neutral">گارانتی ' + window.toFa(p.warrantyMonths) + " ماه</span>";
  if (p.alternativeStorageGb) out += '<span class="chip chip--warning">جایگزین ' + window.toFa(p.alternativeStorageGb) + " گیگ</span>";
  return out;
}

function threadCard(t) {
  var statusChip = {
    confirmed: '<span class="chip chip--success"><span class="ic" data-size="12">' + window.icon("badge-check", 12) + '</span> تأیید شد</span>',
    unavailable: '<span class="chip chip--danger">موجود نیست</span>',
    ambiguous: '<span class="chip chip--warning">پاسخ ناقص</span>',
    pending: '<span class="chip chip--neutral"><span class="ic" data-size="12">' + window.icon("clock", 12) + '</span> در انتظار پاسخ</span>'
  }[t.status];
  var price = t.confirmedPrice || t.price;
  var priceNote = t.confirmedAt ? '<div class="muted" style="margin-top:2px;font-size:10px;color:var(--accent)">تأیید ' + t.confirmedAt + "</div>" : '<div class="muted" style="margin-top:2px;font-size:10px">قیمت ثبت‌شده</div>';
  var parsedOwner = t.messages.filter(function (m) { return m.role === "owner"; })[0];
  var parsedHTML = parsedOwner && parsedOwner.parsed
    ? '<div class="chipline">' + parsedChips(parsedOwner.parsed) + "</div>"
    : "";
  var bubbles = t.messages.map(bubble).join("");
  return (
    '<article class="card threadcard">' +
      '<div class="offer-top">' +
        '<div>' +
          '<div class="name-row"><h2 style="font-size:14px;font-weight:700">' + t.shop + "</h2>" + statusChip + "</div>" +
          '<div style="margin-top:4px;display:flex;gap:12px;font-size:10px;color:var(--muted)">' +
            '<span>' + window.icon("map-pin", 11) + " " + t.loc + "</span>" +
            '<span>' + window.icon("clock", 11) + " " + t.hoursLabel + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="pricewrap"><div class="price sm">' + window.fmtToman(price) + "</div>" + priceNote + "</div>" +
      "</div>" +
      '<div class="bubbles">' + bubbles + "</div>" +
      parsedHTML +
    "</article>"
  );
}

function eventRow(e, i, n) {
  var ic = e.kind === "confirmed" ? window.icon("badge-check", 13) : e.kind === "unavailable" ? window.icon("x", 13) : window.icon("navigation", 12);
  return (
    "<li>" +
      '<span class="icon">' + ic + "</span>" +
      "<div><div class=\"t\">" + e.title + "</div>" + (e.detail ? '<div class="d">' + e.detail + "</div>" : "") + "</div>" +
    "</li>"
  );
}

function altCard(a) {
  return (
    '<article class="card altcard">' +
      "<div><div class=\"t\">" + a.shop + '</div><div class="meta">' + a.loc + " · " + a.hoursLabel + "</div>" +
      (a.reason ? '<div class="reason">' + window.icon("check", 11) + " " + a.reason + "</div>" : "") + "</div>" +
      '<div class="price sm">' + window.fmtToman(a.price) + "</div>" +
    "</article>"
  );
}

function initAsk() {
  $("#eventList").innerHTML = window.LAB.run.events.map(eventRow).join("");
  $("#threadList").innerHTML = window.LAB.run.threads.map(threadCard).join("");
  $("#altList").innerHTML = window.LAB.run.alternatives.map(altCard).join("");
  $("#liveToggle").addEventListener("click", function () {
    state.live = !state.live;
    $("#liveToggle").querySelector(".ic") && ($("#liveToggle").querySelector(".ic").style.animation = state.live ? "spin 3s linear infinite" : "none");
  });
  var others = $("#planOthers");
  if (others) others.innerHTML = window.LAB.plan.others.map(function (o) {
    return (
      '<article class="card altcard">' +
        "<div><div class=\"t\">" + o.shop + '</div><div class="meta">' + o.loc + " · " + o.hoursLabel + "</div></div>" +
        '<div class="price" style="font-size:12px">' + window.fmtToman(o.price) + "</div>" +
      "</article>"
    );
  }).join("");
}

function initPlan() {
  $("#shareBtn").addEventListener("click", function () {
    var btn = this;
    var done = function () {
      btn.innerHTML = window.icon("check", 14) + " کپی شد";
      setTimeout(function () { btn.innerHTML = window.icon("share", 14) + " اشتراک متن"; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.LAB.plan.shareMessage).then(done, done);
    } else {
      done();
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  renderIcons();
  initHome();
  initResults();
  initAsk();
  initPlan();
  setTimeout(function () { renderIcons(); }, 0);
});
