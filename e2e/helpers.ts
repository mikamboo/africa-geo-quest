import { expect, type Page, type TestInfo } from '@playwright/test';

export interface PageGuards {
  errors: string[];
  external: string[];
}

/** Collecte erreurs console, violations CSP et requêtes hors origine. */
export function watchPage(page: Page, baseUrl = 'http://localhost:4173'): PageGuards {
  const guards: PageGuards = { errors: [], external: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') guards.errors.push(message.text());
  });
  page.on('pageerror', (error) => guards.errors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (!url.startsWith(baseUrl)) guards.external.push(url);
  });
  return guards;
}

export async function createProfile(page: Page, level: 'explorer' | 'geographer' = 'explorer') {
  await page.goto('/');
  await page.getByTestId('start').click();
  await page.getByTestId(`level-${level}`).check({ force: true });
  await page.getByTestId('setup-go').click();
  await expect(page.getByTestId('mode-explore')).toBeVisible();
}

async function readLatLon(page: Page): Promise<{ lat: number; lon: number }> {
  const position = page.getByTestId('hud-position');
  const lat = Number(await position.getAttribute('data-lat'));
  const lon = Number(await position.getAttribute('data-lon'));
  return { lat, lon };
}

/** Maintient une direction au clavier, ou au joystick tactile sur mobile. */
export class Walker {
  private cdp: Awaited<ReturnType<ReturnType<Page['context']>['newCDPSession']>> | null = null;

  constructor(
    private readonly page: Page,
    private readonly isMobile: boolean,
  ) {}

  private async touch(type: string, x?: number, y?: number): Promise<void> {
    this.cdp ??= await this.page.context().newCDPSession(this.page);
    await this.cdp.send('Input.dispatchTouchEvent', {
      type: type as 'touchStart',
      touchPoints: x === undefined || y === undefined ? [] : [{ x, y, id: 1 }],
    });
  }

  async start(dx: number, dy: number): Promise<void> {
    if (this.isMobile) {
      const box = await this.page.getByTestId('joystick').boundingBox();
      if (!box) throw new Error('Joystick invisible');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await this.touch('touchStart', cx, cy);
      await this.touch('touchMove', cx + dx * 50, cy + dy * 50);
      return;
    }
    if (dx > 0) await this.page.keyboard.down('ArrowRight');
    if (dx < 0) await this.page.keyboard.down('ArrowLeft');
    if (dy > 0) await this.page.keyboard.down('ArrowDown');
    if (dy < 0) await this.page.keyboard.down('ArrowUp');
  }

  async stop(): Promise<void> {
    if (this.isMobile) {
      await this.touch('touchEnd');
      return;
    }
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
      await this.page.keyboard.up(key);
    }
  }

  /** Marche jusqu'à ce que `until` soit vrai, en suivant `direction`. */
  async walkUntil(
    direction: () => Promise<{ dx: number; dy: number }>,
    until: () => Promise<boolean>,
    timeoutMs = 90_000,
  ): Promise<void> {
    const started = Date.now();
    let current: { dx: number; dy: number } | null = null;
    while (Date.now() - started < timeoutMs) {
      if (await until()) {
        await this.stop();
        return;
      }
      const next = await direction();
      if (!current || next.dx !== current.dx || next.dy !== current.dy) {
        if (current) await this.stop();
        await this.start(next.dx, next.dy);
        current = next;
      }
      await this.page.waitForTimeout(150);
    }
    await this.stop();
    throw new Error(`Objectif non atteint en ${timeoutMs} ms`);
  }
}

const COMPASS: Record<string, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  NE: { dx: 1, dy: -1 },
  E: { dx: 1, dy: 0 },
  SE: { dx: 1, dy: 1 },
  S: { dx: 0, dy: 1 },
  SW: { dx: -1, dy: 1 },
  W: { dx: -1, dy: 0 },
  NW: { dx: -1, dy: -1 },
};

/** Se dirige avec l'indice de boussole affiché au joueur. */
export function followHint(page: Page) {
  return async (): Promise<{ dx: number; dy: number }> => {
    const compass = await page.getByTestId('mission-hint').getAttribute('data-compass');
    return COMPASS[compass ?? 'N'] ?? { dx: 0, dy: -1 };
  };
}

export function goTowards(page: Page, lat: number, lon: number) {
  return async (): Promise<{ dx: number; dy: number }> => {
    const here = await readLatLon(page);
    const dx = Math.abs(lon - here.lon) < 0.5 ? 0 : lon > here.lon ? 1 : -1;
    const dy = Math.abs(lat - here.lat) < 0.5 ? 0 : lat > here.lat ? -1 : 1;
    return { dx, dy };
  };
}

export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'mobile';
}

export function expectClean(guards: PageGuards): void {
  expect(guards.errors, 'erreurs console ou violations CSP').toEqual([]);
  expect(guards.external, 'requêtes hors origine').toEqual([]);
}
