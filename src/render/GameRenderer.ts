import 'pixi.js/unsafe-eval';
import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TilingSprite,
} from 'pixi.js';
import type { Position } from 'geojson';
import { Explorer, type GameEvent } from '../core/explorer';
import { bboxOfRings, type Point } from '../core/geometry';
import type { InputVector } from '../core/movement';
import type { AvatarId } from '../core/progress';
import { project } from '../core/projection';
import { NON_STATE_TERRITORY, type Level, type Locale, type Localized } from '../core/types';
import { COUNTRIES, type GameData } from '../data/gameData';
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  createSpriteSheet,
  DIRECTIONS,
  FRAMES_PER_DIRECTION,
  LOOKS,
} from './characters';
import {
  BORDER,
  CONTEXT_LAND,
  INK,
  LAKE,
  NON_STATE,
  OCEAN,
  OCRE,
  PAPER,
  REGION_COLORS,
  RIVER,
  TERRE,
  washed,
} from './palette';

const MIN_ZOOM = 0.09;
const MAX_ZOOM = 2.6;
const LABEL_FONT = 'Lilita One, Nunito, sans-serif';
const BODY_FONT = 'Nunito, sans-serif';

export interface RendererOptions {
  host: HTMLElement;
  data: GameData;
  start: Point;
  avatar: AvatarId;
  level: Level;
  locale: Locale;
  stamped: ReadonlySet<string>;
  discovered: ReadonlySet<string>;
  reducedMotion: boolean;
  getInput: () => InputVector;
  onEvents: (events: GameEvent[]) => void;
  onPosition: (position: Point, terrain: 'land' | 'water') => void;
}

export interface GameRendererHandle {
  destroy(): void;
  zoomBy(factor: number): void;
  setStamped(stamped: ReadonlySet<string>): void;
  setDiscovered(discovered: ReadonlySet<string>): void;
  setTarget(target: Point | null): void;
  setHighlight(codes: readonly string[]): void;
  setReducedMotion(value: boolean): void;
  initialEvents(): GameEvent[];
}

interface Label {
  point: Point;
  text: Localized;
  node: Text | null;
  minZoom: number;
  maxZoom: number;
  style: 'country' | 'place' | 'relief' | 'water';
  anchorY: number;
}

interface Marker {
  id: string;
  point: Point;
  kind: string;
  node: Graphics;
  minZoom: number;
}

function projectLine(line: Position[]): number[] {
  const flat: number[] = [];
  for (const position of line) {
    const { x, y } = project(position[0]!, position[1]!);
    flat.push(x, y);
  }
  return flat;
}

function strokeLines(graphics: Graphics, lines: number[][]): void {
  for (const line of lines) {
    graphics.moveTo(line[0]!, line[1]!);
    for (let i = 2; i + 1 < line.length; i += 2) graphics.lineTo(line[i]!, line[i + 1]!);
  }
}

function createWaveTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${OCEAN.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [x, y] of [
    [14, 26],
    [78, 58],
    [28, 96],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8, y - 7, x + 16, y);
    ctx.quadraticCurveTo(x + 24, y + 7, x + 32, y);
    ctx.stroke();
  }
  return Texture.from(canvas);
}

/** Pirogue vue de trois quarts, dessinée en code, centrée sur l'origine. */
function drawPirogue(graphics: Graphics): void {
  graphics
    .moveTo(-40, -6)
    .quadraticCurveTo(0, 2, 40, -6)
    .quadraticCurveTo(30, 16, 0, 17)
    .quadraticCurveTo(-30, 16, -40, -6)
    .fill(0x7a4422)
    .stroke({ color: INK, width: 3 });
  graphics.moveTo(-30, 0).quadraticCurveTo(0, 7, 30, 0).stroke({ color: OCRE, width: 3 });
  graphics
    .moveTo(-24, 8)
    .lineTo(-16, 5)
    .lineTo(-8, 10)
    .lineTo(0, 6)
    .lineTo(8, 10)
    .lineTo(16, 5)
    .lineTo(24, 8)
    .stroke({ color: PAPER, width: 2 });
}

