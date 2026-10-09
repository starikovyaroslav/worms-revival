# Арт-бриф: промпты и ТЗ для ИИ-генерации с ручной доработкой

> **ОБНОВЛЕНИЕ 2026-10-09: выбран ретро-стиль (пиксель-арт).** Всё ниже про «мягкое cel-shading, HiDPI,
> размеры ×2–4» относится к первоначальному глянцевому направлению и **устарело**. Актуально:
> пиксель-арт в родном масштабе (1 пиксель арта = 1 пиксель мира), палитра DB32, обводка 1 px,
> без сглаживания и полупрозрачных градиентов, вид сбоку. Размеры: иконки оружия 32 px, объекты и снаряды
> 6–24 px, червяк ≈ 14×18 кадры. Для промптов добавляйте: `pixel art, limited palette, 1px dark outline,
no anti-aliasing, retro 90s PC game sprite, crisp pixels`. Рабочий набор сейчас генерируется кодом
> (`npm run art`); внешняя ИИ нужна для ключевых вещей (червяк, логотип, фоны) в том же стиле.

Версия 1 · 2026-10-08 · решение владельца: арт делаем **ИИ-генерацией + ручной доработкой** (см. `ROADMAP.md`).

Бриф универсален: подходит для любой модели, которая умеет **референс-изображения** (style/character
reference или img2img) и **фиксированный seed**. Названия конкретных сервисов не привязаны.
Промпты — на английском (модели лучше понимают), пояснения — на русском.

## 0. Правила (юридические и качественные)

1. **Не называть в промптах** Worms, Team17, имена художников, названия студий и игр. Мы делаем оригинальный
   стиль и оригинального персонажа (торговая марка «Worms» принадлежит Team17).
2. **Чисто ИИ-работы авторским правом обычно не охраняются.** Поэтому каждый ключевой ассет (персонаж, лицо,
   логотип, иконки оружия) обязательно **дорабатывается вручную**: перерисовка контуров, правка форм,
   единая палитра, чистка артефактов. Записывайте это в `ATTRIBUTIONS.md` (какой инструмент, что правилось).
3. **Согласованность важнее красоты отдельной картинки.** Лучше средняя, но единая по стилю, чем 40
   «шедевров» в разных стилях. Всегда генерируем от **якорных референсов** (раздел 2).
4. Каждый ассет — на **однотонном фоне** (чистый зелёный `#00ff00` или белый) для вырезки, без теней на фоне.
5. Никакого текста на картинках (ИИ его ломает) — подписи и числа рисуем в игре.

## 1. Арт-дирекшн (style bible)

**Одной фразой:** весёлый «мультяшный экшен» с плотной тёмной обводкой, мягкой ячеистой (cel) светотенью,
тёплым верхним светом и сочными, но не неоновыми цветами. Объёмно, «осязаемо», как дорогая 2D-анимация.

| Параметр     | Значение                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Обводка      | Тёмно-фиолетово-коричневая `#2a1a24`, толщина ≈ 4–5% высоты объекта, чуть «живая», не механическая |
| Свет         | Основной — сверху-слева, тёплый `#fff1d0`. Заполняющий — холодный снизу-справа `#6a7ab0`           |
| Тени         | Не чёрные, а холодный фиолет `#5a4a7a`; 2 ступени (cel), без размытых градиентов                   |
| Блик         | Один чёткий белый блик на глянцевых вещах (глаза, кожа, металл)                                    |
| Фактура      | Минимум шума; материал читается формой и светом, а не мелкой текстурой                             |
| Насыщенность | Высокая, но с запасом: чистые цвета ≈ 85% насыщенности                                             |
| Перспектива  | Строго **вид сбоку**, без перспективы (2D-платформер)                                              |
| Настроение   | Дерзко-смешное, «мы тут воюем, но нам весело». Выразительные эмоции                                |

**Цвета команд** (для тонирования в игре, рисуем нейтрально-серыми там, где указано):
красный `#ff4a4a`, синий `#4a8cff`, зелёный `#4ade4a`, жёлтый `#ffd23a`, пурпурный `#e85cff`, бирюзовый `#3ae0e0`.

**Темы окружения** (палитры фона/земли):
`meadow` (луг: зелёный/коричневый, тёплое небо), `desert` (песок/охра, оранжевое небо),
`arctic` (лёд/голубой, холодное небо), `hell` (тёмно-красный/угольный, лава, багровое небо).

## 2. Персонаж (оригинальный дизайн)

