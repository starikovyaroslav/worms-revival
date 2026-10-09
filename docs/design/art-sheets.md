# Листы спрайтов для внешней ИИ (Nano Banana и др.)

Рабочий процесс: вы генерируете **лист** → кладёте в `assets-in/<id>.png` → `npm run art:sheets` →
игра подхватывает. Нарезчик сам убирает фон, находит каждый спрайт, ужимает, привязывает к палитре DB32,
добавляет контур 1 px и обновляет манифест. Подписи на листе не нужны: имена берутся **по порядку**
(слева направо, сверху вниз) из `tools/art/sheets/<id>.json`.

## Правила для любого листа

1. **Однотонный фон** `#ff00ff` (ярко-пурпурный) без градиентов и теней. Ни один спрайт не должен содержать
   этот цвет.
2. **Сетка** ровно `cols × rows`. Все спрайты одного размера «по духу», между ними **широкие пустые зазоры**
   (не меньше размера половины спрайта). Спрайты **не касаются** друг друга и краёв листа.
3. **Каждый спрайт целиком отдельно:** ничего не перекрывается, нет рамок, подписей, цифр, стрелок, теней
   на фоне.
4. **Простота:** крупные, толстые, читаемые формы. Итоговый размер 24×24 пикселя, мелкие детали исчезнут.
5. Если число найденных спрайтов не совпало, нарезчик напишет, сколько нашёл, и координаты. Тогда
   перегенерируйте или попросите «ровно 20, ни больше ни меньше».

## Лист 1 — червяк (`worm`, сетка 5×4 = 20 спрайтов)

**Порядок (читать слева направо, сверху вниз):**

| Ряд | 1      | 2      | 3      | 4      | 5          |
| --- | ------ | ------ | ------ | ------ | ---------- |
| 1   | idle_0 | idle_1 | idle_2 | idle_3 | idle_blink |
| 2   | walk_0 | walk_1 | walk_2 | walk_3 | walk_4     |
| 3   | walk_5 | walk_6 | walk_7 | jump   | fall       |
| 4   | land   | hurt_0 | hurt_1 | win_0  | win_1      |

Что означает каждая поза (всё **вид строго сбоку, червяк смотрит вправо, голова справа**):

- `idle_0..3` — стоит спокойно, «дышит»: тело чуть вытягивается и сжимается между кадрами; взгляд вперёд, лёгкая улыбка.
- `idle_blink` — как idle, глаза закрыты.
- `walk_0..7` — один цикл ползания «гусеницей»: горб бежит по телу от хвоста к голове (в первом кадре тело
  ровное, в середине горб посередине, в конце снова ровное). Это зацикленный шаг.
- `jump` — вытянут вверх, глаза широко открыты, рот открыт.
- `fall` — вытянут вниз-вперёд, испуганный, рот кричит, брови домиком.
- `land` — сплющен, как лепёшка, зубы сжаты, брови сердитые.
- `hurt_0`, `hurt_1` — получил урон: 0 — зажмурился, зубы сжаты; 1 — глаза выпучены, рот кричит.
- `win_0`, `win_1` — радуется: 0 — подпрыгнул, глаза закрыты от счастья, рот широко открыт; 1 — в стойке, подмигивает.

**Повязка на шее — цветом `#00e5ff` (ярко-голубой), ровной заливкой, без оттенков.** Нарезчик вырежет всё
голубое в отдельный слой, и игра покрасит его в цвет команды (красный/синий/…). Больше нигде этот цвет не
использовать (в том числе в глазах).

### Промпт (русский вариант ниже, английский надёжнее)

```
Pixel art sprite sheet of one cute original cartoon worm mascot, 20 sprites in a strict grid of 5 columns
by 4 rows, perfectly even spacing, very wide empty gaps between sprites, nothing touches or overlaps,
flat solid magenta (#ff00ff) background everywhere, no text, no labels, no numbers, no shadows on the
background, no borders. Each sprite shows the same character: a chubby segmented peach-cream grub-worm
body, big simple white eyes with black pupils, small eyebrows, rosy cheek, wearing a neck bandana filled
with flat pure cyan (#00e5ff) and no other cyan anywhere. Strict side view, facing right, head on the
right, no perspective. Chunky bold shapes, thick dark outline (#222034), very simple shading with at most
two tones, classic 1990s PC game sprite look, limited palette, crisp pixels, no anti-aliasing, no
gradients, no glow. Poses in reading order, left to right and top to bottom:
row 1: calm standing idle breathing (4 slightly different frames), then eyes closed blinking;
row 2: five frames of a crawling caterpillar-style walk cycle with a body hump travelling from tail to
head; row 3: three more frames of the same walk cycle, then jumping stretched upward with surprised face,
then falling stretched downward screaming; row 4: landing squashed flat gritting teeth, hurt with eyes
squeezed shut and teeth gritted, hurt with eyes bulging and mouth screaming, cheering jumping with eyes
closed and wide open mouth, cheering standing and winking. Exactly 20 sprites.
```

**Для Nano Banana (Gemini):**

- Просите в одном сообщении: «сгенерируй ровно один лист со всеми 20 поз, не отдельные картинки».
- Если получилось 19/21 или слиплись — напишите: «в сетке должно быть ровно 5 столбцов и 4 строки, у каждой ячейки
  свой отдельный червяк, увеличь расстояния между ними» и пересоздайте.
- Сначала сгенерируйте **один стиль-референс** (один червяк крупно). Затем в запросе листа приложите его и
  напишите «тот же персонаж, тот же стиль».
- Размер листа: чем больше, тем лучше (хотя бы 2048 px по ширине).

### Что делать, если получилось не идеально

Не страшно, если:

- не те позы или лицо чуть отличается: мы ориентируемся на спрайты по порядку, так что перепутанные позы
  можно переставить в `tools/art/sheets/worm.json`;
- «пиксели» не по сетке или разного размера: нарезчик сам приведёт к 24×24 и палитре;
- нет повязки голубой: тогда команда не подсветится, но игра работает.

Критично, если:

- спрайтов не 20 (нарезчик остановится с понятной ошибкой);
- спрайты касаются друг друга или фон не однотонный.

### Проверка

```
npm run art:sheets      # нарезка в apps/client/public/assets (+ манифест)
npm run dev             # посмотреть в игре; ?seed=1
```

Если результат не нравится, удалите нарезанные файлы командой `npm run art` (она заново соберёт мой набор
из кода) и попробуйте другой лист.

## Следующие листы (после червяка)

Тем же способом, по 12–20 спрайтов на лист (описания и порядок я добавлю в `tools/art/sheets/` по мере
готовности предыдущего):

- `weapons-a` — иконки оружия F1–F5 (20 штук, 32 px);
- `weapons-b` — иконки оружия F6–F12 и утилиты;
- `objects` — ящики, бочка, мина, надгробие, парашют, снаряды;
- `face` — отдельные эмоции (если захотим мимику слоями);
- `bg-meadow`, `bg-desert`, `bg-arctic`, `bg-hell` — фоны (другой формат: полосы, не сетка).
