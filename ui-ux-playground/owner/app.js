(function () {
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  window.toFa = function (v) {
    return String(v).replace(/\d/g, function (d) { return FA[d]; });
  };
  window.toEnDigits = function (s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
  };
  window.fmtToman = function (v) {
    if (v == null) return "قیمت نامشخص";
    if (v >= 1e6) {
      var m = Math.round(v / 1e5) / 10;
      return window.toFa(m).replace(".", "٫") + " میلیون تومان";
    }
    return window.toFa(String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬")) + " تومان";
  };
})();

var state = { shopId: null, threadId: null, threads: {} };
var daysPerShop = { "رووان مهرآرا": 4, "نویار آذروش": 9, "نی‌آرا آروان": 6, "آذرنوش رویس": 3, "رویار نیک‌نوش": 11, "مانان مانینا": 14, "آروان دیسین": 5, "نیینا نیان": 2 };
var hoursPerShop = { "رووان مهرآرا": "امروز: ۱۰ تا ۲۱", "نویار آذروش": "امروز: ۱۰ تا ۲۰", "نی‌آرا آروان": "امروز: ۱۰ تا ۲۱", "آذرنوش رویس": "امروز: ۱۰ تا ۲۰", "رویار نیک‌نوش": "ساعت امروز نامشخص", "مانان مانینا": "امروز: ۱۱ تا ۲۱", "آروان دیسین": "امروز: ۱۰ تا ۲۰", "نیینا نیان": "امروز: ۱۰ تا ۲۲" };

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

function $(sel) { return document.querySelector(sel); }

function parseOwnerReply(text) {
  var norm = window.toEnDigits(text);
  var out = { available: null, priceToman: null, closesAt: null, warrantyMonths: null, alternativeStorageGb: null };
  if (/تموم شد|تموم شده|تمام شد|تمام شده|نمونده|ندارم|نداریم|نمی\u200cدارد|نداره|فعلا\s*نیست|نمیشه/.test(norm)) out.available = false;
  else if (/هست|موجوده|در دسترس/.test(norm)) out.available = true;

  var million = norm.match(/(\d+)((?:[\.,])\d+)?\s*میلیون(?:\s*و\s*(\d+))?/);
  var toman = norm.match(/(\d{6,})\s*تومان/);
  if (million) {
    var whole = parseInt(million[1], 10);
    var frac = million[2] ? Math.round(parseFloat(million[2]) * 100) : 0;
    var extra = million[3] ? parseInt(million[3], 10) * 1000 : 0;
    out.priceToman = whole * 1e6 + frac * 1e4 + extra;
  } else if (toman) {
    out.priceToman = parseInt(toman[1].replace(/[\.,٬\s]/g, ""), 10);
  }

  var close = norm.match(/تا\s*(\d{1,2})\s*(شب|عصر|بعدازظهر|بعد از ظهر)?/);
  if (close) {
    var h = parseInt(close[1], 10);
    if (close[2] && h < 12) h += 12;
    out.closesAt = Math.min(h, 23);
  }

  var warranty = norm.match(/گارانتی\s*(\d+)\s*ماه/);
  if (warranty) out.warrantyMonths = parseInt(warranty[1], 10);

  var gig = norm.match(/(\d{3,4})\s*گیگ/);
  if (gig) out.alternativeStorageGb = parseInt(gig[1], 10);
  return out;
}

function currentShop() {
  return window.OWNER.shops.filter(function (s) { return s.id === state.shopId; })[0];
}

function shopThreads() {
  return state.threads[state.shopId] || [];
}

function threadStatus(t) {
  var lastOwner = null;
  t.messages.forEach(function (m) { if (m.role === "owner") lastOwner = m; });
  if (lastOwner && lastOwner.parsed) {
    if (lastOwner.parsed.available === true) return "confirmed";
    if (lastOwner.parsed.available === false) return "unavailable";
  }
  return "pending";
}

function renderShopChips() {
  var box = $("#shopChips");
  box.innerHTML = "";
  window.OWNER.shops.forEach(function (s) {
    var b = document.createElement("button");
    b.className = "chip-btn";
    if (s.id === state.shopId) b.className += " active";
    b.textContent = s.name;
    b.addEventListener("click", function () { openShop(s.id); });
    box.appendChild(b);
  });
}

function statusChip(status) {
  var map = {
    confirmed: '<span class="chip chip--success">تأیید شد</span>',
    unavailable: '<span class="chip chip--danger">ناموجود</span>',
    pending: '<span class="chip chip--warning">در انتظار پاسخ</span>',
    ambiguous: '<span class="chip chip--warning">پاسخ ناقص</span>'
  };
  return map[status] || map.pending;
}

function bubble(m) {
  var row = document.createElement("div");
  row.className = "bubble-row " + m.role;
  var b = document.createElement("div");
  b.className = "bubble";
  if (m.role === "agent") b.innerHTML = '<span class="who">دستیار: </span>';
  if (m.role === "buyer") b.innerHTML = '<span class="who">خریدار: </span>';
  b.appendChild(document.createTextNode(m.text));
  row.appendChild(b);
  return row;
}

function openShop(id) {
  state.shopId = id;
  $("#shopPicker").hidden = true;
  $("#shopView").hidden = false;
  $("#shopBack").hidden = false;
  var shop = currentShop();
  $("#shopName").textContent = shop.name;
  $("#shopAddress").textContent = shop.address;
  if (!state.threads[id]) state.threads[id] = window.OWNER.starterThreads[shop.name] ? [makeThreadJSON(window.OWNER.starterThreads[shop.name])] : [];
  state.threadId = shopThreads().length ? shopThreads()[0].id : null;
  renderShopChips();
  renderThreads();
  renderInbox();
}

function closeShop() {
  state.shopId = null;
  state.threadId = null;
  $("#shopPicker").hidden = false;
  $("#shopView").hidden = true;
  $("#shopBack").hidden = true;
  renderShopChips();
}

function makeThreadJSON(t) {
  return { id: t.id, messages: t.messages.slice(), status: t.status || "pending" };
}

function threadTitle(t) {
  return window.OWNER.productTitle;
}

function renderThreads() {
  var threads = shopThreads();
  var row = $("#threadsRow");
  $("#threadsEmpty").hidden = threads.length > 0;
  row.hidden = threads.length === 0;
  row.innerHTML = "";
  threads.forEach(function (t) {
    var title = "S25 FE ۲۵۶ · درخواست خرید";
    var last = t.messages[t.messages.length - 1];
    var lbl = title.slice(0, 26) + (last && last.role !== "owner" && t.messages.length > 1 ? " · جدید" : "");
    var b = document.createElement("button");
    b.className = "chip-btn sm" + (t.id === state.threadId ? " active" : "");
    b.textContent = lbl;
    b.addEventListener("click", function () {
      state.threadId = t.id;
      $("#parsedBox").hidden = true;
      renderThreads();
      renderInbox();
    });
    row.appendChild(b);
  });
}

function currentThread() {
  var ts = shopThreads();
  for (var i = 0; i < ts.length; i++) if (ts[i].id === state.threadId) return ts[i];
  return null;
}

function renderInbox() {
  var t = currentThread();
  var inbox = $("#inbox");
  if (!t) { inbox.hidden = true; return; }
  inbox.hidden = false;
  $("#threadTitle").textContent = threadTitle(t);
  $("#threadStatus").innerHTML = statusChip(threadStatus(t));
  var shop = currentShop();
  $("#threadPrice").textContent = window.fmtToman(window.OWNER.heroOfferPricePerShop[shop.name]);
  $("#threadHours").textContent = hoursPerShop[shop.name];
  $("#threadCount").textContent = window.toFa(t.messages.length) + " پیام";
  var chat = $("#chatArea");
  chat.innerHTML = "";
  t.messages.forEach(function (m) { chat.appendChild(bubble(m)); });
  var last = t.messages[t.messages.length - 1];
  $("#lastWhen").textContent = last ? "آخرین پیام همین حالا" : "";
  $("#parsedBox").hidden = true;
  var pr = $("#quickReplies");
  pr.innerHTML = "";
  [shop.expected, "موجوده، قیمت امروز همونه. تا ۹ شب بازیم.", "تمام شده."].forEach(function (q) {
    var b = document.createElement("button");
    b.className = "quick-reply";
    b.textContent = q;
    b.addEventListener("click", function () { $("#replyText").value = q; });
    pr.appendChild(b);
  });
}

function parsedBoxHTML(p) {
  var parts = [];
  parts.push("<b>دستیار خواند: </b>");
  parts.push(p.available === true ? "موجود" : p.available === false ? "ناموجود" : "نامشخص");
  if (p.priceToman) parts.push(" · " + window.fmtToman(p.priceToman));
  if (p.closesAt != null) parts.push(" · تا " + window.toFa(p.closesAt));
  if (p.warrantyMonths) parts.push(" · گارانتی " + window.toFa(p.warrantyMonths) + " ماه");
  return parts.join("");
}

function sendReply() {
  var t = currentThread();
  var input = $("#replyText");
  var text = input.value.trim();
  var err = $("#sendError");
  err.hidden = true;
  if (!t || !text) return;
  if (text.length > 1200) {
    err.textContent = "متن پاسخ کوتاه‌تر از ۱۲۰۰ حرف باشد.";
    err.hidden = false;
    return;
  }
  var parsed = parseOwnerReply(text);
  t.messages.push({ role: "owner", text: text, parsed: parsed });
  input.value = "";
  var box = $("#parsedBox");
  box.innerHTML = parsedBoxHTML(parsed);
  box.hidden = false;
  if (parsed.available === true && (parsed.priceToman == null || parsed.closesAt == null)) {
    t.messages.push({ role: "agent", text: "قیمت روز و ساعت کاری امروز را هم می‌فرمایید؟" });
  }
  renderThreads();
  renderInbox();
  box.hidden = false;
  var chat = $("#chatArea");
  chat.scrollTop = chat.scrollHeight;
}

function simulateInquiry() {
  if (!state.shopId) return;
  var shop = currentShop();
  var threads = state.threads[state.shopId];
  var t = {
    id: "t" + (threads.length + 1) + "-" + Date.now(),
    messages: [
      {
        role: "agent",
        text: window.OWNER.inquiryText
          .replace("{price}", window.fmtToman(window.OWNER.heroOfferPricePerShop[shop.name]).replace(" تومان", ""))
          .replace("{days}", window.toFa(daysPerShop[shop.name] || 5))
      }
    ]
  };
  threads.unshift(t);
  state.threadId = t.id;
  renderThreads();
  renderInbox();
}

function reset() {
  state.threads = {};
  if (state.shopId) {
    var shop = currentShop();
    state.threads[state.shopId] = window.OWNER.starterThreads[shop.name] ? [makeThreadJSON(window.OWNER.starterThreads[shop.name])] : [];
    state.threadId = shopThreads().length ? shopThreads()[0].id : null;
    renderThreads();
    renderInbox();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-icon]").forEach(function (el) {
    el.innerHTML = window.icon(el.getAttribute("data-icon"), el.getAttribute("data-size") || 15);
  });
  renderShopChips();
  $("#shopBack").addEventListener("click", closeShop);
  $("#resetBtn").addEventListener("click", reset);
  $("#simulateInquiry").addEventListener("click", simulateInquiry);
  $("#sendReply").addEventListener("click", sendReply);
  $("#replyText").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  });
});
