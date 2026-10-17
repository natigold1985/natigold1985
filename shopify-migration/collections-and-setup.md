# הקמת קולקציות והגדרות — העתק/הדבק

## 13 קולקציות (Products → Collections → Create collection → Automated)
לכל קולקציה: Conditions → "Product tag" "is equal to" → התג. (המוצרים כבר מתויגים ב-CSV, אז הם ייכנסו לבד.)

| שם הקולקציה | תג |
|---|---|
| סדרת בקוצ'יול DEEP | סדרת DEEP |
| Hyaluronic Wine | Hyaluronic Wine |
| סדרת ה-Body Buddy | Body Buddy |
| סדרת ה-Super Food | Super Food |
| סדרת סוד היין Segreto del Vino | Segreto del Vino |
| סדרת PERFECTION | PERFECTION |
| אנטי אייג'ינג | אנטי אייג'ינג |
| סרומים | סרומים |
| לחות והזנה | לחות והזנה |
| הבהרה | הבהרה |
| עיניים וצוואר | עיניים וצוואר |
| ניקוי טיפולי | ניקוי טיפולי |
| הגנה מהשמש | הגנה מהשמש |

## הגדרות (Settings)
- General: Store currency = ILS (₪); Time zone = Jerusalem; Store name = יהודית גולד
- Languages: Hebrew (default)
- Shipping and delivery: משלוח חינם מעל 199 ₪ (Add rate → Free, "Minimum order price" 199), תעריף רגיל 25 ₪ מתחת, Local pickup: ורדיה סנטר חיפה
- Checkout → Abandoned checkout emails: Automatically send, 4 hours  (זה מחליף את כל ה-webhook)
- Discounts → Create → Discount code `WELCOME10`, 10% על כל המוצרים, 1 שימוש ללקוחה
- Payments: Shopify Payments לא זמין בישראל — לחבר PayPal / Tranzila / PayPlus / Meshulam
