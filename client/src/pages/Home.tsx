/**
 * Design philosophy — استديو التحرير المعماري:
 * Arabic-first Swiss editorial workspace; structured data flows left-to-right from source to print-ready pages.
 * Ivory paper, charcoal ink, and copper actions make validation and document hierarchy immediately legible.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronLeft,
  ClipboardPaste,
  Copy,
  Code2,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  ImagePlus,
  LayoutTemplate,
  Minus,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Type,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const assetUrl = (filename: string) => `${import.meta.env.BASE_URL}assets/${filename}`;
const LOGO_URL = assetUrl("document-studio-logo.png");
const HERO_URL = assetUrl("editorial-canvas-hero.jpg");
const STRUCTURE_URL = assetUrl("json-structure-art.jpg");
const CALIBRATION_URL = assetUrl("print-calibration-art.jpg");
const STORAGE_KEY = "studio-document-engine-v3";
const VERSIONS_KEY = "studio-document-engine-versions-v3";

const PAPER_SIZES = {
  A4: { label: "A4", portrait: [210, 297], landscape: [297, 210] },
  A3: { label: "A3", portrait: [297, 420], landscape: [420, 297] },
  Letter: { label: "Letter", portrait: [215.9, 279.4], landscape: [279.4, 215.9] },
  Legal: { label: "Legal", portrait: [215.9, 355.6], landscape: [355.6, 215.9] },
} as const;

type PaperSize = keyof typeof PAPER_SIZES;
type ElementKind =
  | "title"
  | "heading"
  | "paragraph"
  | "list"
  | "infoGrid"
  | "box"
  | "divider"
  | "signature"
  | "table"
  | "figure";

type DocumentElement = {
  id: string;
  type: ElementKind;
  text?: string;
  title?: string;
  items?: string[] | [string, string][];
  src?: string;
  cols?: number;
  widths?: number[];
  noHeader?: boolean;
  cells?: Array<{
    r: number;
    c: number;
    text: string;
    rowSpan?: number;
    colSpan?: number;
    align?: "c" | "r" | "l";
    v?: boolean;
  }>;
};

type DocumentSchema = {
  meta: { title: string; size: PaperSize; orientation: "portrait" | "landscape"; template: TemplateKey };
  header: { mode: "text" | "image"; imageData?: string | null; rightLines: string[]; leftLines: string[]; logoImage?: { data: string } | null };
  footer: { signatures: Array<{ role: string; name: string }>; showPageNum: boolean; showSignatureLine: boolean };
  styles: { bodyFont: string; bodySize: number; headingFont: string; headingColor: string; headingSize: number };
  pages: Array<{ id: string; elements: DocumentElement[] }>;
};

type TemplateKey = "official" | "royal" | "emerald" | "burgundy" | "platinum" | "sand" | "education" | "record";
type Issue = { path: string; message: string; severity: "error" | "warning" };

const ARABIC_FONTS = ["Cairo", "IBM Plex Sans Arabic", "Tajawal", "Almarai", "Noto Naskh Arabic", "Amiri", "Readex Pro", "Changa", "Mada", "Harmattan", "Scheherazade New"];

const elementLabels: Record<ElementKind, string> = {
  title: "عنوان رئيسي",
  heading: "عنوان قسم",
  paragraph: "فقرة",
  list: "قائمة",
  infoGrid: "بيانات موجزة",
  box: "صندوق معلومات",
  divider: "فاصل",
  signature: "توقيعات",
  table: "جدول",
  figure: "صورة",
};

const templates: Record<TemplateKey, { name: string; description: string; ink: string; paper: string }> = {
  official: { name: "رسمي دقيق", description: "هيكل واضح للمراسلات والسجلات الإدارية.", ink: "#263E55", paper: "#F4F0E9" },
  royal: { name: "كحلي ملكي", description: "كحلي عميق ولمسة ذهبية هادئة للمراسلات الرفيعة.", ink: "#173A5E", paper: "#F4F0E4" },
  emerald: { name: "زمردي رسمي", description: "أخضر رصين مناسب للمنشآت التعليمية والمؤسسية.", ink: "#17614F", paper: "#EDF4EF" },
  burgundy: { name: "عنابي فاخر", description: "عنابي متزن بمظهر إداري أنيق وتقليدي.", ink: "#6C2940", paper: "#F7EEF0" },
  platinum: { name: "بلاتيني إداري", description: "حبر فحمي رمادي مع ورق بارد لتقارير البيانات.", ink: "#3E4C5A", paper: "#F0F2F3" },
  sand: { name: "رملي نبيل", description: "بني هادئ وورق عاجي للمذكرات والخطط الرسمية.", ink: "#654936", paper: "#F8F1E5" },
  education: { name: "تعليمي منظم", description: "تباين لطيف ومناسب للخطط والنماذج التعليمية.", ink: "#215C55", paper: "#EEF4EF" },
  record: { name: "سجل بيانات", description: "معالجة كثيفة للجداول والتقارير ذات التفاصيل المتكررة.", ink: "#563C35", paper: "#F6EFEA" },
};

const AI_ANALYSIS_PROMPT = `أنت محلل مستندات عربي شديد الدقة. سأرسل لك ملفًا أو صور صفحات مستند. حلله صفحةً صفحةً ثم أعد «JSON واحدًا فقط» صالحًا للنسخ المباشر إلى محرك تصميم المستندات.

قواعد صارمة لا يجوز مخالفتها:
1) لا تكتب أي شرح أو مقدمة أو خاتمة أو Markdown أو \`\`\`json. أخرج كائن JSON فقط.
2) افحص كل صفحة بصريًا قبل كتابة النتيجة. لا تخمّن نصًا غير واضح؛ استخدم "[غير واضح]" عند الضرورة.
3) احتفظ بتسلسل القراءة العربي وبكل الفقرات والعناوين والقوائم والبيانات دون تلخيص أو دمج.
4) استخرج عنوان المستند الرسمي في meta.title؛ هذا الاسم سيظهر في نافذة الطباعة.
5) ضع الترويسة الثابتة المتكررة في header: rightLines لجهة المملكة/الوزارة/الإدارة، وleftLines لاسم المستند واسم الجهة/المدرسة. لا تنشئ شعارًا أو صورة أو بيانات لم تظهر في الملف.
6) ضع تذييل المسؤولين في footer.signatures. كل عنصر هو {"role":"المسمى الوظيفي","name":"الاسم"}. فعّل showSignatureLine فقط إن كانت هناك مساحة أو طلب للتوقيع.
7) أنشئ كائن pages، ولكل صفحة id فريد وعناصرها بالترتيب المرئي. الأنواع المسموحة فقط: title, heading, paragraph, list, infoGrid, box, divider, signature, table, figure.
8) للجداول: اكتب كل الخلايا بما فيها الفارغة. استخدم r وc بدءًا من 1، وrowSpan وcolSpan للخلايا المدمجة، وcols لعدد الأعمدة. لا تحوّل الجدول إلى نص أو قائمة.
9) استخدم figure فقط إذا زودتك برابط صورة صالح. لا تضع data URL للصورة داخل JSON.
10) تأكد أن JSON صالح تمامًا: اقتباسات مزدوجة، لا تعليقات، لا فواصل زائدة، معرفات فريدة، وصفحة واحدة لكل صفحة مصدر.

استخدم هذا القالب حرفيًا ثم املأ القيم:
{
  "meta": { "title": "العنوان الرسمي", "size": "A4", "orientation": "portrait", "template": "official" },
  "header": { "mode": "text", "rightLines": ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة بمنطقة ..."], "leftLines": ["اسم الملف", "اسم المدرسة"], "logoImage": null },
  "footer": { "signatures": [{ "role": "المسمى الوظيفي", "name": "الاسم" }], "showPageNum": true, "showSignatureLine": true },
  "styles": { "bodyFont": "Cairo", "bodySize": 14, "headingFont": "Cairo", "headingColor": "#263E55", "headingSize": 18 },
  "pages": [{ "id": "p1", "elements": [] }]
}`;

const inputSchema = z
  .object({
    meta: z
      .object({ title: z.string().optional(), size: z.string().optional(), orientation: z.string().optional(), template: z.string().optional() })
      .optional(),
    header: z
      .object({ mode: z.string().optional(), type: z.string().optional(), imageData: z.string().nullable().optional(), headerImage: z.unknown().optional(), rightLines: z.array(z.string()).optional(), leftLines: z.array(z.string()).optional(), logoImage: z.unknown().optional() })
      .optional(),
    footer: z
      .object({ signatures: z.array(z.object({ role: z.string().optional(), name: z.string().optional() })).optional(), showPageNum: z.boolean().optional(), showSignatureLine: z.boolean().optional() })
      .optional(),
    styles: z
      .object({ bodyFont: z.string().optional(), bodySize: z.number().optional(), headingFont: z.string().optional(), headingColor: z.string().optional(), headingSize: z.number().optional() })
      .optional(),
    pages: z
      .array(z.object({ id: z.string().min(1), elements: z.array(z.object({ id: z.string().min(1), type: z.string().min(1) }).passthrough()) }))
      .min(1),
  })
  .passthrough();

type HtmlConversion = { elements: DocumentElement[]; issues: string[] };

const HTML_SAMPLE = `<h1>عنوان المستند</h1>
<p>اكتب هنا النص الذي تريد طباعته داخل المستند.</p>
<h2>بيانات أساسية</h2>
<ul><li>النقطة الأولى</li><li>النقطة الثانية</li></ul>
<table><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody><tr><td>العام</td><td>1447هـ</td></tr></tbody></table>`;

function htmlId(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
}

function nodeText(node: Element) {
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function convertHtmlTable(table: HTMLTableElement): DocumentElement | null {
  const cells: NonNullable<DocumentElement["cells"]> = [];
  let maxCols = 0;
  let hasHeader = false;
  Array.from(table.rows).forEach((row, rowIndex) => {
    let column = 1;
    Array.from(row.cells).forEach((cell) => {
      while (cells.some((item) => item.r <= rowIndex + 1 && item.r + (item.rowSpan || 1) > rowIndex + 1 && item.c <= column && item.c + (item.colSpan || 1) > column)) column += 1;
      const colSpan = Math.max(1, cell.colSpan || 1);
      const rowSpan = Math.max(1, cell.rowSpan || 1);
      cells.push({ r: rowIndex + 1, c: column, text: nodeText(cell), rowSpan, colSpan, align: "c", v: false });
      column += colSpan;
      maxCols = Math.max(maxCols, column - 1);
      if (cell.tagName.toLowerCase() === "th") hasHeader = true;
    });
  });
  return cells.length && maxCols ? { id: htmlId("table"), type: "table", cols: maxCols, noHeader: !hasHeader, cells } : null;
}

function convertHtmlToElements(html: string): HtmlConversion {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const issues: string[] = [];
  parsed.querySelectorAll("script, style, iframe, object, embed, link, meta, form, input, button, svg").forEach((node) => node.remove());

  const convertNode = (node: Element): DocumentElement[] => {
    const tag = node.tagName.toLowerCase();
    const text = nodeText(node);
    if (!text && tag !== "img" && tag !== "hr" && tag !== "table") return [];
    if (tag === "h1") return [{ id: htmlId("title"), type: "title", text }];
    if (["h2", "h3", "h4", "h5", "h6"].includes(tag)) return [{ id: htmlId("heading"), type: "heading", text }];
    if (["p", "pre"].includes(tag)) return [{ id: htmlId("paragraph"), type: "paragraph", text }];
    if (["ul", "ol"].includes(tag)) {
      const items = Array.from(node.querySelectorAll(":scope > li")).map((item) => nodeText(item)).filter(Boolean);
      return items.length ? [{ id: htmlId("list"), type: "list", items }] : [];
    }
    if (tag === "hr") return [{ id: htmlId("divider"), type: "divider" }];
    if (tag === "blockquote") return [{ id: htmlId("box"), type: "box", title: "ملاحظة", text }];
    if (tag === "table") {
      const converted = convertHtmlTable(node as HTMLTableElement);
      return converted ? [converted] : [];
    }
    if (tag === "img") {
      const src = (node.getAttribute("src") || "").trim();
      if (/^(https?:\/\/|data:image\/)/i.test(src)) return [{ id: htmlId("figure"), type: "figure", src }];
      issues.push("تم تجاهل صورة بمسار غير آمن أو غير صالح.");
      return [];
    }
    if (["article", "section", "main", "div", "figure"].includes(tag)) {
      const children = Array.from(node.children).flatMap(convertNode);
      return children.length ? children : text ? [{ id: htmlId("paragraph"), type: "paragraph", text }] : [];
    }
    if (tag === "br") return [];
    issues.push(`تم تبسيط الوسم <${tag}> إلى نص قابل للطباعة.`);
    return [{ id: htmlId("paragraph"), type: "paragraph", text }];
  };

  return { elements: Array.from(parsed.body.children).flatMap(convertNode), issues };
}

function createDemoSchema(): DocumentSchema {
  return {
    meta: { title: "سجل متابعة الأداء — الفصل الدراسي الأول", size: "A4", orientation: "portrait", template: "official" },
    header: {
      mode: "text",
      imageData: null,
      rightLines: ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم"],
      leftLines: ["سجل متابعة الأداء", "مدرسة النور الابتدائية"],
      logoImage: null,
    },
    footer: {
      signatures: [
        { role: "وكيل الشؤون التعليمية", name: "" },
        { role: "قائد المدرسة", name: "" },
      ],
      showPageNum: true,
      showSignatureLine: true,
    },
    styles: { bodyFont: "Cairo", bodySize: 14, headingFont: "Cairo", headingColor: "#263E55", headingSize: 18 },
    pages: [
      {
        id: "p1",
        elements: [
          { id: "title-1", type: "title", text: "سجل متابعة أداء الطلاب" },
          {
            id: "info-1",
            type: "infoGrid",
            items: [
              ["الصف", "الثالث الابتدائي"],
              ["الفصل", "الأول"],
              ["العام الدراسي", "1447هـ"],
              ["المعلم", "أ. أحمد الحربي"],
            ],
          },
          { id: "heading-1", type: "heading", text: "بيانات المتابعة الأسبوعية" },
          {
            id: "table-1",
            type: "table",
            cols: 4,
            widths: [11, 34, 29, 26],
            cells: [
              { r: 1, c: 1, text: "م" },
              { r: 1, c: 2, text: "اسم الطالب" },
              { r: 1, c: 3, text: "التقييم" },
              { r: 1, c: 4, text: "ملاحظات" },
              { r: 2, c: 1, text: "1" },
              { r: 2, c: 2, text: "خالد سعد العتيبي", align: "r" },
              { r: 2, c: 3, text: "ممتاز" },
              { r: 2, c: 4, text: "—" },
              { r: 3, c: 1, text: "2" },
              { r: 3, c: 2, text: "فهد ناصر القحطاني", align: "r" },
              { r: 3, c: 3, text: "جيد جدًا" },
              { r: 3, c: 4, text: "يحتاج متابعة في القراءة" },
            ],
          },
          { id: "heading-2", type: "heading", text: "توصيات التنفيذ" },
          { id: "list-1", type: "list", items: ["تعزيز مهارات القراءة لدى الطلاب المتأخرين.", "إشراك ولي الأمر في خطة التحسين.", "مراجعة مؤشرات الأداء نهاية كل أسبوع."] },
        ],
      },
    ],
  };
}

function cleanJson(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:json|JSON)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

function asText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function validateAndNormalize(raw: string): { ok: true; value: DocumentSchema; issues: Issue[] } | { ok: false; issues: Issue[] } {
  let source: unknown;
  try {
    source = JSON.parse(cleanJson(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^Unexpected token/, "رمز غير متوقع") : "تعذر قراءة JSON";
    return { ok: false, issues: [{ path: "JSON", message, severity: "error" }] };
  }

  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.slice(0, 8).map((issue) => ({ path: issue.path.join(".") || "root", message: issue.message, severity: "error" })),
    };
  }

  const input = parsed.data;
  const issues: Issue[] = [];
  const pageIds = new Set<string>();
  const elementIds = new Set<string>();
  const allowed = new Set<ElementKind>(["title", "heading", "paragraph", "list", "infoGrid", "box", "divider", "signature", "table", "figure"]);
  const size: PaperSize = input.meta?.size && input.meta.size in PAPER_SIZES ? (input.meta.size as PaperSize) : "A4";
  const orientation = input.meta?.orientation === "landscape" ? "landscape" : "portrait";
  const template: TemplateKey = input.meta?.template && input.meta.template in templates ? (input.meta.template as TemplateKey) : "official";

  const pages = input.pages.map((page, pageIndex) => {
    if (pageIds.has(page.id)) issues.push({ path: `pages[${pageIndex}].id`, message: `المعرّف «${page.id}» مكرر.`, severity: "error" });
    pageIds.add(page.id);

    const elements = page.elements.map((rawElement, elementIndex) => {
      const path = `pages[${pageIndex}].elements[${elementIndex}]`;
      if (elementIds.has(rawElement.id)) issues.push({ path: `${path}.id`, message: `المعرّف «${rawElement.id}» مكرر.`, severity: "error" });
      elementIds.add(rawElement.id);
      const type = rawElement.type as ElementKind;
      if (!allowed.has(type)) {
        issues.push({ path: `${path}.type`, message: `النوع «${rawElement.type}» غير مدعوم.`, severity: "error" });
        return { id: rawElement.id, type: "paragraph" as const, text: "" };
      }

      const node = rawElement as Record<string, unknown>;
      if (["title", "heading", "paragraph"].includes(type)) return { id: rawElement.id, type, text: asText(node.text) } as DocumentElement;
      if (type === "divider") return { id: rawElement.id, type };
      if (type === "figure") {
        const src = asText(node.src);
        if (!src) issues.push({ path: `${path}.src`, message: "الصورة تحتاج رابط src صالحًا.", severity: "error" });
        return { id: rawElement.id, type, src };
      }
      if (type === "box") return { id: rawElement.id, type, title: asText(node.title), text: asText(node.text) };
      if (type === "list") {
        const items = Array.isArray(node.items) ? node.items.map(asText).filter(Boolean) : [];
        if (!items.length) issues.push({ path: `${path}.items`, message: "القائمة تحتاج عنصرًا واحدًا على الأقل.", severity: "error" });
        return { id: rawElement.id, type, items };
      }
      if (type === "infoGrid" || type === "signature") {
        const rawItems = Array.isArray(node.items) ? node.items : [];
        const items = rawItems.map((item) => (Array.isArray(item) ? [asText(item[0]), asText(item[1])] : ["", ""])) as [string, string][];
        if (!items.length) issues.push({ path: `${path}.items`, message: `${elementLabels[type]} يحتاج عنصرًا واحدًا على الأقل.`, severity: "error" });
        return { id: rawElement.id, type, items };
      }

      const cols = Number(node.cols);
      if (!Number.isInteger(cols) || cols < 1 || cols > 12) issues.push({ path: `${path}.cols`, message: "عدد أعمدة الجدول يجب أن يكون من 1 إلى 12.", severity: "error" });
      const validCols = Number.isInteger(cols) && cols >= 1 && cols <= 12 ? cols : 1;
      const rawCells = Array.isArray(node.cells) ? node.cells : [];
      const cells = rawCells.map((cell, cellIndex) => {
        const c = (cell || {}) as Record<string, unknown>;
        const r = Number(c.r);
        const col = Number(c.c);
        const rowSpan = Math.max(1, Number(c.rowSpan) || 1);
        const colSpan = Math.max(1, Number(c.colSpan) || 1);
        if (!Number.isInteger(r) || !Number.isInteger(col) || r < 1 || col < 1 || col > validCols) {
          issues.push({ path: `${path}.cells[${cellIndex}]`, message: "إحداثيات خلية الجدول غير صالحة.", severity: "error" });
        }
        const align: "c" | "r" | "l" = c.align === "r" || c.align === "l" ? c.align : "c";
        return { r, c: col, text: asText(c.text), rowSpan, colSpan, align, v: Boolean(c.v) };
      });
      if (!cells.length) issues.push({ path: `${path}.cells`, message: "الجدول يحتاج خلية واحدة على الأقل.", severity: "error" });
      const widths = Array.isArray(node.widths) && node.widths.length === validCols ? node.widths.map(Number) : Array.from({ length: validCols }, () => 100 / validCols);
      if (widths.some((width) => !Number.isFinite(width) || width <= 0)) issues.push({ path: `${path}.widths`, message: "عروض أعمدة الجدول يجب أن تكون أرقامًا موجبة.", severity: "error" });
      return { id: rawElement.id, type, cols: validCols, widths, noHeader: Boolean(node.noHeader), cells };
    });
    return { id: page.id, elements };
  });

  if (issues.some((issue) => issue.severity === "error")) return { ok: false, issues };
  const headerInput = input.header?.logoImage as { data?: unknown } | undefined;
  const legacyHeaderImage = input.header?.headerImage as { data?: unknown } | undefined;
  const imageData = input.header?.imageData || (typeof legacyHeaderImage?.data === "string" ? legacyHeaderImage.data : null);
  const headerMode = input.header?.mode === "image" || input.header?.type === "image" ? "image" : "text";
  const styleInput = input.styles || {};
  return {
    ok: true,
    issues,
    value: {
      meta: { title: input.meta?.title?.trim() || "مستند غير معنون", size, orientation, template },
      header: { mode: headerMode, imageData, rightLines: input.header?.rightLines || [], leftLines: input.header?.leftLines || [], logoImage: typeof headerInput?.data === "string" ? { data: headerInput.data } : null },
      footer: { signatures: (input.footer?.signatures || []).map((signature) => ({ role: signature.role || "", name: signature.name || "" })), showPageNum: input.footer?.showPageNum !== false, showSignatureLine: input.footer?.showSignatureLine !== false },
      styles: { bodyFont: ARABIC_FONTS.includes(styleInput.bodyFont || "") ? styleInput.bodyFont || "Cairo" : "Cairo", bodySize: Math.min(18, Math.max(10, styleInput.bodySize || 14)), headingFont: ARABIC_FONTS.includes(styleInput.headingFont || "") ? styleInput.headingFont || "Cairo" : "Cairo", headingColor: /^#[0-9a-fA-F]{6}$/.test(styleInput.headingColor || "") ? styleInput.headingColor || "#263E55" : "#263E55", headingSize: Math.min(30, Math.max(13, styleInput.headingSize || 18)) },
      pages,
    },
  };
}

function getStoredDocument(): DocumentSchema | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const result = validateAndNormalize(stored);
    return result.ok ? result.value : null;
  } catch {
    return null;
  }
}

function getVersions() {
  try {
    const saved = localStorage.getItem(VERSIONS_KEY);
    return saved ? (JSON.parse(saved) as Array<{ id: string; at: string; title: string; schema: DocumentSchema }>) : [];
  } catch {
    return [];
  }
}

const initialDocument = getStoredDocument() || createDemoSchema();

function compactText(element: DocumentElement) {
  if (element.type === "table") return `جدول • ${element.cols || 0} أعمدة`;
  if (element.type === "list") return (element.items as string[] | undefined)?.slice(0, 2).join("، ") || "قائمة";
  return (element.text || element.title || "عنصر")?.slice(0, 58);
}

function DocumentTable({ element }: { element: DocumentElement }) {
  const cols = element.cols || 1;
  const cells = element.cells || [];
  const maxRow = Math.max(1, ...cells.map((cell) => cell.r + (cell.rowSpan || 1) - 1));
  const lookup = new Map(cells.map((cell) => [`${cell.r}:${cell.c}`, cell]));
  const covered = new Set<string>();
  const rows = Array.from({ length: maxRow }, (_, rowIndex) => {
    const row = rowIndex + 1;
    return Array.from({ length: cols }, (_, colIndex) => {
      const col = colIndex + 1;
      const key = `${row}:${col}`;
      if (covered.has(key)) return null;
      const cell = lookup.get(key);
      if (!cell) return null;
      for (let dr = 0; dr < (cell.rowSpan || 1); dr += 1) for (let dc = 0; dc < (cell.colSpan || 1); dc += 1) covered.add(`${row + dr}:${col + dc}`);
      const isHeader = row === 1 && !element.noHeader;
      const CellTag = isHeader ? "th" : "td";
      return <CellTag key={key} rowSpan={cell.rowSpan || 1} colSpan={cell.colSpan || 1} className={`cell-${cell.align || "c"} ${cell.v ? "vertical-cell" : ""}`}>{cell.text}</CellTag>;
    });
  });
  return (
    <div className="table-wrap">
      <table className="document-table">
        <colgroup>{(element.widths || Array.from({ length: cols }, () => 100 / cols)).map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
        <tbody>{rows.map((row, index) => <tr key={index}>{row}</tr>)}</tbody>
      </table>
    </div>
  );
}

function DocumentElementView({ element }: { element: DocumentElement }) {
  switch (element.type) {
    case "title": return <h1 className="doc-title">{element.text}</h1>;
    case "heading": return <h2 className="doc-heading">{element.text}</h2>;
    case "paragraph": return <p className="doc-paragraph">{element.text}</p>;
    case "list": return <ul className="doc-list">{((element.items || []) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>;
    case "infoGrid": return <div className="info-grid">{((element.items || []) as [string, string][]).map(([label, value], index) => <div className="info-grid__item" key={index}><b>{label}</b><span>{value}</span></div>)}</div>;
    case "box": return <section className="document-box"><strong>{element.title}</strong><p>{element.text}</p></section>;
    case "divider": return <hr className="document-divider" />;
    case "signature": return <div className="signatures">{((element.items || []) as [string, string][]).map(([role, name], index) => <div className="signature" key={index}><strong>{role}</strong><span>{name || "الاسم والتوقيع"}</span></div>)}</div>;
    case "table": return <DocumentTable element={element} />;
    case "figure": return element.src ? <figure className="doc-figure"><img src={element.src} alt="عنصر توضيحي في المستند" /></figure> : null;
    default: return null;
  }
}

function DocumentSheet({ document, page, index, total, zoom, sheetRef }: { document: DocumentSchema; page: DocumentSchema["pages"][number]; index: number; total: number; zoom: number; sheetRef?: (node: HTMLDivElement | null) => void }) {
  const [width, height] = PAPER_SIZES[document.meta.size][document.meta.orientation];
  const template = templates[document.meta.template];
  return (
    <div className="sheet-scale" style={{ "--zoom": zoom } as React.CSSProperties}>
      <article ref={sheetRef} className={`document-sheet template-${document.meta.template}`} style={{ "--sheet-w": `${width}mm`, "--sheet-h": `${height}mm`, "--ink": template.ink, "--paper": template.paper, "--body-font": document.styles.bodyFont, "--body-size": `${document.styles.bodySize}px`, "--heading-font": document.styles.headingFont, "--heading-color": document.styles.headingColor, "--heading-size": `${document.styles.headingSize}px` } as React.CSSProperties}>
        {document.header.mode === "image" && document.header.imageData ? (
          <header className="document-header document-header--image"><img src={document.header.imageData} alt="ترويسة المستند" /></header>
        ) : (
          <header className="document-header">
            <div className="header-lines header-lines--right">{document.header.rightLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</div>
            <div className="document-seal">{document.header.logoImage?.data ? <img src={document.header.logoImage.data} alt="شعار المستند" /> : <img src={LOGO_URL} alt="علامة محرك المستندات" />}</div>
            <div className="header-lines header-lines--left">{document.header.leftLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</div>
          </header>
        )}
        <main className="document-content">{page.elements.map((element) => <DocumentElementView key={element.id} element={element} />)}</main>
        <footer className="document-footer">
          {document.footer.signatures.length > 0 && <div className={`footer-signatures ${document.footer.showSignatureLine ? "footer-signatures--line" : ""}`}>{document.footer.signatures.map((signature, signatureIndex) => <div key={signatureIndex}><strong>{signature.role}</strong><span>{signature.name || "الاسم"}</span>{document.footer.showSignatureLine && <i>التوقيع</i>}</div>)}</div>}
          {document.footer.showPageNum && <span className="page-number">صفحة {index + 1} من {total}</span>}
        </footer>
      </article>
    </div>
  );
}

export default function Home() {
  const [document, setDocument] = useState<DocumentSchema>(initialDocument);
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initialDocument, null, 2));
  const [rawHtml, setRawHtml] = useState(HTML_SAMPLE);
  const [sourceMode, setSourceMode] = useState<"json" | "html">("json");
  const [htmlIssues, setHtmlIssues] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.68);
  const [activePanel, setActivePanel] = useState<"studio" | "schema" | "versions">("studio");
  const [versions, setVersions] = useState(getVersions);
  const [toast, setToast] = useState<string | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const analysis = useMemo(() => validateAndNormalize(rawJson), [rawJson]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(document)); } catch { /* quota is non-blocking */ }
  }, [document]);

  useEffect(() => {
    window.document.title = document.meta.title || "محرك تصميم المستندات";
  }, [document.meta.title]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const syncDocument = (next: DocumentSchema) => {
    setDocument(next);
    setRawJson(JSON.stringify(next, null, 2));
  };

  const applyJson = () => {
    if (!analysis.ok) {
      setToast("لا يمكن تطبيق البنية قبل معالجة الأخطاء الظاهرة.");
      return;
    }
    syncDocument(analysis.value);
    setToast("تم تطبيق البنية بنجاح، والمعاينة محدثة الآن.");
  };

  const applyHtml = () => {
    if (!rawHtml.trim()) {
      setToast("الصق HTML داخل المحرر أولًا.");
      return;
    }
    const converted = convertHtmlToElements(rawHtml);
    setHtmlIssues(converted.issues);
    if (!converted.elements.length) {
      setToast("لم نجد عناصر HTML قابلة للتحويل. استخدم عناوين أو فقرات أو قوائم أو جداول.");
      return;
    }
    const next: DocumentSchema = { ...document, pages: [{ id: "html-page-1", elements: converted.elements }] };
    syncDocument(next);
    setToast(`تم تحويل HTML إلى ${converted.elements.length} عنصرًا منظمًا داخل المعاينة.`);
  };

  const loadExample = () => {
    syncDocument(createDemoSchema());
    setActivePanel("schema");
    setToast("تم تحميل بنية نموذجية قابلة للتعديل.");
  };

  const updateMeta = <K extends keyof DocumentSchema["meta"]>(key: K, value: DocumentSchema["meta"][K]) => {
    syncDocument({ ...document, meta: { ...document.meta, [key]: value } });
  };

  const updateStyles = <K extends keyof DocumentSchema["styles"]>(key: K, value: DocumentSchema["styles"][K]) => {
    syncDocument({ ...document, styles: { ...document.styles, [key]: value } });
  };

  const updateHeader = (patch: Partial<DocumentSchema["header"]>) => syncDocument({ ...document, header: { ...document.header, ...patch } });

  const updateFooter = (patch: Partial<DocumentSchema["footer"]>) => syncDocument({ ...document, footer: { ...document.footer, ...patch } });

  const updateSignature = (index: number, key: "role" | "name", value: string) => {
    const signatures = [...document.footer.signatures];
    while (signatures.length <= index) signatures.push({ role: "", name: "" });
    signatures[index] = { ...signatures[index], [key]: value };
    updateFooter({ signatures });
  };

  const readImage = (file: File, kind: "header" | "logo") => {
    if (!file.type.startsWith("image/")) { setToast("اختر ملف صورة صالحًا فقط."); return; }
    if (file.size > 6 * 1024 * 1024) { setToast("حجم الصورة كبير؛ استخدم صورة أقل من 6 ميغابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      if (!data) return;
      if (kind === "header") updateHeader({ mode: "image", imageData: data });
      else updateHeader({ logoImage: { data } });
      setToast(kind === "header" ? "تمت إضافة ترويسة الصورة وإخفاء النصوص في المعاينة." : "تم إدراج الشعار في وسط الترويسة النصية.");
    };
    reader.readAsDataURL(file);
  };

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(AI_ANALYSIS_PROMPT); setToast("تم نسخ البرومبت الصارم. أرسله مع الملف إلى أداة الذكاء الخارجية."); }
    catch { setToast("تعذر النسخ التلقائي؛ انسخ النص يدويًا من مربع البرومبت."); }
  };

  const downloadSchema = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safeName = document.meta.title.replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document-schema";
    const link = Object.assign(window.document.createElement("a"), { href: url, download: `${safeName}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveVersion = () => {
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), title: document.meta.title, schema: document }, ...versions].slice(0, 10);
    setVersions(next);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(next));
    setToast("حُفظت لقطة استعادة محلية للمستند.");
  };

  const restoreVersion = (schema: DocumentSchema) => {
    syncDocument(schema);
    setActivePanel("studio");
    setToast("تمت استعادة الإصدار المختار دون حذف اللقطات الأخرى.");
  };

  const clearWorkspace = () => {
    const empty: DocumentSchema = { ...createDemoSchema(), meta: { title: "مستند جديد", size: "A4", orientation: "portrait", template: "official" }, header: { mode: "text", imageData: null, rightLines: [], leftLines: [], logoImage: null }, footer: { signatures: [], showPageNum: true, showSignatureLine: true }, styles: { bodyFont: "Cairo", bodySize: 14, headingFont: "Cairo", headingColor: "#263E55", headingSize: 18 }, pages: [{ id: "p1", elements: [] }] };
    syncDocument(empty);
    setToast("تم إنشاء مساحة مستند نظيفة.");
  };

  return (
    <div className="studio-app" dir="rtl">
      <style>{`@page { size: ${document.meta.size} ${document.meta.orientation}; margin: 0; }`}</style>
      <aside className="studio-rail">
        <div className="brand-lockup"><img src={LOGO_URL} alt="علامة محرك المستندات" /><div><span>محرّك</span><strong>المستندات</strong></div></div>
        <nav className="rail-nav" aria-label="تنقل مساحة العمل">
          <button className={activePanel === "studio" ? "active" : ""} onClick={() => setActivePanel("studio")}><LayoutTemplate /><span>الاستديو</span></button>
          <button className={activePanel === "schema" ? "active" : ""} onClick={() => setActivePanel("schema")}><Code2 /><span>بنية JSON</span></button>
          <button className={activePanel === "versions" ? "active" : ""} onClick={() => setActivePanel("versions")}><RotateCcw /><span>الإصدارات</span></button>
        </nav>
        <div className="rail-note"><span className="note-rule" /><p><strong>مصدر محكوم</strong>JSON للتصميم الدقيق، وHTML للمحتوى النصي القابل للتحويل والطباعة.</p></div>
      </aside>

      <section className="control-column">
        <header className="control-header">
          <div className="heading-row"><div><span className="eyebrow">استديو التحرير</span><h1>صمّم من <em>البنية</em>، لا من الفوضى.</h1><p>ألصق المخرجات التي أنشأها قالبك الذكي، تحقّق منها، ثم عاين وثيقة جاهزة للطباعة.</p></div><img className="header-mark" src={LOGO_URL} alt="علامة محرك المستندات" /></div>
          <div className="workflow-strip" aria-label="مسار المستند"><span className="workflow-step done"><i>01</i> المصدر</span><span className={analysis.ok ? "workflow-step done" : "workflow-step attention"}><i>02</i> التدقيق</span><span className="workflow-step current"><i>03</i> المعاينة</span></div>
          <div className={`operational-status ${analysis.ok ? "valid" : "needs-attention"}`}>{analysis.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{analysis.ok ? "البنية صالحة؛ راجع المعاينة قبل التصدير." : "البنية غير مكتملة؛ افتح المصدر وصحّح التشخيص."}</div>
        </header>

        {activePanel === "studio" && <div className="panel-stack">
          <section className="studio-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(244,240,233,.96) 0%, rgba(244,240,233,.86) 48%, rgba(244,240,233,.08) 100%), url(${HERO_URL})` }}>
            <span className="hero-tag"><Sparkles size={14} /> مسار عمل محكوم</span><strong>من JSON إلى صفحة مرتبة.</strong><p>الحالة الحالية: <b>{document.pages.length} {document.pages.length === 1 ? "صفحة" : "صفحات"}</b> و{document.pages.reduce((count, page) => count + page.elements.length, 0)} عنصرًا منظّمًا.</p>
          </section>
          <section className="source-bridge">
            <div className="source-bridge__heading"><span className="section-index">SOURCE / JSON</span><span className={analysis.ok ? "source-health healthy" : "source-health warning"}>{analysis.ok ? "مُدقّق" : "يتطلب تدقيقًا"}</span></div>
            <div className="source-bridge__body"><Code2 size={23} /><div><b>مصدر المستند</b><p>استخدم JSON للتصميم المتكامل، أو HTML لتحويل المحتوى النصي إلى عناصر مرتبة.</p></div><button onClick={() => setActivePanel("schema")}>فتح المصدر <ChevronLeft size={15} /></button></div>
            <code>{`{ "pages": ${document.pages.length}, "elements": ${document.pages.reduce((count, page) => count + page.elements.length, 0)} }`}</code>
          </section>
          <section className="section-block">
            <div className="section-title"><div><span className="section-index">01</span><h2>إعداد الصفحة</h2></div><Settings2 size={18} /></div>
            <label className="field-label">عنوان الوثيقة<input value={document.meta.title} onChange={(event) => updateMeta("title", event.target.value)} /></label>
            <div className="control-grid">
              <label className="field-label">مقاس الورق<select value={document.meta.size} onChange={(event) => updateMeta("size", event.target.value as PaperSize)}>{Object.keys(PAPER_SIZES).map((size) => <option key={size}>{size}</option>)}</select></label>
              <label className="field-label">الاتجاه<select value={document.meta.orientation} onChange={(event) => updateMeta("orientation", event.target.value as "portrait" | "landscape")}><option value="portrait">عمودي</option><option value="landscape">أفقي</option></select></label>
            </div>
          </section>
          <section className="section-block identity-section">
            <div className="section-title"><div><span className="section-index">02</span><h2>الترويسة وهوية الجهة</h2></div><ImagePlus size={18} /></div>
            <div className="mode-switch"><button className={document.header.mode === "text" ? "active" : ""} onClick={() => updateHeader({ mode: "text" })}>ترويسة نصية</button><button className={document.header.mode === "image" ? "active" : ""} onClick={() => updateHeader({ mode: "image" })}>ترويسة صورة كاملة</button></div>
            {document.header.mode === "image" ? <div className="upload-card"><span className="upload-card__mark"><ImagePlus size={19} /></span><div><b>صورة ترويسة مستطيلة</b><p>تعرض بارزة داخل مستطيل بحدود وزوايا أنيقة، وتلغي النص والشعار في الترويسة.</p></div><label className="upload-action"><Upload size={14} /> رفع الصورة<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readImage(file, "header"); }} /></label>{document.header.imageData && <button className="remove-upload" onClick={() => updateHeader({ mode: "text", imageData: null })}><X size={14} /> إزالة</button>}</div> : <>
              <label className="field-label">الجهة اليمنى — سطر لكل بند<textarea value={document.header.rightLines.join("\n")} onChange={(event) => updateHeader({ rightLines: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} placeholder={"المملكة العربية السعودية\nوزارة التعليم\nالإدارة العامة بمنطقة ..."} /></label>
              <label className="field-label">الجهة اليسرى — اسم الملف واسم المدرسة<textarea value={document.header.leftLines.join("\n")} onChange={(event) => updateHeader({ leftLines: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} placeholder={"اسم الملف\nاسم المدرسة"} /></label>
              <div className="upload-card upload-card--compact"><span className="upload-card__mark"><ImagePlus size={18} /></span><div><b>الشعار المركزي</b><p>صورة مربعة تظهر في المنتصف مع بقاء بيانات الجهتين.</p></div><label className="upload-action"><Upload size={14} /> رفع الشعار<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readImage(file, "logo"); }} /></label>{document.header.logoImage?.data && <button className="remove-upload" onClick={() => updateHeader({ logoImage: null })}><X size={14} /> إزالة</button>}</div>
            </>}
          </section>
          <section className="section-block footer-section">
            <div className="section-title"><div><span className="section-index">03</span><h2>شريط الذيل والتوقيع</h2></div><FileCheck2 size={18} /></div>
            <p className="section-note">تظهر الوظيفة والاسم في صف واحد متباعد داخل مستطيل علوي الحواف، ويظهر سطر التوقيع عند تفعيله.</p>
            <div className="signature-inputs">{[0, 1].map((index) => <div className="signature-editor" key={index}><label className="field-label">المسمى الوظيفي<input value={document.footer.signatures[index]?.role || ""} onChange={(event) => updateSignature(index, "role", event.target.value)} placeholder="مثال: قائد المدرسة" /></label><label className="field-label">الاسم<input value={document.footer.signatures[index]?.name || ""} onChange={(event) => updateSignature(index, "name", event.target.value)} placeholder="الاسم" /></label></div>)}</div>
            <div className="toggle-line"><label><input type="checkbox" checked={document.footer.showSignatureLine} onChange={(event) => updateFooter({ showSignatureLine: event.target.checked })} />إظهار سطر التوقيع</label><label><input type="checkbox" checked={document.footer.showPageNum} onChange={(event) => updateFooter({ showPageNum: event.target.checked })} />إظهار رقم الصفحة</label></div>
          </section>
          <section className="section-block typography-section">
            <div className="section-title"><div><span className="section-index">04</span><h2>الخطوط والعناوين</h2></div><Type size={18} /></div>
            <div className="control-grid"><label className="field-label">خط المتن<select value={document.styles.bodyFont} onChange={(event) => updateStyles("bodyFont", event.target.value)}>{ARABIC_FONTS.map((font) => <option value={font} key={font}>{font}</option>)}</select></label><label className="field-label">حجم المتن<input type="number" min="10" max="18" value={document.styles.bodySize} onChange={(event) => updateStyles("bodySize", Number(event.target.value))} /></label><label className="field-label">خط العناوين<select value={document.styles.headingFont} onChange={(event) => updateStyles("headingFont", event.target.value)}>{ARABIC_FONTS.map((font) => <option value={font} key={font}>{font}</option>)}</select></label><label className="field-label">حجم العناوين<input type="number" min="13" max="30" value={document.styles.headingSize} onChange={(event) => updateStyles("headingSize", Number(event.target.value))} /></label></div>
            <label className="field-label heading-color">لون العناوين<input type="color" value={document.styles.headingColor} onChange={(event) => updateStyles("headingColor", event.target.value)} /><span>{document.styles.headingColor}</span></label>
          </section>
          <section className="section-block">
            <div className="section-title"><div><span className="section-index">05</span><h2>قالب الإخراج</h2></div><Palette size={18} /></div>
            <div className="template-list">{(Object.entries(templates) as [TemplateKey, typeof templates[TemplateKey]][]).map(([key, template]) => <button key={key} className={`template-choice ${document.meta.template === key ? "selected" : ""}`} onClick={() => updateMeta("template", key)}><span className="template-swatch" style={{ background: template.ink }} /><span><b>{template.name}</b><small>{template.description}</small></span><ChevronLeft size={16} /></button>)}</div>
          </section>
          <section className="section-block source-summary">
            <div className="source-summary__top"><div><span className="section-index">06</span><h2>خريطة المحتوى</h2></div><span className="status-dot">بنية نشطة</span></div>
            {document.pages.map((page, pageIndex) => <button className="page-outline" onClick={() => pageRefs.current[pageIndex]?.scrollIntoView({ behavior: "smooth", block: "center" })} key={page.id}><span>ص {pageIndex + 1}</span><div><b>{page.elements.length} عناصر</b><small>{page.elements.slice(0, 2).map(compactText).join(" — ") || "صفحة فارغة"}</small></div></button>)}
          </section>
        </div>}

        {activePanel === "schema" && <div className="panel-stack schema-panel">
          <section className="schema-intro" style={{ backgroundImage: `linear-gradient(90deg, rgba(38,62,85,.96), rgba(38,62,85,.72)), url(${STRUCTURE_URL})` }}><span className="hero-tag hero-tag--dark"><Code2 size={14} /> طبقة المصدر</span><h2>الصق بنية أو محتوى.</h2><p>استخدم JSON للمستندات المنظمة، أو ألصق HTML نظيفًا لتحويله تلقائيًا إلى عناصر قابلة للطباعة دون تشغيل أي كود داخله.</p></section>
          <div className="source-mode-switch" role="tablist" aria-label="صيغة مصدر المحتوى"><button role="tab" aria-selected={sourceMode === "json"} className={sourceMode === "json" ? "active" : ""} onClick={() => setSourceMode("json")}><Code2 size={15} /> JSON منظّم</button><button role="tab" aria-selected={sourceMode === "html"} className={sourceMode === "html" ? "active" : ""} onClick={() => setSourceMode("html")}><FileText size={15} /> HTML محتوى</button></div>
          {sourceMode === "json" ? <>
            <section className="prompt-card"><div><span className="section-index">EXTERNAL AI / PROMPT</span><h3>برومبت صارم للتحليل صفحةً صفحةً</h3><p>انسخه ثم أرفقه بالملف داخل أداة الذكاء التي تختارها. ستعيد الأداة JSON فقط قابلًا للّصق.</p></div><button onClick={copyPrompt}><Copy size={15} /> نسخ البرومبت</button><textarea readOnly className="prompt-editor" dir="rtl" value={AI_ANALYSIS_PROMPT} aria-label="برومبت تحليل المستند الخارجي" /></section>
            <div className="schema-toolbar"><span className={analysis.ok ? "analysis-ok" : "analysis-error"}>{analysis.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{analysis.ok ? "البنية قابلة للتطبيق" : "تحتاج البنية إلى تصحيح"}</span><button onClick={loadExample}><FilePlus2 size={15} /> نموذج جاهز</button></div>
            <textarea className="json-editor" dir="ltr" spellCheck={false} value={rawJson} onChange={(event) => setRawJson(event.target.value)} aria-label="محرر JSON" />
            <div className="diagnostic-list">{analysis.issues.length ? analysis.issues.slice(0, 8).map((issue, index) => <div className={`diagnostic ${issue.severity}`} key={`${issue.path}-${index}`}><span><AlertTriangle size={15} /></span><div><b>{issue.path}</b><p>{issue.message}</p></div></div>) : <div className="diagnostic success"><CheckCircle2 size={16} /><div><b>فحص بنيوي مكتمل</b><p>المعرّفات فريدة، والعناصر المدعومة قابلة للعرض والطباعة.</p></div></div>}</div>
            <Button className="apply-json" onClick={applyJson}><ClipboardPaste size={17} /> تطبيق البنية في المعاينة</Button>
          </> : <>
            <section className="html-help"><span className="section-index">SAFE HTML / CONTENT</span><h3>الصق محتوى HTML فقط</h3><p>تُقبل العناوين والفقرات والقوائم والجداول والصور ذات روابط موثوقة. تُحذف تلقائيًا الوسوم البرمجية مثل script وstyle وiframe وأي نماذج أو أزرار.</p><code>&lt;h1&gt;عنوان&lt;/h1&gt; · &lt;p&gt;فقرة&lt;/p&gt; · &lt;ul&gt;...&lt;/ul&gt; · &lt;table&gt;...&lt;/table&gt;</code></section>
            <div className="schema-toolbar"><span className="analysis-ok"><CheckCircle2 size={16} />تحويل آمن إلى عناصر مستند</span><button onClick={() => setRawHtml(HTML_SAMPLE)}><FilePlus2 size={15} /> مثال HTML</button></div>
            <textarea className="json-editor html-editor" dir="rtl" spellCheck={false} value={rawHtml} onChange={(event) => setRawHtml(event.target.value)} aria-label="محرر HTML" />
            <div className="diagnostic-list">{htmlIssues.length ? htmlIssues.slice(0, 6).map((issue, index) => <div className="diagnostic warning" key={`${issue}-${index}`}><span><AlertTriangle size={15} /></span><div><b>HTML</b><p>{issue}</p></div></div>) : <div className="diagnostic success"><CheckCircle2 size={16} /><div><b>التحويل لا ينفّذ أكوادًا</b><p>ألصق المحتوى، ثم حوّله إلى عناصر منظمة داخل صفحة المستند.</p></div></div>}</div>
            <Button className="apply-json apply-html" onClick={applyHtml}><ClipboardPaste size={17} /> تحويل HTML إلى المعاينة</Button>
          </>}
        </div>}

        {activePanel === "versions" && <div className="panel-stack">
          <section className="schema-intro versions-art" style={{ backgroundImage: `linear-gradient(90deg, rgba(246,239,234,.97), rgba(246,239,234,.64)), url(${CALIBRATION_URL})` }}><span className="hero-tag"><RotateCcw size={14} /> نقاط استعادة</span><h2>العمل محفوظ محليًا.</h2><p>أنشئ لقطة قبل تجربة بنية جديدة، ثم استعد أي نسخة دون حذف النسخ الأخرى.</p></section>
          <Button className="save-version" onClick={saveVersion}><Save size={17} /> حفظ لقطة حالية</Button>
          <div className="version-list">{versions.length ? versions.map((version) => <article className="version-card" key={version.id}><span>نسخة محفوظة</span><h3>{version.title}</h3><p>{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.at))}</p><button onClick={() => restoreVersion(version.schema)}>استعادة هذه النسخة <ChevronLeft size={15} /></button></article>) : <div className="empty-state"><FileCheck2 size={24} /><p>لا توجد لقطات بعد. احفظ إصدارًا قبل تجربة تغيير كبير.</p></div>}</div>
        </div>}

        <footer className="control-actions"><Button variant="outline" onClick={clearWorkspace}><RotateCcw size={16} /> مستند نظيف</Button><Button variant="outline" onClick={downloadSchema}><Download size={16} /> تصدير JSON</Button></footer>
      </section>

      <main className="preview-column">
        <header className="preview-topbar"><div><span className="eyebrow">معاينة مباشرة</span><h2>{document.meta.title}</h2></div><div className="preview-tools"><span className="ready-state"><CheckCircle2 size={16} /> جاهز للطباعة</span><div className="zoom-control"><button onClick={() => setZoom((value) => Math.max(0.4, value - 0.08))} aria-label="تصغير"><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1, value + 0.08))} aria-label="تكبير"><Plus size={15} /></button></div><Button className="print-button" onClick={() => window.print()}><Printer size={16} /> طباعة / PDF</Button></div></header>
        <div className="preview-canvas"><div className="preview-measure"><span>المعاينة</span><i /><span>{document.meta.size} · {document.meta.orientation === "portrait" ? "عمودي" : "أفقي"}</span></div><div className="document-stack">{document.pages.length ? document.pages.map((page, index) => <DocumentSheet key={page.id} document={document} page={page} index={index} total={document.pages.length} zoom={zoom} sheetRef={(node) => { pageRefs.current[index] = node; }} />) : <div className="preview-empty"><FileText size={35} /><h3>صفحة بانتظار المحتوى</h3><p>انتقل إلى بنية JSON والصق وثيقتك المنظمة.</p></div>}</div></div>
      </main>
      {toast && <div className="studio-toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}
