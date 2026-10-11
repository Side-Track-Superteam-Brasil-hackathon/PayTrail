/** Cliente HTTP mínimo para a API (specs/03-api.yaml). Corpo JSON tipado pelo chamador. */

export class HttpError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly body: string,
    expected: number[],
    authenticated = false,
  ) {
    // No Spring Security, rota não mapeada com token válido cai em /error (protegido) e vira 401 vazio.
    const missing = status === 404 || status === 405 || (status === 401 && authenticated && body.trim() === '');
    const hint = missing ? ' (endpoint não implementado?)' : '';
    super(`${method} ${path} -> HTTP ${status}, esperado ${expected.join('|')}${hint}: ${truncate(body, 400)}`);
  }
}

export function truncate(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
}

export interface ApiResponse<T> {
  status: number;
  body: T;
  text: string;
  headers: Headers;
}

export interface RequestOptions {
  /** Status aceitos (default: 200). */
  expect?: number | number[];
  headers?: Record<string, string>;
  /** Não envia o Bearer token mesmo se houver. */
  anonymous?: boolean;
}

export class Api {
  constructor(
    readonly baseUrl: string,
    readonly token?: string,
  ) {}

  as(token: string): Api {
    return new Api(this.baseUrl, token);
  }

  anonymous(): Api {
    return new Api(this.baseUrl);
  }

  async request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
    const expected = Array.isArray(opts.expect) ? opts.expect : [opts.expect ?? 200];
    const headers: Record<string, string> = { Accept: 'application/json, text/csv;q=0.9, */*;q=0.1', ...opts.headers };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token && !opts.anonymous) headers.Authorization = `Bearer ${this.token}`;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      throw new Error(`${method} ${path}: sem resposta da API (${e instanceof Error ? e.message : String(e)})`);
    }
    const text = await res.text();
    if (!expected.includes(res.status)) {
      throw new HttpError(method, path, res.status, text, expected, headers.Authorization !== undefined);
    }
    let parsed: unknown = text;
    if ((res.headers.get('content-type') ?? '').includes('json') && text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`${method} ${path}: JSON inválido: ${truncate(text, 200)}`);
      }
    }
    return { status: res.status, body: parsed as T, text, headers: res.headers };
  }

  async get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return (await this.request<T>('GET', path, undefined, opts)).body;
  }

  async post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return (await this.request<T>('POST', path, body, opts)).body;
  }

  async patch<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T> {
    return (await this.request<T>('PATCH', path, body, opts)).body;
  }
}

export function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}
