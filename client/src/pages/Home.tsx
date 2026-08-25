/**
 * تصميم رِواق: الحداثة الطباعية العربية. مساحة العمل حول الصفحة لا فوقها؛
 * زمرد رصين، عناصر قليلة الحواف، واستجابة فورية بين JSON والمعاينة.
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpenCheck,
  Braces,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  FileJson2,
  FileText,
  ImagePlus,
  LayoutTemplate,
  Palette,
  PanelRightOpen,
  Plus,
  Printer,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stamp,
  Type,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";

type ContentBlock = {
  type?: "title" | "paragraph" | "table" | "list" | "callout" | "columns";
  text?: string;
  level?: number;
  headers?: string[];
  rows?: string[][];
  items?: string[];
  title?: string;
  children?: ContentBlock[];
};

type DocumentPage = { title?: string; blocks?: ContentBlock[] };
type DocumentData = {
  officialName?: string;
  title?: string;
  school?: string;
  region?: string;
  pages?: DocumentPage[];
  footer?: { rightLabel?: string; rightName?: string; leftLabel?: string; leftName?: string };
};

const LOGO_URL = "/manus-storage/riwaq-mark_287e5e61.png";
const PAPER_PATTERN = "/manus-storage/riwaq-paper-pattern_92e35046.jpg";
const ORNAMENT = "/manus-storage/riwaq-document-ornament_0245a5cc.jpg";

const sampleDocument: DocumentData = {
  officialName: "سجل متابعة المبادرات التعليمية",
  title: "خطة تفعيل أسبوع القراءة",
  school: "متوسطة الرواد التعليمية",
  region: "الإدارة العامة للتعليم بمنطقة الرياض",
  pages: [
    {
      title: "بيانات الخطة",
      blocks: [
        { type: "paragraph", text: "وثيقة تنظيمية لتفعيل برنامج أسبوع القراءة، تتضمن الأهداف ومراحل التنفيذ ومؤشرات المتابعة." },
        {
          type: "table",
          headers: ["المجال", "البيان", "المسؤول"],
          rows: [
            ["الفترة", "من 12 إلى 16 صفر 1448هـ", "منسقة البرنامج"],
            ["الفئة المستهدفة", "طالبات المرحلة المتوسطة", "رائدة النشاط"],
            ["مكان التنفيذ", "مركز مصادر التعلم", "أمينة المصادر"],
          ],
        },
        { type: "callout", title: "الهدف العام", text: "تنمية عادة القراءة الحرة وتوسيع المشاركة في الأنشطة القرائية داخل البيئة المدرسية." },
      ],
    },
    {
      title: "خطة التنفيذ والمتابعة",
      blocks: [
        { type: "title", level: 2, text: "مراحل التنفيذ" },
        { type: "list", items: ["الإعلان عن البرنامج وتهيئة البيئة الصفية.", "تنفيذ ركن القراءة اليومية والفعاليات المصاحبة.", "توثيق المشاركات ورفع مؤشرات المتابعة."] },
        {
          type: "table",
          headers: ["المهمة", "موعد الإنجاز", "مؤشر النجاح"],
          rows: [
            ["إعداد ركن القراءة", "الأسبوع الأول", "تجهيز الركن في جميع الفصول"],
            ["مسابقة القارئ المتميز", "منتصف البرنامج", "مشاركة 60% من الطالبات"],
            ["التقرير الختامي", "نهاية البرنامج", "رفع التقرير مع الشواهد"],
          ],
        },
      ],
    },
  ],
  footer: { rightLabel: "إعداد", rightName: "منسقة النشاط", leftLabel: "اعتماد", leftName: "قائدة المدرسة" },
};

const analysisPrompt = `أنت محلل وثائق تعليمية دقيق. حلّل الملف المرفق صفحةً صفحةً دون إسقاط أي نص أو جدول أو ترويسة أو تذييل. أعد النتيجة JSON صالحًا فقط، بلا Markdown أو شرح، وفق المخطط التالي:\n\n{\n  "officialName": "الاسم الرسمي للملف",\n  "title": "عنوان المستند",\n  "school": "اسم المدرسة",\n  "region": "الإدارة العامة للتعليم بمنطقة...",\n  "pages": [{\n    "title": "عنوان الصفحة",\n    "blocks": [\n      {"type":"title","level":2,"text":"..."},\n      {"type":"paragraph","text":"..."},\n      {"type":"table","headers":["..."],"rows":[["...","..."]]},\n      {"type":"list","items":["...","..."]},\n      {"type":"callout","title":"...","text":"..."}\n    ]\n  }],\n  "footer": {"rightLabel":"إعداد","rightName":"...","leftLabel":"اعتماد","leftName":"..."}\n}\n\nقواعد صارمة: مثّل كل صفحة على حدة؛ لا تدمج الجداول ولا تعِد صياغة النص؛ احتفظ بترتيب الأعمدة وادمج الخلايا بوصف صريح داخل النص عند الحاجة؛ استخدم type=table لكل جدول ولو كان معقدًا؛ أدرج العناوين والتوقيعات والخانات الفارغة المهمة؛ اجعل كل القيم نصوصًا عربية دقيقة.`;

const templatePrompt = `أنت مهندس قوالب HTML/CSS للطباعة التعليمية. سأرسل لك كود قالب موجود. حلّله ثم أعد JSON صالحًا فقط يصف خصائصه لتسجيله داخل منصة رِواق. لا تعد كتابة HTML. المخطط: {"name":"اسم القالب","description":"وصف قصير","orientation":"portrait أو landscape","recommendedFont":"...","primaryColor":"#...","sections":["header","body","footer"],"notes":"قواعد مهمة لتطبيق القالب على بيانات JSON"}. استنتج الهوامش، تسلسل العناوين، الجداول، الترويسة والتذييل بدقة.`;

const templates = [
  { id: "formal", name: "رسمي رصين", subtitle: "للسجلات والخطط", color: "#0B5B4C" },
  { id: "classroom", name: "صف دراسي", subtitle: "للأنشطة والبرامج", color: "#995F2A" },
  { id: "assessment", name: "تقييم ومتابعة", subtitle: "للمحاضر والاستمارات", color: "#385D78" },
];

function getBlocksFromPage(page: unknown): ContentBlock[] {
  if (Array.isArray(page)) return page as ContentBlock[];
  if (typeof page === "object" && page !== null && Array.isArray((page as DocumentPage).blocks)) return (page as DocumentPage).blocks!;
  return [];
}

function normalizeDocument(value: unknown): DocumentData {
  if (Array.isArray(value)) return { ...sampleDocument, pages: value.map((blocks, index) => ({ title: `الصفحة ${index + 1}`, blocks: getBlocksFromPage(blocks) })) };
  if (typeof value === "object" && value !== null) {
    const incoming = value as DocumentData & { content?: ContentBlock[]; blocks?: ContentBlock[] };
    const fallbackPages = incoming.pages?.length
      ? incoming.pages
      : [{ title: incoming.title || "محتوى المستند", blocks: incoming.blocks || incoming.content || [] }];
    return { ...sampleDocument, ...incoming, pages: fallbackPages };
  }
  throw new Error("صيغة JSON لا تمثل مستندًا.");
}

function copyText(text: string, success: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success(success)).catch(() => toast.error("تعذر النسخ تلقائيًا. انسخ النص يدويًا."));
}

function uploadImage(event: ChangeEvent<HTMLInputElement>, setImage: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار ملف صورة صالح."); return; }
  const reader = new FileReader();
  reader.onload = () => setImage(String(reader.result));
  reader.readAsDataURL(file);
}

function BlockRenderer({ block, accent, fontClass }: { block: ContentBlock; accent: string; fontClass: string }) {
  if (block.type === "table") {
    return (
      <div className="my-4 overflow-hidden rounded-lg border border-[#d7ded8]">
        <table className="w-full border-collapse text-right text-[11px] leading-6">
          {block.headers && <thead style={{ backgroundColor: `${accent}12` }}><tr>{block.headers.map((header, index) => <th className="border-b border-l border-[#d7ded8] px-3 py-2 font-bold last:border-l-0" key={`${header}-${index}`}>{header}</th>)}</tr></thead>}
          <tbody>{block.rows?.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{row.map((cell, cellIndex) => <td className="border-b border-l border-[#e5e9e6] px-3 py-2 align-top last:border-l-0 last:border-b-0" key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  if (block.type === "list") return <ul className="my-3 space-y-2 pr-5 text-[13px] leading-7">{block.items?.map((item, index) => <li className="relative pr-4" key={`${item}-${index}`}><span className="absolute right-0 top-[12px] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />{item}</li>)}</ul>;
  if (block.type === "callout") return <aside className="my-4 border-r-4 bg-[#f6f7f4] px-4 py-3" style={{ borderRightColor: accent }}><p className="mb-1 text-xs font-bold" style={{ color: accent }}>{block.title || "تنبيه"}</p><p className="text-[13px] leading-7">{block.text}</p></aside>;
  if (block.type === "columns") return <div className="my-4 grid grid-cols-2 gap-4">{block.children?.map((child, index) => <BlockRenderer block={child} key={`col-${index}`} accent={accent} fontClass={fontClass} />)}</div>;
  if (block.type === "title") {
    const Tag = block.level === 1 ? "h1" : "h2";
    return <Tag className={`${fontClass} mt-5 mb-2 font-bold ${block.level === 1 ? "text-[19px]" : "text-[15px]"}`} style={{ color: accent }}>{block.text}</Tag>;
  }
  return <p className="my-3 text-[13px] leading-8 text-[#293530]">{block.text}</p>;
}

export default function Home() {
  const [documentData, setDocumentData] = useState<DocumentData>(sampleDocument);
  const [jsonText, setJsonText] = useState(JSON.stringify(sampleDocument, null, 2));
  const [activeNav, setActiveNav] = useState("document");
  const [selectedTemplate, setSelectedTemplate] = useState("formal");
  const [accent, setAccent] = useState("#0B5B4C");
  const [font, setFont] = useState<"naskh" | "plex" | "kufi">("naskh");
  const [titleSize, setTitleSize] = useState(22);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [headerImage, setHeaderImage] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);
  const [parseState, setParseState] = useState<"ready" | "valid" | "error">("ready");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const activeTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplate) ?? templates[0], [selectedTemplate]);
  const previewFont = font === "naskh" ? "font-naskh" : font === "kufi" ? "font-kufi" : "";
  const primaryBlocks = documentData.pages?.[0]?.blocks || [];
  const remainingPages = documentData.pages?.slice(1) || [];

  function parseJson() {
    try {
      const parsed = normalizeDocument(JSON.parse(jsonText));
      setDocumentData(parsed);
      setParseState("valid");
      toast.success("تم تركيب البيانات في المعاينة.");
    } catch (error) {
      setParseState("error");
      toast.error(error instanceof Error ? `راجع JSON: ${error.message}` : "تعذر قراءة JSON.");
    }
  }

  function setTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    const next = templates.find((template) => template.id === templateId);
    if (next) setAccent(next.color);
  }

  function updateDocumentField(field: keyof DocumentData, value: string) {
    setDocumentData((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-[#eef1ee] text-[#263530]" dir="rtl">
      <style>{`@media print { @page { size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"}; } #print-canvas, .document-page { width: ${orientation === "landscape" ? "297mm" : "210mm"} !important; } .document-page { min-height: ${orientation === "landscape" ? "210mm" : "297mm"} !important; } }`}</style>
      <aside className="no-print fixed right-0 top-0 z-30 hidden h-screen w-[238px] flex-col bg-[#153b35] text-[#edf1e9] lg:flex">
        <div className="relative overflow-hidden border-b border-white/10 px-6 py-7">
          <img src={PAPER_PATTERN} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.11] mix-blend-screen" />
          <div className="relative flex items-center gap-3">
            <img src={LOGO_URL} alt="رمز رِواق" className="h-12 w-12 rounded-xl bg-white/95 p-1.5 shadow-lg" />
            <div><p className="font-kufi text-lg font-bold tracking-tight">رِواق</p><p className="mt-0.5 text-[10px] text-[#b9d2c8]">مصمم الملفات التعليمية</p></div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6" aria-label="مسار العمل">
          <p className="px-3 pb-3 text-[10px] font-bold tracking-[0.18em] text-[#8db4a7]">مسار الوثيقة</p>
          {[
            { id: "document", label: "بيانات المستند", icon: FileJson2 },
            { id: "templates", label: "القوالب", icon: LayoutTemplate },
            { id: "identity", label: "الهوية والترويسة", icon: Stamp },
            { id: "guidance", label: "دليل التحليل", icon: Sparkles },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveNav(id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm transition-all duration-200 ${activeNav === id ? "bg-[#2c6258] text-white shadow-sm" : "text-[#c5d8d0] hover:bg-white/8 hover:text-white"}`}>
              <Icon className="h-4 w-4" strokeWidth={activeNav === id ? 2.5 : 1.8} />{label}
              {activeNav === id && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#c79a57]" />}
            </button>
          ))}
        </nav>

        <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-[#e9c28b]"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-bold">خصوصية محلية</span></div>
          <p className="text-[11px] leading-5 text-[#afc7bd]">تُعالَج بياناتك داخل المتصفح ولا يُرسل هذا الإصدار أي ملف إلى خادم خارجي.</p>
        </div>
      </aside>

      <main className="lg:mr-[238px]">
        <header className="no-print sticky top-0 z-20 flex min-h-[76px] items-center justify-between border-b border-[#d7ded8] bg-[#f7f8f5]/95 px-5 backdrop-blur-lg sm:px-8">
          <div className="flex items-center gap-3 lg:hidden"><img src={LOGO_URL} alt="رِواق" className="h-9 w-9 rounded-lg bg-white p-1" /><span className="font-kufi text-sm font-bold">رِواق</span></div>
          <div className="hidden items-center gap-3 lg:flex"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#b8cec4] bg-white p-1.5"><img src={LOGO_URL} alt="ختم رِواق" className="h-full w-full object-contain" /></div><div><div className="flex items-center gap-2"><p className="font-kufi text-sm font-bold">رِواق</p><span className="h-3.5 w-px bg-[#b8cec4]" /><p className="text-xs font-semibold text-[#496258]">محرر الوثيقة</p></div><p className="mt-1 text-[11px] text-[#6b7d74]">من البيانات المنظّمة إلى ملف جاهز للطباعة</p></div></div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-[#e5eee9] px-3 py-1.5 text-[11px] font-semibold text-[#276051] sm:flex"><CheckCircle2 className="h-3.5 w-3.5" /> حفظ تلقائي محليًا</span>
            <span className="hidden items-center gap-1.5 rounded-full border border-[#e7c58d] bg-[#fff7e8] px-3 py-1.5 text-[11px] font-semibold text-[#875a22] xl:flex"><Stamp className="h-3.5 w-3.5" /> جاهز للطباعة</span>
            <Button onClick={() => { document.title = documentData.officialName || documentData.title || "وثيقة تعليمية"; window.print(); }} className="h-10 gap-2 rounded-xl bg-[#0B5B4C] px-4 text-xs text-white hover:bg-[#08493d]"><Printer className="h-4 w-4" />طباعة الملف</Button>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-76px)] grid-cols-1 xl:grid-cols-[minmax(330px,0.8fr)_minmax(560px,1.25fr)]">
          <section className="no-print quiet-scrollbar order-2 max-h-[calc(100vh-76px)] overflow-y-auto border-t border-[#d7ded8] bg-[#f9faf8] p-5 xl:order-1 xl:border-l xl:border-t-0 xl:p-7">
            <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[0.16em] text-[#0B5B4C]">منطقة الضبط</p><h1 className="font-kufi mt-1 text-xl font-bold text-[#1d3932]">{activeNav === "document" ? "ركّب المستند" : activeNav === "templates" ? "اختر قالب العمل" : activeNav === "identity" ? "هوية الوثيقة" : "دليل التحليل الذكي"}</h1></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e1ece6] text-[#0B5B4C]"><PanelRightOpen className="h-4 w-4" /></span></div>
            <div className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#c9d9d1] bg-white shadow-[0_6px_18px_rgba(27,64,52,0.04)]">
              {[{ id: "document", number: "01", label: "المصدر", icon: FileJson2 }, { id: "templates", number: "02", label: "البناء", icon: LayoutTemplate }, { id: "result", number: "03", label: "النتيجة", icon: Printer }].map(({ id, number, label, icon: Icon }) => {
                const active = id === "result" ? false : activeNav === id || (id === "templates" && activeNav === "identity");
                return <button key={id} onClick={() => id === "result" ? document.getElementById("print-canvas")?.scrollIntoView({ behavior: "smooth", block: "start" }) : setActiveNav(id)} className={`relative flex min-h-[75px] flex-col items-start justify-center gap-1 border-l border-[#dfe7e2] px-3 text-right last:border-l-0 ${active ? "bg-[#f1f7f4]" : "hover:bg-[#f8faf8]"}`}><span className={`absolute right-0 top-0 h-full w-[3px] ${active ? "bg-[#0B5B4C]" : "bg-transparent"}`} /><span className={`flex items-center gap-1.5 text-[10px] font-bold ${active ? "text-[#0B5B4C]" : "text-[#81928a]"}`}><Icon className="h-3 w-3" />{number}</span><span className="text-xs font-bold text-[#30463d]">{label}</span></button>;
              })}
            </div>

            {activeNav === "document" && <div className="space-y-5">
              <div className="rounded-2xl border border-[#dbe2dd] bg-white p-4 shadow-[0_8px_20px_rgba(27,64,52,0.04)]">
                <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Braces className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">بيانات JSON المنظّمة</h2></div><button onClick={() => setJsonText(JSON.stringify(sampleDocument, null, 2))} className="text-xs font-semibold text-[#0B5B4C] hover:underline">تحميل مثال</button></div>
                <Textarea value={jsonText} onChange={(event) => { setJsonText(event.target.value); setParseState("ready"); }} spellCheck={false} className="min-h-[275px] resize-y rounded-xl border-[#dbe2dd] bg-[#fbfcfa] p-3 text-left font-mono text-[11px] leading-5 text-[#2c4038]" dir="ltr" aria-label="بيانات JSON" />
                <div className="mt-3 flex items-center justify-between gap-3"><span className={`text-[11px] ${parseState === "error" ? "text-red-600" : parseState === "valid" ? "text-[#0B5B4C]" : "text-[#7b8b84]"}`}>{parseState === "error" ? "توجد مشكلة في البنية" : parseState === "valid" ? "تمت قراءة البيانات بنجاح" : "ألصق مخرجات التحليل هنا"}</span><Button onClick={parseJson} className="h-9 gap-2 rounded-lg bg-[#0B5B4C] px-3 text-xs text-white hover:bg-[#08493d]"><Sparkles className="h-3.5 w-3.5" />ركّب الوثيقة</Button></div>
              </div>

              <div className="rounded-2xl border border-[#dbe2dd] bg-white p-4"><div className="mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">الضبط السريع</h2></div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#52665d]">اتجاه الورق<select value={orientation} onChange={(event) => setOrientation(event.target.value as "portrait" | "landscape")} className="mt-1.5 w-full rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-3 py-2 text-sm text-[#263530]"><option value="portrait">رأسي A4</option><option value="landscape">أفقي A4</option></select></label><label className="text-xs font-semibold text-[#52665d]">الخط<select value={font} onChange={(event) => setFont(event.target.value as "naskh" | "plex" | "kufi")} className="mt-1.5 w-full rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-3 py-2 text-sm text-[#263530]"><option value="naskh">نسخ رسمي</option><option value="plex">عربي حديث</option><option value="kufi">كوفي هندسي</option></select></label></div></div>
            </div>}

            {activeNav === "templates" && <div className="space-y-5">
              <p className="text-sm leading-7 text-[#5e7068]">القالب يتحكم في الهوية البصرية وتنظيم المستند، ولا يغير النص أو بيانات JSON.</p>
              <div className="space-y-3">{templates.map((template) => <button key={template.id} onClick={() => setTemplate(template.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-right transition-all ${selectedTemplate === template.id ? "border-[#0B5B4C] bg-[#f1f7f4] shadow-sm" : "border-[#dbe2dd] bg-white hover:border-[#9cbaaf]"}`}><span className="h-11 w-9 rounded-md border border-black/5" style={{ background: `linear-gradient(135deg, ${template.color} 0 28%, #f6f3e9 28% 100%)` }} /><span><b className="block text-sm">{template.name}</b><span className="mt-1 block text-xs text-[#74847c]">{template.subtitle}</span></span>{selectedTemplate === template.id && <CheckCircle2 className="mr-auto h-5 w-5 text-[#0B5B4C]" />}</button>)}</div>
              <div className="rounded-2xl border border-dashed border-[#b9cec4] bg-[#f2f7f4] p-4"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">أضف قالبك الخاص</h2></div><p className="mt-2 text-xs leading-6 text-[#5e7068]">انسخ برومبت التحويل، أرسله مع كود HTML/CSS لقالبك، ثم احتفظ بملخصه JSON لتوثيق إعداداته.</p><Button onClick={() => setShowTemplateHelp(true)} variant="outline" className="mt-3 h-9 w-full gap-2 border-[#99bbad] bg-white text-xs text-[#0B5B4C] hover:bg-[#e7f1ec]"><LayoutTemplate className="h-3.5 w-3.5" />برومبت تحويل القالب</Button></div>
            </div>}

            {activeNav === "identity" && <div className="space-y-5">
              <div className="rounded-2xl border border-[#dbe2dd] bg-white p-4"><div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">النصوص الرسمية</h2></div><div className="space-y-3"><label className="block text-xs font-semibold text-[#52665d]">الإدارة / المنطقة<input value={documentData.region || ""} onChange={(event) => updateDocumentField("region", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-3 py-2 text-sm font-normal text-[#263530]" /></label><label className="block text-xs font-semibold text-[#52665d]">اسم المدرسة<input value={documentData.school || ""} onChange={(event) => updateDocumentField("school", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-3 py-2 text-sm font-normal text-[#263530]" /></label><label className="block text-xs font-semibold text-[#52665d]">عنوان المستند<input value={documentData.title || ""} onChange={(event) => updateDocumentField("title", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-3 py-2 text-sm font-normal text-[#263530]" /></label></div></div>
              <div className="rounded-2xl border border-[#dbe2dd] bg-white p-4"><div className="mb-4 flex items-center gap-2"><Palette className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">العنوان والألوان</h2></div><div className="grid grid-cols-[1fr_auto] gap-3"><label className="text-xs font-semibold text-[#52665d]">لون العنوان<input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="mt-1.5 block h-10 w-full cursor-pointer rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] p-1" /></label><label className="text-xs font-semibold text-[#52665d]">الحجم<div className="mt-1.5 flex h-10 items-center rounded-lg border border-[#dbe2dd] bg-[#fbfcfa] px-2"><input type="range" min="18" max="30" value={titleSize} onChange={(event) => setTitleSize(Number(event.target.value))} className="w-24 accent-[#0B5B4C]" /><span className="mr-2 text-xs" dir="ltr">{titleSize}px</span></div></label></div></div>
              <div className="rounded-2xl border border-[#dbe2dd] bg-white p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><ImagePlus className="h-4 w-4 text-[#0B5B4C]" /><h2 className="text-sm font-bold">الشعار والترويسة المصوّرة</h2></div></div><p className="mb-3 text-[11px] leading-5 text-[#6b7d74]">الشعار مربع في وسط الترويسة. أما الترويسة المصوّرة فتستبدل النصوص الرسمية في الأعلى.</p><div className="grid grid-cols-2 gap-3"><button onClick={() => logoInputRef.current?.click()} className="rounded-xl border border-dashed border-[#b8cec4] bg-[#f7faf8] p-3 text-center hover:bg-[#eef6f1]"><Upload className="mx-auto h-4 w-4 text-[#0B5B4C]" /><span className="mt-2 block text-xs font-semibold">رفع شعار</span></button><button onClick={() => headerInputRef.current?.click()} className="rounded-xl border border-dashed border-[#b8cec4] bg-[#f7faf8] p-3 text-center hover:bg-[#eef6f1]"><ImagePlus className="mx-auto h-4 w-4 text-[#0B5B4C]" /><span className="mt-2 block text-xs font-semibold">رفع ترويسة</span></button></div><input ref={logoInputRef} onChange={(event) => uploadImage(event, setSchoolLogo)} type="file" accept="image/*" className="hidden" /><input ref={headerInputRef} onChange={(event) => uploadImage(event, setHeaderImage)} type="file" accept="image/*" className="hidden" />{(schoolLogo || headerImage) && <div className="mt-3 flex gap-2"><span className="text-xs text-[#0B5B4C]">تمت إضافة الصورة</span><button onClick={() => { setSchoolLogo(""); setHeaderImage(""); }} className="mr-auto text-xs text-red-600 hover:underline">إزالة</button></div>}</div>
            </div>}

            {activeNav === "guidance" && <div className="space-y-5"><div className="overflow-hidden rounded-2xl border border-[#dbe2dd] bg-white"><img src={ORNAMENT} alt="رمز وثيقة منمق" className="h-36 w-full object-cover object-center" /><div className="p-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#b77e37]" /><h2 className="text-sm font-bold">برومبت تحليل PDF</h2></div><p className="mt-2 text-xs leading-6 text-[#5e7068]">أرسله مع الملف إلى أداة التحليل التي تستخدمها. سيعيد JSON متوافقًا مع رِواق، صفحةً صفحةً.</p><Button onClick={() => copyText(analysisPrompt, "تم نسخ برومبت التحليل.")} className="mt-4 h-10 w-full gap-2 rounded-xl bg-[#0B5B4C] text-xs text-white hover:bg-[#08493d]"><Clipboard className="h-4 w-4" />نسخ برومبت التحليل</Button></div></div><div className="rounded-2xl border border-[#eadcc4] bg-[#fffaf2] p-4"><h2 className="text-sm font-bold text-[#6e4c25]">كيف تسير العملية؟</h2><ol className="mt-3 space-y-3 text-xs leading-6 text-[#755d40]"><li className="flex gap-3"><b className="text-[#b77e37]">01</b><span>حلّل الملف في أداتك الخارجية بالبرومبت أعلاه.</span></li><li className="flex gap-3"><b className="text-[#b77e37]">02</b><span>ألصق JSON في «بيانات المستند» ثم ركّب الوثيقة.</span></li><li className="flex gap-3"><b className="text-[#b77e37]">03</b><span>عدّل القالب والهوية، ثم اطبع باسم الملف الرسمي.</span></li></ol></div></div>}
          </section>

          <section className="quiet-scrollbar order-1 overflow-auto bg-[#e9eeea] p-5 sm:p-8 xl:order-2 xl:p-10" style={{ backgroundImage: `linear-gradient(rgba(233,238,234,.82), rgba(233,238,234,.82)), url(${PAPER_PATTERN})`, backgroundSize: "cover", backgroundAttachment: "fixed" }}>
            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#0B5B4C] shadow-sm"><BookOpenCheck className="h-4 w-4" /></span><div><p className="text-[11px] font-bold tracking-[0.14em] text-[#4c7062]">معاينة حية</p><p className="text-xs text-[#64776e]">{documentData.pages?.length || 0} صفحات · {orientation === "portrait" ? "A4 رأسي" : "A4 أفقي"}</p></div></div><div className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-bold text-[#4d645a]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />{activeTemplate.name}</div></div>

            <div id="print-canvas" className="mx-auto w-full" style={{ direction: "rtl" }}>
            <div className={`document-page paper-shadow mx-auto min-h-[842px] w-full max-w-[794px] overflow-hidden bg-[#fffefb] p-[42px] text-[#25342f] ${orientation === "landscape" ? "max-w-[1000px]" : ""}`}>
              {headerImage ? <img src={headerImage} alt="ترويسة المستند" className="mb-6 h-[105px] w-full rounded-xl border-2 object-cover shadow-sm" style={{ borderColor: accent }} /> : <header className="mb-7 grid grid-cols-[1fr_82px_1fr] items-center gap-4 border-b-2 pb-4" style={{ borderColor: accent }}><div className="text-right text-[11px] leading-6 text-[#243932]"><p className="font-bold">المملكة العربية السعودية</p><p>وزارة التعليم</p><p>{documentData.region || "الإدارة العامة للتعليم بمنطقة"}</p></div><div className="flex justify-center"><div className="flex h-[66px] w-[66px] items-center justify-center rounded-xl border bg-white p-1.5" style={{ borderColor: `${accent}70` }}><img src={schoolLogo || LOGO_URL} alt="شعار المدرسة" className="h-full w-full object-contain" /></div></div><div className="text-left text-[11px] leading-6 text-[#243932]"><p className="font-bold">{documentData.officialName || "اسم الملف الرسمي"}</p><p>{documentData.school || "اسم المدرسة"}</p><p className="text-[#728178]">العام الدراسي 1448 هـ</p></div></header>}

              <article className={previewFont}>
                <div className="mb-6 text-center"><span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em]" style={{ color: accent }}><span className="h-px w-7" style={{ backgroundColor: accent }} />وثيقة تعليمية<span className="h-px w-7" style={{ backgroundColor: accent }} /></span><h1 className="font-kufi mt-3 font-bold leading-relaxed" style={{ color: accent, fontSize: `${titleSize}px` }}>{documentData.title || "عنوان المستند"}</h1></div>
                {primaryBlocks.map((block, index) => <BlockRenderer key={`primary-${index}`} block={block} accent={accent} fontClass={previewFont} />)}
              </article>

              <footer className="mt-10 grid grid-cols-2 gap-10 rounded-t-2xl border-t-2 bg-[#fbfcfa] px-5 py-4 text-[11px]" style={{ borderColor: `${accent}75` }}><div><p className="font-bold" style={{ color: accent }}>{documentData.footer?.rightLabel || "إعداد"}</p><p className="mt-2 text-[#52655d]">{documentData.footer?.rightName || "الاسم والوظيفة"}</p><div className="mt-5 border-b border-dashed border-[#b8c4bc] pb-1 text-[#849189]">التوقيع</div></div><div className="text-left"><p className="font-bold" style={{ color: accent }}>{documentData.footer?.leftLabel || "اعتماد"}</p><p className="mt-2 text-[#52655d]">{documentData.footer?.leftName || "الاسم والوظيفة"}</p><div className="mt-5 border-b border-dashed border-[#b8c4bc] pb-1 text-right text-[#849189]">التوقيع</div></div></footer>
            </div>

            {remainingPages.map((page, pageIndex) => <div key={`page-${pageIndex}`} className="document-page paper-shadow mx-auto mt-7 w-full max-w-[794px] bg-[#fffefb] p-[42px] print:break-before-page"><div className="mb-5 border-b pb-3 text-center" style={{ borderColor: `${accent}60` }}><p className="font-kufi text-sm font-bold" style={{ color: accent }}>{page.title || `الصفحة ${pageIndex + 2}`}</p></div><article className={previewFont}>{page.blocks?.map((block, blockIndex) => <BlockRenderer key={`${pageIndex}-${blockIndex}`} block={block} accent={accent} fontClass={previewFont} />)}</article></div>)}
            </div>
          </section>
        </div>
      </main>

      {showTemplateHelp && <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5B4C]">قالب مخصص</p><h2 className="font-kufi mt-1 text-lg font-bold">حوّل HTML/CSS إلى إعداد قابل للتوثيق</h2></div><button onClick={() => setShowTemplateHelp(false)} className="rounded-lg p-1.5 text-[#62736b] hover:bg-[#eef3f0]"><X className="h-5 w-5" /></button></div><p className="mt-3 text-sm leading-7 text-[#5d7066]">انسخ النص التالي ثم أرفقه مع كود القالب في أداتك. الناتج JSON هو بطاقة مرجعية تحفظها مع القالب، بينما يبقى تركيب المحتوى عبر بيانات المستند.</p><Textarea value={templatePrompt} readOnly className="mt-4 min-h-[210px] resize-none bg-[#f7faf8] p-3 text-left font-mono text-[11px] leading-5" dir="ltr" /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowTemplateHelp(false)} className="rounded-lg text-xs">إغلاق</Button><Button onClick={() => copyText(templatePrompt, "تم نسخ برومبت تحويل القالب.")} className="gap-2 rounded-lg bg-[#0B5B4C] text-xs text-white hover:bg-[#08493d]"><Clipboard className="h-4 w-4" />نسخ البرومبت</Button></div></div></div>}
    </div>
  );
}
