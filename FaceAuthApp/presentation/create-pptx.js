const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "FaceAuth Pro Team";
pres.title = "FaceAuth Pro v2.0 — NHAI Hackathon 7.0";

// ── Color palette: Midnight Executive ──
const C = {
  navy: "1A2744",
  blue: "1A73E8",
  blueDark: "0D47A1",
  blueLight: "E3F2FD",
  white: "FFFFFF",
  offWhite: "F5F7FA",
  text: "1A1A2E",
  textMuted: "6B7280",
  green: "00C853",
  greenLight: "E8F5E9",
  red: "FF1744",
  accent: "00BFA5",
  gold: "FF9100",
};

const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.12 });

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Top accent bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.blue } });

  // Title
  s.addText("FaceAuth Pro", {
    x: 0.8, y: 1.0, w: 8.4, h: 1.2,
    fontSize: 54, fontFace: "Calibri", color: C.white, bold: true, margin: 0,
  });
  s.addText("v2.0", {
    x: 0.8, y: 2.1, w: 8.4, h: 0.6,
    fontSize: 28, fontFace: "Calibri", color: C.blue, bold: true, margin: 0,
  });

  // Subtitle
  s.addText("Offline Face Recognition & Geofenced Attendance\nfor Datalake 3.0", {
    x: 0.8, y: 3.0, w: 8.4, h: 0.9,
    fontSize: 18, fontFace: "Calibri", color: "CADCFC", margin: 0,
  });

  // Bottom bar with badges
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 4.8, w: 10, h: 0.825, fill: { color: "0F1B33" } });
  s.addText("NHAI Hackathon 7.0", {
    x: 0.8, y: 4.9, w: 3, h: 0.6,
    fontSize: 14, fontFace: "Calibri", color: "CADCFC", bold: true, margin: 0,
  });

  // Badge pills
  const badges = ["99.28% LFW", "1.15 MB", "100% Offline", "5-Layer Security"];
  badges.forEach((b, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 4.2 + i * 1.5, y: 5.0, w: 1.35, h: 0.35,
      fill: { color: C.blue }, rectRadius: 0.05,
    });
    s.addText(b, {
      x: 4.2 + i * 1.5, y: 5.0, w: 1.35, h: 0.35,
      fontSize: 9, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2 — PROBLEM
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addText("The Problem", {
    x: 0.8, y: 0.4, w: 8.4, h: 0.7,
    fontSize: 36, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  const problems = [
    { num: "50K+", title: "Remote Workers", desc: "Highway construction workers at sites with no internet connectivity" },
    { num: "0%", title: "Verification", desc: "No way to confirm a worker is physically at the correct site" },
    { num: "30%+", title: "Proxy Fraud", desc: "Manual registers allow one person to sign for others" },
    { num: "FAIL", title: "Online Devices", desc: "Biometric devices require connectivity that doesn't exist in the field" },
  ];

  problems.forEach((p, i) => {
    const y = 1.4 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 8.4, h: 0.82, fill: { color: i % 2 === 0 ? C.offWhite : C.white } });
    s.addText(p.num, {
      x: 1.0, y, w: 1.4, h: 0.82,
      fontSize: 24, fontFace: "Calibri", color: C.red, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(p.title, {
      x: 2.6, y: y + 0.08, w: 6, h: 0.35,
      fontSize: 16, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
    });
    s.addText(p.desc, {
      x: 2.6, y: y + 0.42, w: 6, h: 0.35,
      fontSize: 12, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 3 — OUR SOLUTION
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Our Solution", {
    x: 0.8, y: 0.4, w: 8.4, h: 0.7,
    fontSize: 36, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  const features = [
    { icon: "AI", label: "Custom-Trained AI", detail: "MobileFaceNet: 99.28% LFW, trained by us" },
    { icon: "OFF", label: "100% Offline", detail: "All processing on-device, no internet needed" },
    { icon: "SEC", label: "3-Layer Anti-Spoof", detail: "Liveness + Laplacian texture + geofence" },
    { icon: "GPS", label: "Geofenced Attendance", detail: "GPS verifies worker is at correct site" },
    { icon: "ENC", label: "Encrypted Storage", detail: "AES-256 for all biometric embeddings" },
    { icon: "1MB", label: "Ultra-Lightweight", detail: "Just 1.15 MB model, runs on any phone" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 2.95;
    const y = 1.4 + row * 1.9;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.75, h: 1.65,
      fill: { color: C.white }, shadow: makeShadow(),
    });
    // Icon circle
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.2, y: y + 0.25, w: 0.55, h: 0.55,
      fill: { color: C.blueLight },
    });
    s.addText(f.icon, {
      x: x + 0.2, y: y + 0.25, w: 0.55, h: 0.55,
      fontSize: 10, fontFace: "Calibri", color: C.blue, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(f.label, {
      x: x + 0.9, y: y + 0.2, w: 1.65, h: 0.4,
      fontSize: 13, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
    });
    s.addText(f.detail, {
      x: x + 0.2, y: y + 0.95, w: 2.35, h: 0.55,
      fontSize: 11, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 4 — ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addText("Authentication Pipeline", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.6,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });
  s.addText("Total compute: <400ms  |  All on-device  |  Zero cloud dependency", {
    x: 0.8, y: 0.85, w: 8.4, h: 0.35,
    fontSize: 12, fontFace: "Calibri", color: C.textMuted, margin: 0,
  });

  const steps = [
    { label: "Camera\nCapture", time: "50ms", color: C.blue },
    { label: "Face\nDetect", time: "80ms", color: "1565C0" },
    { label: "Anti\nSpoof", time: "5ms", color: "0D47A1" },
    { label: "Liveness\n3 Checks", time: "user", color: C.accent },
    { label: "Face\nEmbed", time: "63ms", color: C.blue },
    { label: "Template\nMatch", time: "1ms", color: "1565C0" },
    { label: "Geofence\nGPS", time: "100ms", color: C.green },
    { label: "Attend\nLog", time: "5ms", color: "0D47A1" },
  ];

  steps.forEach((st, i) => {
    const x = 0.35 + i * 1.18;
    const y = 1.6;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 1.05, h: 1.3,
      fill: { color: st.color }, shadow: makeShadow(),
    });
    s.addText(st.label, {
      x, y: y + 0.1, w: 1.05, h: 0.7,
      fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(st.time, {
      x, y: y + 0.85, w: 1.05, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: "CADCFC", align: "center", valign: "middle", margin: 0,
    });

    // Arrow between steps
    if (i < steps.length - 1) {
      s.addText(">", {
        x: x + 1.05, y: y + 0.3, w: 0.13, h: 0.5,
        fontSize: 14, fontFace: "Calibri", color: C.textMuted, align: "center", valign: "middle", margin: 0,
      });
    }
  });

  // Bottom row: output
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 3.5, w: 8.4, h: 1.5, fill: { color: C.offWhite } });

  const outputs = [
    ["Encrypted Storage", "AES-256 for embeddings at rest"],
    ["Auto Attendance", "Check-in/out with GPS + site"],
    ["Sync Queue", "Auto-retry when online"],
  ];
  outputs.forEach((o, i) => {
    const x = 1.0 + i * 2.9;
    s.addText(o[0], {
      x, y: 3.65, w: 2.5, h: 0.4,
      fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
    });
    s.addText(o[1], {
      x, y: 4.1, w: 2.5, h: 0.4,
      fontSize: 11, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 5 — SECURITY STACK
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("5-Layer Security Architecture", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.white, bold: true, margin: 0,
  });

  const layers = [
    { num: "1", title: "Liveness Detection", desc: "Randomized 3-of-4 challenges: blink, smile, turn left, turn right. State-machine transition detection defeats pre-recorded videos.", color: C.blue },
    { num: "2", title: "Anti-Spoof Analysis", desc: "Native Kotlin Laplacian variance texture analysis. Detects printed photos (flat texture) and screen replays (moire patterns).", color: "1565C0" },
    { num: "3", title: "Geofence Validation", desc: "Haversine great-circle GPS distance calculation. Configurable work sites with 500m default radius enforcement.", color: C.accent },
    { num: "4", title: "Encrypted Storage", desc: "AES-256 encryption for all face embeddings at rest. Keys stored device-local, never exported.", color: C.green },
    { num: "5", title: "Duplicate Prevention", desc: "Cosine similarity > 0.75 blocks re-enrollment. Prevents one person from having multiple identities.", color: C.gold },
  ];

  layers.forEach((l, i) => {
    const y = 1.2 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 0.5, h: 0.7, fill: { color: l.color } });
    s.addText(l.num, {
      x: 0.8, y, w: 0.5, h: 0.7,
      fontSize: 20, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(l.title, {
      x: 1.5, y: y + 0.02, w: 3.0, h: 0.3,
      fontSize: 14, fontFace: "Calibri", color: C.white, bold: true, margin: 0,
    });
    s.addText(l.desc, {
      x: 1.5, y: y + 0.32, w: 7.5, h: 0.35,
      fontSize: 10.5, fontFace: "Calibri", color: "CADCFC", margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 6 — MODEL PERFORMANCE
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addText("Model Performance", {
    x: 0.8, y: 0.3, w: 5, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });
  s.addText("Custom-trained by us, not pre-trained", {
    x: 0.8, y: 0.9, w: 5, h: 0.35,
    fontSize: 13, fontFace: "Calibri", color: C.accent, bold: true, margin: 0,
  });

  // Big stats
  const stats = [
    { num: "99.28%", label: "LFW Accuracy", sub: "10-fold cross-validation" },
    { num: "1.15 MB", label: "Model Size", sub: "INT8 quantized ONNX" },
    { num: "63 ms", label: "Inference", sub: "Single-thread CPU" },
    { num: "1M", label: "Parameters", sub: "MobileFaceNet architecture" },
  ];

  stats.forEach((st, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.8 + col * 4.5;
    const y = 1.6 + row * 1.7;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 1.45,
      fill: { color: C.offWhite },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 1.45,
      fill: { color: C.blue },
    });
    s.addText(st.num, {
      x: x + 0.3, y: y + 0.1, w: 3.5, h: 0.55,
      fontSize: 32, fontFace: "Calibri", color: C.blue, bold: true, margin: 0,
    });
    s.addText(st.label, {
      x: x + 0.3, y: y + 0.65, w: 3.5, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
    });
    s.addText(st.sub, {
      x: x + 0.3, y: y + 0.98, w: 3.5, h: 0.3,
      fontSize: 11, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 7 — KEY DIFFERENTIATORS
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Why We Win", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  const rows = [
    ["Feature", "FaceAuth Pro", "Competitor A", "Competitor B"],
    ["Custom Trained Model", "99.28% LFW", "Pre-trained", "Pre-trained"],
    ["Model Size", "1.15 MB", "5.9 MB", "2.6 MB"],
    ["All Features Working", "YES (7/7)", "3/5 mocked", "Some 404"],
    ["Anti-Spoof", "Laplacian + Liveness", "Simulated", "Claims only"],
    ["Geofencing", "Working", "Not built", "Not built"],
    ["Analytics Dashboard", "Real-time", "None", "Claims"],
    ["Hindi Localization", "Yes", "No", "404"],
    ["Duplicate Detection", "Yes", "No", "Claims"],
  ];

  const headerFill = { color: C.navy };
  const headerFont = { fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle" };
  const cellFont = { fontSize: 10.5, fontFace: "Calibri", color: C.text, align: "center", valign: "middle" };
  const ourFont = { fontSize: 10.5, fontFace: "Calibri", color: C.green, bold: true, align: "center", valign: "middle" };

  const tableRows = rows.map((row, ri) => {
    return row.map((cell, ci) => {
      if (ri === 0) return { text: cell, options: { fill: headerFill, color: C.white, bold: true, fontSize: 11, align: "center", valign: "middle" } };
      if (ci === 0) return { text: cell, options: { bold: true, fontSize: 10.5, align: "left", valign: "middle", fill: { color: ri % 2 === 0 ? C.white : C.offWhite } } };
      if (ci === 1) return { text: cell, options: { ...ourFont, fill: { color: ri % 2 === 0 ? C.white : C.offWhite } } };
      return { text: cell, options: { ...cellFont, fill: { color: ri % 2 === 0 ? C.white : C.offWhite } } };
    });
  });

  s.addTable(tableRows, {
    x: 0.5, y: 1.15, w: 9.0,
    colW: [2.2, 2.0, 2.4, 2.4],
    border: { pt: 0.5, color: "D1D5DB" },
    rowH: [0.4, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38],
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 8 — FULL FEATURE LIST
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addText("Complete Feature Set", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });
  s.addText("7 fully functional screens  |  0 mocked  |  0 placeholder", {
    x: 0.8, y: 0.9, w: 8.4, h: 0.35,
    fontSize: 13, fontFace: "Calibri", color: C.green, bold: true, margin: 0,
  });

  const feats = [
    "Face enrollment with duplicate detection",
    "3-challenge randomized liveness verification",
    "Real-time Laplacian anti-spoof analysis",
    "Auto check-in / check-out attendance",
    "GPS geofence enforcement at work sites",
    "Analytics dashboard with weekly trends",
    "Hindi / English localization",
    "AES-256 encrypted biometric storage",
    "Filterable auth history with security metadata",
    "Configurable sync to AWS with retry logic",
  ];

  feats.forEach((f, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = 0.8 + col * 4.5;
    const y = 1.5 + row * 0.72;

    s.addShape(pres.shapes.OVAL, {
      x: x, y: y + 0.1, w: 0.28, h: 0.28,
      fill: { color: C.green },
    });
    s.addText("Y", {
      x: x, y: y + 0.1, w: 0.28, h: 0.28,
      fontSize: 10, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(f, {
      x: x + 0.45, y: y + 0.03, w: 3.8, h: 0.42,
      fontSize: 12.5, fontFace: "Calibri", color: C.text, margin: 0, valign: "middle",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 9 — DATALAKE 3.0 INTEGRATION
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Datalake 3.0 Integration", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  // Code block
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 1.2, w: 8.4, h: 2.4,
    fill: { color: "1E1E2E" }, shadow: makeShadow(),
  });
  s.addText([
    { text: "// Single API call — auth + geofence + attendance\n", options: { color: "6A9955", fontSize: 11, fontFace: "Consolas", breakLine: true } },
    { text: "const ", options: { color: "569CD6", fontSize: 11, fontFace: "Consolas" } },
    { text: "result = ", options: { color: "9CDCFE", fontSize: 11, fontFace: "Consolas" } },
    { text: "await ", options: { color: "C586C0", fontSize: 11, fontFace: "Consolas" } },
    { text: "FaceAuthModule.markAttendance(imagePath);\n", options: { color: "DCDCAA", fontSize: 11, fontFace: "Consolas", breakLine: true } },
    { text: "\n", options: { fontSize: 6, breakLine: true } },
    { text: "// result.authenticated    → true/false\n", options: { color: "6A9955", fontSize: 11, fontFace: "Consolas", breakLine: true } },
    { text: "// result.withinGeofence   → GPS validated\n", options: { color: "6A9955", fontSize: 11, fontFace: "Consolas", breakLine: true } },
    { text: "// result.attendanceAction → 'Checked In' | 'Checked Out'\n", options: { color: "6A9955", fontSize: 11, fontFace: "Consolas", breakLine: true } },
    { text: "// result.spoofScore       → anti-spoof confidence\n", options: { color: "6A9955", fontSize: 11, fontFace: "Consolas" } },
  ], { x: 1.1, y: 1.4, w: 7.8, h: 2.0, margin: 0 });

  // Key points
  const points = [
    ["Single API Call", "Complete auth + attendance in one function"],
    ["Works Offline", "All processing on-device, zero cloud dependency"],
    ["Auto-Sync", "Queues data and syncs with retry when online"],
  ];
  points.forEach((p, i) => {
    const x = 0.8 + i * 3.0;
    const y = 4.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.8, h: 1.2, fill: { color: C.white }, shadow: makeShadow() });
    s.addText(p[0], {
      x: x + 0.2, y: y + 0.15, w: 2.4, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: C.blue, bold: true, margin: 0,
    });
    s.addText(p[1], {
      x: x + 0.2, y: y + 0.55, w: 2.4, h: 0.45,
      fontSize: 11, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 10 — TECH STACK
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addText("Tech Stack", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  const stack = [
    ["Framework", "React Native 0.85.3, TypeScript 5.8"],
    ["Camera", "react-native-vision-camera 5.0"],
    ["ML Runtime", "ONNX Runtime Android 1.18"],
    ["Face Detection", "Google ML Kit 16.1.7 (bundled offline)"],
    ["Recognition", "Custom MobileFaceNet (ArcFace, CASIA-WebFace)"],
    ["Storage", "AsyncStorage with AES-256 encryption"],
    ["Navigation", "React Navigation 7.x (native stack)"],
    ["Localization", "Custom i18n (Hindi + English)"],
    ["Testing", "17 tests passing, 0 TypeScript errors"],
  ];

  stack.forEach((item, i) => {
    const y = 1.2 + i * 0.45;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 8.4, h: 0.4, fill: { color: i % 2 === 0 ? C.offWhite : C.white } });
    s.addText(item[0], {
      x: 1.0, y, w: 2.5, h: 0.4,
      fontSize: 12, fontFace: "Calibri", color: C.navy, bold: true, valign: "middle", margin: 0,
    });
    s.addText(item[1], {
      x: 3.5, y, w: 5.5, h: 0.4,
      fontSize: 12, fontFace: "Calibri", color: C.text, valign: "middle", margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 11 — APP SCREENS
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("7 Screens — All Fully Functional", {
    x: 0.8, y: 0.3, w: 8.4, h: 0.7,
    fontSize: 32, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
  });

  const screens = [
    { name: "Home", desc: "Dashboard with KPIs, quick actions, security badges" },
    { name: "Authenticate", desc: "Liveness challenges + anti-spoof + face recognition" },
    { name: "Enroll", desc: "Camera capture + duplicate detection" },
    { name: "Attendance", desc: "Today's check-in/out records with GPS status" },
    { name: "Dashboard", desc: "Analytics: success rates, trends, security metrics" },
    { name: "History", desc: "Filterable logs with geofence and spoof data" },
    { name: "Settings", desc: "Sync config, geofence sites, user management" },
  ];

  screens.forEach((sc, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i < 4 ? i : i - 4;
    const x = 0.8 + col * 4.5;
    const y = 1.25 + row * 1.0;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.1, h: 0.85,
      fill: { color: C.white }, shadow: makeShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 0.85,
      fill: { color: C.blue },
    });
    s.addText(sc.name, {
      x: x + 0.25, y: y + 0.05, w: 3.6, h: 0.35,
      fontSize: 14, fontFace: "Calibri", color: C.navy, bold: true, margin: 0,
    });
    s.addText(sc.desc, {
      x: x + 0.25, y: y + 0.4, w: 3.6, h: 0.35,
      fontSize: 10.5, fontFace: "Calibri", color: C.textMuted, margin: 0,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 12 — THANK YOU
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.blue } });

  s.addText("Thank You", {
    x: 0.8, y: 1.2, w: 8.4, h: 1.0,
    fontSize: 48, fontFace: "Calibri", color: C.white, bold: true, align: "center", margin: 0,
  });

  s.addText("FaceAuth Pro v2.0", {
    x: 0.8, y: 2.4, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: "Calibri", color: C.blue, bold: true, align: "center", margin: 0,
  });

  s.addText("99.28% Accuracy  |  1.15 MB  |  100% Offline  |  5-Layer Security", {
    x: 0.8, y: 3.2, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: "CADCFC", align: "center", margin: 0,
  });

  // Bottom
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 4.8, w: 10, h: 0.825, fill: { color: "0F1B33" } });
  s.addText("NHAI Hackathon 7.0  —  Datalake 3.0 Integration", {
    x: 0.8, y: 4.95, w: 8.4, h: 0.5,
    fontSize: 14, fontFace: "Calibri", color: "CADCFC", align: "center", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════
// WRITE FILE
// ═══════════════════════════════════════════════════════════════════
const outPath = path.resolve(__dirname, "FaceAuth_Pro_NHAI_Hackathon7.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Presentation created: " + outPath);
}).catch(err => {
  console.error("Error:", err);
});
