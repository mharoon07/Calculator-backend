// Constants
const PLINTH = 3;
const LOWER_HEIGHT = 34;
const GAP_TO_MIDDLE = 24;
const CORNER_UNIT = 26;
const MAX_WIDTH = 36;
const MIN_FIRST_START = 18;
const LOWER_DEPTH = 24; // in
const SHEET_SQFT = 32; // 4×8

const WALLS_BY_TYPE = {
    straight: ['A'],
    galley: ['A', 'B'],
    l: ['A', 'B'],
    u: ['A', 'B', 'C']
};

// Helper functions
const n = (v) => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
};
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '0.00');

function cornerPolicy(type, wallId) {
    let startCut = 0, endCut = 0;
    let showCornerStart = false, showCornerEnd = false;

    if (type === 'l') {
        if (wallId === 'A') { endCut = CORNER_UNIT; showCornerEnd = true; }
        if (wallId === 'B') { startCut = CORNER_UNIT; }
    } else if (type === 'u') {
        if (wallId === 'A') { endCut = CORNER_UNIT; showCornerEnd = true; }
        if (wallId === 'B') { startCut = CORNER_UNIT; endCut = CORNER_UNIT; showCornerEnd = true; }
        if (wallId === 'C') { startCut = CORNER_UNIT; }
    }
    return { startCut, endCut, showCornerStart, showCornerEnd };
}

function labelFromTags(tagStr, drawerUnderHob) {
    if (!tagStr) return 'Custom Block';
    const raw = tagStr.split('+').filter(Boolean);
    const parts = [];
    const push = (s) => { if (!parts.includes(s)) parts.push(s); };

    raw.forEach(t => {
        if (t.includes('hob')) push(drawerUnderHob ? 'Drawer Stack (Hob)' : 'Hob Base');
        else if (t.includes('brLeft') || t.includes('brRight')) push('Bottle Rack 6"');
        else if (t.includes('sink')) push('Sink Base');
        else if (t.includes('dw')) push('Dishwasher');
        else push('Custom Block');
    });

    const order = ['Sink Base', 'Dishwasher', 'Hob Base', 'Drawer Stack (Hob)', 'Bottle Rack 6"', 'Custom Block'];
    parts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return Array.from(new Set(parts)).join(' + ');
}

function clampSpan(minX, maxX, s) { return { start: Math.max(minX, s.start), end: Math.min(maxX, s.end) }; }

function spansForLower(state, wallId) {
    const L = state.lengths[wallId] || 0;
    const cp = cornerPolicy(state.type, wallId);
    let start = cp.startCut;
    let endCut = cp.endCut;

    if (state.tall.fridge.present && state.tall.fridge.wall === wallId) endCut += state.tall.fridge.w;
    if (state.tall.om.present && state.tall.om.wall === wallId) endCut += state.tall.om.w;

    const minX = start, maxX = Math.max(minX, L - endCut);
    let blocked = [];

    if (state.hob.wall === wallId) {
        const s = { start: (L - state.hob.w) / 2, end: (L + state.hob.w) / 2, tag: 'hob' };
        const c = clampSpan(minX, maxX, s);
        if (c.end > c.start) blocked.push(c);
        if (state.opts.bottleRacks) {
            const left = clampSpan(minX, maxX, { start: c.start - 6, end: c.start, tag: 'brLeft' });
            const right = clampSpan(minX, maxX, { start: c.end, end: c.end + 6, tag: 'brRight' });
            if (left.end > left.start) blocked.push(left);
            if (right.end > right.start) blocked.push(right);
        }
    }

    const sinkWall = state.type === 'straight' ? 'A' : state.sink.wall;
    if (sinkWall === wallId) {
        const s = { start: (L - state.sink.w) / 2, end: (L + state.sink.w) / 2, tag: 'sink' };
        const c = clampSpan(minX, maxX, s);
        if (c.end > c.start) blocked.push(c);
        if (state.dishwasher.on) {
            const dwW = state.dishwasher.w;
            const tryRight = state.dishwasher.side === 'right';
            const right = clampSpan(minX, maxX, { start: c.end, end: c.end + dwW, tag: 'dw' });
            const left = clampSpan(minX, maxX, { start: c.start - dwW, end: c.start, tag: 'dw' });
            const fitsRight = (right.end - right.start) === dwW && right.end <= maxX;
            const fitsLeft = (left.end - left.start) === dwW && left.start >= minX;
            const pick = (tryRight && fitsRight) ? right : (!tryRight && fitsLeft) ? left
                : (fitsRight ? right : (fitsLeft ? left : null));
            if (pick) blocked.push(pick);
        }
    }

    blocked = blocked.filter(b => b.end > b.start).sort((a, b) => a.start - b.start);
    const merged = [];
    blocked.forEach(b => {
        if (!merged.length || b.start >= merged[merged.length - 1].end) merged.push({ ...b });
        else {
            const last = merged[merged.length - 1];
            last.start = Math.min(last.start, b.start);
            last.end = Math.max(last.end, b.end);
            last.tag = (last.tag || '') + '+' + (b.tag || '');
        }
    });

    const free = [];
    let cursor = minX;
    merged.forEach(b => { if (b.start - cursor > 0) free.push({ start: cursor, end: b.start }); cursor = b.end; });
    if (maxX - cursor > 0) free.push({ start: cursor, end: maxX });

    return { L, free, blocked: merged, minX, maxX, cp, endCutApplied: endCut };
}