**Предложение (подтвердить владельцу проекта):** не «розовый червяк» (узнаваемый образ Team17), а
**личинка/гусеница-коротышка**: упитанное сегментированное тело кремово-персикового цвета с мягкими
поперечными складками, большие выразительные глаза, маленькие подвижные брови, румяные щёки, на «шее» —
повязка/бандана цвета команды (тонируется). Узнаваемый силуэт: «толстая колбаска с повязкой».
Если хочется другого образа (например, толстый червь-пират, червь-панк) — менять **здесь, до генерации**,
после генерации менять дорого.

### 2.1 Якорные референсы (делать первыми, остальное строится на них)

Создать и **утвердить** три картинки. Дальше они подаются как референсы во все остальные запросы.

**Якорь A — лист персонажа (turnaround)**

```
character design sheet of an original cartoon grub-worm mascot, chubby segmented cream-peach body with
soft horizontal creases, big glossy expressive eyes with small eyebrows, rosy cheeks, a team-colored
bandana around the neck, friendly mischievous personality, side view and three-quarter view,
bold dark outline (#2a1a24), soft two-step cel shading, warm top-left light, saturated colors,
clean vector-like 2D game art, plain flat green background, no text, no watermark
```

**Якорь B — шкала эмоций**

```
same character as reference, expression sheet: neutral, happy, angry, scared, hurt, dizzy, surprised,
smug, sad, laughing, determined, sleepy — head only, side view, consistent proportions, bold dark outline,
cel shading, plain flat green background, grid layout, no text
```

**Якорь C — стиль окружения**

```
cartoon 2D game environment concept, side view platformer landscape, rolling green hills, layered
parallax depth, bold dark outlines on foreground, soft atmospheric haze in background, warm sunlight
from top-left, saturated but harmonious palette, clean cel shading, no characters, no text
```

**Универсальный префикс стиля** (добавлять в начало КАЖДОГО промпта):

```
original cartoon 2D game art, bold dark outline (#2a1a24), soft two-step cel shading, warm top-left
light, cool violet shadows, saturated colors, clean shapes, side view, no perspective,
```

**Универсальный негатив** (если модель поддерживает):

```
text, letters, watermark, signature, photo, realistic, 3d render, blurry, noisy texture, gradient
background, shadow on background, cropped, multiple objects, extra limbs, deformed, low quality
```

## 3. Технические требования к рендеру (как мы это используем)

Игровой мир: червяк ≈ 13 пикселей мира в высоту; камера зумит ×0.35–×2.5, экраны HiDPI (×2).
Значит на экране червяк бывает до ~65 пикселей. Рисуем **с запасом ×2–4**.

| Ассет                          | Размер исходника          | Формат              | Примечание                                            |
| ------------------------------ | ------------------------- | ------------------- | ----------------------------------------------------- |
| Тело червяка (полоса)          | 640×160                   | PNG, прозрачный фон | Горизонтальная прямая полоса, голова справа (см. 4.1) |
| Части лица (глаза, брови, рот) | 96×96 на кадр             | PNG, прозрачный фон | Отдельные слои (см. 4.2)                              |
| Повязка                        | 160×96                    | PNG, **серая**      | Тонируется цветом команды                             |
| Оружие в руке                  | до 256×128                | PNG, прозрачный фон | Смотрит вправо, точка хвата в метаданных              |
| Снаряды, объекты               | 64–128 по большей стороне | PNG, прозрачный фон | Вид сбоку, смотрят вправо                             |
| Иконки оружия (UI)             | 128×128                   | PNG, прозрачный фон | Единый ракурс (3/4 слева-сверху), одинаковый масштаб  |
| Рамки/кнопки UI                | 9-slice, 256×256          | PNG, прозрачный фон | Угол ≥ 24 px, центр однотонный                        |
| Логотип                        | 1024×400                  | PNG, прозрачный фон | Без текста от ИИ: слово набираем сами, ИИ — украшения |
| Фоны (параллакс)               | 2048×1024 на слой         | PNG, тайлится по X  | 4 слоя на тему: дальний → ближний                     |
| Текстуры земли                 | 512×512                   | PNG, **бесшовные**  | soil, rock, + полоса поверхности 512×64               |
| Эффекты (флипбуки)             | ячейка 128×128, сетка 8×4 | PNG, прозрачный     | Опционально: сейчас эффекты процедурные               |

Общее: PNG 8 бит RGBA, sRGB, **без предумноженной альфы**, края чистые (без зелёной каймы после вырезки).

## 4. Ассеты и промпты

