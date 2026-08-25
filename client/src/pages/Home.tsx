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
  Code2,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  LayoutTemplate,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
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
  header: { rightLines: string[]; leftLines: string[]; logoImage?: { data: string } | null };
  footer: { signatures: Array<{ role: string; name: string }>; showPageNum: boolean };
  pages: Array<{ id: string; elements: DocumentElement[] }>;
};

type TemplateKey = "official" | "education" | "record";
type Issue = { path: string; message: string; severity: "error" | "warning" };

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
  education: { name: "تعليمي منظم", description: "تباين لطيف ومناسب للخطط والنماذج التعليمية.", ink: "#215C55", paper: "#EEF4EF" },
  record: { name: "سجل بيانات", description: "معالجة كثيفة للجداول والتقارير ذات التفاصيل المتكررة.", ink: "#563C35", paper: "#F6EFEA" },
};

const inputSchema = z
  .object({
    meta: z
      .object({ title: z.string().optional(), size: z.string().optional(), orientation: z.string().optional(), template: z.string().optional() })
      .optional(),
    header: z
      .object({ rightLines: z.array(z.string()).optional(), leftLines: z.array(z.string()).optional(), logoImage: z.unknown().optional() })
      .optional(),
    footer: z
      .object({ signatures: z.array(z.object({ role: z.string().optional(), name: z.string().optional() })).optional(), showPageNum: z.boolean().optional() })
      .optional(),
    pages: z
      .array(z.object({ id: z.string().min(1), elements: z.array(z.object({ id: z.string().min(1), type: z.string().min(1) }).passthrough()) }))
      .min(1),
  })
  .passthrough();

