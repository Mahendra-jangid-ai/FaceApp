const pptxgen = require("pptxgenjs");
const path = require("path");

const DOCS = path.join(__dirname, "..", "docs");
const SS = path.join(DOCS, "screenshots");
const LOGO = path.join(DOCS, "nhai_logo.png");
const shot = (n) => path.join(SS, n);

// Palette
const C = {
  bg: "0A0E1A", panel: "121A2E", panel2: "0E1424", line: "1E2A44",
  text: "F1F5FB", dim: "A6B6CE", faint: "67789A",
  orange: "FF6B35", cyan: "00D4FF", green: "00E676", navy: "1F5FCB", yellow: "FFC107",
};
const HF = "Arial Black"; // headers
const BF = "Arial";       // body
const MF = "Consolas";    // mono

const sh = () => ({ type: "outer", color: "000000", blur: 9, offset: 4, angle: 135, opacity: 0.45 });

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "NHAI Face Auth Team";
pres.title = "NHAI Face Auth — Hackathon 7.0";
const W = 13.333, H = 7.5;

function bg(s, color = C.bg) { s.background = { color }; }

// soft glow blobs
function glow(s, x, y, d, color, op = 18) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color, transparency: 100 - op }, line: { type: "none" } });
}

function footer(s, n) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 7.18, w: W, h: 0.32, fill: { color: C.panel2 }, line: { type: "none" } });
  s.addText("NHAI FACE AUTH", { x: 0.5, y: 7.18, w: 5, h: 0.32, fontFace: MF, fontSize: 9, color: C.faint, align: "left", valign: "middle", charSpacing: 2, margin: 0 });
  s.addText("NHAI Hackathon 7.0", { x: 4, y: 7.18, w: 5.333, h: 0.32, fontFace: BF, fontSize: 9, color: C.faint, align: "center", valign: "middle", margin: 0 });
  s.addText(String(n), { x: 12.3, y: 7.18, w: 0.6, h: 0.32, fontFace: MF, fontSize: 9, color: C.orange, align: "right", valign: "middle", margin: 0, bold: true });
}

function kicker(s, text, color = C.orange) {
  s.addText(text.toUpperCase(), { x: 0.7, y: 0.5, w: 11, h: 0.35, fontFace: BF, fontSize: 13, color, bold: true, charSpacing: 3, margin: 0 });
}
function title(s, text) {
  s.addText(text, { x: 0.7, y: 0.85, w: 12, h: 1.0, fontFace: HF, fontSize: 33, color: C.text, bold: true, margin: 0 });
}

// rounded card
function card(s, x, y, w, h, fill = C.panel) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: C.line, width: 1 }, rectRadius: 0.12, shadow: sh() });
}
function chip(s, x, y, w, label, color) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.42, fill: { color: C.bg }, line: { color: C.line, width: 1 }, rectRadius: 0.21 });
  s.addText(label, { x, y, w, h: 0.42, fontFace: MF, fontSize: 11, color, align: "center", valign: "middle", margin: 0 });
}
// colored dot "icon" chip
function dot(s, x, y, color) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 0.5, h: 0.5, fill: { color: color + "" }, line: { type: "none" }, rectRadius: 0.12 });
}

const phoneW = (h) => h * (1080 / 2280);
function phone(s, img, cx, y, h, caption) {
  const w = phoneW(h);
  s.addImage({ path: img, x: cx - w / 2, y, w, h, rounding: false });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - w / 2, y, w, h, fill: { type: "none" }, line: { color: C.line, width: 1.25 }, rectRadius: 0.08 });
  if (caption) s.addText(caption, { x: cx - 1.5, y: y + h + 0.08, w: 3, h: 0.3, fontFace: BF, fontSize: 11, color: C.dim, align: "center", bold: true, margin: 0 });
}

