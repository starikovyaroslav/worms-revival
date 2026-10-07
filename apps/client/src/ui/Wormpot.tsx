import { useEffect, useRef, useState } from 'preact/hooks';
import { WORMPOT } from '@wr/content';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

const SLOTS = 3;

/** WWP-style slot machine: spin for up to three random match modifiers. */
export function Wormpot({ value, onChange }: Props) {
  const [spinning, setSpinning] = useState<number[] | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => clearInterval(timer.current), []);

  const spin = () => {
    const pool = WORMPOT.map((m) => m.id);
    // Pick three different modifiers; each slot may also come up empty.
    const result: string[] = [];
    for (let i = 0; i < SLOTS; i++) {
      if (Math.random() < 0.2) continue;
      const left = pool.filter((id) => !result.includes(id));
      result.push(left[Math.floor(Math.random() * left.length)]!);
    }
    let frame = 0;
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      frame++;
      setSpinning([0, 1, 2].map((i) => (frame + i * 5) % WORMPOT.length));
      if (frame > 18) {
        clearInterval(timer.current);
        setSpinning(null);
        onChange(result);
      }
    }, 60);
  };

  const cycle = (slot: number) => {
    const ids = value.slice();
    const current = ids[slot];
    const idx = current ? WORMPOT.findIndex((m) => m.id === current) : -1;
    const next = WORMPOT.slice(idx + 1).find((m) => !ids.includes(m.id));
    if (next) ids[slot] = next.id;
    else ids.splice(slot, 1);
    onChange(ids.filter(Boolean));
  };

  return (
    <div class="wormpot">
      <div class="wormpot-slots">
        {Array.from({ length: SLOTS }, (_, i) => {
          const mod = spinning ? WORMPOT[spinning[i]!] : WORMPOT.find((m) => m.id === value[i]);
          return (
            <button
              class={`wormpot-slot ${spinning ? 'spin' : ''}`}
              key={i}
              onClick={() => cycle(i)}
              title={mod?.description}
            >
              <span class="wp-icon">{mod?.icon ?? '—'}</span>
              <span class="wp-name">{mod?.name ?? 'пусто'}</span>
            </button>
          );
        })}
      </div>
      <div class="row">
        <button class="btn small" onClick={spin} disabled={!!spinning}>
          🎰 Крутить
        </button>
        {value.length > 0 && (
          <button class="btn small secondary" onClick={() => onChange([])}>
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