function spansForUpper(state, wallId, level) {
    const L = state.lengths[wallId] || 0;
    const cp = cornerPolicy(state.type, wallId);
    const minX = cp.startCut, maxX = Math.max(minX, L - cp.endCut);

    let blocked = [];
    let hoodVoid = null;

    if (level === 'middle' && state.middle.h > 0 && state.hood.wall === wallId) {
        hoodVoid = clampSpan(minX, maxX, { start: (L - state.hood.w) / 2, end: (L + state.hood.w) / 2 });
        if (hoodVoid.end > hoodVoid.start) blocked.push(hoodVoid);
    }

    const w = state.windows[wallId];
    if (w && w.on) {
        const wnd = clampSpan(minX, maxX, { start: w.start, end: w.start + w.width });
        if (wnd.end > wnd.start) blocked.push(wnd);
    }

    blocked = blocked.filter(b => b.end > b.start).sort((a, b) => a.start - b.start);
    const merged = [];
    blocked.forEach(b => {
        if (!merged.length || b.start >= merged[merged.length - 1].end) merged.push({ ...b });
        else merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
    });

    const free = [];
    let cursor = minX;
    merged.forEach(b => { if (b.start - cursor > 0) free.push({ start: cursor, end: b.start }); cursor = b.end; });
    if (maxX - cursor > 0) free.push({ start: cursor, end: maxX });

    return { L, free, blocked: merged, minX, maxX, cp, hoodVoid };
}

function splitNoFiller(start, end, enforceFirstMin) {
    const len = Math.max(0, end - start);
    if (len <= 0) return [];
    let N = Math.max(1, Math.ceil(len / MAX_WIDTH));
    let base = Math.floor(len / N);
    let rem = len - base * N;
    const widths = new Array(N).fill(base);
    for (let i = 0; i < rem; i++) widths[i] += 1;

    if (enforceFirstMin && len >= MIN_FIRST_START && widths[0] < MIN_FIRST_START) {
        let need = MIN_FIRST_START - widths[0];
        for (let i = N - 1; i >= 1 && need > 0; i--) {
            const canGive = Math.min(need, widths[i] - 1);
            if (canGive > 0) { widths[i] -= canGive; widths[0] += canGive; need -= canGive; }
        }
    }

    const items = [];
    let x = start;
    for (let i = 0; i < N; i++) { const w = widths[i]; items.push({ start: x, end: x + w, width: w }); x += w; }
    return items;
}

function splitHorizontalNoFiller(start, end) {
    const len = end - start;
    if (len <= 0) return [];
    const N = Math.max(1, Math.ceil(len / MAX_WIDTH));
    const base = Math.floor(len / N);
    let rem = len - base * N;
    const items = [];
    let x = start;
    for (let i = 0; i < N; i++) {
        let w = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        items.push({ start: x, end: x + w, width: w });
        x += w;
    }
    return items;
}

function reserveInterval(freeList, a, b) {
    if (b <= a) return;
    for (let i = 0; i < freeList.length; i++) {
        const s = freeList[i];
        if (b <= s.start || a >= s.end) continue;
        const left = (a > s.start) ? { start: s.start, end: a } : null;
        const right = (b < s.end) ? { start: b, end: s.end } : null;
        freeList.splice(i, 1, ...(left ? [left] : []), ...(right ? [right] : []));
        i--;
    }
}

