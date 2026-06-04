const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Hackathon 7.0 Team";
pres.title = "FaceAuth - Offline Facial Recognition & Liveness Detection";

const C = {
  navy: "0F2B46",
  teal: "028090",
  mint: "02C39A",
  seafoam: "00A896",
  white: "FFFFFF",
  offWhite: "F0F5F4",
  lightTeal: "E0F2F1",
  darkText: "0F2B46",
  bodyText: "37474F",
  muted: "78909C",
  accent: "FF6D00",
};

const mkShadow = () => ({ type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.12 });

// ============ SLIDE 1: TITLE ============
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.navy } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 4.6, w: 10, h: 1.025, fill: { color: C.teal } });
  s.addText("FaceAuth", { x: 0.8, y: 1.0, w: 8.4, h: 1.2, fontSize: 52, fontFace: "Arial Black", color: C.white, bold: true, margin: 0 });
  s.addText("Secure Offline Facial Recognition & Liveness Detection", { x: 0.8, y: 2.2, w: 8.4, h: 0.8, fontSize: 22, fontFace: "Calibri", color: C.mint, margin: 0 });
  s.addText("for Datalake 3.0 | Zero-Network Authentication", { x: 0.8, y: 2.9, w: 8.4, h: 0.5, fontSize: 16, fontFace: "Calibri", color: C.muted, margin: 0 });
  s.addText("HACKATHON 7.0 SUBMISSION", { x: 0.8, y: 4.8, w: 5, h: 0.5, fontSize: 14, fontFace: "Calibri", color: C.white, bold: true, charSpacing: 4, margin: 0 });
  s.addText("June 2026", { x: 6, y: 4.8, w: 3.2, h: 0.5, fontSize: 14, fontFace: "Calibri", color: C.white, align: "right", margin: 0 });
}

// ============ SLIDE 2: PROBLEM STATEMENT ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("The Problem", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const problems = [
    { title: "Zero Connectivity", desc: "Field personnel work in remote locations with no internet access" },
    { title: "Identity Fraud Risk", desc: "Photo-based spoofing can bypass simple camera checks" },
    { title: "Device Constraints", desc: "Must run on mid-range phones with limited GPU and 3GB RAM" },
    { title: "Integration Need", desc: "Must plug into existing Datalake 3.0 React Native architecture" },
  ];
  problems.forEach((p, i) => {
    const y = 1.6 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 8.4, h: 0.8, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 0.08, h: 0.8, fill: { color: C.teal } });
    s.addText(p.title, { x: 1.2, y, w: 2.5, h: 0.8, fontSize: 15, fontFace: "Calibri", color: C.navy, bold: true, valign: "middle", margin: 0 });
    s.addText(p.desc, { x: 3.8, y, w: 5.2, h: 0.8, fontSize: 13, fontFace: "Calibri", color: C.bodyText, valign: "middle", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.6, w: 8.4, h: 0.7, fill: { color: C.navy } });
  s.addText([
    { text: "Challenge: ", options: { bold: true, color: C.mint } },
    { text: "Authenticate field personnel accurately, securely, and entirely offline on standard mobile devices.", options: { color: C.white } },
  ], { x: 1.1, y: 4.6, w: 8, h: 0.7, fontSize: 12, fontFace: "Calibri", valign: "middle" });
}

