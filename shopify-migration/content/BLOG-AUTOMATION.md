# Judith Gold blog: writing and publishing guidelines

A scheduled task reads this file before every post. One post per run, Sunday to Thursday, about 20 a month.

## Store and access
- Shopify store: judithgold.myshopify.com. Use the Composio Shopify connector, account `judithgold-v2`, tool `SHOPIFY_GRAPH_QL_QUERY`.
- Blog: `gid://shopify/Blog/100039000247` (handle `news`, title "בלוג טיפוח – יהודית גולד").
- Topics: `shopify-migration/content/blog-calendar.json` (branch `claude/session-r3gcce`).
- Article log: `shopify-migration/content/blog-log.md`.

## Steps for each run
1. Pick the first topic with `"status": "todo"` in `blog-calendar.json`.
2. Check against the store that no article with a similar handle or title exists:
   `{ articles(first:250){ nodes{ handle title } } }`.
   If one exists, mark the topic `skipped-duplicate` and take the next one.
3. Check the linked products are still live. Use the handles in `products`, plus up to two more products if they fit.
   Query: `{ productByHandle(handle:"...") { title onlineStoreUrl } }`.
   Never link to a product that doesn't exist.
4. Write the article in HTML (rules below).
5. Publish it:
   - Call `articleCreate` with blogId, title, handle (short Hebrew words joined by hyphens), body, summary, tags, `isPublished: true`, author `{name: "יהודית גולד"}`.
   - Add metafields `global.title_tag` (up to 60 characters, includes the keyword and "| יהודית גולד") and `global.description_tag` (140–155 characters, includes the keyword and a call to action).
6. Verify: fetch `https://judithgold.myshopify.com/blogs/news/<handle>` and confirm status 200, the title appears, and the page contains `"FAQPage"` and `"BlogPosting"`.
7. Update the repo:
   - In `blog-calendar.json`, set the topic's `status` to `published`, `handle`, and `date`.
   - Add a row to `blog-log.md`: date | title | link | keyword.
   - Commit and push to `claude/session-r3gcce`.
8. Search Console:
   - If the `google_search_console` connector is active, run `GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP` on `https://judithgold.myshopify.com/sitemap.xml` once a week (only on Sundays).
   - Optionally run `GOOGLE_SEARCH_CONSOLE_INSPECT_URL` on the new article.
9. When fewer than 10 `todo` topics remain:
   - Add 30 new topics to the end of the calendar, following the same pattern: one Hebrew search intent per topic, a relevant service page and product handles.
   - Don't add topics that overlap existing ones.

## Writing rules (natural Hebrew, addressed to women readers, in Judith's voice)
- Length: 900–1,400 words.
- Open with a paragraph that starts with `<p><strong>תשובה קצרה:</strong> …</p>`: 2–3 sentences that answer the question directly. This is the GEO/AEO answer.
- Body:
  - 3–5 `<h2>` sections, `<h3>` where needed, short paragraphs, lists.
  - The keyword appears in the first paragraph, in one `<h2>`, and naturally in the text, never forced.
- Internal links (required):
  - At least 3 products as `<a href="/products/<handle>">name</a>`.
  - The service page `<a href="/pages/<service>">`.
  - The relevant category, or `/collections/all`.
  - One earlier article if a relevant one exists.
- Local touch: mention Judith Gold's clinic at Vardia Center in Haifa where it is relevant, without overdoing it.
- Ending:
  - A WhatsApp call to action: `<p><a href="https://wa.me/972547444478?text=...">ייעוץ אישי עם יהודית בוואטסאפ ←</a></p>`.
  - Then `<h2>שאלות ותשובות</h2>` with 4 `<details><summary>question</summary><p>short direct answer</p></details>` blocks. The theme generates the FAQPage schema from them automatically.
- Accuracy and safety:
  - No medical promises such as "cures" or "eliminates for good". Use "helps", "contributes to the appearance of".
  - No made-up statistics or studies, no prices, no fake reviews or ratings.
  - Pregnancy, medications, skin conditions: recommend consulting a doctor.
  - Describe products only by what is written on their product page in the store.
- Tags: 2–4 relevant Hebrew tags (for example "אנטי אייג'ינג", "ד״ר קליין", "טיפוח בחורף").
- Summary (`summary`): 1–2 sentences.

## Cover image (recommended)
Create a branded cover image in the Composio workbench:
- Size 1600×900, background `#faf7fb`, title in Assistant 800 color `#211a26`, small label in gold `#8c6825`, Judith Gold logo from `https://raw.githubusercontent.com/natigold1985/natigold1985/claude/session-r3gcce/assets/img/logo.png`.
- Render with Playwright, upload with `stagedUploadsCreate`, then `articleUpdate` with `image:{url, altText}`.
- Don't create images that look like real product photos or a real person.