function buildLayout(state) {
    const result = {
        meta: {
            rules: { plinth: PLINTH, lower: LOWER_HEIGHT, gap: GAP_TO_MIDDLE, corner: CORNER_UNIT, maxPiece: MAX_WIDTH, firstMinAtFreeStart: MIN_FIRST_START },
            heights: state.heights,
            options: state.opts,
            middle: state.middle,
            top: state.top
        }, walls: {}
    };

    state.walls.forEach(wallId => {
        const wall = { lower: [], middle: [], top: [] };
        const L = state.lengths[wallId] || 0;

        // LOWER
        const low = spansForLower(state, wallId);
        const fixedLower = [];
        if (low.cp.showCornerStart && low.cp.startCut > 0) fixedLower.push({ type: 'Corner', start: 0, end: low.cp.startCut, width: low.cp.startCut });
        if (low.cp.showCornerEnd && low.cp.endCut > 0) fixedLower.push({ type: 'Corner', start: L - low.cp.endCut, end: L, width: low.cp.endCut });

        let rightCursor = L - low.cp.endCut;
        if (state.tall.fridge.present && state.tall.fridge.wall === wallId) {
            const fStart = rightCursor - state.tall.fridge.w;
            const fEnd = rightCursor;
            fixedLower.push({ type: 'Tall Fridge', start: fStart, end: fEnd, width: (fEnd - fStart) });
            rightCursor -= state.tall.fridge.w;
        }
        if (state.tall.om.present && state.tall.om.wall === wallId) {
            const omStart = rightCursor - state.tall.om.w;
            const omEnd = rightCursor;
            fixedLower.push({ type: 'Tall Oven+Microwave', start: omStart, end: omEnd, width: (omEnd - omStart) });
            rightCursor -= state.tall.om.w;
        }

        low.blocked.forEach(b => {
            const label = labelFromTags(b.tag || '', state.opts.drawerUnderHob);
            fixedLower.push({ type: label, start: b.start, end: b.end, width: b.end - b.start });
        });

        const enforceMinStartLower = (low.cp.startCut === 0);
        low.free.forEach(s => {
            const touchesStart = (s.start === low.minX && low.minX === 0);
            const items = splitNoFiller(s.start, s.end, touchesStart && enforceMinStartLower);
            wall.lower.push(...items.map(it => ({ type: 'Base Cab', ...it })));
        });
        wall.lower.push(...fixedLower);
        wall.lower.sort((a, b) => a.start - b.start);

        // MIDDLE
        const mid = spansForUpper(state, wallId, 'middle');
        const fixedMid = [];
        if (mid.cp.showCornerStart && mid.cp.startCut > 0) fixedMid.push({ type: 'Corner', start: 0, end: mid.cp.startCut, width: mid.cp.startCut });
        if (mid.cp.showCornerEnd && mid.cp.endCut > 0) fixedMid.push({ type: 'Corner', start: L - mid.cp.endCut, end: L, width: mid.cp.endCut });

        const freeAfter = mid.free.map(s => ({ ...s }));
        const horizontals = [];

        if (state.tall.fridge.present && state.tall.fridge.wall === wallId && state.middle.h > 0) {
            const endCuts = mid.cp.endCut;
            const start = Math.max(mid.minX, L - (endCuts + state.tall.fridge.w));
            const end = Math.min(mid.maxX, L - endCuts);
            if (end > start) { reserveInterval(freeAfter, start, end); splitHorizontalNoFiller(start, end).forEach(h => horizontals.push({ type: 'Over-Fridge Horizontal', ...h })); }
        }

        if (state.tall.om.present && state.tall.om.wall === wallId && state.middle.h > 0) {
            const extra = (state.tall.fridge.present && state.tall.fridge.wall === wallId) ? state.tall.fridge.w : 0;
            const endCuts = mid.cp.endCut + extra;
            const start = Math.max(mid.minX, L - (endCuts + state.tall.om.w));
            const end = Math.min(mid.maxX, L - endCuts);
            if (end > start) { reserveInterval(freeAfter, start, end); splitHorizontalNoFiller(start, end).forEach(h => horizontals.push({ type: 'Over-Tall OM Horizontal', ...h })); }
        }

        if (mid.hoodVoid && state.opts.hoodFlank !== 'none') {
            const eps = 1e-6;
            const leftSpan = freeAfter.find(s => Math.abs(s.end - mid.hoodVoid.start) < eps || (s.end > mid.hoodVoid.start - eps && s.end <= mid.hoodVoid.start + eps));
            const rightSpan = freeAfter.find(s => Math.abs(s.start - mid.hoodVoid.end) < eps || (s.start >= mid.hoodVoid.end - eps && s.start < mid.hoodVoid.end + eps));
            function cap(span) { return span ? (span.end - span.start) : 0; }
            function useLeft(w) { if (!leftSpan || w <= 0) return; const a = leftSpan.end - w, b = leftSpan.end; reserveInterval(freeAfter, a, b); splitHorizontalNoFiller(a, b).forEach(h => horizontals.push({ type: 'Horizontal Cab (Hood Left)', ...h })); }
            function useRight(w) { if (!rightSpan || w <= 0) return; const a = rightSpan.start, b = rightSpan.start + w; reserveInterval(freeAfter, a, b); splitHorizontalNoFiller(a, b).forEach(h => horizontals.push({ type: 'Horizontal Cab (Hood Right)', ...h })); }
            const capL = Math.min(MAX_WIDTH, leftSpan ? (leftSpan.end - leftSpan.start) : 0);
            const capR = Math.min(MAX_WIDTH, rightSpan ? (rightSpan.end - rightSpan.start) : 0);
            if (state.opts.hoodFlank === 'both') {
                const W = Math.max(0, Math.min(capL, capR));
                useLeft(W); useRight(W);
            } else if (state.opts.hoodFlank === 'left') { useLeft(capL); }
            else if (state.opts.hoodFlank === 'right') { useRight(capR); }
        }

        if (mid.hoodVoid) fixedMid.push({ type: 'Hood Void', start: mid.hoodVoid.start, end: mid.hoodVoid.end, width: mid.hoodVoid.end - mid.hoodVoid.start });
        const w = state.windows[wallId];
        if (w && w.on) fixedMid.push({ type: 'Window Void', start: w.start, end: w.start + w.width, width: w.width });

        const enforceMinStartMiddle = (mid.cp.startCut === 0);
        freeAfter.forEach(s => {
            const touchesStart = (s.start === mid.minX && mid.minX === 0);
            const items = splitNoFiller(s.start, s.end, touchesStart && enforceMinStartMiddle);
            wall.middle.push(...items.map(it => ({ type: 'Middle Cab', ...it })));
        });
        wall.middle.push(...horizontals, ...fixedMid);
        wall.middle.sort((a, b) => a.start - b.start);

        // TOP
        const top = spansForUpper(state, wallId, 'top');
        const fixedTop = [];
        if (top.cp.showCornerStart && top.cp.startCut > 0) fixedTop.push({ type: 'Corner', start: 0, end: top.cp.startCut, width: top.cp.startCut });
        if (top.cp.showCornerEnd && top.cp.endCut > 0) fixedTop.push({ type: 'Corner', start: L - top.cp.endCut, end: L, width: top.cp.endCut });
        if (w && w.on) fixedTop.push({ type: 'Window Void', start: w.start, end: w.start + w.width, width: w.width });

        const enforceMinStartTop = (top.cp.startCut === 0);
        top.free.forEach(s => {
            const touchesStart = (s.start === top.minX && top.minX === 0);
            const items = splitNoFiller(s.start, s.end, touchesStart && enforceMinStartTop);
            wall.top.push(...items.map(it => ({ type: 'Top Cab', ...it })));
        });
        wall.top.push(...fixedTop);
        wall.top.sort((a, b) => a.start - b.start);

        result.walls[wallId] = wall;
    });

    return result;
}

