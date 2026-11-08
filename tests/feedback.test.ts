import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_FIELDS,
  FEEDBACK_TEMPLATES,
  buildReport,
  categoriesFor,
  reportFields,
  templateFor,
  toIssueUrl,
} from '../src/core/feedback';
import { desiredLabels } from '../scripts/feedback/labels';

/** Contrat entre le jeu, les formulaires GitHub, les labels et les agents (ADR 0009). */

interface FormField {
  type: string;
  id?: string;
  validations?: { required?: boolean };
}
interface IssueForm {
  name: string;
  labels: string[];
  body: FormField[];
}
interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, string>;
}
interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, { steps: Step[] }>;
}

const read = (path: string): string => readFileSync(path, 'utf8');
const formOf = (file: string): IssueForm =>
  parse(read(`.github/ISSUE_TEMPLATE/${file}`)) as IssueForm;
const labels = desiredLabels(read('.github/labels.yml'), read('data/countries.json'));
const labelNames = new Set(labels.map((label) => label.name));

describe('formulaires GitHub', () => {
  const files = Object.values(FEEDBACK_TEMPLATES);

  it('existent pour chaque modèle, et les issues vierges sont désactivées', () => {
    for (const file of files) expect(existsSync(`.github/ISSUE_TEMPLATE/${file}`), file).toBe(true);
    expect(parse(read('.github/ISSUE_TEMPLATE/config.yml'))).toEqual({
      blank_issues_enabled: false,
    });
  });

  it('portent tous les champs que le jeu pré-remplit, en champs texte facultatifs', () => {
    for (const file of files) {
      const fields = formOf(file).body;
      for (const id of FEEDBACK_FIELDS) {
        const field = fields.find((candidate) => candidate.id === id);
        expect(field, `${file} : ${id}`).toBeDefined();
        // Seuls les champs « input » se pré-remplissent par l'URL.
        expect(field!.type, `${file} : ${id}`).toBe('input');
        expect(field!.validations?.required ?? false, `${file} : ${id}`).toBe(false);
      }
    }
  });

  it('exigent l’absence de données personnelles', () => {
    for (const file of files) {
      const privacy = formOf(file).body.find((field) => field.id === 'privacy');
      expect(privacy?.type, file).toBe('checkboxes');
    }
  });

  it('posent triage:new et un type, tous deux définis dans labels.yml', () => {
    for (const file of files) {
      const formLabels = formOf(file).labels;
      expect(formLabels, file).toContain('triage:new');
      expect(
        formLabels.some((label) => label.startsWith('type:')),
        file,
      ).toBe(true);
      for (const label of formLabels) expect(labelNames.has(label), label).toBe(true);
    }
  });

  it('reçoivent du jeu un lien dont chaque paramètre est un champ connu', () => {
    for (const category of FEEDBACK_CATEGORIES) {
      const screen = (['country-card', 'quiz', 'parents'] as const).find((candidate) =>
        categoriesFor(candidate).includes(category),
      )!;
      const report = buildReport(
        {
          screen,
          locale: 'en',
          level: 'expert',
          appVersion: '1.2.3',
          country: 'KEN',
          questionId: 'capital-of:KEN',
        },
        category,
      );
      const url = new URL(toIssueUrl(report));
      const form = formOf(templateFor(category));
      const ids = new Set(form.body.map((field) => field.id));
      for (const key of url.searchParams.keys()) {
        if (key === 'template' || key === 'title') continue;
        expect(ids.has(key), `${category} : ${key}`).toBe(true);
      }
      expect(reportFields(report).length).toBe(FEEDBACK_FIELDS.length);
    }
  });
});

describe('labels', () => {
  it('couvrent la taxonomie et les 54 pays, sans ESH', () => {
    for (const name of ['triage:new', 'triage:done', 'needs-human', 'agent-proposed', 'ready']) {
      expect(labelNames.has(name), name).toBe(true);
    }
    const countries = labels.filter((label) => label.name.startsWith('pays:'));
    expect(countries).toHaveLength(54);
    expect(labelNames.has('pays:esh')).toBe(false);
  });

  it('refusent un doublon', () => {
    const yaml = "- name: 'pays:sen'\n  color: 'ffffff'\n  description: x\n";
    expect(() => desiredLabels(yaml, read('data/countries.json'))).toThrow(/double/);
  });

  it('sont tous ceux que citent les consignes des agents', () => {
    for (const file of ['.github/agents/triage.md', '.github/agents/digest.md']) {
      const cited = read(file).match(/`((?:type|prio|lang|triage):[a-z0-9-]+)`/g) ?? [];
      for (const raw of cited)
        expect(labelNames.has(raw.slice(1, -1)), `${file} : ${raw}`).toBe(true);
    }
  });
});

describe('workflows des agents', () => {
  const agents = ['feedback-triage.yml', 'feedback-digest.yml'];

  for (const file of agents) {
    const text = read(`.github/workflows/${file}`);
    const workflow = parse(text) as Workflow;
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
    const claude = steps.find((step) => step.uses?.startsWith('anthropics/claude-code-action@'));

    describe(file, () => {
      it('ne se déclenche que par planification ou à la main', () => {
        expect(Object.keys(workflow.on).sort()).toEqual(['schedule', 'workflow_dispatch']);
      });

      it('a des permissions minimales', () => {
        expect(workflow.permissions).toEqual({ contents: 'read', issues: 'write' });
      });

      it('épingle l’action sur un commit', () => {
        expect(claude?.uses).toMatch(/@[0-9a-f]{40}$/);
      });

      it('ne place aucun texte d’issue dans le prompt et lit ses consignes versionnées', () => {
        const prompt = claude?.with?.prompt ?? '';
        expect(prompt).not.toMatch(/github\.event/);
        expect(prompt).toMatch(/\.github\/agents\/\w+\.md/);
        expect(existsSync(prompt.match(/\.github\/agents\/\w+\.md/)![0])).toBe(true);
      });

      it('limite les outils de l’agent', () => {
        const args = claude?.with?.claude_args ?? '';
        expect(args).toContain('--allowedTools');
        expect(args).toContain('--max-turns');
        expect(args).not.toMatch(/gh issue (close|delete|lock|transfer)|gh pr|git push|Write|Edit/);
        expect(args).not.toMatch(/Bash\((?!gh )/);
      });
    });
  }

  it('la synchronisation des labels ne lance que le script dédié', () => {
    const workflow = parse(read('.github/workflows/labels-sync.yml')) as Workflow;
    expect(workflow.permissions).toEqual({ contents: 'read', issues: 'write' });
    const runs = workflow.jobs.labels!.steps.map((step) => step.run).filter(Boolean);
    expect(runs).toEqual(['pnpm install --frozen-lockfile', 'pnpm feedback:labels']);
  });
});