// ============ SLIDE 3: SOLUTION OVERVIEW ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Our Solution", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const blocks = [
    { label: "MobileFaceNet", sub: "1M params, 128-d embeddings\nTrained on CASIA-WebFace", color: C.teal },
    { label: "ML Kit Detection", sub: "Face landmarks, smile/eye\nprobability, head pose", color: C.seafoam },
    { label: "ONNX Runtime", sub: "On-device inference\nINT8 quantized (1.1 MB)", color: C.mint },
    { label: "React Native", sub: "Cross-platform app\nAndroid + iOS", color: C.navy },
  ];
  blocks.forEach((b, i) => {
    const x = 0.8 + i * 2.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.0, h: 2.2, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.0, h: 0.06, fill: { color: b.color } });
    s.addText(b.label, { x, y: 1.85, w: 2.0, h: 0.5, fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, align: "center", margin: 0 });
    s.addText(b.sub, { x: x + 0.15, y: 2.4, w: 1.7, h: 1.1, fontSize: 11, fontFace: "Calibri", color: C.bodyText, align: "center", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.1, w: 8.4, h: 1.2, fill: { color: C.white }, shadow: mkShadow() });
  s.addText("End-to-End Flow", { x: 1.1, y: 4.15, w: 8, h: 0.4, fontSize: 13, fontFace: "Calibri", color: C.navy, bold: true, margin: 0 });
  s.addText("Camera Capture  →  Face Detection (ML Kit)  →  Liveness Check  →  ONNX Inference  →  Cosine Similarity  →  Auth Result", {
    x: 1.1, y: 4.55, w: 8, h: 0.5, fontSize: 12, fontFace: "Calibri", color: C.teal, bold: true, margin: 0
  });
}

// ============ SLIDE 4: MODEL PERFORMANCE ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Model Performance", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const stats = [
    { value: "99.28%", label: "LFW Accuracy", target: "Target: > 95%" },
    { value: "1.1 MB", label: "Model Size (INT8)", target: "Target: < 20 MB" },
    { value: "63 ms", label: "Inference Latency", target: "Target: < 1000 ms" },
    { value: "1.0 M", label: "Parameters", target: "Lightweight" },
  ];
  stats.forEach((st, i) => {
    const x = 0.8 + i * 2.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.0, h: 1.8, fill: { color: C.white }, shadow: mkShadow() });
    s.addText(st.value, { x, y: 1.7, w: 2.0, h: 0.8, fontSize: 28, fontFace: "Arial Black", color: C.teal, align: "center", valign: "middle", margin: 0 });
    s.addText(st.label, { x, y: 2.5, w: 2.0, h: 0.4, fontSize: 12, fontFace: "Calibri", color: C.navy, bold: true, align: "center", margin: 0 });
    s.addText(st.target, { x, y: 2.9, w: 2.0, h: 0.3, fontSize: 10, fontFace: "Calibri", color: C.muted, align: "center", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 3.7, w: 8.4, h: 1.6, fill: { color: C.white }, shadow: mkShadow() });
  s.addText("Training Details", { x: 1.1, y: 3.8, w: 8, h: 0.35, fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, margin: 0 });

  const details = [
    "Architecture: MobileFaceNet (Inverted Residual blocks + Depthwise Separable Convolutions)",
    "Loss Function: ArcFace (Additive Angular Margin, s=64, m=0.5) for discriminative embeddings",
    "Dataset: CASIA-WebFace (490K images, 10.5K identities) | Evaluation: LFW 6000 pairs",
    "Training: 40 epochs, SGD + cosine LR decay, AMP (FP16), ~6.5 hours on T4 GPU",
  ];
  s.addText(details.map((d, i) => ({
    text: d,
    options: { bullet: true, breakLine: i < details.length - 1, fontSize: 11, color: C.bodyText }
  })), { x: 1.1, y: 4.2, w: 7.8, h: 1.0, fontFace: "Calibri" });
}