Во всех промптах подразумевается универсальный префикс из раздела 2.1 и подача якорей A/B/C как референсов.

### 4.1 Тело червяка — полоса для мягкого меша

Тело в игре — гибкий меш: текстура растягивается вдоль цепочки сегментов. Поэтому рисуем **прямую
горизонтальную колбаску** без лица, голова справа.

```
the same grub-worm body, perfectly straight horizontal sausage shape lying flat, side view, head end on
the right with a rounded cap, tail end on the left tapering softly, soft horizontal creases along the
body, lighter belly highlight on the lower edge, no face, no eyes, no mouth, no accessories, no arms,
bold dark outline, two-step cel shading, plain flat green background
```

Требования при доработке: голова/хвост закруглены, обводка непрерывна, складки **не пересекают** обводку.
Нужны варианты: `body-normal`, `body-hurt` (тот же, но бледнее/с синяком), `body-poison` (зеленоватый).

### 4.2 Лицо — слои

Рисуем части отдельно, чтобы комбинировать (меньше кадров, больше выражений):

- **Глаза (белок):** `eye-open`, `eye-half`, `eye-closed`, `eye-wide`, `eye-squint`, `eye-dead` (крестик).
- **Зрачок:** одна круглая картинка с бликом (двигаем кодом, взгляд следит за прицелом).
- **Брови:** `brow-neutral`, `brow-angry`, `brow-worried`, `brow-raised`, `brow-sad`.
- **Рты:** `mouth-smile`, `mouth-open`, `mouth-talk-a`, `mouth-talk-b`, `mouth-scream`, `mouth-grit`,
  `mouth-smug`, `mouth-worried`, `mouth-dead`.

```
isolated cartoon cartoon-face part, [PART], same style as reference character face, bold dark outline,
cel shading, centered, plain flat green background, no head, no body
```

Подставлять в `[PART]`: `pair of wide-open glossy eyes` / `single angry eyebrow` / `smiling open mouth with tongue` и т.д.
Эмоции-композиты проверять собранными на якоре B.

### 4.3 Повязка и аксессуары (тонируются командой)

```
isolated cloth neck bandana tied with a small knot, grayscale only (white to mid-gray shading), no color,
bold dark outline, cel shading, side view, plain flat green background
```

Дополнительно (косметика, потом): шапки `cap`, `helmet`, `pirate-hat`, `crown`, `cowboy-hat`, `headphones`,
`goggles` — тоже в серой шкале, смотрят вправо, посадка на «голову» червяка.

### 4.4 Руки и оружие в руке

Червяк держит оружие у «груди»; руки рисуем частью спрайта оружия (кисть + оружие вместе).
Точка хвата и дуло задаются в метаданных (см. раздел 6).

Шаблон для каждого оружия:

```
[WEAPON], held by a small cartoon hand with a glove, side view pointing right, chunky exaggerated
proportions, bold dark outline, cel shading, single object, plain flat green background
```

Список (подставлять в `[WEAPON]`) — по рядам панели:

| Ряд | Оружие                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `bazooka rocket launcher`, `homing missile launcher with a small radar dish`, `mortar tube`, `carrier pigeon cage launcher`            |
| F2  | `round black grenade with pin`, `red cluster bomb with small bomblets`, `banana-shaped bomb`                                           |
| F3  | `pump-action shotgun`, `small pistol`, `compact uzi submachine gun`, `rotary minigun`, `wooden longbow with an arrow`                  |
| F4  | `flaming fist`, `prod stick with a hand at the end`                                                                                    |
| F5  | `bundle of dynamite sticks with a lit fuse`, `round landmine with a blinking light`, `fluffy sheep`, `sheep with a red superhero cape` |
| F6  | `walkie-talkie radio for calling an air strike`                                                                                        |
| F7  | `blowtorch with a flame`, `pneumatic drill`, `steel girder beam`, `baseball bat`                                                       |
| F8  | `ninja rope grappling hook`, `small parachute pack`, `teleport device with swirling sparkles`                                          |
| F9  | `golden holy hand grenade with a cross and a halo`                                                                                     |

### 4.5 Снаряды и объекты (отдельные спрайты)

Только сам объект, вид сбоку, смотрит вправо, на однотонном фоне:

