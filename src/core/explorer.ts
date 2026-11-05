import type { Point } from './geometry';
import { facingFromInput, stepPosition, type Facing, type InputVector } from './movement';
import type { Level, Terrain } from './types';
import type { Location, WorldModel } from './world';

/** Fréquence de détection : à 10 Hz, un pas fait environ 10 km, moins que les plus petites zones. */
const DETECT_INTERVAL_S = 0.1;

export type GameEvent =
  | { type: 'country-entered'; code: string; from: string | null }
  | { type: 'country-left'; code: string }
  | { type: 'terrain-changed'; terrain: Terrain }
  | { type: 'lake-entered'; id: string }
  | { type: 'place-reached'; id: string }
  | { type: 'river-crossed'; id: string };

/** Avatar déplacé sur la carte : détecte pays, terrain, lieux et fleuves à fréquence réduite. */
export class Explorer {
  position: Point;
  facing: Facing = 'down';
  moving = false;
  location: Location;
  private accumulator = 0;
  private lastDetected: Point;
  private readonly reached = new Set<string>();

  constructor(
    private readonly world: WorldModel,
    start: Point,
    public level: Level,
  ) {
    this.position = world.clampToBounds(start);
    this.lastDetected = this.position;
    this.location = world.locate(this.position);
  }

  /** Événements de la position de départ, à traiter une seule fois au lancement. */
  initialEvents(): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.location.country) {
      events.push({ type: 'country-entered', code: this.location.country, from: null });
    }
    events.push(...this.detectPlaces());
    return events;
  }

  update(input: InputVector, dtSeconds: number): GameEvent[] {
    this.moving = input.x !== 0 || input.y !== 0;
    this.facing = facingFromInput(input, this.facing);
    this.position = stepPosition(this.position, input, dtSeconds, this.world);
    this.accumulator += dtSeconds;
    if (this.accumulator < DETECT_INTERVAL_S) return [];
    this.accumulator = 0;
    return this.detect();
  }

  /** Place l'avatar ailleurs sans parcours : pas de fleuve traversé, mais un nouveau pays reste détecté. */
  teleport(point: Point): GameEvent[] {
    this.position = this.world.clampToBounds(point);
    this.lastDetected = this.position;
    this.reached.clear();
    return this.detect();
  }

  private detect(): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.lastDetected !== this.position) {
      for (const id of this.world.crossedRivers(this.lastDetected, this.position)) {
        events.push({ type: 'river-crossed', id });
      }
      this.lastDetected = this.position;
    }
    const next = this.world.locate(this.position);
    const previous = this.location;
    if (next.terrain !== previous.terrain) {
      events.push({ type: 'terrain-changed', terrain: next.terrain });
    }
    if (next.country !== previous.country) {
      if (previous.country) events.push({ type: 'country-left', code: previous.country });
      if (next.country) {
        events.push({ type: 'country-entered', code: next.country, from: previous.country });
      }
    }
    if (next.lake && next.lake !== previous.lake) {
      events.push({ type: 'lake-entered', id: next.lake });
    }
    this.location = next;
    events.push(...this.detectPlaces());
    return events;
  }

  private detectPlaces(): GameEvent[] {
    const near = this.world.placesNear(this.position, this.level);
    const nearIds = new Set(near.map((place) => place.id));
    // On oublie les lieux quittés : revenir sur place redéclenche un événement utile aux missions.
    for (const id of this.reached) if (!nearIds.has(id)) this.reached.delete(id);
    const events: GameEvent[] = [];
    for (const place of near) {
      if (!this.reached.has(place.id)) {
        this.reached.add(place.id);
        events.push({ type: 'place-reached', id: place.id });
      }
    }
    return events;
  }
}
