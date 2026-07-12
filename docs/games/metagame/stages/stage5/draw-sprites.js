// draw-sprites.js — Stage 5 Signal Racer: procedural, bottom-anchored sprite draw functions (no image
// assets — every sprite is flat-colour canvas primitives, so it stays offline + zero-fetch). Each fn
// takes a screen anchor (cx, baseY = the sprite's contact point on the road) and an already-scaled
// pixel width; the caller derives width from the anchoring road segment's projected scale, so a sprite
// far up the road is small and one near the camera is large. Painter's order is the caller's concern.

const TAU = Math.PI * 2;

function carShape(ctx, cx, baseY, w, body, glass, lean = 0) {
  const h = w * 0.82;
  const top = baseY - h;
  const sk = lean * w * 0.18; // curve lean: skews the roof against the turn
  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.5, w * 0.13, 0, 0, TAU);
  ctx.fill();
  // wheels
  ctx.fillStyle = '#0b0713';
  ctx.fillRect(cx - w * 0.5, baseY - h * 0.46, w * 0.15, h * 0.46);
  ctx.fillRect(cx + w * 0.35, baseY - h * 0.46, w * 0.15, h * 0.46);
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, baseY);
  ctx.lineTo(cx + w * 0.42, baseY);
  ctx.lineTo(cx + w * 0.30 + sk, top);
  ctx.lineTo(cx - w * 0.30 + sk, top);
  ctx.closePath();
  ctx.fill();
  // cockpit glass
  ctx.fillStyle = glass;
  ctx.fillRect(cx - w * 0.18 + sk, top + h * 0.16, w * 0.36, h * 0.26);
  // tail light bar
  ctx.fillStyle = glass;
  ctx.fillRect(cx - w * 0.30, baseY - h * 0.14, w * 0.60, h * 0.07);
}

export function drawPlayerCar(ctx, cx, baseY, w, palette, lean = 0) {
  carShape(ctx, cx, baseY, w, palette.playerBody, palette.playerGlass, lean);
}

export function drawRivalCar(ctx, cx, baseY, w, palette) {
  carShape(ctx, cx, baseY, w, palette.rivalBody, palette.rivalGlass, 0);
}

export function drawGhostCar(ctx, cx, baseY, w, palette) {
  ctx.globalAlpha = 0.35;
  carShape(ctx, cx, baseY, w, palette.ghost, palette.ghost, 0);
  ctx.globalAlpha = 1;
}

const BLOCK_COLOR = { '░': 'blockStatic', '▒': 'blockPulse', '▓': 'blockDense' };

export function drawBlock(ctx, cx, baseY, w, glyph, palette) {
  const heavy = glyph === '▓';
  const h = w * (heavy ? 1.05 : 0.85);
  const top = baseY - h;
  const color = palette[BLOCK_COLOR[glyph] || 'blockStatic'];
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.45, w * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(cx - w * 0.4, top, w * 0.8, h);
  // lit top edge (reads as a solid block, not a flat rectangle)
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillRect(cx - w * 0.4, top, w * 0.8, h * 0.14);
  if (heavy) { // the −5 dense block gets a warning core
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - w * 0.16, top + h * 0.3, w * 0.32, h * 0.4);
  }
}

export function drawGate(ctx, cx, baseY, w, palette) {
  const h = w * 1.15;
  const top = baseY - h;
  const pw = w * 0.15;
  ctx.fillStyle = palette.gatePost;
  ctx.fillRect(cx - w * 0.58, top, pw, h);
  ctx.fillRect(cx + w * 0.58 - pw, top, pw, h);
  ctx.fillStyle = palette.gateBanner;
  ctx.fillRect(cx - w * 0.58, top, w * 1.16, h * 0.22);
  // chevron on the banner
  ctx.fillStyle = 'rgba(9,5,18,0.75)';
  ctx.fillRect(cx - w * 0.1, top + h * 0.05, w * 0.2, h * 0.06);
}

const PICKUP_COLOR = {
  shield: 'pickupBuff', overclock: 'pickupBuff', emp: 'pickupBuff',
  repair: 'pickupRepair', cache: 'pickupCache',
};

export function drawPickup(ctx, cx, baseY, w, ptype, palette) {
  const s = w * 0.42;
  const cy = baseY - w * 0.62;
  ctx.fillStyle = palette[PICKUP_COLOR[ptype] || 'pickupBuff'];
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(9,5,18,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, TAU);
  ctx.fill();
}

// Dispatch a track/rival entity to its sprite. `entity.kind` is one of block/gate/pickup/rival/ghost.
export function drawEntitySprite(ctx, entity, cx, baseY, w, palette) {
  switch (entity.kind) {
    case 'block': return drawBlock(ctx, cx, baseY, w, entity.glyph, palette);
    case 'gate': return drawGate(ctx, cx, baseY, w, palette);
    case 'pickup': return drawPickup(ctx, cx, baseY, w, entity.ptype, palette);
    case 'rival': return drawRivalCar(ctx, cx, baseY, w, palette);
    case 'ghost': return drawGhostCar(ctx, cx, baseY, w, palette);
    default: return undefined;
  }
}