| Объект                       | Промпт-вставка                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Ракета                       | `cartoon rocket missile with red nose cone and small fins`                       |
| Самонаводящаяся ракета       | `cartoon guided missile with blue nose cone and a small antenna`                 |
| Граната / кластерная / банан | как в 4.4, но без руки                                                           |
| Святая граната               | `golden ornate hand grenade with a small cross, glowing`                         |
| Голубь с письмом             | `cartoon pigeon in flight carrying a small envelope, wings up, side view`        |
| Стрела                       | `cartoon wooden arrow with red fletching and steel tip`                          |
| Динамит                      | `bundle of three red dynamite sticks tied with a rope, lit fuse`                 |
| Мина                         | `round flat landmine with a small red light on top`                              |
| Бочка                        | `red oil drum barrel with a yellow flame warning symbol, no text`                |
| Ящик с оружием               | `wooden supply crate with metal corners and a yellow star`                       |
| Ящик здоровья                | `white supply crate with a red cross symbol`                                     |
| Парашют                      | `small white parachute canopy with red and blue panels, with lines`              |
| Надгробие (×6 цветов команд) | `cartoon tombstone with a small flag on top, grayscale for tinting`              |
| Овца / супер-овца            | `fluffy cartoon sheep, side view, walking pose` / `…with a red cape and goggles` |

### 4.6 UI: иконки оружия (набор из ~40)

Все иконки — **один ракурс, один размер объекта, один стиль света**, на квадрате 128×128.

```
game UI icon of [WEAPON], three-quarter view from upper left, centered, fills 80% of the frame,
bold dark outline, cel shading, subtle drop shadow beneath, plain flat green background, no text
```

(список оружия — как в 4.4 + `skip turn (hourglass)`, `surrender (white flag)`, `girder`, `teleport`, `parachute`, `ninja rope`).

### 4.7 UI: рамки, кнопки, панели

```
cartoon game UI panel frame, rounded rectangle with a thick dark outline and an inner highlight,
wooden-and-metal feel, flat empty center, symmetrical, 9-slice friendly, no text, plain flat green background
```

Нужны: панель (светлая/тёмная), кнопка (обычная/нажатая/неактивная), плашка команды, плашка таймера,
шкала ветра, слот оружия (обычный/выбран/недоступен), тултип.

### 4.8 Логотип

Название игры решаем отдельно (оригинальное). ИИ рисует **только украшения**; текст набираем в редакторе.

```
cartoon game logo decoration: a chunky banner ribbon with bursting sparks and a small mischievous grub-worm
peeking from behind, bold dark outline, cel shading, empty banner area for text, no text, plain flat
green background
```

### 4.9 Фоны (параллакс, 4 слоя × 4 темы)

Слои от дальнего к ближнему; каждый — прозрачный PNG 2048×1024, **бесшовный по горизонтали**,
линия горизонта в нижней трети, сверху прозрачно (небо рисуем градиентом в игре).

```
[THEME] parallax layer [N] of 4, side view, [DESCRIPTION], soft atmospheric haze (stronger for far
layers), bold dark outline only on the nearest layer, cel shading, horizontally seamless, transparent
sky, no characters, no text
```

| Тема   | Слой 1 (дальний)       | Слой 2                 | Слой 3                       | Слой 4 (ближний)              |
| ------ | ---------------------- | ---------------------- | ---------------------------- | ----------------------------- |
| meadow | pale blue mountains    | rolling green hills    | distant trees and a windmill | foreground bushes and flowers |
| desert | hazy orange dunes      | rocky mesas            | cacti and dry shrubs         | foreground boulders           |
| arctic | pale icy mountains     | snowy hills            | frozen pine trees            | foreground ice chunks         |
| hell   | dark red volcano range | lava rivers and cliffs | jagged black spires          | foreground bones and embers   |

Дополнительно: облака (отдельные спрайты, 5 штук, прозрачные), солнце/луна/багровый диск.

### 4.10 Текстуры земли (бесшовные)

```
seamless tileable texture, [MATERIAL], top-down flat lighting, no strong shadows, no perspective,
cartoon style with subtle hand-painted details, bold shapes, 512x512
```

`[MATERIAL]` по темам: `rich brown soil with small pebbles and roots` / `warm sand with small rocks` /
`frozen blue-white ice with cracks` / `dark volcanic rock with glowing red veins`.
Плюс **полоса поверхности** 512×64 (трава / песок / снег / пепел): тайлится по X, верхняя кромка неровная,
прозрачный верх. Плюс `rock` (неразрушаемая порода) — серый камень, бесшовный.

## 5. Процесс (рекомендуемый)

1. **Якоря.** Сгенерировать A, B, C. Выбрать лучшие, при необходимости 2–3 итерации. **Утвердить** (владелец).
2. **Тело и лицо.** Тело-полоса (4.1) с референсом A. Лицо слоями (4.2) с референсом B.
   Собрать в графическом редакторе «червяка» с 10–12 эмоциями — это тест на согласованность.
