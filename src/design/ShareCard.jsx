// ─────────────────────────────────────────────────────────────────────────────
// SHAREABLE BRIEFING CARD · v6.2
//
// The growth loop: every bill (and later MP) gets a "Share" action that
// renders a clean 1200×630 branded card — wordmark, headline, sentiment,
// provenance stamp — so screenshots carry the methodology instead of
// cropping it out. Drawn with the raw canvas API: zero dependencies.
//
// Cards always render on light paper regardless of app theme — they need to
// look consistent in feeds and chats.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { C, TYPE, RADIUS, SHADOW } from "./tokens.js";
import { PALETTES } from "./theme.jsx";
import { Button } from "./primitives.jsx";

const W = 1200, H = 630;
const P = PALETTES.light; // raw hex — canvas can't resolve CSS variables

/** Wrap text to maxWidth; returns drawn line count. */
function wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = text.split(" ");
  let line = "", lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines === maxLines - 1) {
        while (ctx.measureText(line + "…").width > maxWidth) line = line.slice(0, -1);
        ctx.fillText(line + "…", x, y + lines * lineHeight);
        return lines + 1;
      }
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++; line = words[i];
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y + lines * lineHeight); lines++; }
  return lines;
}

/**
 * Draw a bill briefing card onto a canvas 2D context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("./screens/BillCard.jsx").Bill} bill
 * @param {"live"|"cached"|"sample"} dataState
 */
export function drawBillCard(ctx, bill, dataState = "sample") {
  const M = 72; // margin
  ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);

  // Wordmark: "Pol" + dotless ı + calibrated terracotta dot
  ctx.fillStyle = P.ink;
  ctx.font = "56px 'Instrument Serif', Georgia, serif";
  ctx.textBaseline = "alphabetic";
  const base = M + 52;
  ctx.fillText("Polı", M, base);
  const polWidth = ctx.measureText("Pol").width;
  const iWidth = ctx.measureText("ı").width;
  const dotR = 56 * 0.16;
  ctx.beginPath();
  ctx.arc(M + polWidth + iWidth / 2, base - 56 * 0.72, dotR, 0, Math.PI * 2);
  ctx.fillStyle = P.accent; ctx.fill();

  // Kicker right
  ctx.fillStyle = P.faint;
  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("BILL BRIEFING · POLI", W - M, base - 10);
  ctx.textAlign = "left";

  // Strong double rule
  ctx.fillStyle = P.ink;
  ctx.fillRect(M, M + 84, W - 2 * M, 4);
  ctx.fillRect(M, M + 92, W - 2 * M, 1.5);

  // Status + party line
  ctx.fillStyle = P.accentText;
  ctx.font = "700 19px 'Inter', sans-serif";
  const statusLabel = { Active: "ACTIVE LAW", Proposed: "PROPOSED", Legislation: "IN PARLIAMENT" }[bill.status] || String(bill.status).toUpperCase();
  ctx.fillText(`${statusLabel}   ·   ${bill.party}   ·   ${String(bill.category).toUpperCase()}`, M, M + 138);

  // Headline (serif, wrapped)
  ctx.fillStyle = P.ink;
  ctx.font = "58px 'Instrument Serif', Georgia, serif";
  const titleLines = wrap(ctx, bill.title, M, M + 202, W - 2 * M, 66, 2);

  // Plain-English summary
  ctx.fillStyle = P.mid;
  ctx.font = "25px 'Inter', sans-serif";
  const sumY = M + 202 + titleLines * 66 + 14;
  wrap(ctx, bill.plain, M, sumY, W - 2 * M - 120, 38, 2);

  // Sentiment bar
  const barY = H - 172, barW = W - 2 * M, barH = 16;
  const segs = [
    [bill.support, P.green], [bill.neutral, P.borderDark], [bill.oppose, P.red],
  ];
  let bx = M;
  for (const [pct, color] of segs) {
    const w = (pct / 100) * barW;
    ctx.fillStyle = color; ctx.fillRect(bx, barY, Math.max(w - 3, 0), barH);
    bx += w;
  }
  ctx.font = "600 22px 'Inter', sans-serif";
  ctx.fillStyle = P.green;
  ctx.fillText(`${bill.support}% support`, M, barY + 52);
  ctx.fillStyle = P.red; ctx.textAlign = "right";
  ctx.fillText(`${bill.oppose}% oppose`, W - M, barY + 52);
  ctx.textAlign = "left";

  // Provenance colophon
  ctx.fillStyle = P.border;
  ctx.fillRect(M, H - 78, W - 2 * M, 1.5);
  ctx.fillStyle = P.faint;
  ctx.font = "18px 'Inter', sans-serif";
  const stamp = { live: "Live data · APH", cached: "Last verified data · APH", sample: "Sample data · demonstration" }[dataState];
  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  ctx.fillText(`${stamp} · ${date} · Independent & non-partisan`, M, H - 44);
  ctx.textAlign = "right";
  ctx.fillStyle = P.accentText;
  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillText("poli.au", W - M, H - 44);
  ctx.textAlign = "left";
}

/**
 * Modal with canvas preview + download / copy actions.
 * @param {{ bill: import("./screens/BillCard.jsx").Bill, dataState?: string,
 *           onClose: () => void }} props
 */
export function ShareCardModal({ bill, dataState = "sample", onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [canCopy] = useState(() => typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try { await document.fonts.ready; } catch { /* draw with fallbacks */ }
      if (cancelled) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawBillCard(ctx, bill, dataState);
    };
    render();
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [bill, dataState, onClose]);

  const download = () => {
    const a = document.createElement("a");
    a.download = `poli-${String(bill.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const copy = () => {
    canvasRef.current.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      } catch { download(); } // fall back to download if the browser refuses
    });
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Share this briefing" style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "color-mix(in srgb, var(--poli-ink) 36%, transparent)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, border: `1px solid ${C.borderDark}`, borderRadius: RADIUS.card,
        boxShadow: SHADOW.overlay, padding: 20, maxWidth: 660, width: "100%",
      }}>
        <div style={{ ...TYPE.h3, color: C.ink, marginBottom: 4 }}>Share this briefing</div>
        <p style={{ ...TYPE.sm, fontSize: 12, color: C.mid, margin: "0 0 14px" }}>
          A clean card with the numbers and their provenance — so what gets shared carries its source.
        </p>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ width: "100%", height: "auto", borderRadius: RADIUS.panel, border: `1px solid ${C.border}`, display: "block" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canCopy && <Button variant="secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy image"}</Button>}
          <Button variant="primary" onClick={download}>Download PNG</Button>
        </div>
      </div>
    </div>
  );
}