/* ───────────────────────── 1 · TITLE ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  glow(s, 8.5, -2, 7, C.orange, 16);
  glow(s, -2.5, 3.5, 7, C.cyan, 14);
  // logo on white rounded tile
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.97, y: 0.85, w: 1.4, h: 1.4, fill: { color: "FFFFFF" }, line: { type: "none" }, rectRadius: 0.18, shadow: sh() });
  s.addImage({ path: LOGO, x: 6.07, y: 0.97, w: 1.2, h: 1.16 });
  s.addText([{ text: "NHAI ", options: { color: C.text } }, { text: "FACE AUTH", options: { color: C.orange } }],
    { x: 0, y: 2.55, w: W, h: 0.95, fontFace: HF, fontSize: 52, bold: true, align: "center", margin: 0 });
  s.addText("Offline-first biometric authentication & attendance for highway worksites",
    { x: 1.5, y: 3.65, w: 10.333, h: 0.5, fontFace: BF, fontSize: 18, color: C.dim, align: "center", margin: 0 });
  // badges
  const badges = [["99.28% LFW", C.green], ["1.15 MB MODEL", C.orange], ["63 ms / FACE", C.cyan], ["100% OFFLINE", C.navy]];
  const bw = 2.5, gap = 0.25, totalW = badges.length * bw + (badges.length - 1) * gap;
  let bx = (W - totalW) / 2;
  badges.forEach(([t, c]) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: 4.5, w: bw, h: 0.62, fill: { color: C.panel }, line: { color: c, width: 1.25 }, rectRadius: 0.31 });
    s.addText(t, { x: bx, y: 4.5, w: bw, h: 0.62, fontFace: HF, fontSize: 14, color: c, align: "center", valign: "middle", margin: 0 });
    bx += bw + gap;
  });
  s.addText("NHAI HACKATHON 7.0   ·   DATALAKE 3.0 READY", { x: 0, y: 5.6, w: W, h: 0.4, fontFace: MF, fontSize: 13, color: C.faint, align: "center", charSpacing: 3, margin: 0 });
}

/* ───────────────────────── 2 · PROBLEM ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "The Problem", C.orange); title(s, "Attendance breaks down where the highway is built");
  s.addText([
    { text: "NHAI manages 50,000+ construction workers across remote highway stretches with little or no connectivity.", options: { breakLine: true, paraSpaceAfter: 10 } },
    { text: "Paper registers invite proxy punching. Online biometric devices fail in the field. There is no reliable way to prove who was actually on-site — or that they were safe to be there.", options: {} },
  ], { x: 0.7, y: 2.1, w: 6.0, h: 2.6, fontFace: BF, fontSize: 16, color: C.dim, lineSpacingMultiple: 1.15, valign: "top", margin: 0 });

  const stats = [["50,000+", "workers across remote sites", C.orange], ["0", "bars of signal in the field", C.cyan], ["NIL", "verifiable proof of presence", C.green]];
  let y = 1.95;
  stats.forEach(([n, l, c]) => {
    card(s, 7.4, y, 5.2, 1.45);
    s.addShape(pres.shapes.RECTANGLE, { x: 7.4, y: y, w: 0.09, h: 1.45, fill: { color: c }, line: { type: "none" } });
    s.addText(n, { x: 7.7, y: y + 0.18, w: 2.4, h: 1.1, fontFace: HF, fontSize: 40, color: c, valign: "middle", margin: 0 });
    s.addText(l, { x: 10.0, y: y + 0.18, w: 2.45, h: 1.1, fontFace: BF, fontSize: 14, color: C.dim, valign: "middle", margin: 0 });
    y += 1.65;
  });
  footer(s, 2);
}

/* ───────────────────────── 3 · SOLUTION ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "Our Solution", C.cyan); title(s, "Authenticate any worker by face — fully offline");
  const items = [
    ["Custom face recognition", "A MobileFaceNet model we trained ourselves — 99.28% LFW.", C.orange],
    ["Liveness + anti-spoofing", "Blink / smile / head-turn challenges defeat photo & video replay.", C.cyan],
    ["Privacy by design", "BioHash cancellable templates — the raw face is never stored.", C.green],
    ["Safety + presence", "GPS geofencing and PPE checks gate every check-in.", C.yellow],
    ["Syncs when online", "Offline-first; pushes to NHAI Datalake 3.0 when a signal returns.", C.navy],
  ];
  let y = 2.0;
  items.forEach(([h, d, c]) => {
    dot(s, 0.7, y + 0.05, c);
    s.addText(h, { x: 1.35, y: y - 0.05, w: 6.4, h: 0.4, fontFace: HF, fontSize: 16, color: C.text, margin: 0 });
    s.addText(d, { x: 1.35, y: y + 0.32, w: 6.6, h: 0.45, fontFace: BF, fontSize: 13, color: C.dim, margin: 0 });
    y += 0.98;
  });
  phone(s, shot("home.png"), 10.7, 1.85, 4.7, "Command Center");
  footer(s, 3);
}

/* ───────────────────────── 4 · CUSTOM MODEL (HERO) ───────────────────────── */
{
  const s = pres.addSlide(); bg(s, C.panel2);
  glow(s, 9.5, -2.5, 7, C.cyan, 14);
  kicker(s, "The AI we built", C.cyan);
  title(s, "A custom model — trained from scratch, not an API");
  // big hero stat
  card(s, 0.7, 2.0, 3.5, 3.0, C.panel);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.0, w: 3.5, h: 0.09, fill: { color: C.green }, line: { type: "none" } });
  s.addText("99.28%", { x: 0.7, y: 2.45, w: 3.5, h: 1.1, fontFace: HF, fontSize: 52, color: C.green, align: "center", margin: 0 });
  s.addText("LFW 10-fold\nverification accuracy", { x: 0.7, y: 3.5, w: 3.5, h: 0.8, fontFace: BF, fontSize: 14, color: C.dim, align: "center", margin: 0 });
  s.addText("MobileFaceNet + ArcFace", { x: 0.7, y: 4.35, w: 3.5, h: 0.4, fontFace: MF, fontSize: 12, color: C.orange, align: "center", margin: 0 });

  // stat grid 2x3
  const g = [["490,623", "training images", C.text], ["10,572", "identities", C.text],
    ["1.0 M", "parameters", C.orange], ["128-D", "embedding", C.cyan],
    ["1.15 MB", "INT8 model size", C.orange], ["63 ms", "CPU latency / face", C.cyan]];
  const gx = 4.5, gy = 2.0, cw = 2.6, ch = 0.92, gpx = 0.18, gpy = 0.18;
  g.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = gx + col * (cw + gpx), y = gy + row * (ch + gpy);
    card(s, x, y, cw, ch);
    s.addText(it[0], { x: x + 0.15, y: y + 0.08, w: cw - 0.3, h: 0.5, fontFace: HF, fontSize: 22, color: it[2], margin: 0 });
    s.addText(it[1], { x: x + 0.15, y: y + 0.55, w: cw - 0.3, h: 0.3, fontFace: BF, fontSize: 11, color: C.dim, margin: 0 });
  });
  // pipeline chips
  const pipe = ["CASIA-WebFace", "MobileFaceNet", "ArcFace s=64 m=0.5", "SGD + cosine LR", "PyTorch -> ONNX -> INT8", "LFW / CFP-FP / AgeDB"];
  let px = 4.5, py = 4.05;
  s.addText("TRAINING PIPELINE", { x: 4.5, y: py, w: 8, h: 0.3, fontFace: BF, fontSize: 11, color: C.faint, bold: true, charSpacing: 2, margin: 0 });
  py += 0.4;
  let cx2 = 4.5;
  const cws = [2.0, 2.0, 2.5, 2.2, 2.9, 2.6];
  pipe.forEach((t, i) => {
    if (cx2 + cws[i] > 13.0) { cx2 = 4.5; py += 0.55; }
    chip(s, cx2, py, cws[i], t, C.dim);
    cx2 += cws[i] + 0.15;
  });
  // constraints line
  s.addText([
    { text: "ALL HACKATHON CONSTRAINTS  ", options: { color: C.dim, fontFace: BF, fontSize: 12 } },
    { text: "PASS", options: { color: C.green, fontFace: HF, fontSize: 13, bold: true } },
    { text: "   ·  < 20 MB  ·  < 1 s/face  ·  > 95% LFW  ·  self-trained", options: { color: C.faint, fontFace: MF, fontSize: 11 } },
  ], { x: 0.7, y: 5.7, w: 12, h: 0.4, align: "left", margin: 0 });
  footer(s, 4);
}

