import { homeHref } from "@/lib/base";
import * as QRCode from "qrcode";
import {
  AtSign,
  CalendarDays,
  Check,
  CircleDollarSign,
  Contact,
  Copy,
  Download,
  FileCode,
  FileImage,
  Grid3X3,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Paintbrush,
  Phone,
  Plus,
  RotateCcw,
  ScanLine,
  Share2,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
  Wifi,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";

type ContentType =
  | "URL"
  | "TEXT"
  | "EMAIL"
  | "PHONE"
  | "SMS"
  | "VCARD"
  | "ME CARD"
  | "LOCATION"
  | "FACEBOOK"
  | "TWITTER"
  | "YOUTUBE"
  | "WIFI"
  | "EVENT"
  | "BITCOIN"
  | "MORE";
type DotStyle = "square" | "rounded" | "dots" | "diamond";
type CornerStyle = "square" | "rounded" | "dot";
type FrameStyle = "none" | "line" | "label" | "bubble";
type CorrectionLevel = "L" | "M" | "Q" | "H";
type ColorMode = "single" | "gradient";
type GradientKind = "linear" | "radial";
type BodyShape = "square" | "rounded" | "dots" | "diamond" | "smallDots" | "bars" | "pill" | "cut" | "wave" | "star" | "flower";
type EyeFrameShape = "square" | "rounded" | "circle" | "diamond" | "octagon" | "soft" | "cut" | "pixel" | "slant" | "dashed";
type EyeBallShape = "square" | "rounded" | "circle" | "diamond" | "flower" | "pill" | "cut" | "pixel" | "slant" | "wave";
type Matrix = { size: number; data: boolean[] };
type QrOptions = {
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  frameStyle: FrameStyle;
  foreground: string;
  background: string;
  size: number;
  quiet: number;
  correction: CorrectionLevel;
};
type FormState = Record<string, string>;

const types: ContentType[] = [
  "URL",
  "TEXT",
  "EMAIL",
  "PHONE",
  "SMS",
  "VCARD",
  "ME CARD",
  "LOCATION",
  "FACEBOOK",
  "TWITTER",
  "YOUTUBE",
  "WIFI",
  "EVENT",
  "BITCOIN",
  "MORE",
];
const typeIcons: Record<ContentType, typeof Link2> = {
  URL: Link2,
  TEXT: Type,
  EMAIL: Mail,
  PHONE: Phone,
  SMS: MessageSquare,
  VCARD: Contact,
  "ME CARD": UserRound,
  LOCATION: MapPin,
  FACEBOOK: Share2,
  TWITTER: AtSign,
  YOUTUBE: Youtube,
  WIFI: Wifi,
  EVENT: CalendarDays,
  BITCOIN: CircleDollarSign,
  MORE: MoreHorizontal,
};
const bodyShapes: BodyShape[] = ["square", "rounded", "dots", "diamond", "smallDots", "bars", "pill", "cut", "wave", "star", "flower"];
const eyeFrameShapes: EyeFrameShape[] = ["square", "rounded", "circle", "diamond", "octagon", "soft", "cut", "pixel", "slant", "dashed"];
const eyeBallShapes: EyeBallShape[] = ["square", "rounded", "circle", "diamond", "flower", "pill", "cut", "pixel", "slant", "wave"];
const initialForm: FormState = {
  url: "https://example.com",
  text: "",
  email: "",
  subject: "",
  message: "",
  phone: "+49 172 45921...",
  smsMessage: "",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  twitterMode: "url",
  youtubeUrl: "https://youtube.com",
  ssid: "",
  password: "",
  encryption: "no encryption",
  eventTitle: "",
  eventLocation: "",
  startTime: "2026/08/26 12:15",
  endTime: "2026/08/26 12:15",
  address: "",
  latitude: "51.049259",
  longitude: "13.738336",
  version: "3",
  firstname: "",
  lastname: "",
  organization: "",
  position: "",
  phoneWork: "",
  phonePrivate: "",
  phoneMobile: "",
  faxWork: "",
  faxPrivate: "",
  website: "",
  street: "",
  zipcode: "",
  city: "",
  state: "",
  country: "",
  notes: "",
  nickname: "",
  birthday: "",
  bitcoin: "bitcoin:bc1qexample",
};

function buildPayload(type: ContentType, f: FormState) {
  switch (type) {
    case "TEXT":
      return f.text || "Text QR code";
    case "EMAIL":
      return `mailto:${f.email || "name@mail.com"}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.message)}`;
    case "PHONE":
      return `tel:${f.phone || "+49 172 45921"}`;
    case "SMS":
      return `SMSTO:${f.phone || "+49 172 45921"}:${f.smsMessage}`;
    case "FACEBOOK":
      return f.facebookUrl || "https://facebook.com";
    case "TWITTER":
      return f.twitterMode === "tweet" ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(f.twitterUrl)}` : f.twitterUrl || "https://twitter.com";
    case "YOUTUBE":
      return f.youtubeUrl || "https://youtube.com";
    case "WIFI":
      return `WIFI:T:WPA;S:${f.ssid};P:${f.password};;`;
    case "EVENT":
      return `BEGIN:VEVENT\nSUMMARY:${f.eventTitle}\nLOCATION:${f.eventLocation}\nDTSTART:${f.startTime}\nDTEND:${f.endTime}\nEND:VEVENT`;
    case "LOCATION":
      return `geo:${f.latitude},${f.longitude}`;
    case "BITCOIN":
      return f.bitcoin || "bitcoin:bc1qexample";
    case "VCARD":
      return `BEGIN:VCARD\nVERSION:${f.version}\nN:${f.lastname};${f.firstname}\nORG:${f.organization}\nTITLE:${f.position}\nTEL;TYPE=WORK:${f.phoneWork}\nTEL;TYPE=HOME:${f.phonePrivate}\nTEL;TYPE=CELL:${f.phoneMobile}\nEMAIL:${f.email}\nURL:${f.website}\nADR:${f.street};${f.city};${f.state};${f.zipcode};${f.country}\nEND:VCARD`;
    case "ME CARD":
      return `MECARD:N:${f.lastname},${f.firstname};NICKNAME:${f.nickname};TEL:${f.phoneMobile};EMAIL:${f.email};URL:${f.website};BDAY:${f.birthday};ADR:${f.street},${f.city},${f.state},${f.zipcode},${f.country};NOTE:${f.notes};;`;
    default:
      return f.url || "https://example.com";
  }
}

function buildMatrix(value: string, correction: CorrectionLevel): Matrix {
  const qr = QRCode.create(value || " ", { errorCorrectionLevel: correction });
  return { size: qr.modules.size, data: Array.from(qr.modules.data, Boolean) };
}

function isFinderZone(row: number, col: number, size: number) {
  return (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
}

function FinderPattern({
  x,
  y,
  frame,
  ball,
  paint,
  background,
}: {
  x: number;
  y: number;
  frame: EyeFrameShape;
  ball: EyeBallShape;
  paint: string;
  background: string;
}) {
  const outer = () => {
    if (frame === "circle") return <circle cx={x + 3.5} cy={y + 3.5} r={3.5} fill={paint} />;
    if (frame === "diamond") return <path d={`M ${x + 3.5} ${y} L ${x + 7} ${y + 3.5} L ${x + 3.5} ${y + 7} L ${x} ${y + 3.5} Z`} fill={paint} />;
    if (frame === "octagon") return <path d={`M ${x + 1.4} ${y} H ${x + 5.6} L ${x + 7} ${y + 1.4} V ${y + 5.6} L ${x + 5.6} ${y + 7} H ${x + 1.4} L ${x} ${y + 5.6} V ${y + 1.4} Z`} fill={paint} />;
    if (frame === "slant") return <path d={`M ${x + 0.9} ${y} H ${x + 7} V ${y + 6.1} L ${x + 6.1} ${y + 7} H ${x} V ${y + 0.9} Z`} fill={paint} />;
    if (frame === "cut") return <path d={`M ${x} ${y} H ${x + 5.8} L ${x + 7} ${y + 1.2} V ${y + 7} H ${x + 1.2} L ${x} ${y + 5.8} Z`} fill={paint} />;
    if (frame === "dashed") return <rect x={x + 0.3} y={y + 0.3} width={6.4} height={6.4} rx={0.25} fill="none" stroke={paint} strokeWidth=".9" strokeDasharray=".65 .45" />;
    if (frame === "rounded" || frame === "soft") return <rect x={x} y={y} width={7} height={7} rx={frame === "soft" ? 2.15 : 1.1} fill={paint} />;
    if (frame === "pixel") return <rect x={x + 0.35} y={y + 0.35} width={6.3} height={6.3} fill="none" stroke={paint} strokeWidth=".7" strokeDasharray=".9 .25" />;
    return <rect x={x} y={y} width={7} height={7} rx={0.18} fill={paint} />;
  };
  const inner = () => {
    if (ball === "circle") return <circle cx={x + 3.5} cy={y + 3.5} r={1.55} fill={paint} />;
    if (ball === "diamond") return <path d={`M ${x + 3.5} ${y + 1.75} L ${x + 5.25} ${y + 3.5} L ${x + 3.5} ${y + 5.25} L ${x + 1.75} ${y + 3.5} Z`} fill={paint} />;
    if (ball === "flower")
      return (
        <g fill={paint}>
          <circle cx={x + 2.8} cy={y + 2.8} r={0.95} />
          <circle cx={x + 4.2} cy={y + 2.8} r={0.95} />
          <circle cx={x + 2.8} cy={y + 4.2} r={0.95} />
          <circle cx={x + 4.2} cy={y + 4.2} r={0.95} />
        </g>
      );
    if (ball === "pill") return <rect x={x + 1.85} y={y + 2.2} width={3.3} height={2.6} rx={1.2} fill={paint} />;
    if (ball === "cut") return <path d={`M ${x + 1.95} ${y + 2} H ${x + 4.5} L ${x + 5.05} ${y + 2.55} V ${y + 5.05} H ${x + 2.5} L ${x + 1.95} ${y + 4.5} Z`} fill={paint} />;
    if (ball === "slant") return <path d={`M ${x + 2} ${y + 1.8} H ${x + 5.1} V ${y + 4.9} L ${x + 4.8} ${y + 5.2} H ${x + 1.9} V ${y + 2.1} Z`} fill={paint} />;
    if (ball === "wave")
      return (
        <path
          d={`M ${x + 1.7} ${y + 2.25} C ${x + 2.7} ${y + 1.55}, ${x + 3.2} ${y + 2.95}, ${x + 4} ${y + 2.2} C ${x + 4.8} ${y + 1.45}, ${x + 5.25} ${y + 2.85}, ${x + 5.25} ${y + 3.6} C ${x + 4.3} ${y + 4.45}, ${x + 3.4} ${y + 3.65}, ${x + 2.65} ${y + 4.65} C ${x + 2.05} ${y + 4.2}, ${x + 1.65} ${y + 3.45}, ${x + 1.7} ${y + 2.25} Z`}
          fill={paint}
        />
      );
    if (ball === "rounded") return <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill={paint} />;
    if (ball === "pixel") return <rect x={x + 1.95} y={y + 1.95} width={3.1} height={3.1} fill={paint} />;
    return <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.1} fill={paint} />;
  };
  return (
    <g>
      {outer()}
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={frame === "circle" ? 2.5 : 0.25} fill={background} />
      {inner()}
    </g>
  );
}

function QrSvg({
  matrix,
  options,
  colorMode,
  gradientKind,
  gradientColor,
  customEyeColor,
  eyeForeground,
  eyeGradient,
  bodyShape = "square",
  eyeFrameShape = "square",
  eyeBallShape = "square",
  logoData,
  svgRef,
}: {
  matrix: Matrix;
  options: QrOptions;
  colorMode: ColorMode;
  gradientKind: GradientKind;
  gradientColor: string;
  customEyeColor: boolean;
  eyeForeground: string;
  eyeGradient: string;
  bodyShape?: BodyShape;
  eyeFrameShape?: EyeFrameShape;
  eyeBallShape?: EyeBallShape;
  logoData: string | null;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const total = matrix.size + options.quiet * 2;
  const qrPaint = colorMode === "gradient" ? "url(#qr-gradient)" : options.foreground;
  const eyePaint = customEyeColor ? (colorMode === "gradient" ? "url(#eye-gradient)" : eyeForeground) : qrPaint;
  const modules = [];
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.data[row * matrix.size + col] || isFinderZone(row, col, matrix.size)) continue;
      const x = col + options.quiet;
      const y = row + options.quiet;
      if (bodyShape === "dots" || bodyShape === "smallDots") modules.push(<circle key={`${row}-${col}`} cx={x + 0.5} cy={y + 0.5} r={bodyShape === "smallDots" ? 0.26 : 0.42} fill={qrPaint} />);
      else if (bodyShape === "diamond") modules.push(<path key={`${row}-${col}`} d={`M ${x + 0.5} ${y + 0.06} L ${x + 0.94} ${y + 0.5} L ${x + 0.5} ${y + 0.94} L ${x + 0.06} ${y + 0.5} Z`} fill={qrPaint} />);
      else if (bodyShape === "bars") modules.push(<rect key={`${row}-${col}`} x={x + 0.06} y={y + 0.23} width={0.88} height={0.54} rx={0.22} fill={qrPaint} />);
      else if (bodyShape === "pill") modules.push(<rect key={`${row}-${col}`} x={x + 0.12} y={y + 0.16} width={0.76} height={0.68} rx={0.34} fill={qrPaint} />);
      else if (bodyShape === "cut") modules.push(<path key={`${row}-${col}`} d={`M ${x + 0.1} ${y + 0.1} H ${x + 0.72} L ${x + 0.9} ${y + 0.28} V ${y + 0.9} H ${x + 0.28} L ${x + 0.1} ${y + 0.72} Z`} fill={qrPaint} />);
      else if (bodyShape === "wave") modules.push(<path key={`${row}-${col}`} d={`M ${x + 0.08} ${y + 0.36} C ${x + 0.28} ${y + 0.06}, ${x + 0.57} ${y + 0.76}, ${x + 0.92} ${y + 0.28} V ${y + 0.9} H ${x + 0.08} Z`} fill={qrPaint} />);
      else if (bodyShape === "star") modules.push(<path key={`${row}-${col}`} d={`M ${x + 0.5} ${y + 0.04} L ${x + 0.62} ${y + 0.38} L ${x + 0.96} ${y + 0.5} L ${x + 0.62} ${y + 0.62} L ${x + 0.5} ${y + 0.96} L ${x + 0.38} ${y + 0.62} L ${x + 0.04} ${y + 0.5} L ${x + 0.38} ${y + 0.38} Z`} fill={qrPaint} />);
      else if (bodyShape === "flower")
        modules.push(
          <g key={`${row}-${col}`} fill={qrPaint}>
            <circle cx={x + 0.34} cy={y + 0.34} r={0.25} />
            <circle cx={x + 0.66} cy={y + 0.34} r={0.25} />
            <circle cx={x + 0.34} cy={y + 0.66} r={0.25} />
            <circle cx={x + 0.66} cy={y + 0.66} r={0.25} />
          </g>,
        );
      else modules.push(<rect key={`${row}-${col}`} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={bodyShape === "rounded" ? 0.25 : 0.06} fill={qrPaint} />);
    }
  }
  const finders = [
    [options.quiet, options.quiet],
    [options.quiet + matrix.size - 7, options.quiet],
    [options.quiet, options.quiet + matrix.size - 7],
  ];
  const logoSize = total * 0.2;
  const logoPosition = (total - logoSize) / 2;
  const gradientDefs =
    gradientKind === "linear" ? (
      <>
        <linearGradient id="qr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={options.foreground} />
          <stop offset="100%" stopColor={gradientColor} />
        </linearGradient>
        <linearGradient id="eye-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={eyeForeground} />
          <stop offset="100%" stopColor={eyeGradient} />
        </linearGradient>
      </>
    ) : (
      <>
        <radialGradient id="qr-gradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={options.foreground} />
          <stop offset="100%" stopColor={gradientColor} />
        </radialGradient>
        <radialGradient id="eye-gradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={eyeForeground} />
          <stop offset="100%" stopColor={eyeGradient} />
        </radialGradient>
      </>
    );
  return (
    <svg ref={svgRef} className="qr-svg" viewBox={`0 0 ${total} ${total}`} role="img" aria-label="Live QR code preview">
      <defs>{colorMode === "gradient" && gradientDefs}</defs>
      <rect width={total} height={total} fill={options.background} />
      <g shapeRendering="geometricPrecision">{modules}</g>
      {finders.map(([x, y]) => (
        <FinderPattern key={`${x}-${y}`} x={x} y={y} frame={eyeFrameShape} ball={eyeBallShape} paint={eyePaint} background={options.background} />
      ))}
      {logoData && (
        <>
          <rect x={logoPosition - 0.65} y={logoPosition - 0.65} width={logoSize + 1.3} height={logoSize + 1.3} rx={1} fill={options.background} />
          <image href={logoData} x={logoPosition} y={logoPosition} width={logoSize} height={logoSize} preserveAspectRatio="xMidYMid slice" />
        </>
      )}
    </svg>
  );
}

function AccordionRow({ icon, title, open, onClick, children }: { icon: ReactNode; title: string; open: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <div className={open ? "accordion is-open" : "accordion"}>
      <button type="button" className="accordion-trigger" onClick={onClick} aria-expanded={open}>
        <span className="accordion-icon">{icon}</span>
        <span>{title}</span>
        {open ? <Minus size={15} /> : <Plus size={15} />}
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {multiline ? <textarea className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} /> : <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-value">
      <span>{label}</span>
      <div>
        <input aria-label={`${label} picker`} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input aria-label={`${label} hex value`} type="text" value={value.toUpperCase()} readOnly />
      </div>
    </label>
  );
}

function DesignTile({ group, shape, selected, onClick }: { group: "body" | "frame" | "ball"; shape: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={selected ? "shape-tile selected" : "shape-tile"} onClick={onClick} aria-label={`Select ${shape} ${group} shape`}>
      <span className={`shape-preview ${group} ${shape}`}>
        <i />
        <b />
        <em />
      </span>
    </button>
  );
}

function DesignSelector({
  bodyShape,
  setBodyShape,
  eyeFrameShape,
  setEyeFrameShape,
  eyeBallShape,
  setEyeBallShape,
  options,
  updateOption,
}: {
  bodyShape: BodyShape;
  setBodyShape: (shape: BodyShape) => void;
  eyeFrameShape: EyeFrameShape;
  setEyeFrameShape: (shape: EyeFrameShape) => void;
  eyeBallShape: EyeBallShape;
  setEyeBallShape: (shape: EyeBallShape) => void;
  options: QrOptions;
  updateOption: <K extends keyof QrOptions>(key: K, next: QrOptions[K]) => void;
}) {
  return (
    <div className="design-selector">
      <div className="shape-group">
        <p>Body Shape</p>
        <div className="shape-grid">
          {bodyShapes.map((shape) => (
            <DesignTile key={shape} group="body" shape={shape} selected={bodyShape === shape} onClick={() => setBodyShape(shape)} />
          ))}
        </div>
      </div>
      <div className="shape-group">
        <p>Eye Frame Shape</p>
        <div className="shape-grid">
          {eyeFrameShapes.map((shape) => (
            <DesignTile key={shape} group="frame" shape={shape} selected={eyeFrameShape === shape} onClick={() => setEyeFrameShape(shape)} />
          ))}
        </div>
      </div>
      <div className="shape-group">
        <p>Eye Ball Shape</p>
        <div className="shape-grid">
          {eyeBallShapes.map((shape) => (
            <DesignTile key={shape} group="ball" shape={shape} selected={eyeBallShape === shape} onClick={() => setEyeBallShape(shape)} />
          ))}
        </div>
      </div>
      <div className="design-utility-row">
        <label>
          Quiet zone <strong>{options.quiet} modules</strong>
          <input type="range" min="2" max="8" step="1" value={options.quiet} onChange={(event) => updateOption("quiet", Number(event.target.value))} />
        </label>
        <label>
          Error correction
          <select className="input" value={options.correction} onChange={(event) => updateOption("correction", event.target.value as CorrectionLevel)}>
            <option value="L">Low</option>
            <option value="M">Medium</option>
            <option value="Q">Quartile</option>
            <option value="H">High</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export default function Home() {
  const [contentType, setContentType] = useState<ContentType>("URL");
  const [form, setForm] = useState<FormState>(initialForm);
  const [openPanel, setOpenPanel] = useState<"colors" | "logo" | "design" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("single");
  const [gradientKind, setGradientKind] = useState<GradientKind>("linear");
  const [gradientColor, setGradientColor] = useState("#555555");
  const [customEyeColor, setCustomEyeColor] = useState(false);
  const [eyeForeground, setEyeForeground] = useState("#000000");
  const [eyeGradient, setEyeGradient] = useState("#555555");
  const [bodyShape, setBodyShape] = useState<BodyShape>("square");
  const [eyeFrameShape, setEyeFrameShape] = useState<EyeFrameShape>("square");
  const [eyeBallShape, setEyeBallShape] = useState<EyeBallShape>("square");
  const [options, setOptions] = useState<QrOptions>({
    dotStyle: "square",
    cornerStyle: "square",
    frameStyle: "none",
    foreground: "#000000",
    background: "#ffffff",
    size: 1000,
    quiet: 3,
    correction: "H",
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const payload = useMemo(() => buildPayload(contentType, form), [contentType, form]);
  const matrix = useMemo(() => buildMatrix(payload, options.correction), [payload, options.correction]);
  const ContentIcon = typeIcons[contentType];
  const updateField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateOption = <K extends keyof QrOptions>(key: K, next: QrOptions[K]) => setOptions((current) => ({ ...current, [key]: next }));
  const chooseType = (type: ContentType) => {
    setContentType(type);
    setOpenPanel(null);
  };
  const copyForegroundToEyes = () => {
    setEyeForeground(options.foreground);
    setEyeGradient(gradientColor);
  };
  const reset = () => {
    setContentType("URL");
    setForm(initialForm);
    setOpenPanel(null);
    setStatsEnabled(false);
    setLogoData(null);
    setColorMode("single");
    setGradientKind("linear");
    setGradientColor("#555555");
    setCustomEyeColor(false);
    setEyeForeground("#000000");
    setEyeGradient("#555555");
    setBodyShape("square");
    setEyeFrameShape("square");
    setEyeBallShape("square");
    setOptions({
      dotStyle: "square",
      cornerStyle: "square",
      frameStyle: "none",
      foreground: "#000000",
      background: "#ffffff",
      size: 1000,
      quiet: 3,
      correction: "H",
    });
    toast("Generator reset.");
  };
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast("Content copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Copy is unavailable in this browser.");
    }
  };
  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoData(String(reader.result));
      toast("Logo added to the preview.");
    };
    reader.readAsDataURL(file);
  };
  const download = (format: "png" | "svg") => {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const filename = `qr-studio-${contentType.toLowerCase().replaceAll(" ", "-")}.${format}`;
    if (format === "svg") {
      const url = URL.createObjectURL(svgBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast("SVG downloaded.");
      return;
    }
    const image = new Image();
    const url = URL.createObjectURL(svgBlob);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = options.size;
      canvas.height = options.size;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = filename;
      anchor.click();
      toast("PNG downloaded.");
    };
    image.src = url;
  };

  useEffect(() => {
    document.body.classList.add("is-ready");
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const renderFields = () => {
    if (contentType === "TEXT") return <Field label="Your Text" value={form.text} onChange={(v) => updateField("text", v)} multiline placeholder="Line breaks are allowed" />;
    if (contentType === "EMAIL")
      return (
        <>
          <Field label="Your Email" value={form.email} onChange={(v) => updateField("email", v)} placeholder="name@mail.com" />
          <Field label="Subject" value={form.subject} onChange={(v) => updateField("subject", v)} />
          <Field label="Message" value={form.message} onChange={(v) => updateField("message", v)} multiline />
        </>
      );
    if (contentType === "SMS")
      return (
        <>
          <Field label="Your Phone Number" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="+49 172 45921..." />
          <Field label="Your Message" value={form.smsMessage} onChange={(v) => updateField("smsMessage", v)} multiline />
        </>
      );
    if (contentType === "PHONE") return <Field label="Your Phone Number" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="+49 172 45921..." />;
    if (contentType === "WIFI")
      return (
        <div className="field-grid three">
          <Field label="Wireless SSID" value={form.ssid} onChange={(v) => updateField("ssid", v)} />
          <Field label="Password" value={form.password} onChange={(v) => updateField("password", v)} />
          <label className="form-field">
            <span className="form-label">Encryption</span>
            <select className="input" value={form.encryption} onChange={(event) => updateField("encryption", event.target.value)}>
              <option>no encryption</option>
              <option>WPA/WPA2</option>
              <option>WEP</option>
            </select>
          </label>
        </div>
      );
    if (contentType === "EVENT")
      return (
        <div className="event-fields">
          <Field label="Event Title" value={form.eventTitle} onChange={(v) => updateField("eventTitle", v)} />
          <div className="field-grid three">
            <Field label="Event Location" value={form.eventLocation} onChange={(v) => updateField("eventLocation", v)} />
            <Field label="Starttime" value={form.startTime} onChange={(v) => updateField("startTime", v)} />
            <Field label="Endtime" value={form.endTime} onChange={(v) => updateField("endTime", v)} />
          </div>
        </div>
      );
    if (contentType === "LOCATION")
      return (
        <>
          <Field label="Search Your Address" value={form.address} onChange={(v) => updateField("address", v)} placeholder="e.g. 5th Avenue, New York..." />
          <div className="field-grid two">
            <Field label="Latitude" value={form.latitude} onChange={(v) => updateField("latitude", v)} />
            <Field label="Longitude" value={form.longitude} onChange={(v) => updateField("longitude", v)} />
          </div>
          <div className="map-placeholder">
            <div className="map-tabs">
              <strong>Map</strong>
              <span>Satellite</span>
            </div>
            <div className="map-pin">●</div>
            <small>Keyboard shortcuts &nbsp; Map data ©2026</small>
          </div>
          <p className="map-note">You can manually drag the marker on the map.</p>
        </>
      );
    if (contentType === "FACEBOOK")
      return (
        <>
          <div className="radio-row">
            <label>
              <input type="radio" checked readOnly /> Facebook URL
            </label>
            <label>
              <input type="radio" /> Share URL
            </label>
          </div>
          <Field label="Your Facebook URL" value={form.facebookUrl} onChange={(v) => updateField("facebookUrl", v)} placeholder="https://facebook.com" />
        </>
      );
    if (contentType === "TWITTER")
      return (
        <>
          <div className="radio-row">
            <label>
              <input type="radio" checked={form.twitterMode === "url"} onChange={() => updateField("twitterMode", "url")} /> Twitter URL
            </label>
            <label>
              <input type="radio" checked={form.twitterMode === "tweet"} onChange={() => updateField("twitterMode", "tweet")} /> Tweet
            </label>
          </div>
          <Field label="Your Twitter URL" value={form.twitterUrl} onChange={(v) => updateField("twitterUrl", v)} placeholder="https://twitter.com" />
        </>
      );
    if (contentType === "YOUTUBE") return <Field label="Your Youtube URL" value={form.youtubeUrl} onChange={(v) => updateField("youtubeUrl", v)} placeholder="https://youtube.com" />;
    if (contentType === "BITCOIN") return <Field label="Bitcoin Address" value={form.bitcoin} onChange={(v) => updateField("bitcoin", v)} placeholder="bitcoin address" />;
    if (contentType === "VCARD")
      return (
        <>
          <div className="radio-row">
            <label>
              <input type="radio" /> Version 2.1
            </label>
            <label>
              <input type="radio" checked readOnly /> Version 3
            </label>
          </div>
          <div className="field-grid three contact-grid">
            <Field label="Firstname" value={form.firstname} onChange={(v) => updateField("firstname", v)} />
            <Field label="Lastname" value={form.lastname} onChange={(v) => updateField("lastname", v)} />
            <Field label="Organization" value={form.organization} onChange={(v) => updateField("organization", v)} />
            <Field label="Position (Work)" value={form.position} onChange={(v) => updateField("position", v)} />
            <Field label="Phone (Work)" value={form.phoneWork} onChange={(v) => updateField("phoneWork", v)} />
            <Field label="Phone (Private)" value={form.phonePrivate} onChange={(v) => updateField("phonePrivate", v)} />
            <Field label="Phone (Mobile)" value={form.phoneMobile} onChange={(v) => updateField("phoneMobile", v)} />
            <Field label="Fax (Work)" value={form.faxWork} onChange={(v) => updateField("faxWork", v)} />
            <Field label="Fax (Private)" value={form.faxPrivate} onChange={(v) => updateField("faxPrivate", v)} />
            <Field label="Email" value={form.email} onChange={(v) => updateField("email", v)} />
            <Field label="Website" value={form.website} onChange={(v) => updateField("website", v)} />
            <Field label="Street" value={form.street} onChange={(v) => updateField("street", v)} />
            <Field label="Zipcode" value={form.zipcode} onChange={(v) => updateField("zipcode", v)} />
            <Field label="City" value={form.city} onChange={(v) => updateField("city", v)} />
            <Field label="State" value={form.state} onChange={(v) => updateField("state", v)} />
            <Field label="Country" value={form.country} onChange={(v) => updateField("country", v)} />
          </div>
        </>
      );
    if (contentType === "ME CARD")
      return (
        <div className="field-grid three contact-grid">
          <Field label="Firstname" value={form.firstname} onChange={(v) => updateField("firstname", v)} />
          <Field label="Lastname" value={form.lastname} onChange={(v) => updateField("lastname", v)} />
          <Field label="Nickname" value={form.nickname} onChange={(v) => updateField("nickname", v)} />
          <Field label="Phone 1" value={form.phoneWork} onChange={(v) => updateField("phoneWork", v)} />
          <Field label="Phone 2" value={form.phonePrivate} onChange={(v) => updateField("phonePrivate", v)} />
          <Field label="Phone 3" value={form.phoneMobile} onChange={(v) => updateField("phoneMobile", v)} />
          <Field label="Email" value={form.email} onChange={(v) => updateField("email", v)} />
          <Field label="Website" value={form.website} onChange={(v) => updateField("website", v)} />
          <Field label="Birthday" value={form.birthday} onChange={(v) => updateField("birthday", v)} placeholder="YYYY-MM-DD" />
          <Field label="Street" value={form.street} onChange={(v) => updateField("street", v)} />
          <Field label="Zipcode" value={form.zipcode} onChange={(v) => updateField("zipcode", v)} />
          <Field label="City" value={form.city} onChange={(v) => updateField("city", v)} />
          <Field label="State" value={form.state} onChange={(v) => updateField("state", v)} />
          <Field label="Country" value={form.country} onChange={(v) => updateField("country", v)} />
          <Field label="Notes" value={form.notes} onChange={(v) => updateField("notes", v)} />
        </div>
      );
    return (
      <>
        <Field label="Your URL" value={form.url} onChange={(v) => updateField("url", v)} placeholder="https://example.com" />
        {contentType === "URL" && (
          <button className={statsEnabled ? "stats-toggle enabled" : "stats-toggle"} type="button" onClick={() => setStatsEnabled((enabled) => !enabled)}>
            <span className="toggle-knob" />
            <strong>{statsEnabled ? "ON" : "OFF"}</strong>
            <span>Statistics and Editability</span>
          </button>
        )}
      </>
    );
  };

  return (
    <div className={mobileNavOpen ? "app nav-open" : "app"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <nav className={navScrolled ? "nav nav--scrolled" : "nav"} role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className={`nav__inner${mobileNavOpen ? " nav--open" : ""}`}>
            <a href={homeHref} className="nav__logo">
              qr <span>studio</span>
            </a>
            <button
              type="button"
              className="nav__menu-btn"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span className="nav__menu-icon" aria-hidden="true" />
            </button>
            <ul className="nav__links" role="list">
              <li>
                <a href="#generator" className="nav__link" onClick={() => setMobileNavOpen(false)}>
                  Generator
                </a>
              </li>
              <li>
                <a href="#about" className="nav__link" onClick={() => setMobileNavOpen(false)}>
                  About
                </a>
              </li>
              <li>
                <a href="#privacy" className="nav__link" onClick={() => setMobileNavOpen(false)}>
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main id="main-content">
        <section className="section section--bordered" id="generator" aria-labelledby="generator-title">
          <div className="container">
            <div className="section__header">
              <h2 className="section__title" id="generator-title">
                Choose a type
                <span className="section__count">{contentType}</span>
              </h2>
            </div>
            <div className="filter-group type-filters" role="tablist" aria-label="QR code type">
              {types.map((type) => {
                const Icon = typeIcons[type];
                return (
                  <button key={type} type="button" className={contentType === type ? "filter-btn active" : "filter-btn"} onClick={() => chooseType(type)} role="tab" aria-selected={contentType === type}>
                    <Icon size={13} />
                    {type}
                  </button>
                );
              })}
            </div>

            <section className="generator-panel">
              <div className="settings-column">
                <div className="content-heading">
                  <span className="heading-icon">
                    <ContentIcon size={17} strokeWidth={2.2} />
                  </span>
                  <span>Enter content</span>
                </div>
                <div className="type-form">{renderFields()}</div>
                <AccordionRow icon={<Paintbrush size={15} />} title="Set colors" open={openPanel === "colors"} onClick={() => setOpenPanel(openPanel === "colors" ? null : "colors")}>
                  <div className="color-settings">
                    <p>Foreground Color</p>
                    <div className="color-mode-row">
                      <label>
                        <input type="radio" checked={colorMode === "single"} onChange={() => setColorMode("single")} /> Single Color
                      </label>
                      <label>
                        <input type="radio" checked={colorMode === "gradient"} onChange={() => setColorMode("gradient")} /> Color Gradient
                      </label>
                      <label>
                        <input type="checkbox" checked={customEyeColor} onChange={(event) => setCustomEyeColor(event.target.checked)} /> Custom Eye Color
                      </label>
                    </div>
                    <div className={colorMode === "gradient" ? "color-input-row gradient" : "color-input-row"}>
                      <ColorInput label="Foreground" value={options.foreground} onChange={(value) => updateOption("foreground", value)} />
                      {colorMode === "gradient" && <ColorInput label="Gradient stop" value={gradientColor} onChange={setGradientColor} />}
                      {colorMode === "gradient" && (
                        <label className="gradient-kind">
                          <span>↔</span>
                          <select value={gradientKind} onChange={(event) => setGradientKind(event.target.value as GradientKind)}>
                            <option value="linear">Linear Gradient</option>
                            <option value="radial">Radial Gradient</option>
                          </select>
                        </label>
                      )}
                    </div>
                    {customEyeColor && (
                      <div className="eye-color-panel">
                        <p>Eye Color</p>
                        <div className={colorMode === "gradient" ? "color-input-row gradient" : "color-input-row"}>
                          <ColorInput label="Eye foreground" value={eyeForeground} onChange={setEyeForeground} />
                          {colorMode === "gradient" && <ColorInput label="Eye gradient stop" value={eyeGradient} onChange={setEyeGradient} />}
                          <button type="button" className="copy-foreground" onClick={copyForegroundToEyes}>
                            ↔ <span>Copy Foreground</span>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="background-color-panel">
                      <p>Background Color</p>
                      <ColorInput label="Background" value={options.background} onChange={(value) => updateOption("background", value)} />
                    </div>
                  </div>
                </AccordionRow>
                <AccordionRow icon={<ImagePlus size={15} />} title="Add logo image" open={openPanel === "logo"} onClick={() => setOpenPanel(openPanel === "logo" ? null : "logo")}>
                  <label className="upload-box">
                    <ImagePlus size={17} />
                    <span>{logoData ? "Logo loaded — choose another" : "Choose an image to place in the QR"}</span>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogo} />
                  </label>
                  {logoData && (
                    <button className="remove-logo" type="button" onClick={() => setLogoData(null)}>
                      Remove logo
                    </button>
                  )}
                </AccordionRow>
                <AccordionRow icon={<Grid3X3 size={15} />} title="Customize design" open={openPanel === "design"} onClick={() => setOpenPanel(openPanel === "design" ? null : "design")}>
                  <DesignSelector bodyShape={bodyShape} setBodyShape={setBodyShape} eyeFrameShape={eyeFrameShape} setEyeFrameShape={setEyeFrameShape} eyeBallShape={eyeBallShape} setEyeBallShape={setEyeBallShape} options={options} updateOption={updateOption} />
                </AccordionRow>
                <div className="settings-footer">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
                    <RotateCcw size={13} /> Reset
                  </button>
                  <span>All changes update instantly</span>
                </div>
              </div>

              <div className="preview-column">
                <div className="preview-topline">
                  <span className="preview-kicker">
                    <span className="ready-dot" /> Live preview
                  </span>
                  <button type="button" className="copy-action" onClick={copyValue}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy content"}
                  </button>
                </div>
                <div className="reference-qr-wrap">
                  <div className="reference-qr">
                    <QrSvg matrix={matrix} options={options} colorMode={colorMode} gradientKind={gradientKind} gradientColor={gradientColor} customEyeColor={customEyeColor} eyeForeground={eyeForeground} eyeGradient={eyeGradient} bodyShape={bodyShape} eyeFrameShape={eyeFrameShape} eyeBallShape={eyeBallShape} logoData={logoData} svgRef={svgRef} />
                    {options.frameStyle === "label" && <span className="reference-qr-label">SCAN ME</span>}
                  </div>
                </div>
                <div className="quality-slider">
                  <span>Low Quality</span>
                  <input type="range" min="320" max="2000" step="40" value={options.size} onChange={(event) => updateOption("size", Number(event.target.value))} />
                  <span>High Quality</span>
                </div>
                <div className="quality-value">
                  {options.size} × {options.size} Px
                </div>
                <div className="preview-buttons">
                  <button className="btn btn--primary" type="button" onClick={() => toast("QR code updated.")}>
                    <Sparkles size={15} /> Create QR Code
                  </button>
                  <button className="btn" type="button" onClick={() => download("png")}>
                    <Download size={15} /> Download PNG
                  </button>
                </div>
                <div className="format-buttons">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => download("svg")}>
                    <FileCode size={14} /> .SVG
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => download("svg")}>
                    <FileImage size={14} /> .PDF*
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => download("svg")}>
                    <FileCode size={14} /> .EPS*
                  </button>
                </div>
                <p className="format-note">Gradients export consistently in PNG and SVG.</p>
                <div className="preview-note">
                  Static QR codes are free. Everything is generated in your browser — content stays on your device.
                </div>
              </div>
            </section>

            <div className="template-row">
              <button className="btn" type="button" onClick={() => toast("Templates are coming soon.")}>
                <ScanLine size={15} /> QR Code Templates
              </button>
            </div>
          </div>
        </section>

        <section className="section" id="about" aria-labelledby="about-title">
          <div className="container">
            <div className="section__header">
              <h2 className="section__title" id="about-title">
                Why qr studio
              </h2>
            </div>
            <div className="game-grid">
              <article className="game-card">
                <div className="game-card__icon">
                  <Link2 size={32} />
                </div>
                <h3 className="game-card__name">Flexible content</h3>
                <p className="game-card__desc">URL, text, email, Wi-Fi, vCard, events, Bitcoin, and more — pick a type and fill in the fields.</p>
                <div className="game-card__footer">
                  <span className="game-card__count">15 content types</span>
                  <span className="badge">Ready</span>
                </div>
              </article>
              <article className="game-card">
                <div className="game-card__icon">
                  <Paintbrush size={32} />
                </div>
                <h3 className="game-card__name">Design controls</h3>
                <p className="game-card__desc">Body shapes, eye frames, colors, gradients, and a logo overlay. The preview updates as you go.</p>
                <div className="game-card__footer">
                  <span className="game-card__count">Live styling</span>
                  <span className="badge">Studio</span>
                </div>
              </article>
              <article className="game-card">
                <div className="game-card__icon">
                  <Download size={32} />
                </div>
                <h3 className="game-card__name">Print-ready export</h3>
                <p className="game-card__desc">Download PNG or SVG at up to 2000px. High error correction keeps codes scan-ready.</p>
                <div className="game-card__footer">
                  <span className="game-card__count">PNG · SVG</span>
                  <span className="badge">Export</span>
                </div>
              </article>
              <article className="game-card">
                <div className="game-card__icon">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="game-card__name">Private by default</h3>
                <p className="game-card__desc">Nothing is uploaded. Codes are generated locally so your links and contacts never leave this tab.</p>
                <div className="game-card__footer">
                  <span className="game-card__count">Browser-only</span>
                  <span className="badge">Local</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section alerts-cta" id="privacy" aria-labelledby="privacy-title">
          <div className="container alerts-cta__inner">
            <div>
              <h2 className="alerts-cta__title" id="privacy-title">
                Generated on your device
              </h2>
              <p className="alerts-cta__sub">qr studio never sends your QR content to a server. Create, style, and export without an account.</p>
            </div>
            <div className="alerts-cta__actions">
              <button type="button" className="btn btn--primary" onClick={() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })}>
                Start generating
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer__inner">
            <span className="footer__brand">qr studio</span>
            <nav className="footer__links" aria-label="Footer navigation">
              <a href="#generator" className="footer__link">
                Generator
              </a>
              <a href="#about" className="footer__link">
                About
              </a>
              <a href="#privacy" className="footer__link">
                Privacy
              </a>
            </nav>
            <span className="footer__copy">© {new Date().getFullYear()} qr studio. Built in the browser.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