function createDemoSchema(): DocumentSchema {
  return {
    meta: { title: "سجل متابعة الأداء — الفصل الدراسي الأول", size: "A4", orientation: "portrait", template: "official" },
    header: {
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
    },
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
  return {
    ok: true,
    issues,
    value: {
      meta: { title: input.meta?.title?.trim() || "مستند غير معنون", size, orientation, template },
      header: { rightLines: input.header?.rightLines || [], leftLines: input.header?.leftLines || [], logoImage: typeof headerInput?.data === "string" ? { data: headerInput.data } : null },
      footer: { signatures: (input.footer?.signatures || []).map((signature) => ({ role: signature.role || "", name: signature.name || "" })), showPageNum: input.footer?.showPageNum !== false },
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
      <article ref={sheetRef} className={`document-sheet template-${document.meta.template}`} style={{ "--sheet-w": `${width}mm`, "--sheet-h": `${height}mm`, "--ink": template.ink, "--paper": template.paper } as React.CSSProperties}>
        <header className="document-header">
          <div className="header-lines header-lines--right">{document.header.rightLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</div>
          <div className="document-seal">{document.header.logoImage?.data ? <img src={document.header.logoImage.data} alt="شعار المستند" /> : <img src={LOGO_URL} alt="علامة محرك المستندات" />}</div>
          <div className="header-lines header-lines--left">{document.header.leftLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</div>
        </header>
        <main className="document-content">{page.elements.map((element) => <DocumentElementView key={element.id} element={element} />)}</main>
        <footer className="document-footer">
          {document.footer.signatures.length > 0 && <div className="footer-signatures">{document.footer.signatures.map((signature, signatureIndex) => <div key={signatureIndex}><strong>{signature.role}</strong><span>{signature.name || "الاسم والتوقيع"}</span></div>)}</div>}
          {document.footer.showPageNum && <span className="page-number">صفحة {index + 1} من {total}</span>}
        </footer>
      </article>
    </div>
  );
}

export default function Home() {
  const [document, setDocument] = useState<DocumentSchema>(initialDocument);
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initialDocument, null, 2));
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

  const loadExample = () => {
    syncDocument(createDemoSchema());
    setActivePanel("schema");
    setToast("تم تحميل بنية نموذجية قابلة للتعديل.");
  };

  const updateMeta = <K extends keyof DocumentSchema["meta"]>(key: K, value: DocumentSchema["meta"][K]) => {
    syncDocument({ ...document, meta: { ...document.meta, [key]: value } });
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
    const empty: DocumentSchema = { ...createDemoSchema(), meta: { title: "مستند جديد", size: "A4", orientation: "portrait", template: "official" }, header: { rightLines: [], leftLines: [], logoImage: null }, footer: { signatures: [], showPageNum: true }, pages: [{ id: "p1", elements: [] }] };
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
        <div className="rail-note"><span className="note-rule" /><p><strong>JSON أولًا</strong>تتحول البيانات المنظمة إلى صفحة قابلة للطباعة دون نسخ يدوي.</p></div>
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
            <div className="source-bridge__body"><Code2 size={23} /><div><b>مصدر المستند</b><p>JSON هو مرجع المحتوى الوحيد. عدّل المصدر ثم طبّقه على المعاينة.</p></div><button onClick={() => setActivePanel("schema")}>فتح المصدر <ChevronLeft size={15} /></button></div>
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
          <section className="section-block">
            <div className="section-title"><div><span className="section-index">02</span><h2>قالب الإخراج</h2></div><LayoutTemplate size={18} /></div>
            <div className="template-list">{(Object.entries(templates) as [TemplateKey, typeof templates[TemplateKey]][]).map(([key, template]) => <button key={key} className={`template-choice ${document.meta.template === key ? "selected" : ""}`} onClick={() => updateMeta("template", key)}><span className="template-swatch" style={{ background: template.ink }} /><span><b>{template.name}</b><small>{template.description}</small></span><ChevronLeft size={16} /></button>)}</div>
          </section>
          <section className="section-block source-summary">
            <div className="source-summary__top"><div><span className="section-index">03</span><h2>خريطة المحتوى</h2></div><span className="status-dot">بنية نشطة</span></div>
            {document.pages.map((page, pageIndex) => <button className="page-outline" onClick={() => pageRefs.current[pageIndex]?.scrollIntoView({ behavior: "smooth", block: "center" })} key={page.id}><span>ص {pageIndex + 1}</span><div><b>{page.elements.length} عناصر</b><small>{page.elements.slice(0, 2).map(compactText).join(" — ") || "صفحة فارغة"}</small></div></button>)}
          </section>
        </div>}

        {activePanel === "schema" && <div className="panel-stack schema-panel">
          <section className="schema-intro" style={{ backgroundImage: `linear-gradient(90deg, rgba(38,62,85,.96), rgba(38,62,85,.72)), url(${STRUCTURE_URL})` }}><span className="hero-tag hero-tag--dark"><Code2 size={14} /> طبقة المصدر</span><h2>الصق JSON كما هو.</h2><p>تُزال علامات Markdown تلقائيًا، ويجري التحقق من الصفحات والعناصر والجداول قبل لمس المعاينة الحالية.</p></section>
          <div className="schema-toolbar"><span className={analysis.ok ? "analysis-ok" : "analysis-error"}>{analysis.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{analysis.ok ? "البنية قابلة للتطبيق" : "تحتاج البنية إلى تصحيح"}</span><button onClick={loadExample}><FilePlus2 size={15} /> نموذج جاهز</button></div>
          <textarea className="json-editor" dir="ltr" spellCheck={false} value={rawJson} onChange={(event) => setRawJson(event.target.value)} aria-label="محرر JSON" />
          <div className="diagnostic-list">{analysis.issues.length ? analysis.issues.slice(0, 8).map((issue, index) => <div className={`diagnostic ${issue.severity}`} key={`${issue.path}-${index}`}><span>{issue.severity === "error" ? <AlertTriangle size={15} /> : <AlertTriangle size={15} />}</span><div><b>{issue.path}</b><p>{issue.message}</p></div></div>) : <div className="diagnostic success"><CheckCircle2 size={16} /><div><b>فحص بنيوي مكتمل</b><p>المعرّفات فريدة، والعناصر المدعومة قابلة للعرض والطباعة.</p></div></div>}</div>
          <Button className="apply-json" onClick={applyJson}><ClipboardPaste size={17} /> تطبيق البنية في المعاينة</Button>
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