function isCostedCabinet(type) {
    return (
        /^Base Cab$/.test(type) ||
        /^Middle Cab$/.test(type) ||
        /^Top Cab$/.test(type) ||
        /^Horizontal Cab/.test(type) ||
        /^Over-Fridge Horizontal$/.test(type) ||
        /^Over-Tall OM Horizontal$/.test(type) ||
        /^Sink Base$/.test(type) ||
        /^Hob Base$/.test(type) ||
        /^Drawer Stack \(Hob\)$/.test(type) ||
        /^Corner$/.test(type)
    );
}

function isNonMaterial(type) {
    return (/Void|Window/.test(type) || /^Dishwasher$/.test(type) || /^Tall /.test(type) || /^Bottle Rack/.test(type));
}

function shuttersForWidth(w) { return (w > 24) ? 2 : 1; }

function toSqft(in2) { return in2 / 144; }

function buildElementLedger(layout, midD, topD) {
    const rows = [];
    const zones = ['lower', 'middle', 'top'];
    const zoneH = z => (z === 'lower' ? LOWER_HEIGHT : (z === 'middle' ? layout.meta.heights.middle : layout.meta.heights.top));
    const zoneD = z => (z === 'lower' ? LOWER_DEPTH : (z === 'middle' ? midD : topD));

    for (const [wallId, wall] of Object.entries(layout.walls)) {
        zones.forEach(zone => {
            const items = (wall[zone] || []).slice().sort((a, b) => a.start - b.start);
            items.forEach(it => {
                const height = zoneH(zone);
                const depth = zoneD(zone);
                const width = it.width;
                let include = false, reason = '';
                if (isCostedCabinet(it.type)) { include = true; reason = 'Cabinet'; }
                else if (isNonMaterial(it.type)) { include = false; reason = 'No material (corner/void/appliance/tall/hardware)'; }
                else { include = true; reason = 'Custom cabinet'; }
                const hasDoor = include && !/^Drawer Stack \(Hob\)$/.test(it.type);
                const doorSets = include ? (hasDoor ? shuttersForWidth(width) : 0) : 0;
                // Calculate hinges per door based on type and dimensions (matching manual mode logic)
                let hingesPerDoor = 0;
                if (hasDoor) {
                    if (it.type === 'Base Cab' || it.type === 'Middle Cab' || it.type === 'Top Cab' || it.type === 'Horizontal Cab' || it.type === 'Corner') {
                        // For cabinet types, use width-based calculation
                        hingesPerDoor = width > 24 ? 3 : 2;
                    } else {
                        // For other types, use height-based calculation
                        hingesPerDoor = height > 24 ? 3 : 2;
                    }
                }
                const totalHinges = doorSets * hingesPerDoor;
                const shutterIn2 = include && hasDoor ? (width * height) : 0;
                const backIn2 = include ? (width * height) : 0;
                const carcIn2 = include ? ((2 * (depth * height)) + (2 * (width * depth))) : 0;
                const shelfIn2 = include && (zone !== 'top') ? (width * depth) : 0;
                rows.push({
                    wall: wallId, zone, type: it.type,
                    width, height, depth, start: it.start, end: it.end,
                    include, reason,
                    shutterSqft: round(toSqft(shutterIn2)),
                    backSqft: round(toSqft(backIn2)),
                    carcassSqft: round(toSqft(carcIn2)),
                    shelvesSqft: round(toSqft(shelfIn2)),
                    doorSets,
                    hingesPerDoor,
                    totalHinges,
                    hasTop: true, // Default for auto mode
                    hasBottom: true, // Default for auto mode
                    shelves: zone !== 'top' ? 1 : 0 // Default 1 shelf for non-top zones
                });
            });
        });
    }
    return rows;
}

