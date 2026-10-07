interface Props {
  winner: string | null;
  color: string;
  onRematch: () => void;
  onMenu: () => void;
}

export function GameOver({ winner, color, onRematch, onMenu }: Props) {
  return (
    <div class="gameover">
      <div class="gameover-card">
        <h1 style={{ color }}>{winner ? `${winner} побеждает!` : 'Ничья!'}</h1>
        <div class="row">
          <button class="btn" onClick={onRematch}>
            Реванш
          </button>
          <button class="btn secondary" onClick={onMenu}>
            Меню
          </button>
        </div>
      </div>
    </div>
  );
}