/** Dessine le moteur ; toute la logique de jeu reste dans `core/`. */
export async function createGameRenderer(options: RendererOptions): Promise<GameRendererHandle> {
  const { data, host } = options;
  // PixiJS sait se replier sur Canvas 2D, trop lent pour cette carte : on préfère la carte SVG.
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
    throw new Error('WebGL indisponible');
  }
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: OCEAN,
    // Sur écran dense, la résolution suffit : l'anticrénelage coûterait cher au GPU mobile.
    antialias: (window.devicePixelRatio || 1) < 1.5,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.5 : 2),
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  app.canvas.setAttribute('aria-hidden', 'true');
  app.canvas.dataset.testid = 'game-canvas';
  host.appendChild(app.canvas);

  const explorer = new Explorer(data.world, options.start, options.level);
  let reducedMotion = options.reducedMotion;

  const waves = new TilingSprite({
    texture: createWaveTexture(),
    width: app.screen.width,
    height: app.screen.height,
  });
  app.stage.addChild(waves);

  const map = new Container();
  app.stage.addChild(map);

  // Terres hors du jeu : neutres, elles situent le continent.
  const contextLayer = new Graphics();
  for (const polygon of data.context) {
    contextLayer.poly(projectLine(polygon[0]!)).fill(CONTEXT_LAND);
  }
  map.addChild(contextLayer);

  // Pays : du plus grand au plus petit, pour que les enclaves restent visibles.
  const countryMeta = new Map(COUNTRIES.map((country) => [country.code, country]));
  const shapes = new Map<string, Graphics>();
  const countryBoxes = new Map(
    data.countries.map((country) => [
      country.code,
      bboxOfRings(country.polygons.flat().map((ring) => Float64Array.from(projectLine(ring)))),
    ]),
  );
  const countriesLayer = new Container();
  const ordered = [...data.countries].sort(
    (a, b) => data.world.areaOf(b.code) - data.world.areaOf(a.code),
  );
  for (const country of ordered) {
    const graphics = new Graphics();
    for (const polygon of country.polygons) {
      graphics.poly(projectLine(polygon[0]!)).fill(0xffffff);
    }
    shapes.set(country.code, graphics);
    countriesLayer.addChild(graphics);
  }
  map.addChild(countriesLayer);

  let stamped = options.stamped;
  let highlighted = new Set<string>();
  function colorCountries(): void {
    for (const [code, graphics] of shapes) {
      const meta = countryMeta.get(code);
      if (!meta || code === NON_STATE_TERRITORY) {
        graphics.tint = NON_STATE;
        continue;
      }
      const base = REGION_COLORS[meta.region];
      if (stamped.has(code)) graphics.tint = base;
      else graphics.tint = highlighted.has(code) ? washed(base, 0.2) : washed(base);
    }
  }
  colorCountries();

  // Relief stylisé : montagnes en triangles, dunes en petits arcs.
  const reliefLayer = new Graphics();
  for (const relief of data.relief) {
    if (options.level === 'explorer' && relief.level !== 'explorer' && relief.kind !== 'mountain') {
      continue;
    }
    for (const [lon, lat] of relief.samples) {
      const { x, y } = project(lon, lat);
      if (relief.kind === 'mountain') {
        reliefLayer
          .poly([x - 24, y + 16, x, y - 22, x + 24, y + 16])
          .fill({ color: 0x8a6a4a, alpha: 0.75 });
        reliefLayer
          .poly([x - 8, y - 9, x, y - 22, x + 8, y - 9])
          .fill({ color: PAPER, alpha: 0.9 });
      } else if (relief.kind === 'desert') {
        reliefLayer
          .moveTo(x - 30, y)
          .quadraticCurveTo(x, y - 20, x + 30, y)
          .stroke({ color: 0xb98a3e, width: 5, alpha: 0.55 });
      } else if (relief.kind === 'plateau') {
        reliefLayer.rect(x - 18, y - 4, 36, 8).fill({ color: 0x8a6a4a, alpha: 0.35 });
      }
    }
  }
  map.addChild(reliefLayer);

  // Lacs.
  const lakesLayer = new Graphics();
  for (const lake of data.hydro.lakes) {
    for (const polygon of lake.polygons) {
      lakesLayer.poly(projectLine(polygon[0]!)).fill(LAKE);
    }
  }
  map.addChild(lakesLayer);

  // Traits dont l'épaisseur à l'écran reste constante : refaits par palier de zoom.
  const riverLines = data.hydro.rivers.map((river) => ({
    major: river.level === 'explorer',
    lines: river.lines.map(projectLine),
  }));
  const borders = data.borderLines.map(projectLine);
  const coasts = data.coastLines.map(projectLine);
  const riversLayer = new Graphics();
  const bordersLayer = new Graphics();
  map.addChild(riversLayer, bordersLayer);

  let lineBucket = -1;
  function rebuildLines(zoom: number): void {
    const bucket = Math.round(Math.log(zoom) / Math.log(1.35));
    if (bucket === lineBucket) return;
    lineBucket = bucket;
    const unit = 1 / Math.pow(1.35, bucket);
    riversLayer.clear();
    for (const river of riverLines) {
      strokeLines(riversLayer, river.lines);
      riversLayer.stroke({
        color: RIVER,
        width: (river.major ? 2.6 : 1.5) * unit,
        cap: 'round',
        join: 'round',
      });
    }
    bordersLayer.clear();
    strokeLines(bordersLayer, borders);
    bordersLayer.stroke({ color: BORDER, width: 1.5 * unit, alpha: 0.85, join: 'round' });
    strokeLines(bordersLayer, coasts);
    bordersLayer.stroke({ color: BORDER, width: 2 * unit, join: 'round' });
  }

  // Marqueurs de lieux, à taille constante à l'écran.
  const targetRing = new Graphics();
  targetRing.circle(0, 0, 22).stroke({ color: TERRE, width: 5 });
  targetRing.circle(0, 0, 32).stroke({ color: PAPER, width: 2, alpha: 0.9 });
  targetRing.visible = false;

  const markersLayer = new Container();
  map.addChild(markersLayer);
  const labelsLayer = new Container();
  map.addChild(labelsLayer);
  map.addChild(targetRing);

  const markers: Marker[] = [];
  const labels: Label[] = [];
  let discovered = options.discovered;
  const visiblePlaces = data.places.filter(
    (place) => options.level === 'geographer' || place.level === 'explorer',
  );

  function drawMarker(marker: Marker): void {
    const isFound = discovered.has(marker.id);
    const fill = isFound ? TERRE : PAPER;
    marker.node.clear();
    if (marker.kind === 'capital') {
      const spikes: number[] = [];
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? 10 : 4.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        spikes.push(Math.cos(a) * r, Math.sin(a) * r);
      }
      marker.node.poly(spikes).fill(fill).stroke({ color: INK, width: 2 });
    } else if (marker.kind === 'city') {
      marker.node.circle(0, 0, 5).fill(fill).stroke({ color: INK, width: 2 });
    } else {
      marker.node.rect(-6, -6, 12, 12).fill(fill).stroke({ color: INK, width: 2 });
      marker.node.rotation = Math.PI / 4;
    }
  }

  for (const place of visiblePlaces) {
    const point = project(place.lon, place.lat);
    const node = new Graphics();
    node.position.set(point.x, point.y);
    const marker: Marker = {
      id: place.id,
      point,
      kind: place.kind,
      node,
      minZoom: place.kind === 'capital' ? 0.14 : 0.3,
    };
    drawMarker(marker);
    markers.push(marker);
    markersLayer.addChild(node);
    labels.push({
      point,
      text: place.names,
      node: null,
      minZoom: place.kind === 'capital' ? 0.3 : 0.55,
      maxZoom: Infinity,
      style: 'place',
      anchorY: -0.45,
    });
  }

  for (const country of data.countries) {
    const meta = countryMeta.get(country.code);
    const isNonState = country.code === NON_STATE_TERRITORY;
    if (!meta && !isNonState) continue;
    const largest = [...country.polygons].sort((a, b) => b[0]!.length - a[0]!.length)[0]![0]!;
    const flat = projectLine(largest);
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < flat.length; i += 2) {
      sx += flat[i]!;
      sy += flat[i + 1]!;
    }
    const centroid = { x: sx / (flat.length / 2), y: sy / (flat.length / 2) };
    const capital = data.places.find((p) => p.country === country.code && p.kind === 'capital');
    const point =
      data.world.countryAt(centroid.x, centroid.y) === country.code || !capital
        ? centroid
        : project(capital.lon, capital.lat);
    const area = data.world.areaOf(country.code);
    // Un pays n'affiche son nom que lorsqu'il a la place de le porter à l'écran.
    const minZoom = Math.min(0.5, Math.max(0.09, 100 / Math.sqrt(Math.max(area, 1))));
    labels.push({
      point,
      text: meta?.names ?? { fr: 'Sahara occidental', en: 'Western Sahara' },
      node: null,
      minZoom,
      maxZoom: 1.1,
      style: 'country',
      anchorY: 0.5,
    });
  }

  for (const relief of data.relief) {
    if (options.level === 'explorer' && relief.level !== 'explorer') continue;
    labels.push({
      point: project(relief.label[0], relief.label[1]),
      text: relief.names,
      node: null,
      minZoom: 0.16,
      maxZoom: 0.9,
      style: 'relief',
      anchorY: 0.5,
    });
  }

  // Fleuves et lacs : le nom est posé sur la ligne la plus longue ou au centre du lac.
  for (const river of data.hydro.rivers) {
    if (options.level === 'explorer' && river.level !== 'explorer') continue;
    const longest = [...river.lines].sort((a, b) => b.length - a.length)[0]!;
    const middle = longest[Math.floor(longest.length / 2)]!;
    labels.push({
      point: project(middle[0]!, middle[1]!),
      text: river.names,
      node: null,
      minZoom: river.level === 'explorer' ? 0.2 : 0.35,
      maxZoom: Infinity,
      style: 'water',
      anchorY: 0.5,
    });
  }
  for (const lake of data.hydro.lakes) {
    if (options.level === 'explorer' && lake.level !== 'explorer') continue;
    const ring = [...lake.polygons].sort((a, b) => b[0]!.length - a[0]!.length)[0]![0]!;
    const flat = projectLine(ring);
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < flat.length; i += 2) {
      sx += flat[i]!;
      sy += flat[i + 1]!;
    }
    labels.push({
      point: { x: sx / (flat.length / 2), y: sy / (flat.length / 2) },
      text: lake.names,
      node: null,
      minZoom: lake.level === 'explorer' ? 0.2 : 0.35,
      maxZoom: Infinity,
      style: 'water',
      anchorY: 0.5,
    });
  }

  function createLabelNode(label: Label): Text {
    const locale = options.locale;
    const isCountry = label.style === 'country';
    const node = new Text({
      text: label.style === 'relief' ? label.text[locale].toUpperCase() : label.text[locale],
      style: {
        fontFamily: isCountry ? LABEL_FONT : BODY_FONT,
        fontWeight: isCountry ? '400' : '800',
        fontSize: isCountry ? 19 : 16,
        letterSpacing: label.style === 'relief' ? 2 : 0,
        fill: label.style === 'relief' ? 0x5a4026 : label.style === 'water' ? 0x0f4c68 : INK,
        stroke: { color: PAPER, width: 4, join: 'round' },
      },
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    node.anchor.set(0.5, label.anchorY);
    node.position.set(label.point.x, label.point.y);
    labelsLayer.addChild(node);
    return node;
  }

  // Avatar : toujours au centre de l'écran, la caméra le suit.
  const sheet = Texture.from(createSpriteSheet(LOOKS[options.avatar]));
  const frames: Record<string, Texture[]> = {};
  DIRECTIONS.forEach((facing, row) => {
    frames[facing] = Array.from(
      { length: FRAMES_PER_DIRECTION },
      (_, column) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT),
        }),
    );
  });
  const avatarRoot = new Container();
  const pirogue = new Graphics();
  drawPirogue(pirogue);
  pirogue.visible = false;
  const avatar = new Sprite(frames.down![4]!);
  avatar.anchor.set(0.5, 0.92);
  avatar.scale.set(0.62);
  // Onde d'encre quand un pays reçoit son tampon.
  const ripple = new Graphics();
  ripple.circle(0, 0, 40).stroke({ color: TERRE, width: 6 });
  ripple.visible = false;
  let rippleAge = Infinity;
  avatarRoot.addChild(ripple, pirogue, avatar);
  app.stage.addChild(avatarRoot);

  function initialZoom(): number {
    const shortest = Math.min(app.screen.width, app.screen.height);
    return Math.max(0.22, Math.min(0.5, shortest / 1500));
  }
  let zoom = initialZoom();
  let targetZoom = zoom;
  let cullTimer = 0;
  let animationClock = 0;

  const LABEL_PRIORITY: Record<Label['style'], number> = {
    country: 0,
    place: 1,
    water: 2,
    relief: 3,
  };
  let sortedLabels: Label[] | null = null;
  function orderedLabels(): Label[] {
    sortedLabels ??= [...labels].sort((a, b) => LABEL_PRIORITY[a.style] - LABEL_PRIORITY[b.style]);
    return sortedLabels;
  }

  function updateCulling(): void {
    const halfW = app.screen.width / 2 / zoom;
    const halfH = app.screen.height / 2 / zoom;
    const { x, y } = explorer.position;
    const inside = (p: Point): boolean =>
      Math.abs(p.x - x) < halfW + 60 / zoom && Math.abs(p.y - y) < halfH + 40 / zoom;
    // Les pays hors écran ne sont pas envoyés au GPU.
    const viewMinX = x - halfW;
    const viewMaxX = x + halfW;
    const viewMinY = y - halfH;
    const viewMaxY = y + halfH;
    for (const [code, graphics] of shapes) {
      const box = countryBoxes.get(code)!;
      graphics.visible =
        box.minX <= viewMaxX &&
        box.maxX >= viewMinX &&
        box.minY <= viewMaxY &&
        box.maxY >= viewMinY;
    }
    for (const marker of markers) {
      marker.node.visible = zoom >= marker.minZoom && inside(marker.point);
    }
    // Les étiquettes prioritaires réservent leur place ; celles qui les chevauchent se masquent.
    const taken: { x: number; y: number; w: number; h: number }[] = [];
    for (const label of orderedLabels()) {
      let show = zoom >= label.minZoom && zoom < label.maxZoom && inside(label.point);
      if (show) {
        const name = label.text[options.locale];
        const w = name.length * (label.style === 'country' ? 10 : 9) + 10;
        const h = 22;
        const sx = (label.point.x - x) * zoom;
        const sy = (label.point.y - y) * zoom + (label.anchorY < 0 ? 22 : 0);
        const clash = taken.some(
          (other) =>
            Math.abs(other.x - sx) < (other.w + w) / 2 &&
            Math.abs(other.y - sy) < (other.h + h) / 2,
        );
        if (clash) show = false;
        else taken.push({ x: sx, y: sy, w, h });
      }
      if (show && !label.node) label.node = createLabelNode(label);
      if (label.node) label.node.visible = show;
    }
  }

  function applyScreenScale(): void {
    const inverse = 1 / zoom;
    for (const marker of markers) marker.node.scale.set(inverse);
    for (const label of labels) label.node?.scale.set(inverse);
    targetRing.scale.set(inverse);
  }

  function applyCamera(): void {
    const { width, height } = app.screen;
    map.scale.set(zoom);
    map.position.set(
      width / 2 - explorer.position.x * zoom,
      height / 2 - explorer.position.y * zoom,
    );
    avatarRoot.position.set(width / 2, height / 2);
    waves.width = width;
    waves.height = height;
    waves.tilePosition.set(-explorer.position.x * zoom, -explorer.position.y * zoom);
    const tileScale = Math.max(0.6, Math.min(1.4, zoom * 2));
    waves.tileScale.set(tileScale);
  }

  rebuildLines(zoom);
  updateCulling();
  applyScreenScale();
  applyCamera();

  let lastTerrain = explorer.location.terrain;
  pirogue.visible = lastTerrain === 'water';
  let positionTimer = 0;

  const tick = (ticker: { deltaMS: number }): void => {
    const dt = ticker.deltaMS / 1000;
    const events = explorer.update(options.getInput(), dt);
    if (events.length > 0) options.onEvents(events);

    if (Math.abs(targetZoom - zoom) > 0.0005) {
      zoom = reducedMotion ? targetZoom : zoom + (targetZoom - zoom) * Math.min(1, dt * 9);
      rebuildLines(zoom);
      applyScreenScale();
      cullTimer = 1;
    }

    animationClock += dt;
    const row = frames[explorer.facing]!;
    const frameIndex = explorer.moving
      ? Math.floor(animationClock * 9) % 4
      : reducedMotion
        ? 4
        : 4 + (Math.floor(animationClock * 1.4) % 2);
    avatar.texture = row[frameIndex]!;

    const terrain = explorer.location.terrain;
    if (terrain !== lastTerrain) {
      lastTerrain = terrain;
      pirogue.visible = terrain === 'water';
    }
    if (terrain === 'water') {
      const sway = reducedMotion ? 0 : Math.sin(animationClock * 2.4) * 1.5;
      avatar.position.y = 4 + sway;
      pirogue.position.y = 4 + sway;
    } else {
      avatar.position.y = 0;
    }

    if (rippleAge < 0.6) {
      rippleAge += dt;
      ripple.visible = rippleAge < 0.6;
      ripple.scale.set(0.4 + rippleAge * 3);
      ripple.alpha = Math.max(0, 1 - rippleAge / 0.6);
    }

    if (targetRing.visible && !reducedMotion) {
      const pulse = 1 + Math.sin(animationClock * 4) * 0.12;
      targetRing.scale.set(pulse / zoom);
    }

    applyCamera();
    cullTimer += dt;
    if (cullTimer > 0.2) {
      cullTimer = 0;
      updateCulling();
      applyScreenScale();
    }
    positionTimer += dt;
    if (positionTimer > 0.2) {
      positionTimer = 0;
      options.onPosition(explorer.position, terrain);
    }
  };
  app.ticker.add(tick);

  // Zoom à la molette et au pincement.
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    targetZoom = clampZoom(targetZoom * Math.exp(-event.deltaY * 0.0012));
  };
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  const onPointerDown = (event: PointerEvent): void => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinchDistance = 0;
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2) return;
    const [a, b] = [...pointers.values()];
    const current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    if (pinchDistance > 0) targetZoom = clampZoom(targetZoom * (current / pinchDistance));
    pinchDistance = current;
  };
  const onPointerUp = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    pinchDistance = 0;
  };
  const canvas = app.canvas;
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function clampZoom(value: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
  }

  return {
    destroy() {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      app.ticker.remove(tick);
      app.destroy(true, { children: true, texture: true });
    },
    zoomBy(factor) {
      targetZoom = clampZoom(targetZoom * factor);
    },
    setStamped(next) {
      if (next.size > stamped.size && !reducedMotion) {
        rippleAge = 0;
        ripple.visible = true;
      }
      stamped = next;
      colorCountries();
    },
    setDiscovered(next) {
      discovered = next;
      for (const marker of markers) drawMarker(marker);
    },
    setTarget(target) {
      targetRing.visible = target !== null;
      if (target) targetRing.position.set(target.x, target.y);
    },
    setHighlight(codes) {
      highlighted = new Set(codes);
      colorCountries();
    },
    setReducedMotion(value) {
      reducedMotion = value;
    },
    initialEvents() {
      return explorer.initialEvents();
    },
  };
}
