/* ============================================================
   Juliet Gold — Store logic
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

  /* ---------- toast ---------- */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  /* ---------- render products ---------- */
  function productCard(p) {
    var stars = "★★★★★";
    var old = p.oldPrice ? '<small>' + money(p.oldPrice) + '</small>' : '';
    var tag = p.tag ? '<span class="product-tag">' + p.tag + '</span>' : '';
    return '' +
      '<article class="product-card" role="listitem" data-cat="' + p.cat + '">' +
        '<div class="product-media">' + tag + '<span>' + p.emoji + '</span></div>' +
        '<div class="product-body">' +
          '<span class="product-cat">' + p.catLabel + '</span>' +
          '<h3 class="product-name">' + p.name + '</h3>' +
          '<p class="product-desc">' + p.desc + '</p>' +
          '<p class="product-rating">' + stars + ' <span>(' + p.rating + ' · ' + p.reviews + ' ביקורות)</span></p>' +
          '<div class="product-foot">' +
            '<span class="product-price">' + money(p.price) + old + '</span>' +
            '<button class="add-btn" data-add="' + p.id + '">הוסף לעגלה</button>' +
          '</div>' +
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
          "brand": { "@type": "Brand", "name": "Juliet Gold" },
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
      "name": "מוצרי ג'ולייט גולד",
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
          '<div class="cart-item-media">' + p.emoji + '</div>' +
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
    var add = t.getAttribute && t.getAttribute("data-add");
    var inc = t.getAttribute && t.getAttribute("data-inc");
    var dec = t.getAttribute && t.getAttribute("data-dec");
    var rm = t.getAttribute && t.getAttribute("data-rm");
    if (add) { addToCart(add); }
    else if (inc) { cart[inc]++; renderCart(); }
    else if (dec) { cart[dec]--; if (cart[dec] <= 0) delete cart[dec]; renderCart(); }
    else if (rm) { delete cart[rm]; renderCart(); }
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
    var html = ids.slice(0, 4).map(function (id) {
      var p = byId[id]; if (!p) return "";
      return '<div class="exit-cart-line"><span class="em">' + p.emoji + '</span>' +
             '<span class="nm">' + p.name + '</span>' +
             '<span class="pr">×' + cart[id] + '</span></div>';
    }).join("");
    if (ids.length > 4) html += '<div class="exit-cart-line"><span class="nm">ועוד ' + (ids.length - 4) + ' פריטים…</span></div>';
    $("#exitCartPreview").innerHTML = html;

    // Pre-fill contact if we already captured it
    if (savedLead.email) $("#exitEmail").value = savedLead.email;
    if (savedLead.phone) $("#exitPhone").value = savedLead.phone;

    var n = cartCount();
    $("#exitSub").textContent = "שמנו לב שהשארת " + n + " פריט" + (n > 1 ? "ים" : "") +
      " בעגלה בשווי " + money(cartTotal()) + ". הם ממש מחכים לך 😍";
  }

  function showExitPopup() {
    if (exitShown) return;
    if (cartCount() === 0) return;          // only when there's something to lose
    if (load(EXIT_KEY, false)) return;      // once per session
    exitShown = true;
    save(EXIT_KEY, true);
    buildExitPreview();
    closeCart();
    exitOverlay.classList.add("open");
    exitOverlay.setAttribute("aria-hidden", "false");
    $("#exitEmail").focus();
  }
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

  $("#exitForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("#exitEmail").value.trim();
    var phone = $("#exitPhone").value.trim();
    var note = $("#exitNote");
    if (!isEmail(email)) { note.textContent = "אנא הזיני אימייל תקין כדי שנשמור לך את העגלה"; return; }
    if (phone && !isPhone(phone)) { note.textContent = "מספר הטלפון אינו תקין"; return; }
    savedLead = { email: email, phone: phone, at: Date.now(), cart: Object.assign({}, cart) };
    save(LEAD_KEY, savedLead);
    note.textContent = "מעולה! שמרנו לך את העגלה 💜 קוד 10% הנחה בדרך אלייך";
    setTimeout(function () { hideExitPopup(); openCart(); }, 1600);
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
})();