// ============ SLIDE 5: LIVENESS DETECTION ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Liveness Detection", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const challenges = [
    { icon: "BLINK", title: "Blink Detection", desc: "eyeOpenProbability < 0.3\nfor both eyes", metric: "ML Kit Classification" },
    { icon: "SMILE", title: "Smile Detection", desc: "smilingProbability > 0.7\nfrom face classification", metric: "ML Kit Classification" },
    { icon: "LEFT", title: "Turn Head Left", desc: "headEulerAngleY > 18°\n(yaw rotation)", metric: "ML Kit Head Pose" },
    { icon: "RIGHT", title: "Turn Head Right", desc: "headEulerAngleY < -18°\n(yaw rotation)", metric: "ML Kit Head Pose" },
  ];
  challenges.forEach((c, i) => {
    const x = 0.8 + i * 2.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.0, h: 2.0, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.0, h: 0.06, fill: { color: C.accent } });
    s.addText(c.icon, { x, y: 1.75, w: 2.0, h: 0.4, fontSize: 14, fontFace: "Calibri", color: C.accent, bold: true, align: "center", margin: 0 });
    s.addText(c.title, { x, y: 2.1, w: 2.0, h: 0.35, fontSize: 13, fontFace: "Calibri", color: C.navy, bold: true, align: "center", margin: 0 });
    s.addText(c.desc, { x: x + 0.1, y: 2.5, w: 1.8, h: 0.6, fontSize: 10, fontFace: "Calibri", color: C.bodyText, align: "center", margin: 0 });
    s.addText(c.metric, { x, y: 3.15, w: 2.0, h: 0.3, fontSize: 9, fontFace: "Calibri", color: C.muted, italic: true, align: "center", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 3.9, w: 8.4, h: 1.4, fill: { color: C.navy } });
  s.addText("Anti-Spoofing Strategy", { x: 1.1, y: 4.0, w: 8, h: 0.35, fontSize: 14, fontFace: "Calibri", color: C.mint, bold: true, margin: 0 });
  const strats = [
    "Randomized 3-challenge sequence from 4 possible actions prevents replay attacks",
    "Real-time ML Kit processing ensures challenges are performed live, not pre-recorded",
    "Each challenge has a timeout window — static photos cannot pass dynamic checks",
  ];
  s.addText(strats.map((st, i) => ({
    text: st,
    options: { bullet: true, breakLine: i < strats.length - 1, fontSize: 11, color: C.white }
  })), { x: 1.1, y: 4.4, w: 7.8, h: 0.8, fontFace: "Calibri" });
}

// ============ SLIDE 6: APP ARCHITECTURE ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("App Architecture", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const layers = [
    { label: "React Native UI Layer", items: "Navigation, Screens, Theme, Animations", color: C.teal, y: 1.5 },
    { label: "Service Layer (TypeScript)", items: "Database, Sync, Embedding Utils, Liveness Logic", color: C.seafoam, y: 2.4 },
    { label: "Native Bridge (Kotlin)", items: "FaceProcessorModule — Camera to Embedding pipeline", color: C.mint, y: 3.3 },
    { label: "ML Engine Layer", items: "ML Kit Face Detection  |  ONNX Runtime  |  MobileFaceNet INT8", color: C.navy, y: 4.2 },
  ];
  layers.forEach((l) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: l.y, w: 8.4, h: 0.75, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: l.y, w: 0.08, h: 0.75, fill: { color: l.color } });
    s.addText(l.label, { x: 1.2, y: l.y, w: 3.0, h: 0.75, fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, valign: "middle", margin: 0 });
    s.addText(l.items, { x: 4.3, y: l.y, w: 4.7, h: 0.75, fontSize: 12, fontFace: "Calibri", color: C.bodyText, valign: "middle", margin: 0 });
  });

  // Arrows between layers
  [2.25, 3.15, 4.05].forEach(y => {
    s.addText("▼", { x: 4.7, y: y, w: 0.6, h: 0.2, fontSize: 12, color: C.teal, align: "center", margin: 0 });
  });
}

