/* ============================================================
   Judith Gold — Store logic
   - Product rendering + category filter
   - Cart (localStorage) shown in top-bar drawer
   - Newsletter / contact capture (email + phone)
   - Exit-intent ABANDONED CART popup:
       when a visitor tries to leave with items in the cart,
       interrupt them, remind them of the items, capture
       email/phone, and offer an extra discount.
   ============================================================ */
(function () {
  "use strict";

  var FREE_SHIP = 199;
  var PRODUCTS = window.JG_PRODUCTS || [];
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  var CART_KEY = "jg_cart_v1";
  var LEAD_KEY = "jg_lead_v1";        // saved email/phone
  var EXIT_KEY = "jg_exit_shown_v1";  // popup shown this session

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function money(n) { return "₪" + Number(n).toLocaleString("he-IL"); }
  function load(key, fb) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim()); }
  function isPhone(v) { return /^0\d{1,2}[-\s]?\d{7}$|^\+?\d{9,15}$/.test(String(v || "").replace(/\s/g, "")); }

  var cart = load(CART_KEY, {}); // { id: qty }
  var WISH_KEY = "jg_wish_v1";
  var wishlist = load(WISH_KEY, []); // [id, ...]

  /* ---------- toast ---------- */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  /* ---------- product artwork (elegant bottle SVGs) ---------- */
  var SHAPES = {
    dropper:
      '<rect x="42" y="8" width="16" height="12" rx="2" fill="#4f2350"/>' +
      '<rect x="44" y="19" width="12" height="11" fill="#8a5a8c"/>' +
      '<rect x="30" y="29" width="40" height="83" rx="15" fill="#7c3d80"/>' +
      '<rect x="37" y="55" width="26" height="42" rx="4" fill="#fdfbfe" opacity="0.85"/>' +
      '<line x1="37" y1="65" x2="63" y2="65" stroke="#c19a49" stroke-width="2"/>',
    jar:
      '<rect x="26" y="30" width="48" height="17" rx="7" fill="#4f2350"/>' +
      '<rect x="28" y="45" width="44" height="63" rx="17" fill="#7c3d80"/>' +
      '<rect x="36" y="62" width="28" height="32" rx="4" fill="#fdfbfe" opacity="0.85"/>' +
      '<line x1="36" y1="72" x2="64" y2="72" stroke="#c19a49" stroke-width="2"/>',
    tube:
      '<rect x="40" y="9" width="20" height="13" rx="3" fill="#4f2350"/>' +
      '<rect x="32" y="22" width="36" height="86" rx="11" fill="#7c3d80"/>' +
      '<rect x="32" y="103" width="36" height="5" rx="2" fill="#4f2350"/>' +
      '<rect x="38" y="46" width="24" height="36" rx="4" fill="#fdfbfe" opacity="0.85"/>' +
      '<line x1="38" y1="56" x2="62" y2="56" stroke="#c19a49" stroke-width="2"/>',
    pump:
      '<rect x="46" y="6" width="8" height="15" fill="#4f2350"/>' +
      '<path d="M40 21h20v6h-9v4h-11z" fill="#8a5a8c"/>' +
      '<rect x="45" y="31" width="10" height="8" fill="#8a5a8c"/>' +
      '<rect x="30" y="38" width="40" height="74" rx="11" fill="#7c3d80"/>' +
      '<rect x="37" y="60" width="26" height="38" rx="4" fill="#fdfbfe" opacity="0.85"/>' +
      '<line x1="37" y1="70" x2="63" y2="70" stroke="#c19a49" stroke-width="2"/>'
  };
  function productSVG(shape, cls) {
    return '<svg class="' + (cls || 'prod-svg') + '" viewBox="0 0 100 120" role="img" aria-label="מוצר">' +
           (SHAPES[shape] || SHAPES.dropper) + '</svg>';
  }
  var WA_NUM = "972547444478";
  function waProductLink(p) {
    var msg = 'היי יהודית 😊 אני מעוניין/ת במוצר: "' + p.name + '" (' + money(p.price) + ')' +
              (p.line ? ' מסדרת ' + p.line : '') + '. אפשר פרטים והזמנה?';
    return "https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent(msg);
  }

  /* ---------- render products ---------- */
  function productCard(p) {
    var stars = "★★★★★";
    var old = p.oldPrice ? '<small>' + money(p.oldPrice) + '</small>' : '';
    var tag = p.tag ? '<span class="product-tag">' + p.tag + '</span>' : '';
    var line = p.line ? '<span class="product-line-badge">' + p.line + '</span>' : '';
    var wished = wishlist.indexOf(p.id) > -1 ? ' on' : '';
    var heart = '<button class="wish-heart' + wished + '" data-wish="' + p.id + '" aria-label="הוספה למועדפים" aria-pressed="' + (wished ? 'true' : 'false') + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18z"/></svg></button>';
    return '' +
      '<article class="product-card" role="listitem" data-cat="' + p.cat + '">' +
        '<div class="product-media">' + heart + tag + line + productSVG(p.shape) + '</div>' +
        '<div class="product-body">' +
          '<span class="product-cat">' + p.catLabel + '</span>' +
          '<h3 class="product-name">' + p.name + '</h3>' +
          '<p class="product-desc">' + p.desc + '</p>' +
          '<p class="product-rating">' + stars + ' <span>(' + p.rating + ' · ' + p.reviews + ' ביקורות)</span></p>' +
          '<div class="product-foot">' +
            '<span class="product-price">' + money(p.price) + old + '</span>' +
            '<button class="add-btn" data-add="' + p.id + '">הוסף לעגלה</button>' +
          '</div>' +
          '<a class="wa-product" href="' + waProductLink(p) + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.4 31.6l8.1-2.1c2.2 1.2 4.7 1.9 7.5 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.5 0-4.8-.7-6.8-1.8l-.5-.3-4.8 1.3 1.3-4.7-.3-.5a12.7 12.7 0 0 1-2-6.8C3.1 8.9 8.9 3.1 16 3.1S28.9 8.9 28.9 16 23.1 28.8 16 28.8z"/></svg>' +
            ' שאלו על המוצר בוואטסאפ</a>' +
        '</div>' +
      '</article>';
  }

  var grid = $("#productGrid");
  function renderProducts(filter) {
    var list = PRODUCTS.filter(function (p) { return !filter || filter === "all" || p.cat === filter; });
    grid.innerHTML = list.map(productCard).join("");
  }
  renderProducts("all");

  /* Product structured data for SEO/AEO (injected) */
  (function injectProductSchema() {
    var items = PRODUCTS.map(function (p, i) {
      return {
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Product",
          "name": p.name,
          "category": p.catLabel,
          "brand": { "@type": "Brand", "name": "Dr. Klein" },
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": p.rating, "reviewCount": p.reviews },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "ILS",
            "price": p.price,
            "availability": "https://schema.org/InStock"
          }
        }
      };
    });
    var el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "מוצרי יהודית גולד",
      "itemListElement": items
    });
    document.head.appendChild(el);
  })();

  /* ---------- category filter ---------- */
  document.querySelectorAll(".cat-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".cat-card").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      renderProducts(btn.getAttribute("data-filter"));
      var top = $("#products").getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  /* ---------- cart core ---------- */
  var cartCountEl = $("#cartCount");
  var cartItemsEl = $("#cartItems");
  var cartTotalEl = $("#cartTotal");
  var cartDrawer = $("#cartDrawer");
  var drawerOverlay = $("#drawerOverlay");
  var shipFreeEl = $("#cartShipFree");

  function cartCount() {
    return Object.keys(cart).reduce(function (s, id) { return s + cart[id]; }, 0);
  }
  function cartTotal() {
    return Object.keys(cart).reduce(function (s, id) {
      var p = byId[id]; return p ? s + p.price * cart[id] : s;
    }, 0);
  }

  function renderCart() {
    var ids = Object.keys(cart);
    cartCountEl.textContent = cartCount();
    cartDrawer.classList.toggle("empty", ids.length === 0);

    cartItemsEl.innerHTML = ids.map(function (id) {
      var p = byId[id]; if (!p) return "";
      var q = cart[id];
      return '' +
        '<div class="cart-item">' +
          '<div class="cart-item-media">' + productSVG(p.shape, 'cart-svg') + '</div>' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + p.name + '</span>' +
            '<span class="cart-item-price">' + money(p.price) + '</span>' +
            '<div class="cart-item-controls">' +
              '<button class="qty-btn" data-dec="' + id + '" aria-label="הפחת">−</button>' +
              '<span class="qty-val">' + q + '</span>' +
              '<button class="qty-btn" data-inc="' + id + '" aria-label="הוסף">+</button>' +
              '<button class="cart-item-remove" data-rm="' + id + '">הסר</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join("");

    var total = cartTotal();
    cartTotalEl.textContent = money(total);

    if (total > 0 && total < FREE_SHIP) {
      shipFreeEl.textContent = "עוד " + money(FREE_SHIP - total) + " למשלוח חינם! 🚚";
    } else if (total >= FREE_SHIP) {
      shipFreeEl.textContent = "מזל טוב! יש לך משלוח חינם 🎉";
    } else {
      shipFreeEl.textContent = "";
    }

    save(CART_KEY, cart);
  }

  function addToCart(id) {
    if (!byId[id]) return;
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    toast(byId[id].name.split("–")[0].trim() + " נוסף לעגלה ✓");
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var wishBtn = t.closest && t.closest("[data-wish]");
    if (wishBtn) { toggleWish(wishBtn.getAttribute("data-wish"), wishBtn); return; }
    var add = t.getAttribute && t.getAttribute("data-add");
    var inc = t.getAttribute && t.getAttribute("data-inc");
    var dec = t.getAttribute && t.getAttribute("data-dec");
    var rm = t.getAttribute && t.getAttribute("data-rm");
    if (add) { addToCart(add); }
    else if (inc) { cart[inc]++; renderCart(); }
    else if (dec) { cart[dec]--; if (cart[dec] <= 0) delete cart[dec]; renderCart(); }
    else if (rm) { delete cart[rm]; renderCart(); }
  });

  /* ---------- wishlist ---------- */
  var wishCountEl = $("#wishCount");
  function updateWishCount() { if (wishCountEl) wishCountEl.textContent = wishlist.length; }
  function toggleWish(id, btn) {
    var i = wishlist.indexOf(id);
    if (i > -1) { wishlist.splice(i, 1); if (btn) { btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false"); } }
    else { wishlist.push(id); if (btn) { btn.classList.add("on"); btn.setAttribute("aria-pressed", "true"); } toast((byId[id] ? byId[id].line || "המוצר" : "המוצר") + " נוסף למועדפים ❤"); }
    save(WISH_KEY, wishlist);
    updateWishCount();
  }
  var wishlistBtn = $("#wishlistBtn");
  if (wishlistBtn) wishlistBtn.addEventListener("click", function () {
    if (!wishlist.length) { toast("עדיין לא הוספת מוצרים למועדפים ❤"); return; }
    toast("יש לך " + wishlist.length + " מוצרים במועדפים");
  });

  /* ---------- drawer open/close ---------- */
  function openCart() { cartDrawer.classList.add("open"); drawerOverlay.classList.add("open"); cartDrawer.setAttribute("aria-hidden", "false"); }
  function closeCart() { cartDrawer.classList.remove("open"); drawerOverlay.classList.remove("open"); cartDrawer.setAttribute("aria-hidden", "true"); }
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  drawerOverlay.addEventListener("click", closeCart);
  $("#cartEmptyShop").addEventListener("click", function () { closeCart(); location.hash = "#products"; });

  $("#checkoutBtn").addEventListener("click", function () {
    if (cartCount() === 0) return;
    toast("מעבר לתשלום מאובטח… (הדגמה)");
  });

  /* ---------- newsletter / contact capture ---------- */
  var savedLead = load(LEAD_KEY, {});
  var nlForm = $("#newsletterForm");
  nlForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("#nlEmail").value.trim();
    var phone = $("#nlPhone").value.trim();
    var note = $("#nlNote");
    if (!isEmail(email)) { note.textContent = "אנא הזיני כתובת אימייל תקינה"; return; }
    if (phone && !isPhone(phone)) { note.textContent = "מספר הטלפון אינו תקין"; return; }
    savedLead = { email: email, phone: phone, at: Date.now() };
    save(LEAD_KEY, savedLead);
    note.textContent = "תודה! קוד ההנחה יישלח אלייך במייל 💜";
    nlForm.reset();
  });

  /* ============================================================
     EXIT-INTENT ABANDONED-CART POPUP  (the core "hack")
     Triggers when a visitor with items in the cart tries to
     leave — reminds them, captures email/phone, offers a bonus.
     ============================================================ */
  var exitOverlay = $("#exitOverlay");
  var exitShown = false;

  function buildExitPreview() {
    var ids = Object.keys(cart);
    var wrap = $("#exitCartPreview");
    if (!ids.length) { wrap.innerHTML = ""; wrap.style.display = "none"; }
    else {
      wrap.style.display = "";
      var html = ids.slice(0, 3).map(function (id) {
        var p = byId[id]; if (!p) return "";
        return '<div class="exit-cart-line"><span class="em">' + productSVG(p.shape, 'exit-svg') + '</span>' +
               '<span class="nm">' + p.name + '</span>' +
               '<span class="pr">×' + cart[id] + '</span></div>';
      }).join("");
      if (ids.length > 3) html += '<div class="exit-cart-line"><span class="nm">ועוד ' + (ids.length - 3) + ' פריטים בעגלה…</span></div>';
      wrap.innerHTML = html;
    }
    // Pre-fill from any previously captured lead
    if (savedLead.name) $("#exitName").value = savedLead.name;
    if (savedLead.email) $("#exitEmail").value = savedLead.email;
    if (savedLead.phone) $("#exitPhone").value = savedLead.phone;
  }

  function showExitPopup() {
    if (exitShown) return;
    if (load(EXIT_KEY, false)) return;      // once per session
    exitShown = true;
    save(EXIT_KEY, true);
    buildExitPreview();
    closeCart();
    exitOverlay.classList.add("open");
    exitOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { var n = $("#exitName"); if (n) n.focus(); }, 350);
  }

  // Trigger after 60s of inactivity (spec)
  var idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (exitShown || load(EXIT_KEY, false)) return;
    idleTimer = setTimeout(showExitPopup, 60000);
  }
  ["mousemove", "keydown", "scroll", "touchstart", "click"].forEach(function (ev) {
    window.addEventListener(ev, resetIdle, { passive: true });
  });
  resetIdle();
  function hideExitPopup() {
    exitOverlay.classList.remove("open");
    exitOverlay.setAttribute("aria-hidden", "true");
  }

  // Desktop: mouse leaves through the top of the viewport
  document.addEventListener("mouseout", function (e) {
    if (e.clientY <= 0 && !e.relatedTarget) showExitPopup();
  });

  // Mobile / tab-switch: page becomes hidden (back button, app switch)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      // can't show a modal once hidden, so prep it to appear on return
      if (cartCount() > 0 && !load(EXIT_KEY, false)) save("jg_exit_pending", true);
    } else if (document.visibilityState === "visible" && load("jg_exit_pending", false)) {
      localStorage.removeItem("jg_exit_pending");
      showExitPopup();
    }
  });

  // Mobile: fast upward scroll toward the top (leaving intent)
  var lastY = window.scrollY, lastT = Date.now();
  window.addEventListener("scroll", function () {
    var y = window.scrollY, t = Date.now();
    var v = (lastY - y) / Math.max(1, t - lastT); // upward velocity
    if (v > 1.2 && y < 200) showExitPopup();
    lastY = y; lastT = t;
  }, { passive: true });

  // Safety net for browsers that support it (also re-arms next visit)
  window.addEventListener("beforeunload", function () {
    if (cartCount() > 0 && !load(EXIT_KEY, false)) save(EXIT_KEY, false); // allow next-visit reminder
  });

  $("#exitClose").addEventListener("click", hideExitPopup);
  $("#exitDismiss").addEventListener("click", hideExitPopup);
  exitOverlay.addEventListener("click", function (e) { if (e.target === exitOverlay) hideExitPopup(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hideExitPopup(); closeCart(); }
  });

  /* ---------- lead delivery (static-site friendly) ----------
     Leads are (1) saved locally, (2) POSTed to a form backend if a key
     is configured (Web3Forms → emails judithgold10@gmail.com), and
     (3) always available as a WhatsApp handoff so Judith gets them even
     with zero backend. Paste a free access key below to enable email. */
  var WEB3FORMS_KEY = ""; // ← put your Web3Forms access key here to auto-email leads
  var COUPON = "JG10";

  function cartSummaryText() {
    var ids = Object.keys(cart);
    if (!ids.length) return "העגלה ריקה";
    return ids.map(function (id) { var p = byId[id]; return p ? (p.name + " ×" + cart[id]) : ""; }).filter(Boolean).join(" | ") +
           " · סה\"כ " + money(cartTotal());
  }
  function saveLeadLocal(lead) {
    var arr = load("jg_leads_v1", []);
    arr.push(lead); save("jg_leads_v1", arr);
    savedLead = lead; save(LEAD_KEY, lead);
  }
  function postLeadToBackend(lead) {
    if (!WEB3FORMS_KEY) return; // not configured — WhatsApp handoff covers delivery
    try {
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "ליד עגלה נטושה – יהודית גולד",
          from_name: "אתר יהודית גולד",
          "שם": lead.name, "אימייל": lead.email, "טלפון": lead.phone,
          "עגלה": cartSummaryText(), "הסכמה": "אושרה", "קופון": COUPON
        })
      }).catch(function () {});
    } catch (e) {}
  }
  function leadWhatsappUrl(lead) {
    var msg = "היי יהודית! מילאתי פרטים באתר לקבלת קופון " + COUPON + " (10% הנחה).\n" +
              "שם: " + lead.name + "\nטלפון: " + lead.phone + "\nאימייל: " + lead.email +
              "\nעגלה: " + cartSummaryText();
    return "https://wa.me/972547444478?text=" + encodeURIComponent(msg);
  }

  $("#exitForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#exitName").value.trim();
    var email = $("#exitEmail").value.trim();
    var phone = $("#exitPhone").value.trim();
    var c1 = $("#exitConsent1").checked;
    var c2 = $("#exitConsent2").checked;
    var note = $("#exitNote");
    note.textContent = "";
    if (name.length < 2) { note.textContent = "אנא מלאו שם מלא"; return; }
    if (!isEmail(email)) { note.textContent = "אנא הזינו כתובת אימייל תקינה"; return; }
    if (!isPhone(phone)) { note.textContent = "אנא הזינו מספר טלפון תקין (חובה)"; return; }
    if (!c1 || !c2) { note.textContent = "יש לאשר את שתי התיבות כדי להמשיך"; return; }

    var lead = { name: name, email: email, phone: phone, consentGiven: true,
                 cart: Object.assign({}, cart), cartText: cartSummaryText(), at: Date.now() };
    saveLeadLocal(lead);
    postLeadToBackend(lead);

    var waBtn = $("#exitWaBtn");
    if (waBtn) waBtn.href = leadWhatsappUrl(lead);
    $("#couponCode").textContent = COUPON;
    $("#exitForm").style.display = "none";
    var prev = $("#exitCartPreview"); if (prev) prev.style.display = "none";
    var dismiss = $("#exitDismiss"); if (dismiss) dismiss.style.display = "none";
    $("#exitSuccess").hidden = false;
  });

  /* ---------- mobile nav ---------- */
  var navToggle = $("#navToggle");
  var mainNav = $("#mainNav");
  navToggle.addEventListener("click", function () {
    var open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  mainNav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { mainNav.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); });
  });

  /* ---------- init ---------- */
  renderCart();
  updateWishCount();
})();
