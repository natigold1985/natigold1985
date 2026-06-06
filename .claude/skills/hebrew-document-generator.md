# Hebrew Document Generator Skill

A specialized skill for generating, formatting, and localizing documents in Hebrew, following Israeli typographic standards, legal conventions, and RTL layout requirements.

## Triggers

Use this skill when the user asks to:
- Generate any formal or informal document in Hebrew
- Write contracts, agreements, or legal documents in Hebrew
- Create business letters, proposals, or reports in Hebrew
- Produce invoices, receipts, or financial documents in Hebrew
- Format documents according to Israeli standards (dates, currency, addresses)
- Convert or localize existing English documents into Hebrew
- Generate government or regulatory forms content in Hebrew
- Create HR documents (job offers, employment contracts, policies) in Hebrew
- Write academic or educational documents in Hebrew
- Produce marketing collateral (brochures, presentations, white papers) in Hebrew

## Behavior

When this skill is active, Claude will:

### Document Structure & Formatting
- Write all content right-to-left (RTL) as required for Hebrew documents
- Place the document header and logo reference at the top right (RTL convention)
- Structure sections with Hebrew headings using correct Hebrew punctuation (גרשיים for abbreviations, מקף for ranges)
- Use Hebrew numerals or Western numerals per document type convention (legal: spelled out; financial: Western digits)
- Apply proper Hebrew paragraph spacing and indentation conventions

### Date & Time Formatting
- Default to Israeli date format: DD/MM/YYYY (e.g., 06/06/2026)
- Include Hebrew calendar date when relevant for legal or religious documents (e.g., י״ז סיוון תשפ״ו)
- Use 24-hour time format standard in Israel

### Currency & Numbers
- Use New Israeli Shekel (₪ / ש״ח) as the default currency
- Format numbers with a period as thousands separator and comma as decimal (per Israeli convention): e.g., 1.000,50 ש״ח
- Spell out currency amounts in full when required (legal documents)

### Address & Contact Formatting
- Format Israeli addresses: Street + Number, City, Postal Code
- Include Israeli phone format: 05X-XXXXXXX (mobile), 0X-XXXXXXX (landline)
- Reference Israeli postal codes (5-digit format)

### Legal & Compliance Language
- Apply standard Israeli legal boilerplate where appropriate (governed by Israeli law, jurisdiction in [city] courts)
- Include mandatory disclosures for financial, employment, or consumer-facing documents as required by Israeli law
- Use correct legal Hebrew terminology rather than literal translations from English
- Flag when content may require review by a licensed Israeli attorney (עורך דין)

### Language Quality
- Write in formal (רשמי) or semi-formal Hebrew as appropriate for the document type
- Avoid modern slang in formal documents; use it only in informal/marketing contexts
- Ensure grammatical gender agreement throughout (masculine/feminine per subject)
- Use correct construct state (סמיכות) and definite article (ה) consistently
- Apply nikud (vowel marks) only when explicitly requested or for educational materials

### Document Types & Templates

**Business Documents**
- הצעת מחיר (Price Quote / Proposal)
- חשבונית עסקה (Tax Invoice)
- חוזה שירות (Service Agreement)
- מכתב עסקי (Business Letter)
- תזכיר הבנות (MOU / Letter of Intent)

**HR & Employment**
- הסכם העסקה (Employment Contract)
- מכתב הצעת עבודה (Offer Letter)
- נוהל חברה (Company Policy)
- טופס הערכת עובד (Performance Review Form)

**Marketing & Sales**
- מצגת מכירות (Sales Presentation outline)
- חוברת מוצר (Product Brochure)
- ניירת לבנה (White Paper)
- ניוזלטר (Newsletter)

**Financial & Regulatory**
- דוח רווח והפסד (P&L Report)
- תקציב שנתי (Annual Budget)
- תשקיף (Prospectus — with ISA disclaimer)
- דוח ריבועית (Quarterly VAT Report reference)

## Output Format

- Deliver the full document text in Hebrew, ready to paste into Word / Google Docs
- Include a plain-text structure with clear section markers (e.g., **סעיף 1:**)
- On request, provide an English summary or bilingual (Hebrew/English) version
- Flag any fields requiring customization with [פרט כאן] placeholders
- Note any legal or compliance considerations that require professional review

## Example Prompts This Skill Handles

- "צור חוזה שירות בעברית בין חברת פרסום לבין לקוח עצמאי"
- "כתוב מכתב עסקי רשמי בעברית ללקוח שמאחר בתשלום"
- "תייצר תבנית הסכם העסקה בעברית לעובד במשרה מלאה"
- "Generate a Hebrew invoice template for a freelance consultant"
- "Convert this English NDA into a Hebrew legal document"
- "כתוב הצעת מחיר בעברית לפרויקט בניית אתר"
- "צור ניוזלטר חודשי בעברית לחברת פינטק"
