import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Workflow {
  name: string;
  on: unknown;
  jobs: Record<string, { 'runs-on': string; steps: { run?: string; uses?: string }[] }>;
}

interface VercelConfig {
  framework: string;
  outputDirectory: string;
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;
const headers = Object.fromEntries(
  vercel.headers.flatMap((rule) => rule.headers).map(({ key, value }) => [key, value]),
);

describe('vercel.json', () => {
  it('décrit le build Vite', () => {
    expect(vercel.framework).toBe('vite');
    expect(vercel.outputDirectory).toBe('dist');
    expect(vercel.headers[0]?.source).toBe('/(.*)');
  });

  it('porte les en-têtes de sécurité demandés', () => {
    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
    ]) {
      expect(headers[name], name).toBeTruthy();
    }
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('garde une CSP stricte', () => {
    const csp = headers['Content-Security-Policy']!;
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/https?:/);
  });
});

describe('ci.yml', () => {
  const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as Workflow;

  it('est un workflow valide dans sa structure', () => {
    expect(workflow.name).toBeTruthy();
    expect(workflow.on).toBeTruthy();
    const job = workflow.jobs.verify!;
    expect(job['runs-on']).toBe('ubuntu-latest');
    for (const step of job.steps) expect(Boolean(step.run) || Boolean(step.uses)).toBe(true);
  });

  it('lance les mêmes scripts que le local', () => {
    const commands = workflow.jobs.verify!.steps.map((step) => step.run).filter(Boolean);
    expect(commands).toContain('pnpm install --frozen-lockfile');
    expect(commands).toContain('pnpm verify');
    expect(commands).toContain('pnpm lighthouse');
  });

  it('ne déploie rien', () => {
    const text = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(text).not.toMatch(/vercel|deploy/i);
  });
});
