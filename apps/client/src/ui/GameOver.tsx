interface Props {
  winner: string | null;
  color: string;
  isReplay: boolean;
  onRematch: () => void;
  onMenu: () => void;
  onWatch: () => void;
  onDownload: () => void;
}

export function GameOver({
  winner,
  color,
  isReplay,
  onRematch,
  onMenu,
  onWatch,
  onDownload,
}: Props) {
  return (
    <div class="gameover">
      <div class="gameover-card">
        <h1 style={{ color }}>{winner ? `Победа: ${winner}!` : 'Ничья!'}</h1>
        <div class="row">
          {!isReplay && (
            <button class="btn" onClick={onRematch}>
              Реванш
            </button>
          )}
          <button class="btn secondary" onClick={onWatch}>
            {isReplay ? 'Ещё раз' : 'Смотреть повтор'}
          </button>
          <button class="btn secondary" onClick={onDownload}>
            Скачать повтор
          </button>
          <button class="btn secondary" onClick={onMenu}>
            Меню
          </button>
        </div>
      </div>
    </div>
  );
}