3. **Объекты и иконки** партиями по 6–8 штук, всегда с одним референсом-стилем и одним seed.
4. **Окружение:** сначала одна тема (`meadow`) целиком, затем остальные по её образцу.
5. **Вырезка фона** (удаление зелёного) → **ручная доработка**: чистка краёв, ровная обводка,
   единая палитра (пипеткой из раздела 1), исправление анатомии, добавление чёткого блика.
6. **Проверка в игре:** положить в `assets-src/` → я собираю атласы → смотрим на скриншоте рядом с землёй и
   освещением. Если «выбивается» — правим стиль, а не оставляем.
7. Не генерировать всё сразу: сначала червяк + один набор оружия, играем, потом расширяем.

## 6. Что отдавать (структура и названия)

```
assets-src/
  character/
    body-normal.png  body-hurt.png  body-poison.png
    eye-open.png  eye-half.png  eye-closed.png  eye-wide.png  eye-squint.png  eye-dead.png  pupil.png
    brow-neutral.png  brow-angry.png  brow-worried.png  brow-raised.png  brow-sad.png
    mouth-smile.png  mouth-open.png  mouth-talk-a.png  mouth-talk-b.png  mouth-scream.png  ...
    bandana.png            # серый, тонируется
    hat-cap.png ...        # косметика (позже)
  weapons/
    held/  bazooka.png  grenade.png ...          # оружие в руке
    held/bazooka.json                            # {"grip":[x,y],"muzzle":[x,y]} в пикселях спрайта
    projectile/  rocket.png  homing.png  arrow.png  pigeon.png ...
    icon/  bazooka.png  grenade.png ...          # 128×128
  objects/  crate-weapon.png  crate-health.png  barrel.png  mine.png  tombstone.png  parachute.png ...
  ui/  panel-dark.png  button.png  button-pressed.png  slot.png  ...  logo-decor.png
  environment/
    meadow/  bg-1.png bg-2.png bg-3.png bg-4.png  soil.png  rock.png  surface.png  cloud-1..5.png
    desert/  ...  arctic/  ...  hell/  ...
  SOURCE.md                # для каждого файла: инструмент, дата, что правилось вручную
```

Названия — `kebab-case`, латиница, без пробелов. Имена оружия — как `id` в коде
(`bazooka`, `homing`, `mortar`, `pigeon`, `grenade`, `cluster`, `banana`, `shotgun`, `handgun`, `uzi`,
`minigun`, `longbow`, `firepunch`, `prod`, `dynamite`, `mine`, `sheep`, `supersheep`, `airstrike`,
`blowtorch`, `drill`, `girder`, `bat`, `rope`, `parachute`, `teleport`, `hhg`, `skipgo`, `surrender`).

## 7. Чек-лист приёмки каждого ассета

- [ ] Размер и формат по таблице раздела 3; альфа чистая, нет зелёной каймы.
- [ ] Обводка непрерывна, цвет `#2a1a24`, толщина в пределах 4–5%.
- [ ] Свет сверху-слева, тени холодные, 2 ступени, один блик.
- [ ] Палитра в рамках раздела 1; нет «чужого» неона и градиентных размытий.
- [ ] Вид строго сбоку, смотрит вправо (где применимо).
- [ ] Рядом с остальными ассетами выглядит как один набор.
- [ ] В `SOURCE.md` указано, чем сделано и что правилось руками.

## 8. Открытые решения для владельца

1. **Образ персонажа:** личинка-коротышка (предложение) или другой? Утвердить до якорей.
2. **Название игры** (оригинальное) — нужно для логотипа.
3. **Какой инструмент генерации** вы используете (чтобы я подогнал формат промптов, например, параметры
   стиля/референса).
4. Сколько тем делать в первой версии: рекомендую начать с одной (`meadow`) и расширять.
5. Нужны ли голоса (запись/TTS) и музыка со стемами — отдельный бриф, когда дойдём до звука.

## 9. Что я сделаю, когда придёт арт

- Загрузчик атласов, упаковщик (`tools/`), конфиги анимаций и тем (см. `visual-direction.md`).
- Червяк на мягком меше: полоса-тело + слои лица + повязка + оружие в руке с точкой хвата.
- Замена процедурных спрайтов объектов и снарядов; UI на новом наборе рамок и иконок.
- Фоны и текстуры по темам; повторная настройка света и палитры под ваш арт.
