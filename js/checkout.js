/* ============================================================
   Judith Gold — Checkout page logic
   Reads the cart from localStorage (shared with the store page),
   renders the order summary, validates the customer's details,
   and captures the order. No payment gateway is connected yet
   (see js/config.js) — until one is, submitting the order saves
   it locally, notifies Judith, and hands the customer a one-click
   WhatsApp link so the sale isn't lost while she completes payment
   with Judith directly. Swap in a real gateway later by filling
   js/config.js and wiring it inside submitOrder() below.
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.JG_CONFIG || {};
  var PRODUCTS = window.JG_PRODUCTS || [];
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  var CART_KEY = "jg_cart_v1";
  var ORDERS_KEY = "jg_orders_v1";
  var DISCOUNT_KEY = "jg_discount_v1";
  var FREE_SHIP = CFG.FREE_SHIPPING_FROM || 199;
  var SHIP_FEE = CFG.SHIPPING_FEE != null ? CFG.SHIPPING_FEE : 25;

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

  function cartLines() {
    return Object.keys(cart).map(function (id) {
      var p = byId[id];
      return p ? { id: id, name: p.name, price: p.price, qty: cart[id], line: p.price * cart[id] } : null;
    }).filter(Boolean);
  }
  function subtotal() {
    return cartLines().reduce(function (s, l) { return s + l.line; }, 0);
  }
  // Free-shipping threshold and the discount % both read the same
  // pre-discount subtotal, so the site never looks inconsistent
  // between the cart drawer (js/app.js) and this page.
  function discountAmount() {
    var d = load(DISCOUNT_KEY, null);
    var s = subtotal();
    if (!d || !d.percent || s <= 0) return 0;
    return Math.round(s * d.percent / 100);
  }
  function shippingCost() {
    var s = subtotal();
    return s === 0 || s >= FREE_SHIP ? 0 : SHIP_FEE;
  }
  function orderTotal() {
    return subtotal() - discountAmount() + shippingCost();
  }

  /* ---------- render order summary ---------- */
  function renderSummary() {
    var lines = cartLines();
    if (!lines.length) {
      $("#checkoutEmpty").classList.add("show");
      $("#checkoutGrid").style.display = "none";
      return;
    }
    var wrap = $("#orderItems");
    wrap.innerHTML = lines.map(function (l) {
      return '<div class="order-item">' +
             '<span class="oi-name">' + l.name + ' <span class="oi-qty">×' + l.qty + '</span></span>' +
             '<span class="oi-price">' + money(l.line) + '</span></div>';
    }).join("");
    $("#orderSubtotal").textContent = money(subtotal());
    var disc = discountAmount();
    var discLine = $("#orderDiscountLine");
    if (discLine) {
      discLine.classList.toggle("show", disc > 0);
      if (disc > 0) $("#orderDiscountAmt").textContent = "-" + money(disc);
    }
    var ship = shippingCost();
    $("#orderShipping").textContent = ship === 0 ? "חינם" : money(ship);
    $("#orderTotal").textContent = money(orderTotal());
  }
  renderSummary();

  /* ---------- order id ---------- */
  function newOrderId() {
    return "JG-" + Date.now().toString(36).toUpperCase();
  }

  function orderSummaryText(order) {
    return order.items.map(function (l) { return l.name + " ×" + l.qty; }).join(" | ") +
           (order.discount > 0 ? " · הנחת דיוור: -" + money(order.discount) : "") +
           " · משלוח: " + (order.shipping === 0 ? "חינם" : money(order.shipping)) +
           " · סה\"כ " + money(order.total);
  }

  function orderWhatsappUrl(order) {
    var msg = "היי יהודית! שלחתי הזמנה חדשה מהאתר ומעוניין/ת להשלים תשלום.\n" +
              "מספר הזמנה: " + order.id + "\n" +
              "שם: " + order.customer.name + "\nטלפון: " + order.customer.phone + "\nאימייל: " + order.customer.email +
              "\nכתובת: " + order.customer.city + ", " + order.customer.street +
              (order.customer.apt ? " (" + order.customer.apt + ")" : "") +
              "\nהזמנה: " + orderSummaryText(order);
    return "https://wa.me/972547444478?text=" + encodeURIComponent(msg);
  }

  function notifyOwner(order) {
    if (!CFG.WEB3FORMS_KEY) return;
    try {
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: CFG.WEB3FORMS_KEY,
          subject: "הזמנה חדשה מהאתר – " + order.id,
          from_name: "אתר יהודית גולד",
          "מספר הזמנה": order.id, "שם": order.customer.name, "טלפון": order.customer.phone,
          "אימייל": order.customer.email, "כתובת": order.customer.city + ", " + order.customer.street,
          "הזמנה": orderSummaryText(order), "הערות": order.customer.notes || "-"
        })
      }).catch(function () {});
    } catch (e) {}
  }

  function emailCustomerConfirmation(order) {
    if (!CFG.EMAILJS_PUBLIC_KEY || !CFG.EMAILJS_SERVICE_ID || !CFG.EMAILJS_TEMPLATE_ID_ORDER_CONFIRM) return;
    if (typeof emailjs === "undefined") return;
    try {
      emailjs.init(CFG.EMAILJS_PUBLIC_KEY);
      emailjs.send(CFG.EMAILJS_SERVICE_ID, CFG.EMAILJS_TEMPLATE_ID_ORDER_CONFIRM, {
        to_name: order.customer.name, to_email: order.customer.email,
        order_id: order.id, order_summary: orderSummaryText(order)
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- payment gateway hook ----------
     No provider is connected yet (see js/config.js → PAYMENT_PROVIDER).
     When one is, branch here: e.g. redirect to the gateway's hosted
     payment page with `order`, or mount its hosted-fields widget into
     #paymentGatewayMount. Until then we fall back to the WhatsApp/email
     hand-off below so no sale is lost while the gateway is pending. */
  function submitToPaymentGateway(order) {
    return false; // no provider configured — caller falls back to manual hand-off
  }

  /* ---------- submit ---------- */
  var form = $("#checkoutForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = $("#coNote");
      note.textContent = "";

      var name = $("#coName").value.trim();
      var phone = $("#coPhone").value.trim();
      var email = $("#coEmail").value.trim();
      var city = $("#coCity").value.trim();
      var street = $("#coStreet").value.trim();
      var apt = $("#coApt").value.trim();
      var zip = $("#coZip").value.trim();
      var notes = $("#coNotes").value.trim();
      var consent = $("#coConsent").checked;

      if (name.length < 2) { note.textContent = "אנא מלאו שם מלא"; return; }
      if (!isPhone(phone)) { note.textContent = "אנא הזינו מספר טלפון תקין"; return; }
      if (!isEmail(email)) { note.textContent = "אנא הזינו כתובת אימייל תקינה"; return; }
      if (!city) { note.textContent = "אנא הזינו עיר"; return; }
      if (!street) { note.textContent = "אנא הזינו רחוב ומספר בית"; return; }
      if (!consent) { note.textContent = "יש לאשר את התקנון ומדיניות הפרטיות כדי להמשיך"; return; }
      if (!cartLines().length) { note.textContent = "העגלה ריקה"; return; }

      var order = {
        id: newOrderId(),
        items: cartLines(),
        subtotal: subtotal(),
        discount: discountAmount(),
        shipping: shippingCost(),
        total: orderTotal(),
        customer: { name: name, phone: phone, email: email, city: city, street: street, apt: apt, zip: zip, notes: notes },
        consentGiven: true,
        status: "pending_payment",
        at: Date.now()
      };

      var orders = load(ORDERS_KEY, []);
      orders.push(order);
      save(ORDERS_KEY, orders);

      var wentToGateway = submitToPaymentGateway(order);
      if (wentToGateway) return; // gateway takes over navigation

      notifyOwner(order);
      emailCustomerConfirmation(order);

      // clear the cart and redeem the one-time discount grant, if used
      save(CART_KEY, {});
      if (order.discount > 0) localStorage.removeItem(DISCOUNT_KEY);

      $("#checkoutGrid").style.display = "none";
      $("#coSuccessOrderNo").textContent = "מספר הזמנה: " + order.id;
      var waUrl = orderWhatsappUrl(order);
      $("#coSuccessWa").href = waUrl;
      $("#checkoutSuccess").classList.add("show");
      // Open WhatsApp with the full order pre-filled right away — this is
      // still inside the click handler for the "שליחת ההזמנה" button, so
      // it's a direct result of her tap and isn't blocked as a popup.
      // The button below stays as a fallback in case a browser blocks it
      // anyway (e.g. Safari's stricter popup rules).
      window.open(waUrl, "_blank", "noopener");
    });
  }
})();
