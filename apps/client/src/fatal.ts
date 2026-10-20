/** Top-level error screen. The markup lives in index.html so it works even if the bundle or fonts fail. */

export type FatalStage = 'webgl' | 'manifest' | 'startup' | 'runtime' | 'unhandled';

const TITLES: Record<FatalStage, string> = {
  webgl: 'Не удалось запустить графику (WebGL)',
  manifest: 'Не удалось прочитать список ресурсов',
  startup: 'Ошибка при запуске игры',
  runtime: 'Ошибка в ходе игры',
  unhandled: 'Непредвиденная ошибка',
};

const HINTS: Record<FatalStage, string> = {
  webgl:
    'Включите аппаратное ускорение в браузере и обновите драйвер видеокарты, затем перезагрузите страницу.',
  manifest:
    'Файл manifest.json повреждён. Обновите страницу; если не помогло, переустановите сборку.',
  startup: 'Попробуйте перезагрузить страницу.',
  runtime: 'Игра остановлена. Перезагрузите страницу; подробности можно скопировать для отчёта.',
  unhandled: 'Перезагрузите страницу; подробности можно скопировать для отчёта.',
};

let shown = false;

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack ?? ''}`.trim();
  try {
    return typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Shows the error screen once (the first failure is the interesting one). */
export function showFatal(stage: FatalStage, err: unknown): void {
  console.error(`[fatal:${stage}]`, err);
  if (shown) return;
  shown = true;
  const el = (id: string) => document.getElementById(id);
  const root = el('fatal');
  if (!root) return;
  const details = `stage: ${stage}\nurl: ${location.href}\nua: ${navigator.userAgent}\n\n${describe(err)}`;
  el('fatal-title')!.textContent = TITLES[stage];
  el('fatal-msg')!.textContent = HINTS[stage];
  el('fatal-details')!.textContent = details;
  const copy = el('fatal-copy') as HTMLButtonElement;
  copy.onclick = () => {
    void navigator.clipboard?.writeText(details).then(
      () => (copy.textContent = 'Скопировано'),
      () => (copy.textContent = 'Не удалось скопировать'),
    );
  };
  (el('fatal-reload') as HTMLButtonElement).onclick = () => location.reload();
  root.classList.add('show');
}

/** Non-blocking warning bar (e.g. fonts missing: the game still runs with fallback fonts). */
export function showWarning(text: string): void {
  console.warn(text);
  const w = document.getElementById('warn');
  if (!w) return;
  w.textContent = text;
  w.style.display = 'block';
}

/** Catches everything that escapes the code that handles errors itself. */
export function installGlobalHandlers(): void {
  window.addEventListener('error', (e) => showFatal('unhandled', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => showFatal('unhandled', e.reason));
}