function computeFaceArea(layout) {
    let totalIn2 = 0;
    for (const [wallId, wall] of Object.entries(layout.walls)) {
        for (const zone of ['lower', 'middle', 'top']) {
            const h = zone === 'lower' ? LOWER_HEIGHT : (zone === 'middle' ? layout.meta.heights.middle : layout.meta.heights.top);
            if (h <= 0) continue;
            const items = wall[zone];
            for (const it of items) {
                // Skip non-material items (matching manual mode logic)
                if (/Void|Dishwasher|Tall/.test(it.type)) continue;
                // For non-tall zones, use shutter area (width × height)
                if (zone !== 'tall') {
                    totalIn2 += it.width * h;
                } else {
                    // For tall zones, use carcass area (width × height)
                totalIn2 += it.width * h;
                }
            }
        }
    }
    return toSqft(totalIn2);
}

// UPDATED: Aligned cost calculation to match HTML exactly
function computeBOQ(layout, materials, opts) {
    // Use middle and top depths from the layout meta, or fallback to materials object
    const midD = layout.meta.middle?.d || materials.midD || 14;
    const topD = layout.meta.top?.d || materials.topD || 14;
    
    const ledger = buildElementLedger(layout, midD, topD);
    let shutterSqft = 0, backSqft = 0, carcassSqft = 0, shelvesSqft = 0;
    let hingeSets = 0, handleSets = 0;
    let carcassEdgeFt = 0, shutterEdgeFt = 0;

    for (const r of ledger) {
        if (!r.include) continue;
        shutterSqft += r.shutterSqft;
        backSqft += r.backSqft;
        carcassSqft += r.carcassSqft;
        shelvesSqft += r.shelvesSqft;
        // Use totalHinges instead of doorSets for hinge calculation
        hingeSets += r.totalHinges;
        handleSets += r.doorSets;
        
        // Advanced carcass edge calculation based on module type (matching manual mode)
        let cacsEdgeIn = 0;
        const typeLower = r.type.toLowerCase().replace(/[^a-z\s]/g, ' ').trim();
        
        switch (typeLower) {
            case 'corner':
                cacsEdgeIn = 3 * r.width + 2 * r.height; // 3XW+2XH
                break;
            case 'tall fridge':
            case 'tall oven microwave':
                cacsEdgeIn = r.width + 2 * r.height; // W+2XH
                break;
            case 'tall unit':
            case 'bottle rack':
                cacsEdgeIn = (3 * r.width) + (2 * r.height);
                break;
            default:
                // For regular cabinets, use the manual mode logic
                const shelvesFront = r.shelvesSqft * 144 / r.depth;
                cacsEdgeIn = (r.hasTop ? r.width : 0) + (r.hasBottom ? r.width : 0) + 2 * r.height + shelvesFront;
        }
        carcassEdgeFt += cacsEdgeIn / 12;
        
        // Calculate shutter edgeband (only for non-tall zones and doors)
        if (r.doorSets > 0 && r.zone !== 'tall') {
            const doorWidth = r.width / r.doorSets;
            const shutterEdgeIn = (2 * r.width + 4 * r.height) * r.doorSets;
            shutterEdgeFt += shutterEdgeIn / 12;
        }
    }

    // EXACTLY match HTML calculation formulas
    const shutterSheets = Math.ceil(shutterSqft / SHEET_SQFT);
    const backSheets = Math.ceil(backSqft / SHEET_SQFT);
    const carcassSheets = Math.ceil((carcassSqft + shelvesSqft) / SHEET_SQFT);
    
    // Count specific module types from ledger (matching manual mode logic)
    let bottleQty = 0;
    let hydraulicQty = 0;
    for (const r of ledger) {
        if (!r.include) continue;
        if (r.type.toLowerCase().includes('bottle rack')) {
            bottleQty += 1;
        }
        if (r.type.toLowerCase().includes('drawer stack')) {
            hydraulicQty += 1;
        }
    }
    
    // Fallback to options if not found in ledger
    if (bottleQty === 0 && opts.bottleRacks) bottleQty = 2;
    if (hydraulicQty === 0 && opts.drawerUnderHob) hydraulicQty = 1;

    const costs = {
        // Sheet costs: sheets * price_per_sheet
        shutter: shutterSheets * materials.m_shutter_rate,
        back: backSheets * materials.m_back_rate,
        carcass: carcassSheets * materials.m_carcass_rate,
        
        // Edge costs: Math.ceil(feet / 100) * price_per_roll
        edgeCarcass: Math.ceil(carcassEdgeFt / 100) * materials.price_edge_carcass,
        edgeShutter: Math.ceil(shutterEdgeFt / 100) * materials.price_edge_shutter,
        
        // Hardware costs: quantity * price_per_unit
        hinges: Math.ceil(hingeSets/2) * materials.price_hinge,
        handles: handleSets * materials.price_handle,
        hydraulic: hydraulicQty * materials.price_hydraulic,
        bottle: bottleQty * materials.price_bottle,
        
        // Labor cost: face_area * rate_per_sqft
        labor: computeFaceArea(layout) * materials.rate_labor
    };

    const materialCost = costs.shutter + costs.back + costs.carcass + costs.edgeCarcass + costs.edgeShutter + costs.hinges + costs.handles + costs.hydraulic + costs.bottle;
    const grandTotal = materialCost + costs.labor;
    const faceSqft = computeFaceArea(layout);

    return {
        ledger,
        totals: {
            shutterSqft: round(shutterSqft),
            backSqft: round(backSqft),
            carcassSqft: round(carcassSqft),
            shelvesSqft: round(shelvesSqft),
            carcassEdgeFt: round(carcassEdgeFt),
            shutterEdgeFt: round(shutterEdgeFt),
            hingeSets,
            handleSets,
            bottleQty,
            hydraulicQty,
            shutterSheets,
            backSheets,
            carcassSheets,
            faceSqft: round(faceSqft)
        },
        costs: {
            shutter: round(costs.shutter),
            back: round(costs.back),
            carcass: round(costs.carcass),
            edgeCarcass: round(costs.edgeCarcass),
            edgeShutter: round(costs.edgeShutter),
            hinges: round(costs.hinges),
            handles: round(costs.handles),
            hydraulic: round(costs.hydraulic),
            bottle: round(costs.bottle),
            labor: round(costs.labor)
        },
        materialCost: round(materialCost),
        grandTotal: round(grandTotal)
    };
}

