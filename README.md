# worms-revival

Браузерная пошаговая артиллерийская игра в духе Worms World Party / Armageddon (рабочее название).

- Детерминированная симуляция на 50 тиков/с, разрушаемый пиксельный ландшафт.
- Hot-seat и боты; онлайн (lockstep) — позже.
- Собственная процедурная графика и звук, никаких ассетов Team17.

## Разработка

```sh
npm install
npm run dev        # клиент
npm test           # тесты
npm run lint
npm run typecheck
```

Структура — см. [docs/design/architecture.md](docs/design/architecture.md).
