(function () {
  "use strict";

  var DATA = window.TRIP_DATA || { restaurants: [], activities: [], suggestedPlan: [] };
  var KEY = "gcm-trip-v1";
  var SLOTS = ["Morning", "Afternoon", "Evening"];
  var AREA_LABELS = { smb: "Seven Mile Beach", west: "West Bay", camana: "Camana Bay & George Town", north: "North Side & Rum Point", east: "East End & Bodden Town" };
  var CLUB = { lat: 19.33125, lon: -81.38153 };

  /* ---------- State ---------- */
  var state = load() || { start: "", nights: 6, name: "", days: [], mine: [] };
  if (!Array.isArray(state.days)) state.days = [];
  if (!Array.isArray(state.mine)) state.mine = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICON = {
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  function dayCount() { return Math.max(1, Math.min(22, (parseInt(state.nights, 10) || 6) + 1)); }
  function ensureDays() { while (state.days.length < dayCount()) state.days.push([]); }
  function dateFor(i) {
    if (!state.start) return null;
    var p = state.start.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + i);
    return d;
  }
  function fmtDate(d) { return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
  function findRef(ref) {
    var r = DATA.restaurants.filter(function (x) { return x.id === ref; })[0];
    if (r) return { kind: "eat", item: r };
    var a = DATA.activities.filter(function (x) { return x.id === ref; })[0];
    if (a) return { kind: "do", item: a };
    var m = state.mine.filter(function (x) { return x.id === ref; })[0];
    if (m) return { kind: "eat", item: m };
    return null;
  }
  function brunchWarning(title, dayIndex) {
    var d = dateFor(dayIndex);
    if (d && /brunch/i.test(title) && d.getDay() !== 0) return "Heads up: most Cayman brunches (including Luca's) are Sundays only.";
    return "";
  }

  /* ---------- In-page confirm (works where window.confirm is blocked) ---------- */
  function ask(msg, okLabel, onYes) {
    var dlg = $("#confirm-dialog");
    if (!dlg || typeof dlg.showModal !== "function") { onYes(); return; }
    $("#confirm-msg").textContent = msg;
    $("#confirm-ok").textContent = okLabel || "Yes";
    dlg.returnValue = "";
    dlg.onclose = function () { if (dlg.returnValue === "ok") onYes(); };
    dlg.showModal();
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function copyText(text, okMsg) {
    function fallback() {
      var ta = el("textarea", { style: "position:fixed;opacity:0" });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(okMsg); } catch (e) { toast("Couldn't copy — select and copy manually."); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }

  /* ---------- Trip settings & countdown ---------- */
  function initSettings() {
    var start = $("#trip-start"), nights = $("#trip-nights"), name = $("#trip-name");
    start.value = state.start || "";
    nights.value = state.nights || 6;
    name.value = state.name || "";
    start.addEventListener("change", function () { state.start = start.value; save(); renderDays(); countdown(); });
    nights.addEventListener("change", function () {
      var n = Math.max(1, Math.min(21, parseInt(nights.value, 10) || 6));
      nights.value = n; state.nights = n; ensureDays(); save(); renderDays(); countdown();
    });
    name.addEventListener("input", function () { state.name = name.value; save(); countdown(); });
    $("#trip-settings").addEventListener("submit", function (e) { e.preventDefault(); });
    countdown();
  }
  function countdown() {
    var c = $("#countdown");
    var label = state.name ? state.name : "Grand Cayman";
    if (!state.start) { c.textContent = "Set your arrival date to start the countdown."; return; }
    var startD = dateFor(0), endD = dateFor(dayCount() - 1);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((startD - today) / 86400000);
    c.innerHTML = "";
    if (diff > 1) { c.appendChild(el("strong", { text: String(diff) })); c.appendChild(document.createTextNode(" days until " + label)); }
    else if (diff === 1) c.textContent = "Tomorrow: " + label + "!";
    else if (diff === 0) c.textContent = "Today's the day. Welcome to Cayman.";
    else if (today <= endD) c.textContent = "You're on island — day " + (1 - diff) + " of " + dayCount() + ".";
    else c.textContent = "Hope " + label + " was wonderful.";
  }

  /* ---------- Itinerary ---------- */
  function renderDays() {
    ensureDays();
    var list = $("#days");
    list.innerHTML = "";
    for (var i = 0; i < dayCount(); i++) list.appendChild(renderDay(i));
    if (typeof refreshMap === "function") refreshMap();
  }

  function renderDay(i) {
    var items = state.days[i] || [];
    var d = dateFor(i);
    var head = el("div", { class: "day-head" }, [
      el("h3", { class: "day-num", html: "<span>Day</span>" + (i + 1) }),
      el("p", { class: "day-date" + (d && d.getDay() === 0 ? " is-sunday" : ""), text: d ? fmtDate(d) + (i === 0 ? " · arrive" : i === dayCount() - 1 ? " · depart" : "") : (i === 0 ? "Arrival" : i === dayCount() - 1 ? "Departure" : "") })
    ]);
    var li = el("li", { class: "day", "aria-label": "Day " + (i + 1) }, [head]);
    if (items.some(function (it) { var f = it.ref && findRef(it.ref); return f && f.item.lat; })) {
      head.appendChild(el("button", { type: "button", class: "day-map-btn", text: "Map this day", "aria-label": "Show day " + (i + 1) + " route on the map", onclick: function () { showDayOnMap(i); } }));
    }

    var any = false;
    SLOTS.forEach(function (slot) {
      var inSlot = items.filter(function (it) { return it.slot === slot; });
      if (!inSlot.length) return;
      any = true;
      var ul = el("ul", { class: "slot-items" });
      inSlot.forEach(function (it) { ul.appendChild(renderItem(it, i)); });
      li.appendChild(el("div", { class: "slot-group" }, [el("p", { class: "slot-label", text: slot }), ul]));
    });
    if (!any) li.appendChild(el("p", { class: "empty-day", text: "Nothing planned yet — perfect beach day." }));

    var input = el("input", { type: "text", placeholder: "Add a plan…", "aria-label": "New plan for day " + (i + 1), autocomplete: "off" });
    var sel = el("select", { "aria-label": "Time of day" });
    SLOTS.forEach(function (s) { sel.appendChild(el("option", { value: s, text: s })); });
    var form = el("form", { class: "day-add" }, [input, sel, el("button", { class: "btn btn-small btn-primary", type: "submit", text: "Add" })]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      addItem(i, { title: v, slot: sel.value, kind: "custom" });
      var w = brunchWarning(v, i); if (w) toast(w);
      setTimeout(function () { var f = $all(".day")[i]; if (f) $("input", f).focus(); }, 0);
    });
    li.appendChild(form);
    return li;
  }

  function renderItem(it, dayIndex) {
    var row = el("li", { class: "item", "data-kind": it.kind || "custom" });
    row.appendChild(el("span", { class: "item-title", text: it.title }));
    var actions = el("div", { class: "item-actions" });
    if (dayIndex > 0) actions.appendChild(el("button", { type: "button", class: "icon-btn", title: "Move to previous day", "aria-label": "Move " + it.title + " to previous day", html: ICON.left, onclick: function () { moveItem(dayIndex, it.id, -1); } }));
    if (dayIndex < dayCount() - 1) actions.appendChild(el("button", { type: "button", class: "icon-btn", title: "Move to next day", "aria-label": "Move " + it.title + " to next day", html: ICON.right, onclick: function () { moveItem(dayIndex, it.id, 1); } }));
    actions.appendChild(el("button", { type: "button", class: "icon-btn", title: "Remove", "aria-label": "Remove " + it.title, html: ICON.x, onclick: function () { removeItem(dayIndex, it.id); } }));
    row.appendChild(actions);
    var note = it.note;
    if (!note && it.ref) {
      var f = findRef(it.ref);
      if (f) note = f.kind === "eat" ? (f.item.areaLabel || AREA_LABELS[f.item.area] || "") : (f.item.duration ? f.item.duration + " · " + f.item.when : "");
    }
    if (note) row.appendChild(el("span", { class: "item-note", text: note }));
    var w = brunchWarning(it.title, dayIndex);
    if (w) row.appendChild(el("span", { class: "item-warn", text: w }));
    return row;
  }

  function addItem(dayIndex, item) {
    ensureDays();
    item.id = uid();
    state.days[dayIndex].push(item);
    save(); renderDays(); refreshAddedMarks();
  }
  function removeItem(dayIndex, id) {
    state.days[dayIndex] = state.days[dayIndex].filter(function (x) { return x.id !== id; });
    save(); renderDays(); refreshAddedMarks();
  }
  function moveItem(dayIndex, id, dir) {
    var it = state.days[dayIndex].filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    state.days[dayIndex] = state.days[dayIndex].filter(function (x) { return x.id !== id; });
    state.days[dayIndex + dir].push(it);
    save(); renderDays();
  }
  function hasAnyItems() { return state.days.some(function (d) { return d && d.length; }); }

  function initToolbar() {
    $("#load-suggested").addEventListener("click", function () {
      if (hasAnyItems()) ask("Replace your current itinerary with the suggested plan?", "Replace", loadSuggested);
      else loadSuggested();
    });
    function loadSuggested() {
      var plan = DATA.suggestedPlan.slice();
      var n = dayCount();
      state.days = [];
      for (var i = 0; i < n; i++) state.days.push([]);
      // Keep the departure day last, fit the rest in order.
      var last = plan.pop();
      plan.forEach(function (day, i) { if (i < n - 1) day.forEach(function (it) { state.days[i].push(Object.assign({ id: uid(), kind: it.ref ? (findRef(it.ref) || {}).kind : "custom" }, it)); }); });
      if (n > 1 && last) last.forEach(function (it) { state.days[n - 1].push(Object.assign({ id: uid(), kind: "custom" }, it)); });
      save(); renderDays(); refreshAddedMarks();
      toast("Suggested plan loaded — make it yours.");
    }
    $("#clear-plan").addEventListener("click", function () {
      if (!hasAnyItems()) return;
      ask("Clear every day of the itinerary?", "Clear all", function () {
        state.days = []; ensureDays(); save(); renderDays(); refreshAddedMarks();
        toast("Itinerary cleared.");
      });
    });
    var printBtn = $("#print-plan");
    var framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
    if (framed) printBtn.hidden = true; // printing is blocked inside embedded previews
    printBtn.addEventListener("click", function () { window.print(); });
    $("#copy-plan").addEventListener("click", function () {
      var lines = [(state.name || "Grand Cayman trip") + " — Caribbean Club, Seven Mile Beach", ""];
      for (var i = 0; i < dayCount(); i++) {
        var d = dateFor(i);
        lines.push("Day " + (i + 1) + (d ? " (" + fmtDate(d) + ")" : ""));
        var items = state.days[i] || [];
        if (!items.length) lines.push("  · Free day");
        SLOTS.forEach(function (s) { items.filter(function (x) { return x.slot === s; }).forEach(function (x) { lines.push("  · " + s + ": " + x.title); }); });
        lines.push("");
      }
      copyText(lines.join("\n").trim(), "Itinerary copied.");
    });
  }

  /* ---------- Add-to-trip dialog ---------- */
  var pending = null;
  function openAdd(title, ref, kind, defaultSlot) {
    pending = { title: title, ref: ref, kind: kind };
    var dlg = $("#add-dialog");
    $("#add-item-name").textContent = title;
    var sel = $("#add-day");
    sel.innerHTML = "";
    for (var i = 0; i < dayCount(); i++) {
      var d = dateFor(i);
      sel.appendChild(el("option", { value: i, text: "Day " + (i + 1) + (d ? " · " + fmtDate(d) : "") }));
    }
    var firstFree = 1 < dayCount() ? 1 : 0;
    for (var j = 1; j < dayCount() - 1; j++) { if (!(state.days[j] || []).length) { firstFree = j; break; } }
    sel.value = String(firstFree);
    $all('input[name="slot"]', dlg).forEach(function (r) { r.checked = r.value === (defaultSlot || "Evening"); });
    updateWarn();
    if (typeof dlg.showModal === "function") dlg.showModal();
    else { // very old browsers: add straight to the first free day
      addItem(firstFree, { title: title, ref: ref, kind: kind, slot: defaultSlot || "Evening" });
      toast("Added to Day " + (firstFree + 1));
    }
  }
  function updateWarn() {
    var w = pending ? brunchWarning(pending.title, parseInt($("#add-day").value, 10)) : "";
    var box = $("#add-warn");
    box.textContent = w; box.hidden = !w;
  }
  function initDialog() {
    var dlg = $("#add-dialog");
    $("#add-day").addEventListener("change", updateWarn);
    dlg.addEventListener("close", function () {
      if (dlg.returnValue === "add" && pending) {
        var day = parseInt($("#add-day").value, 10);
        var slot = ($('input[name="slot"]:checked', dlg) || {}).value || "Evening";
        addItem(day, { title: pending.title, ref: pending.ref, kind: pending.kind, slot: slot });
        toast("Added to Day " + (day + 1) + " · " + slot);
      }
      pending = null; dlg.returnValue = "";
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close("cancel"); });
  }

  function isPlanned(ref) {
    return state.days.slice(0, dayCount()).some(function (d) { return (d || []).some(function (x) { return x.ref === ref; }); });
  }
  function refreshAddedMarks() {
    if (map) renderMapList();
    $all("[data-ref]").forEach(function (card) {
      var mark = $(".added", card);
      if (mark) mark.hidden = !isPlanned(card.getAttribute("data-ref"));
    });
  }

  /* ---------- Dining ---------- */
  var diningFilter = "all";
  function mapsLink(name) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " Grand Cayman"); }

  function restaurantCard(r, isMine) {
    var card = el("article", { class: "card", id: "eat-" + r.id, "data-ref": r.id, "data-area": r.area });
    var badges = el("div", { class: "card-badges" });
    if (r.pick) badges.appendChild(el("span", { class: "badge", text: "Must-book" }));
    if (isMine) badges.appendChild(el("span", { class: "badge badge-sea", text: "Your pick" }));
    card.appendChild(el("div", { class: "card-top" }, [
      el("div", {}, [
        el("p", { class: "card-meta", text: r.areaLabel || AREA_LABELS[r.area] || "" }),
        el("h3", { text: r.name })
      ]),
      r.price ? el("span", { class: "price", text: r.price, "aria-label": "Price " + r.price }) : null
    ]));
    if (badges.childNodes.length) card.appendChild(badges);
    if (r.cuisine) card.appendChild(el("p", { class: "card-sub", text: r.cuisine }));
    if (r.blurb) card.appendChild(el("p", { class: "blurb", text: r.blurb }));
    if (r.notes) card.appendChild(el("p", { class: "blurb", text: r.notes }));
    if (r.highlights && r.highlights.length) {
      var ul = el("ul", { class: "hl", "aria-label": "Highlights" });
      r.highlights.forEach(function (h) { ul.appendChild(el("li", { text: h })); });
      card.appendChild(ul);
    }
    if (r.hours) card.appendChild(el("p", { class: "hours", html: "<strong>Hours:</strong> " }, [])).appendChild(document.createTextNode(r.hours));
    if (r.lat) card.appendChild(el("p", { class: "drive", text: driveLabel(r) }));

    var actions = el("div", { class: "card-actions" });
    actions.appendChild(el("button", { type: "button", class: "btn btn-small btn-primary", text: "Add to trip", onclick: function () { openAdd(isMine ? "Dinner at " + r.name : (r.id === "luca" ? "Dinner at Luca" : r.name), r.id, "eat", "Evening"); } }));
    var menu = r.menu || r.link;
    if (menu) actions.appendChild(el("a", { href: menu, target: "_blank", rel: "noopener", text: "Menu ↗" }));
    if (r.phone) actions.appendChild(el("a", { href: "tel:" + r.phone, text: "Call" }));
    if (r.lat) actions.appendChild(el("a", { href: "#map", text: "On map", onclick: function (e) { e.preventDefault(); focusPlace(r.id); } }));
    actions.appendChild(el("a", { href: r.lat ? directionsLink(r) : mapsLink(r.name), target: "_blank", rel: "noopener", text: r.lat ? "Directions ↗" : "Find ↗" }));
    actions.appendChild(el("span", { class: "added", text: "✓ In your trip", hidden: "" }));
    card.appendChild(actions);

    if (isMine) {
      card.appendChild(el("button", { type: "button", class: "icon-btn card-remove", title: "Remove from your list", "aria-label": "Remove " + r.name + " from your list", html: ICON.x, onclick: function () {
        ask("Remove " + r.name + " from your list?", "Remove", function () {
          state.mine = state.mine.filter(function (x) { return x.id !== r.id; });
          save(); renderDining(); refreshMap(); toast(r.name + " removed.");
        });
      } }));
    }
    return card;
  }

  function renderDining() {
    var grid = $("#dining-grid");
    grid.innerHTML = "";
    var list = DATA.restaurants.map(function (r) { return { r: r, mine: false }; })
      .concat(state.mine.map(function (r) { return { r: r, mine: true }; }));
    var q = (($("#dining-search") || {}).value || "").trim().toLowerCase();
    var vibe = ($("#dining-vibe") || {}).value || "all";
    var shown = list.filter(function (x) {
      if (diningFilter === "mine" && !x.mine) return false;
      if (diningFilter !== "all" && diningFilter !== "mine" && x.r.area !== diningFilter) return false;
      if (vibe !== "all" && x.r.vibe !== vibe) return false;
      if (q) {
        var hay = [x.r.name, x.r.cuisine, x.r.areaLabel, x.r.blurb, x.r.notes, (x.r.highlights || []).join(" ")].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    shown.forEach(function (x) { grid.appendChild(restaurantCard(x.r, x.mine)); });
    if (!shown.length) {
      grid.appendChild(el("p", { class: "empty-day", text: diningFilter === "mine" && !state.mine.length ? "No picks yet — add your first restaurant below." : "No restaurants match — try another area, style or search." }));
    }
    refreshAddedMarks();
  }

  function initFilters(groupSel, setter) {
    var group = $(groupSel);
    group.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      $all(".chip", group).forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      setter(b.getAttribute("data-filter"));
    });
  }
  function setFilter(groupSel, value, setter) {
    $all(groupSel + " .chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === value)); });
    setter(value);
  }

  function initMine() {
    var form = $("#mine-form"), status = $("#mine-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = String(fd.get("name") || "").trim();
      if (!name) { form.elements.name.focus(); return; }
      var link = String(fd.get("link") || "").trim();
      if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
      var area = String(fd.get("area") || "smb");
      state.mine.push({ id: "mine-" + uid(), name: name, area: area, areaLabel: AREA_LABELS[area], notes: String(fd.get("notes") || "").trim(), link: link });
      save();
      form.reset();
      status.textContent = name + " added to your picks.";
      setFilter("#dining-filters", "mine", function (v) { diningFilter = v; renderDining(); });
      toast(name + " added.");
    });
    $("#copy-mine").addEventListener("click", function () {
      if (!state.mine.length) { status.textContent = "Add at least one restaurant first."; return; }
      var lines = ["Please add these restaurants (and menus) to my Grand Cayman trip site:", ""];
      state.mine.forEach(function (m, i) {
        lines.push((i + 1) + ". " + m.name + " — " + (AREA_LABELS[m.area] || ""));
        if (m.notes) lines.push("   Notes: " + m.notes);
        if (m.link) lines.push("   Menu/link: " + m.link);
      });
      copyText(lines.join("\n"), "Copied — paste it to Claude.");
      status.textContent = "Copied. Paste it into your chat with Claude.";
    });
  }

  /* ---------- Explore ---------- */
  var exploreFilter = "all";
  function activityCard(a, n) {
    var card = el("article", { class: "card", id: "do-" + a.id, "data-ref": a.id });
    card.appendChild(el("div", { class: "card-top" }, [
      el("div", {}, [
        el("p", { class: "card-meta", text: a.catLabel }),
        el("h3", { text: a.name })
      ])
    ]));
    if (a.rating) card.appendChild(el("p", { class: "card-sub", text: a.rating }));
    card.appendChild(el("p", { class: "blurb", text: a.blurb }));
    var ul = el("ul", { class: "hl", "aria-label": "Details" });
    ul.appendChild(el("li", { text: a.duration }));
    ul.appendChild(el("li", { text: a.when }));
    card.appendChild(ul);
    if (a.cat !== "club") card.appendChild(el("p", { class: "drive", text: driveLabel(a) }));
    if (a.tip) { var tip = el("p", { class: "tip", html: "<strong>Tip:</strong> " }); tip.appendChild(document.createTextNode(a.tip)); card.appendChild(tip); }
    var slot = /evening|night/i.test(a.when) ? "Evening" : /afternoon/i.test(a.when) ? "Afternoon" : "Morning";
    card.appendChild(el("div", { class: "card-actions" }, [
      el("button", { type: "button", class: "btn btn-small btn-primary", text: "Add to trip", onclick: function () { openAdd(a.name, a.id, "do", slot); } }),
      a.cat !== "club" ? el("a", { href: "#map", text: "On map", onclick: function (e) { e.preventDefault(); focusPlace(a.id); } }) : null,
      a.cat !== "club" && !a.boat ? el("a", { href: directionsLink(a), target: "_blank", rel: "noopener", text: "Directions ↗" }) : null,
      el("span", { class: "added", text: "✓ In your trip", hidden: "" })
    ]));
    return card;
  }
  function renderExplore() {
    var grid = $("#explore-grid");
    grid.innerHTML = "";
    DATA.activities.forEach(function (a, i) {
      if (exploreFilter === "all" || a.cat === exploreFilter) grid.appendChild(activityCard(a, i + 1));
    });
    refreshAddedMarks();
  }

  /* ---------- Distances & links ---------- */
  function haversineKm(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function driveMinutes(p) {
    // Rough road model: the North Sound blocks the direct line, so trips east go
    // through George Town and Savannah, and North Side trips go up Frank Sound Road.
    var km;
    if (p.lon < -81.34) km = haversineKm(CLUB, p) * 1.3;
    else {
      var path = [CLUB, { lat: 19.300, lon: -81.372 }, { lat: 19.285, lon: -81.300 }];
      if (p.lat > 19.325 && p.lon < -81.15) path.push({ lat: 19.29, lon: -81.19 }, { lat: 19.345, lon: -81.185 });
      path.push(p);
      km = 0;
      for (var i = 1; i < path.length; i++) km += haversineKm(path[i - 1], path[i]);
      km *= 1.12;
    }
    var speed = km < 6 ? 28 : 50;
    return Math.max(5, Math.round((km / speed * 60 + 3) / 5) * 5);
  }
  function driveLabel(p) {
    if (p.id === "luca" || p.cat === "club") return "At the Caribbean Club";
    var km = haversineKm(CLUB, p);
    if (p.boat) return "By boat · tours pick up along Seven Mile Beach";
    if (km < 0.9) return "≈ " + Math.max(2, Math.round(km * 1000 / 80)) + " min walk from the Club";
    return "≈ " + driveMinutes(p) + " min drive from the Club";
  }
  function directionsLink(p) {
    return "https://www.google.com/maps/dir/?api=1&origin=" + CLUB.lat + "," + CLUB.lon + "&destination=" + p.lat + "," + p.lon + "&travelmode=driving";
  }

  /* ---------- Interactive map (Leaflet) ---------- */
  var map = null, markers = {}, placeLayer = null, routeLayer = null, meMarker = null, mapFilter = "all", tileFails = 0, fallbackShown = false;
  var allPlaces = [];

  function buildPlaces() {
    allPlaces = [{ id: "club", kind: "club", name: "The Caribbean Club", sub: "Your home base · Luca restaurant", lat: CLUB.lat, lon: CLUB.lon }];
    DATA.restaurants.forEach(function (r) { if (r.lat && r.id !== "luca") allPlaces.push({ id: r.id, kind: "eat", name: r.name, sub: r.cuisine, area: r.areaLabel, lat: r.lat, lon: r.lon, src: r }); });
    DATA.activities.forEach(function (a) { if (a.lat && a.cat !== "club") allPlaces.push({ id: a.id, kind: "do", name: a.name, sub: a.catLabel + " · " + a.duration, lat: a.lat, lon: a.lon, boat: a.boat, src: a }); });
  }
  function placeById(id) {
    if (id === "luca" || id === "in-suite-spa") id = "club";
    return allPlaces.filter(function (p) { return p.id === id; })[0];
  }

  var ICONS = {
    eat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v7a2 2 0 0 0 2 2v9M9 3v5M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1-3 4-3 7h3"/></svg>',
    do: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    club: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z M10 20v-5h4v5"/></svg>'
  };
  function makeIcon(kind, label) {
    var size = kind === "club" ? 40 : 30;
    return L.divIcon({
      className: "mk mk-" + kind,
      html: label ? '<span class="mk-num">' + label + "</span>" : ICONS[kind],
      iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
    });
  }

  function popupFor(p) {
    var box = el("div", { class: "pop" });
    box.appendChild(el("p", { class: "pop-kind", text: p.kind === "eat" ? "Restaurant" : p.kind === "do" ? "Thing to do" : "Home base" }));
    box.appendChild(el("h3", { class: "pop-title", text: p.name }));
    if (p.sub) box.appendChild(el("p", { class: "pop-sub", text: p.sub + (p.area ? " · " + p.area : "") }));
    if (p.kind !== "club") box.appendChild(el("p", { class: "pop-drive", text: driveLabel(p.src || p) }));
    var acts = el("div", { class: "pop-actions" });
    if (p.kind !== "club") {
      acts.appendChild(el("button", { type: "button", class: "btn btn-small btn-primary", text: "Add to trip", onclick: function () {
        var isLunch = p.kind === "eat" ? "Evening" : (/evening|night/i.test(p.src.when) ? "Evening" : "Morning");
        openAdd(p.kind === "eat" ? p.name : p.name, p.id, p.kind, isLunch);
      } }));
      if (!p.boat) acts.appendChild(el("a", { href: directionsLink(p), target: "_blank", rel: "noopener", text: "Directions ↗" }));
      acts.appendChild(el("a", { href: "#", text: "Details", onclick: function (e) { e.preventDefault(); map.closePopup(); flashCard((p.kind === "eat" ? "eat-" : "do-") + p.id, p.kind === "eat"); } }));
    } else {
      acts.appendChild(el("a", { href: "#club", text: "About the Club" }));
      acts.appendChild(el("a", { href: "tel:+13456234500", text: "Call front desk" }));
    }
    box.appendChild(acts);
    return box;
  }

  var ISLAND_OUTLINE = [[19.3825,-81.417],[19.390,-81.405],[19.392,-81.395],[19.396,-81.385],[19.393,-81.372],[19.383,-81.372],[19.377,-81.379],[19.366,-81.377],[19.356,-81.374],[19.345,-81.372],[19.330,-81.373],[19.322,-81.374],[19.310,-81.365],[19.302,-81.358],[19.300,-81.340],[19.305,-81.320],[19.315,-81.300],[19.330,-81.290],[19.345,-81.286],[19.356,-81.284],[19.365,-81.282],[19.372,-81.275],[19.374,-81.268],[19.368,-81.255],[19.360,-81.230],[19.352,-81.200],[19.347,-81.185],[19.345,-81.160],[19.340,-81.130],[19.330,-81.100],[19.322,-81.085],[19.310,-81.082],[19.300,-81.090],[19.294,-81.127],[19.292,-81.170],[19.293,-81.200],[19.285,-81.240],[19.275,-81.252],[19.268,-81.280],[19.265,-81.291],[19.268,-81.320],[19.275,-81.360],[19.274,-81.385],[19.2767,-81.392],[19.285,-81.390],[19.297,-81.385],[19.307,-81.386],[19.317,-81.385],[19.331,-81.383],[19.345,-81.386],[19.355,-81.390],[19.362,-81.398],[19.369,-81.402],[19.375,-81.420]];

  function showOutlineFallback() {
    if (fallbackShown || !map) return;
    fallbackShown = true;
    L.polygon(ISLAND_OUTLINE, { color: "#7fb3ae", weight: 2, fillColor: "#f7f2ea", fillOpacity: 1, interactive: false }).addTo(map).bringToBack();
    $("#leaflet-map").classList.add("no-tiles");
  }

  function initMap() {
    buildPlaces();
    var holder = $("#leaflet-map");
    if (!holder) return;
    // Leaflet's stylesheet must load too, or the map renders as scattered tiles.
    var probe = el("div", { class: "leaflet-pane" }); document.body.appendChild(probe);
    var cssOk = getComputedStyle(probe).position === "absolute"; probe.remove();
    if (!window.L || !cssOk) {
      $("#map-fallback").hidden = false; holder.classList.add("is-failed");
      $(".map-tools").hidden = true; $("#map-day").closest(".field").hidden = true;
      renderMapList(); return;
    }

    map = L.map(holder, { scrollWheelZoom: false, zoomSnap: 0.5, tap: true, attributionControl: true });
    var tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    tiles.on("tileerror", function () { tileFails++; if (tileFails >= 4) showOutlineFallback(); });

    placeLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    allPlaces.forEach(function (p) {
      var m = L.marker([p.lat, p.lon], { icon: makeIcon(p.kind), title: p.name, alt: p.name, riseOnHover: true, zIndexOffset: p.kind === "club" ? 1000 : 0 });
      m.bindPopup(function () { return popupFor(p); }, { maxWidth: 280, minWidth: 220, autoPanPadding: [30, 30] });
      markers[p.id] = m;
    });
    resetView();

    // Scroll-wheel zoom only after the map is clicked, so page scrolling never gets trapped.
    map.on("click focus", function () { map.scrollWheelZoom.enable(); });
    holder.addEventListener("mouseleave", function () { map.scrollWheelZoom.disable(); });

    $("#map-search").addEventListener("input", refreshMap);
    initFilters("#map-filters", function (v) { mapFilter = v; refreshMap(); });
    $("#map-day").addEventListener("change", function () { refreshMap(true); if (this.value === "") resetView(); });
    $("#route-clear").addEventListener("click", function () { $("#map-day").value = ""; refreshMap(); resetView(); });
    $("#map-reset").addEventListener("click", resetView);
    $("#map-locate").addEventListener("click", locateMe);

    if ("ResizeObserver" in window) new ResizeObserver(function () { map.invalidateSize(); }).observe(holder);
    refreshMap();
  }

  function resetView() {
    if (!map) return;
    var b = L.latLngBounds(allPlaces.map(function (p) { return [p.lat, p.lon]; }));
    map.fitBounds(b, { padding: [24, 24] });
  }

  function visiblePlaces() {
    var q = (($("#map-search") || {}).value || "").trim().toLowerCase();
    return allPlaces.filter(function (p) {
      if (p.kind === "club") return true;
      if (mapFilter === "eat" && p.kind !== "eat") return false;
      if (mapFilter === "do" && p.kind !== "do") return false;
      if (mapFilter === "trip" && !isPlanned(p.id)) return false;
      if (q) {
        var s = p.src || {};
        var hay = [p.name, p.sub, p.area, s.blurb, (s.highlights || []).join(" ")].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function refreshMap(fit) {
    if (!$("#map-list")) return;
    fit = fit === true;
    // Day options follow the trip length.
    var sel = $("#map-day"), cur = sel.value;
    sel.innerHTML = "";
    sel.appendChild(el("option", { value: "", text: "No route" }));
    for (var i = 0; i < dayCount(); i++) {
      var d = dateFor(i), n = (state.days[i] || []).length;
      sel.appendChild(el("option", { value: String(i), text: "Day " + (i + 1) + (d ? " · " + fmtDate(d) : "") + (n ? "" : " (empty)") }));
    }
    if (cur !== "" && parseInt(cur, 10) < dayCount()) sel.value = cur;

    if (map) {
      placeLayer.clearLayers();
      var routeIds = currentRouteIds();
      visiblePlaces().forEach(function (p) { if (routeIds.indexOf(p.id) === -1 || p.kind === "club") placeLayer.addLayer(markers[p.id]); });
      if (sel.value !== "") drawRoute(parseInt(sel.value, 10), fit);
      else { routeLayer.clearLayers(); $("#route-box").hidden = true; }
    }
    renderMapList();
  }

  function renderMapList() {
    var list = $("#map-list");
    list.innerHTML = "";
    var vis = visiblePlaces().filter(function (p) { return p.kind !== "club"; })
      .sort(function (a, b) { return haversineKm(CLUB, a) - haversineKm(CLUB, b); });
    $("#map-count").textContent = vis.length + (vis.length === 1 ? " place" : " places") + " · nearest to the Club first";
    vis.forEach(function (p) {
      var btn = el(map || p.boat ? "button" : "a", map || p.boat
        ? { type: "button", class: "map-item", "data-kind": p.kind, onclick: function () { focusPlace(p.id); } }
        : { href: directionsLink(p), target: "_blank", rel: "noopener", class: "map-item", "data-kind": p.kind }, [
        el("span", { class: "map-item-icon", html: ICONS[p.kind] }),
        el("span", { class: "map-item-body" }, [
          el("span", { class: "map-item-name", text: p.name }),
          el("span", { class: "map-item-sub", text: driveLabel(p.src || p).replace(" from the Club", "") + (isPlanned(p.id) ? " · in your trip" : "") })
        ])
      ]);
      list.appendChild(el("li", {}, [btn]));
    });
    if (!vis.length) list.appendChild(el("li", { class: "empty-day", text: mapFilter === "trip" ? "Nothing from the map is in your trip yet." : "No places match." }));
  }

  function focusPlace(id) {
    var p = placeById(id);
    var sec = $("#map");
    var narrow = window.matchMedia("(max-width: 899px)").matches;
    if (!map) { if (p && p.kind !== "club" && !p.boat) window.open(directionsLink(p), "_blank", "noopener"); return; }
    if (sec) (narrow ? $(".map-canvas") : sec).scrollIntoView({ behavior: smooth(), block: narrow ? "center" : "start" });
    if (!p) return;
    // Make sure the marker is showing even if a filter hid it.
    if (!placeLayer.hasLayer(markers[p.id]) && !routeLayer.hasLayer(markers[p.id])) placeLayer.addLayer(markers[p.id]);
    setTimeout(function () {
      map.invalidateSize();
      map.flyTo([p.lat, p.lon], Math.max(map.getZoom(), 14), { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.8 });
      map.once("moveend", function () { markers[p.id].openPopup(); });
    }, narrow ? 350 : 250);
  }

  function dayStops(i) {
    var items = state.days[i] || [], stops = [], off = [];
    SLOTS.forEach(function (s) {
      items.filter(function (x) { return x.slot === s; }).forEach(function (x) {
        var p = x.ref ? placeById(x.ref) : null;
        if (p && p.kind !== "club") stops.push({ p: p, item: x });
        else if (!p) off.push(x);
      });
    });
    return { stops: stops, off: off };
  }
  function currentRouteIds() {
    var v = ($("#map-day") || {}).value;
    if (!v) return [];
    return dayStops(parseInt(v, 10)).stops.map(function (s) { return s.p.id; });
  }

  function drawRoute(i, fit) {
    var box = $("#route-box");
    if (!map) return;
    routeLayer.clearLayers();
    var ds = dayStops(i), list = $("#route-list");
    list.innerHTML = "";
    box.hidden = false;
    var pts = [[CLUB.lat, CLUB.lon]];
    ds.stops.forEach(function (s, n) {
      pts.push([s.p.lat, s.p.lon]);
      var m = L.marker([s.p.lat, s.p.lon], { icon: makeIcon("stop " + "mk-" + s.p.kind, String(n + 1)), title: s.p.name, zIndexOffset: 900 });
      m.bindPopup(function () { return popupFor(s.p); }, { maxWidth: 280, minWidth: 220 });
      routeLayer.addLayer(m);
      list.appendChild(el("li", {}, [
        el("button", { type: "button", class: "route-stop", onclick: function () { map.flyTo([s.p.lat, s.p.lon], 14); m.openPopup(); } }, [
          el("span", { class: "route-num", text: String(n + 1) }),
          el("span", {}, [el("strong", { text: s.p.name }), el("small", { text: s.item.slot + (s.p.boat ? " · by boat" : "") })])
        ])
      ]));
    });
    pts.push([CLUB.lat, CLUB.lon]);
    if (ds.stops.length) {
      routeLayer.addLayer(L.polyline(pts, { color: "#c0335e", weight: 3, opacity: .85, dashArray: "6 8" }));
      if (fit) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
      var road = ds.stops.filter(function (s) { return !s.p.boat; });
      var link = $("#route-gmaps");
      if (road.length) {
        var wp = road.map(function (s) { return s.p.lat + "," + s.p.lon; });
        link.href = "https://www.google.com/maps/dir/?api=1&origin=" + CLUB.lat + "," + CLUB.lon + "&destination=" + CLUB.lat + "," + CLUB.lon + "&waypoints=" + encodeURIComponent(wp.join("|")) + "&travelmode=driving";
        link.hidden = false;
      } else link.hidden = true;
    } else {
      $("#route-gmaps").hidden = true;
    }
    var note = [];
    if (!ds.stops.length) note.push("Nothing on Day " + (i + 1) + " has a map location yet. Add restaurants or activities to it.");
    else note.push("Route starts and ends at the Club. Dashed line shows the order, not the roads.");
    if (ds.off.length) note.push(ds.off.length + (ds.off.length === 1 ? " plan isn't" : " plans aren't") + " on the map: " + ds.off.map(function (x) { return x.title; }).join(", ") + ".");
    $("#route-note").textContent = note.join(" ");
  }

  function showDayOnMap(i) {
    var sel = $("#map-day");
    sel.value = String(i);
    $("#map").scrollIntoView({ behavior: smooth(), block: "start" });
    setTimeout(function () { if (map) map.invalidateSize(); refreshMap(true); }, 300);
  }

  function locateMe() {
    if (!map) return;
    if (!navigator.geolocation) { toast("Location isn't available in this browser."); return; }
    toast("Finding you…");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var ll = [pos.coords.latitude, pos.coords.longitude];
      if (meMarker) map.removeLayer(meMarker);
      meMarker = L.circleMarker(ll, { radius: 9, color: "#fff", weight: 3, fillColor: "#2a7fff", fillOpacity: 1 }).addTo(map).bindPopup("You are here");
      var onIsland = ll[0] > 19.2 && ll[0] < 19.45 && ll[1] > -81.45 && ll[1] < -81.05;
      if (onIsland) { map.flyTo(ll, 14); toast("Here you are."); }
      else toast("You're not on Grand Cayman yet — the map stays on the island.");
    }, function () { toast("Couldn't get your location. Check location permission."); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function smooth() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }
  function flashCard(id, isEat) {
    var c = document.getElementById(id);
    if (!c && isEat) {
      $("#dining-search").value = ""; $("#dining-vibe").value = "all";
      setFilter("#dining-filters", "all", function (v) { diningFilter = v; renderDining(); });
      c = document.getElementById(id);
    }
    if (!c && !isEat) { setFilter("#explore-filters", "all", function (v) { exploreFilter = v; renderExplore(); }); c = document.getElementById(id); }
    if (!c) return;
    c.scrollIntoView({ behavior: smooth(), block: "center" });
    c.classList.add("is-flash");
    var btn = $(".btn", c); if (btn) setTimeout(function () { btn.focus({ preventScroll: true }); }, 400);
    setTimeout(function () { c.classList.remove("is-flash"); }, 1800);
  }

  /* ---------- Boot ---------- */
  function boot() {
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    ensureDays();
    initSettings();
    initToolbar();
    initDialog();
    renderDays();
    initFilters("#dining-filters", function (v) { diningFilter = v; renderDining(); });
    $("#dining-search").addEventListener("input", renderDining);
    $("#dining-vibe").addEventListener("change", renderDining);
    initFilters("#explore-filters", function (v) { exploreFilter = v; renderExplore(); });
    renderDining();
    renderExplore();
    initMine();
    initMap();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