function round(x) { return Math.round(x * 100) / 100; }
function currency(x) { return (Math.round(x * 100) / 100).toFixed(2); }
function waste(sheets, usedSqft) { return (sheets * SHEET_SQFT - usedSqft); }

// Manual mode: compute BOQ from cabinets array + formData (same logic as frontend)
function computeManualKitchenBOQ(cabinets, formData) {
    const lenA = n(formData.lenA);
    const lenB = n(formData.lenB);
    const lenC = n(formData.lenC);
    const wallLengths = { A: lenA, B: lenB, C: lenC };

    // Validate wall lengths
    const wallSums = {};
    cabinets.forEach((c) => {
        const wall = c.wall;
        if (wall) {
            if (!wallSums[wall]) wallSums[wall] = { lower: 0, middle: 0, top: 0, tall: 0 };
            wallSums[wall][c.zone] += n(c.width);
        }
    });
    for (const wall in wallSums) {
        const sums = wallSums[wall];
        const maxSum = Math.max(sums.lower || 0, sums.middle || 0, sums.top || 0, sums.tall || 0);
        const len = wallLengths[wall] || 0;
        if (maxSum > len) {
            throw new Error(`Wall ${wall} cabinets exceed length ${len}": max ${maxSum}"`);
        }
    }

    // Group by wall and zone, build ledger
    const cabinetsByWallAndZone = {};
    cabinets.forEach((c) => {
        if (!cabinetsByWallAndZone[c.wall]) cabinetsByWallAndZone[c.wall] = {};
        if (!cabinetsByWallAndZone[c.wall][c.zone]) cabinetsByWallAndZone[c.wall][c.zone] = [];
        cabinetsByWallAndZone[c.wall][c.zone].push(c);
    });

    const ledger = [];
    Object.keys(cabinetsByWallAndZone).forEach((wall) => {
        Object.keys(cabinetsByWallAndZone[wall]).forEach((zone) => {
            let currentPosition = 0;
            cabinetsByWallAndZone[wall][zone].forEach((c) => {
                const w = n(c.width);
                const h = n(c.height);
                const d = n(c.depth);
                const s = n(c.shelves);
                const door = n(c.doors);
                const shutterH = n(c.shutterHeight);
                const shutterSqft = c.hasShutter ? toSqft(w * shutterH) : 0;
                const backSqft = c.hasBack ? toSqft(w * h) : 0;
                const carcassSqft = ((c.hasBottom ? 1 : 0) + (c.hasTop ? 1 : 0)) * toSqft(w * d) + 2 * toSqft(h * d);
                const shelvesSqft = s * toSqft(w * d);
                ledger.push({
                    wall: c.wall,
                    zone: c.zone,
                    type: c.type,
                    width: round(w),
                    height: round(h),
                    depth: round(d),
                    shutterHeight: round(shutterH),
                    hasTop: !!c.hasTop,
                    hasBottom: !!c.hasBottom,
                    start: round(currentPosition),
                    end: round(currentPosition + w),
                    include: c.include !== false,
                    reason: c.reason || '',
                    shutterSqft: round(shutterSqft),
                    backSqft: round(backSqft),
                    carcassSqft: round(carcassSqft),
                    shelvesSqft: round(shelvesSqft),
                    doorSets: door,
                });
                currentPosition += w;
            });
        });
    });

    const totals = {
        shutterSqft: 0,
        backSqft: 0,
        carcassSqft: 0,
        shelvesSqft: 0,
        hingeSets: 0,
        handleSets: 0,
        bottleQty: 0,
        hydraulicQty: 0,
        faceSqft: 0,
        carcassEdgeFt: 0,
        shutterEdgeFt: 0,
        shutterSheets: 0,
        backSheets: 0,
        carcassSheets: 0,
    };

    ledger.forEach((r) => {
        if (!r.include) return;
        if (r.type === 'hood') return;
        if (r.zone !== 'tall') {
            totals.shutterSqft += r.shutterSqft;
            totals.faceSqft += r.shutterSqft;
            const hingesPerDoor = r.type === 'cabinet' ? (r.width > 24 ? 3 : 2) : (r.shutterHeight >= 30 ? 3 : 2);
            totals.hingeSets += r.doorSets * hingesPerDoor;
            totals.handleSets += r.doorSets;
        } else {
            totals.faceSqft += (r.width * r.height) / 144;
        }
        totals.backSqft += r.backSqft;
        totals.carcassSqft += r.carcassSqft;
        totals.shelvesSqft += r.shelvesSqft;
        if (r.type === 'bottle_rack') totals.bottleQty += 1;
        if (r.type === 'drawer_stack') totals.hydraulicQty += 1;

        let cacsEdgeIn = 0;
        const typeKey = (r.type || '').toLowerCase().replace(/_/g, ' ');
        switch (typeKey) {
            case 'corner unit':
                cacsEdgeIn = 3 * r.width + 2 * r.height;
                break;
            case 'fridge':
            case 'microwave/oven unit':
                cacsEdgeIn = r.width + 2 * r.height;
                break;
            case 'tall unit':
            case 'bottle rack':
                cacsEdgeIn = 3 * r.width + 2 * r.height;
                break;
            default:
                const shelvesFront = (r.shelvesSqft * 144) / (r.depth || 1);
                cacsEdgeIn = (r.hasTop ? r.width : 0) + (r.hasBottom ? r.width : 0) + 2 * r.height + shelvesFront;
        }
        totals.carcassEdgeFt += cacsEdgeIn / 12;
        if (r.zone !== 'tall') {
            totals.shutterEdgeFt += ((2 * r.width + 4 * r.shutterHeight) * r.doorSets) / 12;
        }
    });

    totals.shutterSheets = Math.ceil(totals.shutterSqft / SHEET_SQFT);
    totals.backSheets = Math.ceil(totals.backSqft / SHEET_SQFT);
    totals.carcassSheets = Math.ceil((totals.carcassSqft + totals.shelvesSqft) / SHEET_SQFT);

    const m = {
        m_shutter_rate: n(formData.m_shutter_rate),
        m_back_rate: n(formData.m_back_rate),
        m_carcass_rate: n(formData.m_carcass_rate),
        price_edge_carcass: n(formData.price_edge_carcass),
        price_edge_shutter: n(formData.price_edge_shutter),
        price_hinge: n(formData.price_hinge),
        price_handle: n(formData.price_handle),
        price_hydraulic: n(formData.price_hydraulic),
        price_bottle: n(formData.price_bottle),
        rate_labor: n(formData.rate_labor),
    };
    const costs = {
        shutter: totals.shutterSheets * m.m_shutter_rate,
        back: totals.backSheets * m.m_back_rate,
        carcass: totals.carcassSheets * m.m_carcass_rate,
        edgeCarcass: Math.ceil(totals.carcassEdgeFt / 100) * m.price_edge_carcass,
        edgeShutter: Math.ceil(totals.shutterEdgeFt / 100) * m.price_edge_shutter,
        hinges: Math.ceil(totals.hingeSets / 2) * m.price_hinge,
        handles: totals.handleSets * m.price_handle,
        hydraulic: totals.hydraulicQty * m.price_hydraulic,
        bottle: totals.bottleQty * m.price_bottle,
    };
    costs.materialCost = round(Object.values(costs).reduce((a, b) => a + b, 0));
    costs.labor = round(totals.faceSqft * m.rate_labor);
    costs.grandTotal = round(costs.materialCost + costs.labor);

    return {
        ledger,
        totals: {
            shutterSqft: round(totals.shutterSqft),
            backSqft: round(totals.backSqft),
            carcassSqft: round(totals.carcassSqft),
            shelvesSqft: round(totals.shelvesSqft),
            hingeSets: totals.hingeSets,
            handleSets: totals.handleSets,
            bottleQty: totals.bottleQty,
            hydraulicQty: totals.hydraulicQty,
            faceSqft: round(totals.faceSqft),
            carcassEdgeFt: round(totals.carcassEdgeFt),
            shutterEdgeFt: round(totals.shutterEdgeFt),
            shutterSheets: totals.shutterSheets,
            backSheets: totals.backSheets,
            carcassSheets: totals.carcassSheets,
        },
        costs: {
            shutter: round(costs.shutter),
            back: round(costs.back),
            carcass: round(costs.carcass),
            edgeCarcass: round(costs.edgeCarcass),
            edgeShutter: round(costs.edgeShutter),
            hinges: round(costs.hinges),
            handles: round(costs.handles),
            hydraulic: round(costs.hydraulic),
            bottle: round(costs.bottle),
            materialCost: costs.materialCost,
            labor: costs.labor,
            grandTotal: costs.grandTotal,
        },
    };
}

