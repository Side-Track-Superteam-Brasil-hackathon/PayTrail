/** Mini framework de cenários: cada cenário é reportado à parte (PASS/FAIL/SKIP) com seus passos. */

export type Outcome = 'PASS' | 'FAIL' | 'SKIP';

export class AssertionError extends Error {}

export function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new AssertionError(message);
}

export function assertEq<T>(actual: T, expected: T, what: string): void {
  if (actual !== expected) {
    throw new AssertionError(`${what}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
  }
}

export interface StepApi {
  /** Executa um passo nomeado; falha do passo = falha do cenário. */
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  /** Checagem "soft": registra WARN sem falhar o cenário. */
  warn(cond: boolean, message: string): void;
  info(message: string): void;
}

export interface Scenario {
  id: string;
  title: string;
  needs: string[];
  run: (s: StepApi) => Promise<void>;
}

export interface ScenarioResult {
  id: string;
  title: string;
  outcome: Outcome;
  ms: number;
  error?: string;
  warnings: number;
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
export const green = (s: string) => paint(32, s);
export const red = (s: string) => paint(31, s);
export const yellow = (s: string) => paint(33, s);
export const dim = (s: string) => paint(2, s);
export const bold = (s: string) => paint(1, s);

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function runScenarios(scenarios: Scenario[], only?: Set<string>): Promise<ScenarioResult[]> {
  const results = new Map<string, ScenarioResult>();
  for (const sc of scenarios) {
    const header = `${sc.id} ${sc.title}`;
    if (only && !only.has(sc.id)) continue;
    const blocked = sc.needs.filter((n) => results.get(n)?.outcome !== 'PASS');
    if (blocked.length > 0) {
      console.log(`\n${bold(header)}\n  ${yellow('SKIP')} depende de ${blocked.join(', ')} (não passou ou não rodou)`);
      results.set(sc.id, { id: sc.id, title: sc.title, outcome: 'SKIP', ms: 0, warnings: 0, error: `needs ${blocked.join(', ')}` });
      continue;
    }
    console.log(`\n${bold(header)}`);
    const started = Date.now();
    let warnings = 0;
    const api: StepApi = {
      async step(name, fn) {
        const t0 = Date.now();
        try {
          const v = await fn();
          console.log(`  ${green('ok')}   ${name} ${dim(`(${Date.now() - t0} ms)`)}`);
          return v;
        } catch (e) {
          console.log(`  ${red('FAIL')} ${name}\n       ${red(errorText(e))}`);
          throw new StepFailed(name, e);
        }
      },
      warn(cond, message) {
        if (!cond) {
          warnings++;
          console.log(`  ${yellow('WARN')} ${message}`);
        }
      },
      info(message) {
        console.log(`       ${dim(message)}`);
      },
    };
    try {
      await sc.run(api);
      results.set(sc.id, { id: sc.id, title: sc.title, outcome: 'PASS', ms: Date.now() - started, warnings });
    } catch (e) {
      if (!(e instanceof StepFailed)) console.log(`  ${red('FAIL')} ${errorText(e)}`);
      const error = e instanceof StepFailed ? `${e.stepName}: ${errorText(e.inner)}` : errorText(e);
      results.set(sc.id, { id: sc.id, title: sc.title, outcome: 'FAIL', ms: Date.now() - started, warnings, error });
    }
  }
  return [...results.values()];
}

class StepFailed extends Error {
  constructor(
    readonly stepName: string,
    readonly inner: unknown,
  ) {
    super(stepName);
  }
}

export function printSummary(results: ScenarioResult[]): void {
  console.log(`\n${bold('Resumo')}`);
  for (const r of results) {
    const tag = r.outcome === 'PASS' ? green('PASS') : r.outcome === 'FAIL' ? red('FAIL') : yellow('SKIP');
    const extra = r.outcome === 'FAIL' && r.error ? ` ${dim('- ' + r.error.slice(0, 160))}` : '';
    const warn = r.warnings > 0 ? yellow(` (${r.warnings} warn)`) : '';
    console.log(`  ${tag}  ${r.id.padEnd(3)} ${r.title}${warn}${extra}`);
  }
  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  console.log(`\n  ${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIP')} skipped`);
}

export async function waitFor<T>(
  what: string,
  probe: () => Promise<T>,
  done: (v: T) => boolean,
  opts: { timeoutMs: number; intervalMs?: number; describe?: (v: T) => string },
): Promise<T> {
  const deadline = Date.now() + opts.timeoutMs;
  let last: T | undefined;
  let lastError: unknown;
  for (;;) {
    try {
      last = await probe();
      lastError = undefined;
      if (done(last)) return last;
    } catch (e) {
      lastError = e;
    }
    if (Date.now() > deadline) {
      const state =
        lastError !== undefined
          ? `último erro: ${errorText(lastError)}`
          : `último estado: ${last === undefined ? '-' : opts.describe ? opts.describe(last) : JSON.stringify(last).slice(0, 300)}`;
      throw new AssertionError(`timeout (${opts.timeoutMs / 1000}s) esperando ${what}; ${state}`);
    }
    await new Promise((r) => setTimeout(r, opts.intervalMs ?? 1000));
  }
}