/* ───────────────────────── 5 · RECOGNITION PIPELINE ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "How it works", C.orange); title(s, "From camera frame to verified identity");
  const steps = [
    ["1", "Capture", "VisionCamera v5\nfront / back", C.orange],
    ["2", "Detect", "ML Kit face +\nlandmarks", C.cyan],
    ["3", "Embed", "128-D MobileFaceNet\nvector", C.green],
    ["4", "Protect", "BioHash +\nAES-256", C.yellow],
    ["5", "Match", "Cosine vs adaptive\nthreshold", C.navy],
  ];
  const n = steps.length, cw = 2.18, gap = 0.32;
  const total = n * cw + (n - 1) * gap;
  let x = (W - total) / 2, y = 2.4;
  steps.forEach((st, i) => {
    card(s, x, y, cw, 2.1);
    s.addShape(pres.shapes.OVAL, { x: x + cw / 2 - 0.32, y: y + 0.25, w: 0.64, h: 0.64, fill: { color: st[3] }, line: { type: "none" } });
    s.addText(st[0], { x: x + cw / 2 - 0.32, y: y + 0.25, w: 0.64, h: 0.64, fontFace: HF, fontSize: 22, color: C.bg, align: "center", valign: "middle", margin: 0 });
    s.addText(st[1], { x: x, y: y + 1.0, w: cw, h: 0.4, fontFace: HF, fontSize: 17, color: C.text, align: "center", margin: 0 });
    s.addText(st[2], { x: x + 0.1, y: y + 1.42, w: cw - 0.2, h: 0.6, fontFace: BF, fontSize: 11.5, color: C.dim, align: "center", margin: 0 });
    if (i < n - 1) s.addText(">", { x: x + cw, y: y + 0.6, w: gap, h: 0.8, fontFace: BF, fontSize: 26, color: C.faint, bold: true, align: "center", valign: "middle", margin: 0 });
    x += cw + gap;
  });
  card(s, 0.7, 5.05, 11.93, 1.5, C.panel2);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 5.05, w: 0.09, h: 1.5, fill: { color: C.cyan }, line: { type: "none" } });
  s.addText("Resilience by design", { x: 1.0, y: 5.2, w: 11, h: 0.4, fontFace: HF, fontSize: 16, color: C.cyan, margin: 0 });
  s.addText("The neural ONNX embedding runs with an eye-aligned geometric landmark fallback — translation-, scale- and rotation-invariant — so recognition works on every phone, even where the runtime lacks the quantized operator set. No device is left unsupported.",
    { x: 1.0, y: 5.62, w: 11.4, h: 0.85, fontFace: BF, fontSize: 13, color: C.dim, margin: 0, valign: "top" });
  footer(s, 5);
}

/* ───────────────────────── 6 · SECURITY ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "Trust & Security", C.green); title(s, "Hard to fool. Safe with the data.");
  const cards = [
    ["Active Liveness", "Three randomized challenges — blink, smile, head-turn — with live progress. Defeats printed photos and video replay.", C.cyan],
    ["Anti-Spoofing", "Laplacian-variance texture analysis flags screens and prints before a match is ever attempted.", C.orange],
    ["BioHash Privacy", "ISO/IEC 24745 cancellable templates. The raw 128-D face vector is never stored and can be revoked & re-issued.", C.green],
    ["Encryption & Lockout", "AES-256-GCM at rest, 3-attempt lockout with cooldown, and GDPR-style retention with auto-purge.", C.yellow],
  ];
  const cw = 5.95, ch = 2.05, gx = 0.7, gy = 2.05, px = 0.23, py = 0.25;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + px), y = gy + row * (ch + py);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: y + 0.3, w: 0.5, h: 0.5, fill: { color: c[2] }, line: { type: "none" }, rectRadius: 0.12 });
    s.addText(c[0], { x: x + 1.0, y: y + 0.28, w: cw - 1.2, h: 0.55, fontFace: HF, fontSize: 19, color: C.text, valign: "middle", margin: 0 });
    s.addText(c[1], { x: x + 0.32, y: y + 0.95, w: cw - 0.6, h: 0.95, fontFace: BF, fontSize: 13.5, color: C.dim, valign: "top", margin: 0 });
  });
  footer(s, 6);
}

/* ───────────────────────── 7 · FIELD FEATURES ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "Built for the field", C.orange); title(s, "More than attendance — a worksite safety checkpoint");
  const f = [
    ["GPS Geofencing", "Check-in / out validated against site boundaries.", C.cyan],
    ["PPE Compliance", "Helmet & hi-vis vest detection gates site entry.", C.orange],
    ["Aadhaar Linkage", "Optional capture with Verhoeff checksum + masking.", C.green],
    ["Offline-First Sync", "Zero-signal operation; retries to Datalake 3.0.", C.navy],
    ["Live Analytics", "Pass rate, confidence, spoof blocks, 7-day trends.", C.yellow],
    ["Hindi / English", "Voice prompts and high-contrast outdoor UI.", C.cyan],
  ];
  const cw = 3.84, ch = 1.95, gx = 0.7, gy = 2.05, px = 0.2, py = 0.22;
  f.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = gx + col * (cw + px), y = gy + row * (ch + py);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.42, h: 0.42, fill: { color: c[2] }, line: { type: "none" } });
    s.addText(c[0], { x: x + 0.3, y: y + 0.82, w: cw - 0.6, h: 0.4, fontFace: HF, fontSize: 16, color: C.text, margin: 0 });
    s.addText(c[1], { x: x + 0.3, y: y + 1.22, w: cw - 0.6, h: 0.6, fontFace: BF, fontSize: 12.5, color: C.dim, margin: 0, valign: "top" });
  });
  footer(s, 7);
}

/* ───────────────────────── 8 · WALKTHROUGH ───────────────────────── */
{
  const s = pres.addSlide(); bg(s, C.panel2);
  kicker(s, "The app", C.cyan); title(s, "A dark command center for site supervisors");
  phone(s, shot("home.png"), 3.0, 1.95, 4.55, "Command Center");
  phone(s, shot("enroll.png"), 6.667, 1.95, 4.55, "Face Enrolment");
  phone(s, shot("dashboard.png"), 10.333, 1.95, 4.55, "Security Analytics");
  footer(s, 8);
}