// ============ SLIDE 7: OFFLINE-FIRST DESIGN ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Offline-First Design", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  // Left column: Data Flow
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.5, w: 4.0, h: 3.8, fill: { color: C.white }, shadow: mkShadow() });
  s.addText("Data Flow", { x: 1.0, y: 1.6, w: 3.6, h: 0.4, fontSize: 16, fontFace: "Calibri", color: C.navy, bold: true, margin: 0 });

  const flow = [
    { step: "1", label: "ENROLL", desc: "Capture face → Generate embedding → Store locally" },
    { step: "2", label: "AUTH", desc: "Liveness check → Capture → Match against stored" },
    { step: "3", label: "LOG", desc: "Record authentication attempt with timestamp" },
    { step: "4", label: "SYNC", desc: "When online: push data to AWS endpoint" },
    { step: "5", label: "PURGE", desc: "After sync confirmation: remove synced data" },
  ];
  flow.forEach((f, i) => {
    const y = 2.15 + i * 0.6;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.1, y, w: 0.35, h: 0.35, fill: { color: C.teal } });
    s.addText(f.step, { x: 1.1, y, w: 0.35, h: 0.35, fontSize: 12, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
    s.addText(f.label, { x: 1.6, y, w: 0.8, h: 0.35, fontSize: 10, fontFace: "Calibri", color: C.teal, bold: true, valign: "middle", margin: 0 });
    s.addText(f.desc, { x: 2.45, y, w: 2.1, h: 0.35, fontSize: 10, fontFace: "Calibri", color: C.bodyText, valign: "middle", margin: 0 });
  });

  // Right column: Storage
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.5, w: 4.0, h: 3.8, fill: { color: C.white }, shadow: mkShadow() });
  s.addText("Storage & Sync", { x: 5.4, y: 1.6, w: 3.6, h: 0.4, fontSize: 16, fontFace: "Calibri", color: C.navy, bold: true, margin: 0 });

  const storage = [
    { title: "Local Storage", desc: "AsyncStorage for face embeddings (128-d float arrays) and auth logs" },
    { title: "Network Detection", desc: "NetInfo monitors connectivity changes in real-time" },
    { title: "Auto Sync", desc: "When network available, push unsynced records to configured AWS endpoint" },
    { title: "Purge Policy", desc: "After successful sync, synced records are removed from device" },
    { title: "Conflict Resolution", desc: "Server-side timestamp reconciliation for multi-device scenarios" },
  ];
  storage.forEach((st, i) => {
    const y = 2.15 + i * 0.6;
    s.addText(st.title, { x: 5.5, y, w: 1.5, h: 0.35, fontSize: 10, fontFace: "Calibri", color: C.navy, bold: true, valign: "middle", margin: 0 });
    s.addText(st.desc, { x: 7.0, y, w: 2.0, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.bodyText, valign: "middle", margin: 0 });
  });
}

// ============ SLIDE 8: TECHNICAL SPECS ============
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addText("Technical Specifications", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.white, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const specs = [
    { spec: "Model Footprint", value: "1.1 MB", target: "< 20 MB", pass: true },
    { spec: "Inference Speed", value: "63 ms", target: "< 1000 ms", pass: true },
    { spec: "Recognition Accuracy", value: "99.28%", target: "> 95%", pass: true },
    { spec: "Min Android", value: "API 24 (7.0)", target: "Android 8.0+", pass: true },
    { spec: "Min RAM", value: "1 GB used", target: "3 GB device", pass: true },
    { spec: "Open Source", value: "100%", target: "Required", pass: true },
  ];

  s.addTable(
    [
      [
        { text: "Specification", options: { fill: { color: C.teal }, color: C.white, bold: true, fontSize: 13 } },
        { text: "Achieved", options: { fill: { color: C.teal }, color: C.white, bold: true, fontSize: 13 } },
        { text: "Target", options: { fill: { color: C.teal }, color: C.white, bold: true, fontSize: 13 } },
        { text: "Status", options: { fill: { color: C.teal }, color: C.white, bold: true, fontSize: 13 } },
      ],
      ...specs.map(sp => [
        { text: sp.spec, options: { fontSize: 12, color: C.white } },
        { text: sp.value, options: { fontSize: 12, color: C.mint, bold: true } },
        { text: sp.target, options: { fontSize: 12, color: C.muted } },
        { text: sp.pass ? "PASS" : "FAIL", options: { fontSize: 12, color: sp.pass ? "02C39A" : "FF1744", bold: true } },
      ]),
    ],
    {
      x: 0.8, y: 1.6, w: 8.4,
      border: { pt: 0.5, color: "1A3A5C" },
      fill: { color: "0A1F33" },
      colW: [2.5, 2.0, 2.0, 1.9],
      rowH: [0.45, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
      fontFace: "Calibri",
    }
  );

  s.addText("All hackathon technical constraints satisfied with significant margin", {
    x: 0.8, y: 4.8, w: 8.4, h: 0.4, fontSize: 14, fontFace: "Calibri", color: C.mint, italic: true, align: "center", margin: 0
  });
}

// ============ SLIDE 9: DEMO PLACEHOLDER ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Live Demo", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  const screens = ["Home Dashboard", "Face Enrollment", "Liveness Detection", "Auth Result"];
  screens.forEach((scr, i) => {
    const x = 0.8 + i * 2.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.8, w: 2.0, h: 3.2, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.2, y: 2.0, w: 1.6, h: 2.4, fill: { color: C.lightTeal } });
    s.addText("Screenshot", { x: x + 0.2, y: 2.8, w: 1.6, h: 0.4, fontSize: 11, fontFace: "Calibri", color: C.muted, align: "center", margin: 0 });
    s.addText(scr, { x, y: 4.55, w: 2.0, h: 0.35, fontSize: 11, fontFace: "Calibri", color: C.navy, bold: true, align: "center", margin: 0 });
  });
}

