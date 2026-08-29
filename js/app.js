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

  var CFG = window.JG_CONFIG || {};
  var FREE_SHIP = CFG.FREE_SHIPPING_FROM || 199;
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
  function productMedia(p) {
    return (p.images && p.images.length) ?
      '<img src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy" width="300" height="300" />' :
      productSVG(p.shape);
  }
  function productCard(p) {
    var stars = "★★★★★";
    var old = p.oldPrice ? '<small>' + money(p.oldPrice) + '</small>' : '';
    var tag = p.tag ? '<span class="product-tag">' + p.tag + '</span>' : '';
    var discountPct = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    var discount = discountPct > 0 ? '<span class="discount-badge">-' + discountPct + '%</span>' : '';
    var endStack = discount ? '<div class="media-end-stack">' + discount + '</div>' : '';
    var kicker = p.line ? '<span class="product-line-kicker">' + p.line + '</span>' : '<span class="product-line-kicker">' + p.catLabel + '</span>';
    var wished = wishlist.indexOf(p.id) > -1 ? ' on' : '';
    var heart = '<button class="wish-heart' + wished + '" data-wish="' + p.id + '" aria-label="הוספה למועדפים" aria-pressed="' + (wished ? 'true' : 'false') + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18z"/></svg></button>';
    return '' +
      '<article class="product-card" data-cat="' + p.cat + '">' +
        '<div class="product-media" data-open="' + p.id + '">' + heart + tag + endStack + productMedia(p) + '</div>' +
        '<div class="product-body">' +
          kicker +
          '<h3 class="product-name" data-open="' + p.id + '">' + p.name + '</h3>' +
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
  function isAntiAging(p) {
    var text = [p.name, p.line, p.desc, (p.forWhom || []).join(" ")].join(" ");
    return /אנטי[\s-]?אייג|anti[\s-]?aging/i.test(text);
  }
  function renderProducts(filter) {
    var list = PRODUCTS.filter(function (p) {
      if (!filter || filter === "all") return true;
      if (filter === "antiaging") return isAntiAging(p);
      return p.cat === filter;
    });
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
  function filterAndScrollToProducts(filter) {
    document.querySelectorAll(".cat-card").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-filter") === filter);
    });
    renderProducts(filter);
    var top = $("#products").getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: "smooth" });
  }
  document.querySelectorAll(".cat-card").forEach(function (btn) {
    btn.addEventListener("click", function () { filterAndScrollToProducts(btn.getAttribute("data-filter")); });
  });
  document.querySelectorAll("[data-nav-filter]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      filterAndScrollToProducts(a.getAttribute("data-nav-filter"));
      closeMobileNav();
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
          '<div class="cart-item-media">' + productMedia(p) + '</div>' +
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

  function addToCart(id, qty) {
    if (!byId[id]) return;
    cart[id] = (cart[id] || 0) + (qty || 1);
    renderCart();
    toast(byId[id].name.split("–")[0].trim() + " נוסף לעגלה ✓");
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var wishBtn = t.closest && t.closest("[data-wish]");
    if (wishBtn) { toggleWish(wishBtn.getAttribute("data-wish"), wishBtn); return; }
    var openBtn = t.closest && t.closest("[data-open]");
    if (openBtn && !t.closest("[data-wish]")) { openProductModal(openBtn.getAttribute("data-open")); return; }
    var add = t.getAttribute && t.getAttribute("data-add");
    var inc = t.getAttribute && t.getAttribute("data-inc");
    var dec = t.getAttribute && t.getAttribute("data-dec");
    var rm = t.getAttribute && t.getAttribute("data-rm");
    if (add) { addToCart(add); }
    else if (inc) { cart[inc]++; renderCart(); }
    else if (dec) { cart[dec]--; if (cart[dec] <= 0) delete cart[dec]; renderCart(); }
    else if (rm) { delete cart[rm]; renderCart(); }
  });

  /* ---------- product image zoom (click/tap to zoom, drag or hover to pan) ---------- */
  function initZoom(img) {
    if (!img) return;
    var zoomed = false;
    function setPos(e, rect) {
      var clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      var clientY = (e.touches ? e.touches[0].clientY : e.clientY);
      var x = ((clientX - rect.left) / rect.width) * 100;
      var y = ((clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = x + "% " + y + "%";
    }
    img.classList.add("pd-zoomable");
    img.addEventListener("click", function (e) {
      var rect = img.getBoundingClientRect();
      setPos(e, rect);
      zoomed = !zoomed;
      img.classList.toggle("pd-zoomed", zoomed);
    });
    img.addEventListener("mousemove", function (e) {
      if (!zoomed) return;
      setPos(e, img.getBoundingClientRect());
    });
    img.addEventListener("touchmove", function (e) {
      if (!zoomed) return;
      e.preventDefault();
      setPos(e, img.getBoundingClientRect());
    }, { passive: false });
    img.addEventListener("mouseleave", function () {
      zoomed = false;
      img.classList.remove("pd-zoomed");
    });
  }

  /* ---------- product detail modal ---------- */
  var pdOverlay = $("#pdOverlay");
  var pdCurrentId = null;
  function renderPdGallery(p) {
    var imgs = (p.images && p.images.length) ? p.images : null;
    var main = $("#pdMain");
    var thumbs = $("#pdThumbs");
    if (!imgs) {
      main.innerHTML = productSVG(p.shape, "pd-svg");
      thumbs.innerHTML = "";
      thumbs.hidden = true;
      return;
    }
    thumbs.hidden = imgs.length < 2;
    function show(i) {
      main.innerHTML = '<img src="' + imgs[i] + '" alt="' + p.name + '" />';
      Array.prototype.forEach.call(thumbs.children, function (el, idx) {
        el.classList.toggle("active", idx === i);
      });
      var img = main.querySelector("img");
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function () { openLightbox(imgs, i, p.name); });
    }
    thumbs.innerHTML = imgs.map(function (src, i) {
      return '<button class="pd-thumb' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" aria-label="תמונה ' + (i + 1) + ' מתוך ' + imgs.length + '"><img src="' + src + '" alt="" /></button>';
    }).join("");
    Array.prototype.forEach.call(thumbs.children, function (el, idx) {
      el.addEventListener("click", function () { show(idx); });
    });
    show(0);
  }

  /* ---------- fullscreen zoom lightbox ---------- */
  var lbOverlay = $("#lbOverlay");
  var lbStage = $("#lbStage");
  var lbThumbs = $("#lbThumbs");
  var lbImgs = [], lbIndex = 0, lbAlt = "";
  function lbShow(i) {
    lbIndex = (i + lbImgs.length) % lbImgs.length;
    var img = document.createElement("img");
    img.src = lbImgs[lbIndex];
    img.alt = lbAlt;
    lbStage.innerHTML = "";
    lbStage.appendChild(img);
    initZoom(img);
    Array.prototype.forEach.call(lbThumbs.children, function (el, idx) {
      el.classList.toggle("active", idx === lbIndex);
    });
  }
  function openLightbox(imgs, index, altText) {
    lbImgs = imgs; lbAlt = altText || "";
    lbThumbs.hidden = imgs.length < 2;
    lbThumbs.innerHTML = imgs.map(function (src, i) {
      return '<button class="lb-thumb" data-i="' + i + '" aria-label="תמונה ' + (i + 1) + ' מתוך ' + imgs.length + '"><img src="' + src + '" alt="" /></button>';
    }).join("");
    Array.prototype.forEach.call(lbThumbs.children, function (el, idx) {
      el.addEventListener("click", function () { lbShow(idx); });
    });
    lbShow(index || 0);
    lbOverlay.classList.add("open");
    lbOverlay.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    lbOverlay.classList.remove("open");
    lbOverlay.setAttribute("aria-hidden", "true");
  }
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", function () { lbShow(lbIndex - 1); });
  $("#lbNext").addEventListener("click", function () { lbShow(lbIndex + 1); });
  lbOverlay.addEventListener("click", function (e) { if (e.target === lbOverlay) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (!lbOverlay.classList.contains("open")) return;
    if (e.key === "Escape") { closeLightbox(); e.stopImmediatePropagation(); }
    else if (e.key === "ArrowLeft") lbShow(lbIndex + 1);
    else if (e.key === "ArrowRight") lbShow(lbIndex - 1);
  });
  var pdQty = 1;
  var pdQtyVal = $("#pdQtyVal");
  function setPdQty(n) {
    pdQty = Math.max(1, n);
    if (pdQtyVal) pdQtyVal.textContent = pdQty;
  }
  function openProductModal(id) {
    var p = byId[id];
    if (!p) return;
    pdCurrentId = id;
    setPdQty(1);
    renderPdGallery(p);
    $("#pdLine").textContent = p.line || "";
    $("#pdName").textContent = p.name;
    $("#pdRating").innerHTML = "★★★★★ <span>(" + p.rating + " · " + p.reviews + " ביקורות)</span>";
    var old = p.oldPrice ? '<small>' + money(p.oldPrice) + '</small>' : '';
    $("#pdPrice").innerHTML = money(p.price) + old;
    $("#pdDesc").textContent = p.desc;
    $("#pdForWhom").innerHTML = (p.forWhom || []).map(function (s) { return "<li>" + s + "</li>"; }).join("");
    $("#pdHowTo").textContent = p.howToUse || "";
    $("#pdWaLink").href = waProductLink(p);
    pdOverlay.classList.add("open");
    pdOverlay.setAttribute("aria-hidden", "false");
  }
  function closePdModal() {
    pdOverlay.classList.remove("open");
    pdOverlay.setAttribute("aria-hidden", "true");
  }
  $("#pdClose").addEventListener("click", closePdModal);
  pdOverlay.addEventListener("click", function (e) { if (e.target === pdOverlay) closePdModal(); });
  $("#pdAddBtn").addEventListener("click", function () { if (pdCurrentId) addToCart(pdCurrentId, pdQty); });
  $("#pdQtyDec").addEventListener("click", function () { setPdQty(pdQty - 1); });
  $("#pdQtyInc").addEventListener("click", function () { setPdQty(pdQty + 1); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !lbOverlay.classList.contains("open")) closePdModal();
  });

  /* ---------- wishlist ---------- */
  var wishCountEl = $("#wishCount");
  var wishDrawer = $("#wishDrawer");
  var wishItemsEl = $("#wishItems");
  function updateWishCount() { if (wishCountEl) wishCountEl.textContent = wishlist.length; }
  function renderWishlist() {
    if (!wishItemsEl) return;
    wishDrawer.classList.toggle("empty", wishlist.length === 0);
    wishItemsEl.innerHTML = wishlist.map(function (id) {
      var p = byId[id]; if (!p) return "";
      return '' +
        '<div class="cart-item">' +
          '<div class="cart-item-media">' + productMedia(p) + '</div>' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + p.name + '</span>' +
            '<span class="cart-item-price">' + money(p.price) + '</span>' +
            '<div class="cart-item-controls">' +
              '<button class="qty-btn wish-add-btn" data-add="' + id + '">הוסף לעגלה</button>' +
              '<button class="cart-item-remove" data-wish="' + id + '">הסר</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join("");
  }
  function toggleWish(id, btn) {
    var i = wishlist.indexOf(id);
    if (i > -1) { wishlist.splice(i, 1); if (btn) { btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false"); } }
    else { wishlist.push(id); if (btn) { btn.classList.add("on"); btn.setAttribute("aria-pressed", "true"); } toast((byId[id] ? byId[id].line || "המוצר" : "המוצר") + " נוסף למועדפים ❤"); }
    save(WISH_KEY, wishlist);
    updateWishCount();
    renderWishlist();
  }
  var wishlistBtn = $("#wishlistBtn");
  if (wishlistBtn) wishlistBtn.addEventListener("click", function () { renderWishlist(); openWish(); });

  /* ---------- drawer open/close ---------- */
  function openCart() { closeWish(); cartDrawer.classList.add("open"); drawerOverlay.classList.add("open"); cartDrawer.setAttribute("aria-hidden", "false"); }
  function closeCart() { cartDrawer.classList.remove("open"); drawerOverlay.classList.remove("open"); cartDrawer.setAttribute("aria-hidden", "true"); }
  function openWish() { closeCart(); wishDrawer.classList.add("open"); drawerOverlay.classList.add("open"); wishDrawer.setAttribute("aria-hidden", "false"); }
  function closeWish() { wishDrawer.classList.remove("open"); if (!cartDrawer.classList.contains("open")) drawerOverlay.classList.remove("open"); wishDrawer.setAttribute("aria-hidden", "true"); }
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#wishClose").addEventListener("click", closeWish);
  $("#wishEmptyShop").addEventListener("click", function () { closeWish(); location.hash = "#products"; });
  drawerOverlay.addEventListener("click", function () { closeCart(); closeWish(); });
  $("#cartEmptyShop").addEventListener("click", function () { closeCart(); location.hash = "#products"; });

  $("#checkoutBtn").addEventListener("click", function () {
    if (cartCount() === 0) return;
    location.href = "checkout.html";
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
    note.textContent = "תודה שהצטרפת! נעדכן אותך בעדכונים ומבצעים רשמיים 💜";
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
        return '<div class="exit-cart-line"><span class="em">' + productMedia(p) + '</span>' +
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
    if (e.key === "Escape") { hideExitPopup(); closeCart(); closeWish(); closeMobileNav(); }
  });

  /* ---------- lead delivery (static-site friendly) ----------
     A visitor who leaves items in the cart and submits the exit form
     (after agreeing to the two required consent checkboxes) triggers,
     with zero backend needed:
       1) local save, always
       2) an email to Judith (Web3Forms) — if WEB3FORMS_KEY is set
       3) an automatic email to the CUSTOMER (EmailJS) — if EmailJS
          keys are set — "we saved your cart" with a link back
       4) a POST to an automation webhook (Zapier/Make/n8n) — if set —
          so a connected WhatsApp Business API can send her an
          automatic WhatsApp too (true automatic WhatsApp send needs
          that paid/approved business line; it cannot be done from
          plain browser JS)
       5) always: a one-click WhatsApp handoff link so Judith can
          follow up personally even with nothing else configured.
     All of these are optional and configured centrally in js/config.js. */

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
    if (!CFG.WEB3FORMS_KEY) return; // not configured — WhatsApp handoff still covers delivery
    try {
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: CFG.WEB3FORMS_KEY,
          subject: "ליד עגלה נטושה – יהודית גולד",
          from_name: "אתר יהודית גולד",
          "שם": lead.name, "אימייל": lead.email, "טלפון": lead.phone,
          "עגלה": cartSummaryText(), "הסכמה": "אושרה"
        })
      }).catch(function () {});
    } catch (e) {}
  }
  function emailCustomerAutomatically(lead) {
    // Requires EmailJS keys in js/config.js + the EmailJS SDK script tag.
    // Only fires when the customer gave marketing consent (checkbox 2).
    if (!lead.consentGiven) return;
    if (!CFG.EMAILJS_PUBLIC_KEY || !CFG.EMAILJS_SERVICE_ID || !CFG.EMAILJS_TEMPLATE_ID_ABANDONED_CART) return;
    if (typeof emailjs === "undefined") return;
    try {
      emailjs.init(CFG.EMAILJS_PUBLIC_KEY);
      emailjs.send(CFG.EMAILJS_SERVICE_ID, CFG.EMAILJS_TEMPLATE_ID_ABANDONED_CART, {
        to_name: lead.name, to_email: lead.email,
        cart_summary: lead.cartText, shop_url: location.origin + "/index.html#products"
      }).catch(function () {});
    } catch (e) {}
  }
  function notifyAutomationWebhook(lead) {
    // Optional hand-off to Zapier/Make/n8n so a connected WhatsApp
    // Business API can message the customer automatically. No-op
    // until WHATSAPP_AUTOMATION_WEBHOOK is filled in js/config.js.
    if (!CFG.WHATSAPP_AUTOMATION_WEBHOOK) return;
    try {
      fetch(CFG.WHATSAPP_AUTOMATION_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      }).catch(function () {});
    } catch (e) {}
  }
  function leadWhatsappUrl(lead) {
    var msg = "היי יהודית! מילאתי פרטים באתר וארצה ייעוץ אישי.\n" +
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
    emailCustomerAutomatically(lead);
    notifyAutomationWebhook(lead);

    var waBtn = $("#exitWaBtn");
    if (waBtn) waBtn.href = leadWhatsappUrl(lead);
    $("#exitForm").style.display = "none";
    var prev = $("#exitCartPreview"); if (prev) prev.style.display = "none";
    var dismiss = $("#exitDismiss"); if (dismiss) dismiss.style.display = "none";
    $("#exitSuccess").hidden = false;
  });

  /* ---------- mobile nav ---------- */
  var navToggle = $("#navToggle");
  var mainNav = $("#mainNav");
  var navOverlay = $("#navOverlay");
  function closeMobileNav() {
    mainNav.classList.remove("open");
    navOverlay.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    closeNavDropdowns();
  }
  navToggle.addEventListener("click", function () {
    var open = mainNav.classList.toggle("open");
    navOverlay.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navOverlay.addEventListener("click", closeMobileNav);
  mainNav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMobileNav);
  });

  /* ---------- nav dropdowns (תכשירים / טיפולים קוסמטיים) ---------- */
  var navItems = document.querySelectorAll(".nav-item");
  function closeNavDropdowns() {
    navItems.forEach(function (item) {
      item.classList.remove("open");
      var top = item.querySelector(".nav-top");
      if (top) top.setAttribute("aria-expanded", "false");
    });
  }
  navItems.forEach(function (item) {
    var top = item.querySelector(".nav-top");
    top.addEventListener("click", function () {
      var willOpen = !item.classList.contains("open");
      closeNavDropdowns();
      if (willOpen) { item.classList.add("open"); top.setAttribute("aria-expanded", "true"); }
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-item")) closeNavDropdowns();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNavDropdowns();
  });

  /* ---------- init ---------- */
  var bbMedia = $("#lineBodyBuddyMedia");
  if (bbMedia) bbMedia.innerHTML = productSVG("pump");
  renderCart();
  updateWishCount();
})();