/* ───────────────────────── 9 · MORE SCREENS ───────────────────────── */
{
  const s = pres.addSlide(); bg(s, C.panel2);
  kicker(s, "The app", C.cyan); title(s, "Twelve screens, one coherent system");
  const imgs = [["attendance.png", "Attendance"], ["calendar.png", "Calendar"], ["people.png", "Worker Registry"], ["history.png", "Auth History"]];
  const n = imgs.length, hgt = 4.35, w = phoneW(hgt), gap = 0.6;
  const total = n * w + (n - 1) * gap;
  let x = (W - total) / 2 + w / 2, y = 2.0;
  imgs.forEach(([img, cap]) => { phone(s, shot(img), x, y, hgt, cap); x += w + gap; });
  footer(s, 9);
}

/* ───────────────────────── 10 · ARCHITECTURE ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "Under the hood", C.orange); title(s, "Engineering that holds up in production");
  const layers = [
    ["On-Device Pipeline", ["VisionCamera v5 capture", "ML Kit detection + landmarks", "MobileFaceNet 128-D (ONNX)", "Eye-aligned geometric fallback", "Cosine match · adaptive threshold"], C.cyan],
    ["Security & Privacy", ["BioHash ISO/IEC 24745", "AES-256-GCM at rest", "Liveness + Laplacian anti-spoof", "3-attempt lockout + cooldown", "GDPR-style retention & purge"], C.green],
    ["Platform", ["React Native 0.85 · Hermes", "Native Kotlin face-processor", "Encrypted offline-first store", "Background sync → Datalake 3.0", "Standalone APK · no server"], C.orange],
    ["Field Features", ["GPS geofencing", "PPE helmet / vest gate", "Aadhaar Verhoeff validation", "Hindi / English voice", "Live analytics & trends"], C.yellow],
  ];
  const cw = 5.95, ch = 2.05, gx = 0.7, gy = 2.0, px = 0.23, py = 0.22;
  layers.forEach((L, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + px), y = gy + row * (ch + py);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 0.09, h: ch, fill: { color: L[2] }, line: { type: "none" } });
    s.addText(L[0], { x: x + 0.3, y: y + 0.16, w: cw - 0.6, h: 0.4, fontFace: HF, fontSize: 16, color: L[2], margin: 0 });
    s.addText(L[1].map((t, k) => ({ text: t, options: { bullet: true, color: C.dim, fontSize: 12, breakLine: true, paraSpaceAfter: 3 } })),
      { x: x + 0.35, y: y + 0.6, w: cw - 0.6, h: ch - 0.7, fontFace: BF, valign: "top", margin: 0 });
  });
  footer(s, 10);
}

/* ───────────────────────── 11 · WHY WE WIN ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  kicker(s, "Why we win", C.green); title(s, "Built for the brief — and beyond it");
  const headerFill = C.panel;
  const rows = [
    [{ text: "Capability", options: { bold: true, color: C.text } }, { text: "NHAI Face Auth", options: { bold: true, color: C.green } }, { text: "Typical systems", options: { bold: true, color: C.faint } }],
    ["Works fully offline", "Yes — every feature on-device", "Needs connectivity"],
    ["Face model", "Self-trained, 99.28% LFW, 1.15 MB", "Cloud API or 10–50 MB"],
    ["Template protection", "BioHash (raw face never stored)", "Raw embedding stored"],
    ["Liveness & anti-spoof", "3 challenges + texture analysis", "Single-factor or none"],
    ["Device coverage", "Neural + geometric fallback", "Fails on unsupported ops"],
    ["Beyond attendance", "Geofence + PPE safety gate", "Attendance only"],
  ];
  const tbl = rows.map((r, ri) => r.map((cell) => {
    const base = { fontFace: BF, fontSize: 13.5, valign: "middle", color: C.dim,
      fill: { color: ri === 0 ? headerFill : (ri % 2 ? C.panel2 : C.bg) },
      border: [{ pt: 1, color: C.line }, { pt: 1, color: C.line }, { pt: 1, color: C.line }, { pt: 1, color: C.line }],
      margin: [4, 8, 4, 8] };
    if (typeof cell === "string") return { text: cell, options: base };
    return { text: cell.text, options: { ...base, ...cell.options } };
  }));
  s.addTable(tbl, { x: 0.7, y: 2.05, w: 11.93, colW: [3.6, 4.5, 3.83], rowH: 0.62, autoPage: false });
  footer(s, 11);
}

/* ───────────────────────── 12 · CLOSING ───────────────────────── */
{
  const s = pres.addSlide(); bg(s);
  glow(s, 8.5, 2.5, 7, C.orange, 16);
  glow(s, -2.5, -2.5, 7, C.cyan, 13);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.17, y: 1.0, w: 1.0, h: 1.0, fill: { color: "FFFFFF" }, line: { type: "none" }, rectRadius: 0.14, shadow: sh() });
  s.addImage({ path: LOGO, x: 6.25, y: 1.1, w: 0.84, h: 0.81 });
  s.addText("Ready for the field. Ready to win.", { x: 0, y: 2.3, w: W, h: 0.9, fontFace: HF, fontSize: 38, color: C.text, align: "center", margin: 0 });
  s.addText("A custom-trained face model at 99.28% LFW, wrapped in an offline-first, privacy-first app that makes NHAI worksite attendance trustworthy — with or without a signal.",
    { x: 2.0, y: 3.3, w: 9.333, h: 1.0, fontFace: BF, fontSize: 16, color: C.dim, align: "center", margin: 0 });
  const badges = [["99.28% LFW", C.green], ["1.15 MB", C.orange], ["63 ms/FACE", C.cyan], ["100% OFFLINE", C.navy]];
  const bw = 2.4, gap = 0.25, totalW = badges.length * bw + (badges.length - 1) * gap;
  let bx = (W - totalW) / 2;
  badges.forEach(([t, c]) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: 4.45, w: bw, h: 0.6, fill: { color: C.panel }, line: { color: c, width: 1.25 }, rectRadius: 0.3 });
    s.addText(t, { x: bx, y: 4.45, w: bw, h: 0.6, fontFace: HF, fontSize: 14, color: c, align: "center", valign: "middle", margin: 0 });
    bx += bw + gap;
  });
  s.addText("NHAI FACE AUTH  ·  NATIONAL HIGHWAYS AUTHORITY OF INDIA  ·  HACKATHON 7.0", { x: 0, y: 5.5, w: W, h: 0.4, fontFace: MF, fontSize: 12, color: C.faint, align: "center", charSpacing: 2, margin: 0 });
}

pres.writeFile({ fileName: path.join(__dirname, "NHAI_FaceAuth_FINAL.pptx") }).then((f) => console.log("WROTE", f));