// API endpoint - UPDATED to match HTML form structure exactly
// Supports mode: 'auto' (default) or 'manual'. For manual, send cabinets array + formData.
const calculateKitchenLayout = async (req, res) => {
    console.log('Received kitchen calculation request:', req.body?.mode || 'auto');
    try {
        if (req.body.mode === 'manual' && Array.isArray(req.body.cabinets)) {
            const boq = computeManualKitchenBOQ(req.body.cabinets, req.body);
            return res.status(200).json({
                mode: 'manual',
                layout: { walls: {} },
                boq,
            });
        }

        const state = {
            type: req.body.type || 'l',
            walls: WALLS_BY_TYPE[req.body.type] || ['A'],
            lengths: {
                A: n(req.body.lenA),
                B: n(req.body.lenB),
                C: n(req.body.lenC)
            },
            aisle: n(req.body.aisle),
            heights: {
                kitchen: n(req.body.kitchH),
                plinth: PLINTH,
                lower: LOWER_HEIGHT,
                gap: GAP_TO_MIDDLE,
                middle: n(req.body.midH),
                top: n(req.body.topH)
            },
            // UPDATED: Include depth values in layout meta
            middle: { h: n(req.body.midH), d: n(req.body.midD) },
            top: { h: n(req.body.topH), d: n(req.body.topD) },
            hob: { w: n(req.body.hobSize), wall: req.body.hobWall },
            hood: { w: n(req.body.hoodSize), wall: req.body.hobWall },
            sink: { w: n(req.body.sinkSize), wall: req.body.sinkWall },
            dishwasher: {
                on: req.body.dwEnable === 'on',
                w: n(req.body.dwSize),
                side: req.body.dwSide
            },
            tall: {
                fridge: {
                    present: req.body.fridgeW !== 'none',
                    w: n(req.body.fridgeW),
                    wall: req.body.fridgeWall
                },
                om: {
                    present: req.body.tallOM === 'on',
                    w: n(req.body.tallOMW),
                    wall: req.body.tallOMWall
                }
            },
            windows: {
                A: { on: req.body.winA_on, start: n(req.body.winA_start), width: n(req.body.winA_width) },
                B: { on: req.body.winB_on, start: n(req.body.winB_start), width: n(req.body.winB_width) },
                C: { on: req.body.winC_on, start: n(req.body.winC_start), width: n(req.body.winC_width) }
            },
            opts: {
                bottleRacks: req.body.optBottle,
                drawerUnderHob: req.body.optDrawerUnderHob,
                hoodFlank: req.body.optHoodFlank
            },
            // UPDATED: Material pricing structure to exactly match HTML form names
            materials: {
                m_back_thk: n(req.body.m_back_thk),
                m_back_rate: n(req.body.m_back_rate),
                m_carcass_thk: n(req.body.m_carcass_thk),
                m_carcass_rate: n(req.body.m_carcass_rate),
                m_shutter_type: req.body.m_shutter_type,
                m_shutter_thk: n(req.body.m_shutter_thk),
                m_shutter_rate: n(req.body.m_shutter_rate),
                price_edge_carcass: n(req.body.price_edge_carcass),
                price_edge_shutter: n(req.body.price_edge_shutter),
                price_hinge: n(req.body.price_hinge),
                price_handle: n(req.body.price_handle),
                price_hydraulic: n(req.body.price_hydraulic),
                price_bottle: n(req.body.price_bottle),
                rate_labor: n(req.body.rate_labor)
            }
        };

        if (state.type === 'straight') state.sink.wall = 'A';
        if (state.tall.fridge.present && state.tall.fridge.wall === 'none') state.tall.fridge.present = false;

        const layout = buildLayout(state);
        const boq = computeBOQ(layout, state.materials, state.opts);

        res.status(200).json({
            mode: 'auto',
            layout,
            boq
        });
    } catch (error) {
        console.error('Error calculating kitchen layout:', error);
        const status = error.message && /exceed length|validation/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: error.message || 'Internal server error' });
    }
}

export { calculateKitchenLayout };