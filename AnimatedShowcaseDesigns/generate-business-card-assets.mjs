import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { BarcodeFormat, EncodeHintType, QRCodeWriter } = require("@zxing/library");

const outDir = "business-card";
const qrUrl = "https://showcase-designs.com/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch";
const email = "andrew@showcase-designs.com";
const phone = "(520) 367-2769";
const phoneHref = "5203672769";
const gold = "#c9a227";
const warmWhite = "#f5f0e8";
const muted = "#8a8578";
const black = "#0a0a0a";

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function qrRects() {
  const hints = new Map();
  hints.set(EncodeHintType.MARGIN, 2);
  const matrix = new QRCodeWriter().encode(qrUrl, BarcodeFormat.QR_CODE, 41, 41, hints);
  const moduleSize = 10;
  const rects = [];
  for (let y = 0; y < matrix.getHeight(); y += 1) {
    for (let x = 0; x < matrix.getWidth(); x += 1) {
      if (matrix.get(x, y)) {
        rects.push(`<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
      }
    }
  }
  return {
    size: matrix.getWidth() * moduleSize,
    rects: rects.join("")
  };
}

function qrSvg() {
  const qr = qrRects();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${qr.size}" height="${qr.size}" viewBox="0 0 ${qr.size} ${qr.size}" role="img" aria-labelledby="title desc">
  <title id="title">Showcase Designs business card QR code</title>
  <desc id="desc">${xmlEscape(qrUrl)}</desc>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g fill="#000000">${qr.rects}</g>
</svg>
`;
}

function frontSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="3.5in" height="2in" viewBox="0 0 1050 600" role="img" aria-labelledby="title desc">
  <title id="title">Showcase Designs business card front</title>
  <desc id="desc">Front card offer for Showcase Designs.</desc>
  <rect width="1050" height="600" fill="${black}"/>
  <rect x="28" y="28" width="994" height="544" fill="none" stroke="rgba(201,162,39,0.32)" stroke-width="2"/>
  <text x="72" y="96" fill="${warmWhite}" font-family="Manrope, Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="8">SHOWCASE <tspan fill="${gold}">DESIGNS</tspan></text>
  <line x1="72" y1="146" x2="182" y2="146" stroke="${gold}" stroke-width="2"/>
  <text x="72" y="196" fill="${gold}" font-family="Manrope, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5">WEBSITES + LOCAL SEO</text>
  <text x="72" y="312" fill="${warmWhite}" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="700">Free Website</text>
  <text x="72" y="390" fill="${gold}" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-style="italic" font-weight="700">Review</text>
  <text x="72" y="470" fill="${muted}" font-family="Manrope, Arial, sans-serif" font-size="27">For local businesses ready for better leads.</text>
  <text x="72" y="522" fill="${warmWhite}" font-family="Manrope, Arial, sans-serif" font-size="24" font-weight="700">Built by Andrew Ferguson</text>
</svg>
`;
}

function backSvg() {
  const qr = qrRects();
  const qrScale = 0.54;
  const qrRendered = qr.size * qrScale;
  const qrX = 698;
  const qrY = 112;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="3.5in" height="2in" viewBox="0 0 1050 600" role="img" aria-labelledby="title desc">
  <title id="title">Showcase Designs business card back</title>
  <desc id="desc">Back card with QR code for ${xmlEscape(qrUrl)}</desc>
  <rect width="1050" height="600" fill="${black}"/>
  <rect x="28" y="28" width="994" height="544" fill="none" stroke="rgba(201,162,39,0.32)" stroke-width="2"/>
  <text x="72" y="116" fill="${gold}" font-family="Manrope, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5">SCAN FOR A FREE REVIEW</text>
  <text x="72" y="190" fill="${warmWhite}" font-family="Manrope, Arial, sans-serif" font-size="34" font-weight="800">3 trust issues.</text>
  <text x="72" y="238" fill="${warmWhite}" font-family="Manrope, Arial, sans-serif" font-size="34" font-weight="800">3 local SEO opportunities.</text>
  <text x="72" y="286" fill="${warmWhite}" font-family="Manrope, Arial, sans-serif" font-size="34" font-weight="800">1 clear next step.</text>
  <text x="72" y="372" fill="${muted}" font-family="Manrope, Arial, sans-serif" font-size="25">showcase-designs.com</text>
  <text x="72" y="418" fill="${muted}" font-family="Manrope, Arial, sans-serif" font-size="25">${email}</text>
  <text x="72" y="464" fill="${muted}" font-family="Manrope, Arial, sans-serif" font-size="25">${phone}</text>
  <rect x="${qrX - 22}" y="${qrY - 22}" width="${qrRendered + 44}" height="${qrRendered + 44}" rx="18" fill="#ffffff"/>
  <g transform="translate(${qrX} ${qrY}) scale(${qrScale})" fill="#000000">${qr.rects}</g>
  <text x="${qrX + qrRendered / 2}" y="${qrY + qrRendered + 60}" text-anchor="middle" fill="${muted}" font-family="Manrope, Arial, sans-serif" font-size="18">QR uses v3_launch UTM tracking</text>
  <text x="72" y="532" fill="${gold}" font-family="Manrope, Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="3">NO RANKING GUARANTEES. REAL LOCAL SIGNALS MATTER.</text>
</svg>
`;
}

function readme() {
  return `# Business Card Review Assets

Status: review-ready only. Do not print until production passes.

## Files

- \`showcase-business-card-front.svg\`
- \`showcase-business-card-back.svg\`
- \`showcase-business-card-qr.svg\`

## QR URL

\`${qrUrl}\`

## Print Hold

Do not print cards until:

- \`SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs\` passes.
- Final public phone and email are approved.
- The QR scan opens the production URL with UTM parameters intact.
- The contact form, phone click, email click, and \`/thanks\` are tested on production.

## Contact Copy Used

- Email: \`${email}\`
- Phone: \`${phone}\`
- Primary offer: \`Free Website Review\`
- Targeting: \`All local businesses\`
`;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "showcase-business-card-qr.svg"), qrSvg());
writeFileSync(join(outDir, "showcase-business-card-front.svg"), frontSvg());
writeFileSync(join(outDir, "showcase-business-card-back.svg"), backSvg());
writeFileSync(join(outDir, "README.md"), readme());

console.log(`Generated business card review assets in ${outDir}/ for ${qrUrl}`);