// ============ SLIDE 10: DATALAKE INTEGRATION ============
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: 5.625, fill: { color: C.teal } });
  s.addText("Datalake 3.0 Integration", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 32, fontFace: "Arial Black", color: C.navy, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 1.5, h: 0.04, fill: { color: C.mint } });

  // Integration points
  const points = [
    { title: "React Native Compatible", desc: "Built as a standalone React Native module with TypeScript. Drop-in integration via npm package or direct source inclusion into the Datalake app." },
    { title: "Sync API Contract", desc: "POST /api/sync endpoint receives JSON payload with enrollment data and auth logs. Device timestamp included for server-side reconciliation." },
    { title: "AWS-Ready Sync", desc: "Configurable server URL. Auto-detects network via NetInfo. Batch sync of unsynced records. Supports custom auth headers for AWS API Gateway." },
    { title: "Purge After Sync", desc: "Once server confirms receipt, synced records are purged from the device. Keeps storage lean for extended offline operation periods." },
  ];
  points.forEach((p, i) => {
    const y = 1.5 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 8.4, h: 0.8, fill: { color: C.white }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 0.08, h: 0.8, fill: { color: C.teal } });
    s.addText(p.title, { x: 1.2, y, w: 2.5, h: 0.8, fontSize: 13, fontFace: "Calibri", color: C.navy, bold: true, valign: "middle", margin: 0 });
    s.addText(p.desc, { x: 3.8, y, w: 5.2, h: 0.8, fontSize: 11, fontFace: "Calibri", color: C.bodyText, valign: "middle", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.4, w: 8.4, h: 0.9, fill: { color: C.navy } });
  s.addText("Designed for seamless integration with zero changes to the existing Datalake 3.0 codebase", {
    x: 1.1, y: 4.5, w: 7.8, h: 0.7, fontSize: 13, fontFace: "Calibri", color: C.mint, align: "center", valign: "middle", margin: 0
  });
}

// ============ SLIDE 11: THANK YOU ============
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 4.6, w: 10, h: 1.025, fill: { color: C.teal } });
  s.addText("Thank You", { x: 0.8, y: 1.2, w: 8.4, h: 1.2, fontSize: 48, fontFace: "Arial Black", color: C.white, align: "center", margin: 0 });
  s.addText("Questions & Discussion", { x: 0.8, y: 2.4, w: 8.4, h: 0.6, fontSize: 22, fontFace: "Calibri", color: C.mint, align: "center", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 3.1, w: 3, h: 0.04, fill: { color: C.mint } });
  s.addText("FaceAuth  |  Hackathon 7.0  |  Datalake 3.0", {
    x: 0.8, y: 3.4, w: 8.4, h: 0.5, fontSize: 14, fontFace: "Calibri", color: C.muted, align: "center", margin: 0
  });
  s.addText("Open Source  •  Offline-First  •  99.28% Accuracy  •  1.1 MB Model", {
    x: 0.8, y: 4.75, w: 8.4, h: 0.5, fontSize: 13, fontFace: "Calibri", color: C.white, align: "center", margin: 0
  });
}

const outPath = "C:\\Users\\Khamir\\OneDrive\\Desktop\\Face Detect\\FaceAuthApp\\FaceAuth_Presentation.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Presentation saved to:", outPath);
}).catch(err => {
  console.error("Error:", err);
});
