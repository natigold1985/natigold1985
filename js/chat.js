/* ============================================================
   Judith Gold — Customer support chat widget
   - Floating launcher + chat window
   - Image / video / document upload buttons (local preview)
   - Auto-responder on the visitor's first message
   - WhatsApp handoff (static site: real delivery continues on WA)
   ============================================================ */
(function () {
  "use strict";
  var WA_NUM = "972547444478";
  var AUTO_REPLY = "היי, הגעת ליהודית גולד! 🌸 במידה ואני לא עונה באותו הרגע, אנא השאירו מספר טלפון ואחזור אליכם בהקדם האפשרי עם ייעוץ אישי והתאמת מוצרים.";

  function $(s) { return document.querySelector(s); }
  var launcher = $("#chatLauncher");
  var win = $("#chatWindow");
  if (!launcher || !win) return;

  var body = $("#chatBody");
  var form = $("#chatForm");
  var textInput = $("#chatText");
  var previews = $("#chatPreviews");
  var waFoot = $("#chatWaFoot");
  var firstUserMsg = true;
  var pending = []; // attached files {name,type,url}
  var greeted = false;

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function addMsg(who, html) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-" + who;
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }
  function addTyping() {
    var el = addMsg("bot typing", '<span class="chat-typing"><i></i><i></i><i></i></span>');
    return el;
  }

  function openChat() {
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    launcher.classList.add("hidden");
    if (!greeted) {
      greeted = true;
      setTimeout(function () {
        addMsg("bot", esc("שלום 💜 אני כאן לכל שאלה על המוצרים או התאמה אישית לעור שלך."));
      }, 300);
    }
    setTimeout(function () { textInput.focus(); }, 350);
  }
  function closeChat() {
    win.classList.remove("open");
    win.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.classList.remove("hidden");
  }
  launcher.addEventListener("click", openChat);
  $("#chatClose").addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && win.classList.contains("open")) closeChat(); });

  /* ---------- attachments ---------- */
  function renderPreviews() {
    previews.innerHTML = pending.map(function (f, i) {
      var thumb;
      if (f.type.indexOf("image") === 0) thumb = '<img src="' + f.url + '" alt="">';
      else if (f.type.indexOf("video") === 0) thumb = '<span class="chat-file-ic">🎬</span>';
      else thumb = '<span class="chat-file-ic">📄</span>';
      return '<div class="chat-prev">' + thumb + '<span class="chat-prev-x" data-rm="' + i + '">✕</span></div>';
    }).join("");
  }
  function handleFile(input) {
    var f = input.files && input.files[0];
    if (!f) return;
    pending.push({ name: f.name, type: f.type || "", url: URL.createObjectURL(f) });
    renderPreviews();
    input.value = "";
  }
  ["#chatImg", "#chatVid", "#chatDoc"].forEach(function (sel) {
    var el = $(sel); if (el) el.addEventListener("change", function () { handleFile(el); });
  });
  previews.addEventListener("click", function (e) {
    var rm = e.target.getAttribute && e.target.getAttribute("data-rm");
    if (rm !== null && rm !== undefined) {
      var removed = pending.splice(+rm, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      renderPreviews();
    }
  });

  /* ---------- send ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = textInput.value.trim();
    if (!txt && !pending.length) return;

    var html = "";
    if (pending.length) {
      html += '<div class="chat-msg-atts">' + pending.map(function (f) {
        if (f.type.indexOf("image") === 0) return '<img src="' + f.url + '" alt="' + esc(f.name) + '">';
        if (f.type.indexOf("video") === 0) return '<span class="chat-att-chip">🎬 ' + esc(f.name) + '</span>';
        return '<span class="chat-att-chip">📄 ' + esc(f.name) + '</span>';
      }).join("") + '</div>';
    }
    if (txt) html += '<span>' + esc(txt) + '</span>';
    addMsg("user", html);

    var sentText = txt;
    var hadFiles = pending.length;
    textInput.value = "";
    pending = [];
    renderPreviews();

    // auto-responder on first message
    if (firstUserMsg) {
      firstUserMsg = false;
      var typing = addTyping();
      setTimeout(function () {
        typing.remove();
        addMsg("bot", esc(AUTO_REPLY));
        // build a WhatsApp handoff carrying the visitor's message
        var waMsg = "היי יהודית, כתבתי לך מהצ'אט באתר";
        if (sentText) waMsg += ': "' + sentText + '"';
        if (hadFiles) waMsg += " (רציתי לשלוח גם קובץ/תמונה)";
        var waUrl = "https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent(waMsg);
        if (waFoot) waFoot.href = waUrl;
        setTimeout(function () {
          addMsg("bot", 'רוצה להמשיך עם התמונות/הקבצים? <a href="' + waUrl + '" target="_blank" rel="noopener" class="chat-inline-wa">המשיכי בוואטסאפ ←</a>');
        }, 700);
      }, 1100);
    }
  });
})();
