# Промпты для ChatGPT: фоны, земля, логотип, существа и предметы

Версия 1 · 2026-10-20 · автор: дизайнер. Решение владельца D3: арт генерируется в ChatGPT (веб-интерфейс, генерация картинок GPT), затем постобработка в нашем конвейере (палитра DB32, нарезка, целочисленный даунскейл). Логическое разрешение игры: 640x360, целочисленный масштаб `k` (D1). Палитра: DB32 (`packages/render/src/palette.ts`). Промпты на английском (модель понимает лучше), пояснения на русском.

Юридически: в промптах НЕ называем Worms, Team17, студии, художников. Игра выходит под оригинальным рабочим названием. Чисто ИИ-арт авторским правом обычно не охраняется (см. `art-brief.md`, раздел 0), поэтому ключевые вещи (логотип, червяк) потом дорабатываются вручную.

## 0. Честные ограничения (прочитать до начала)

1. **ChatGPT не рисует пиксель-перфектно.** Он генерирует растровую картинку «в духе пиксель-арта»: блоки могут быть разного размера, на границах бывают полутона, цветов больше палитры, сетка «плывёт» на 1-3 px. Поэтому мы просим не «настоящий пиксель-арт 1:1», а **арт из крупных блоков**: каждый арт-пиксель = блок 4x4 (или 8x8, 16x16) пикселей картинки. Конвейер потом делает nearest-neighbour даунскейл с выбором моды блока и привязывает цвета к DB32. Так мелкие дефекты сетки «съедаются».
2. **Размеры вывода.** Веб-ChatGPT обычно отдаёт 1024x1024, 1536x1024 или 1024x1536 (проверяйте по факту: `identify файл.png`). Точный размер вроде 640x360 запросить нельзя. Поэтому все размеры ниже подобраны под эти три формата и кратны блоку. Если вышел другой размер, не страшно, но запишите его: конвейер вычисляет блок как `ширина_картинки / арт_ширина`.
3. **Прозрачного фона нет** (в вебе ненадёжно). Фон под вырезку: сплошной `#ff00ff`. Небо — непрозрачное, без вырезки.
4. **Бесшовность модель выдаёт плохо.** Просим явно, но проверяем (раздел 3) и чиним на нашей стороне (кроссфейд шва) или повторным запросом (раздел 4).
5. **Счёт ячеек модель путает.** В листах всегда пишем «exactly N» и даём порядок. Если не совпало, это видно при ручной приёмке (раздел 3); будущий `ingest` обязан сообщать, сколько «островов» нашёл.
6. **Дрейф стиля в длинном чате.** Один чат = одна группа ассетов (одна тема, или лист существ). В КАЖДОМ сообщении прикладываем стиль-референс (раздел 1).
7. Модель может «улучшать» картинку блеском, градиентами и виньеткой. Лечится фразами «flat, no gradient, no vignette» (уже вшиты) и repair-промптами.

## 1. Стиль-лок: сначала один референс, потом он прикладывается ВСЕГДА

### Шаг 1.1. Собрать референс из наших спрайтов (локально, 1 минута)

Наши спрайты (червяк ~24x24 в кадре 32x32, ящик 16x15, надгробие 11x15, бочка 13x14) увеличиваем в 8 раз без сглаживания и ставим на пурпурный фон:

```
cd /home/yaroslav/Documents/DEV/worms-revival/apps/client/public/assets
montage worm/idle_0.png act/sheep_0.png objects/crate-weapon.png objects/crate-health.png objects/barrel.png objects/tombstone.png \
  -background '#ff00ff' -filter point -geometry 256x256+16+16 -tile 6x1 /tmp/existing-x8.png
```

Если ImageMagick не подходит, загрузите 3-4 спрайта по отдельности.

### Шаг 1.2. Сгенерировать единый стиль-референс (нужна ОДНА утверждённая картинка)

Новый чат, приложите `/tmp/existing-x8.png`, отправьте промпт S0:

**Промпт S0 (style reference, 1536x1024):**

```
Use the attached image only as a STYLE reference (do not copy its content). Create one image, exactly 1536x1024 px.
Pixel art drawn as large pixel blocks: every art pixel is an exact 8x8 px block of one flat colour, aligned to a strict grid (192x128 art pixels). Flat colours only; no anti-aliasing, no gradients, no blur, no glow, no soft shadows, no noise, no text. 1-art-pixel dark outline #222034. Two or three flat tones per material, light from the top-left. 1990s PC game look.
Use ONLY these colours: #000000 #222034 #45283c #663931 #8f563b #df7126 #d9a066 #eec39a #fbf236 #99e550 #6abe30 #37946e #4b692f #323c39 #306082 #5b6ee1 #639bff #5fcde4 #cbdbfc #ffffff #9badb7 #847e87 #696a6a #ac3232 #d95763 #d77bba.
Scene (side view, flat 2D, no perspective): a flat strip of ground at the bottom third (grass top edge in 3 greens over brown soil with speckles), a simple blue sky with 4 flat bands, two small cartoon characters (a chubby segmented peach-cream grub with a cyan bandana, and a fluffy white sheep), a wooden crate and a small gravestone standing on the ground. Everything crisp and chunky, big simple shapes.
```

Генерируйте, пока не получите картинку, в которой: блоки одинакового размера, нет градиентов, контур тёмный. Сохраните как `assets-in/style/style-ref.png`. Это ЕДИНСТВЕННЫЙ эталон.

### Шаг 1.3. Фраза стиль-лока (точная формулировка)

В начале КАЖДОГО сообщения с запросом картинки (даже в новом чате) приложите `style-ref.png` и вставьте:

```
STYLE LOCK: the attached image is the style reference. Match it exactly: the same pixel-block size logic (each art pixel is a flat square block), the same outline colour #222034, the same 2-3 flat tones per material, the same top-left light, the same limited palette, no gradients, no anti-aliasing. Do not copy its objects, only its style. Generate exactly ONE image and reply with no text.

TASK:
```

Дальше после `TASK:` вставляется нужный промпт из разделов 5-9. (Слова «Generate exactly ONE image and reply with no text» не дают модели добавлять «вариации» и болтовню.)

## 2. Пайплайн: что получаем, куда кладём, что с этим делает конвейер

Статус: автоматического конвейера **нет**. Старый нарезчик (`npm run art:sheets`, `tools/art/*`) удалён в M0 вместе с генераторами кода-арта. Скрипт приёма `tools/art/ingest.mjs` (спецификация ниже) **ещё предстоит написать, см. `docs/plans/visual-plan.md` (T9/V3)**. До тех пор приёмка ручная: проверить картинку по чеклисту раздела 3, сделать даунскейл и привязку к DB32 в редакторе или ImageMagick и положить файлы в `apps/client/public/assets/...` по таблице ниже.

`assets-in/` (в `.gitignore`) остаётся входной папкой для сырых картинок из ChatGPT: `assets-in/<theme>/...`, `assets-in/style/`, `assets-in/logo/`, `assets-in/sheets/`. В репозиторий они не попадают, в игру идёт только результат приёмки.

| Что                     | Файл от вас                            | Размер генерации | Блок | Итог (логический)                   | Куда кладёт конвейер                                     |
| ----------------------- | -------------------------------------- | ---------------- | ---- | ----------------------------------- | -------------------------------------------------------- |
| стиль-референс          | `assets-in/style/style-ref.png`        | 1536x1024        | 8    | не используется в игре              | только для промптов                                      |
| небо                    | `assets-in/<theme>/bg-sky.png`         | 1024x1536        | 4    | 256x384, тайл по X                  | `apps/client/public/assets/bg/<theme>/sky.png`           |
| фон, дальний            | `assets-in/<theme>/bg-far.png`         | 1536x1024        | 4    | 384 x до 160                        | `.../bg/<theme>/far.png`                                 |
| фон, средний            | `assets-in/<theme>/bg-mid.png`         | 1536x1024        | 4    | 384 x до 128                        | `.../bg/<theme>/mid.png`                                 |
| фон, ближний            | `assets-in/<theme>/bg-near.png`        | 1536x1024        | 4    | 384 x до 96                         | `.../bg/<theme>/near.png`                                |
| кромки земли (3 полосы) | `assets-in/<theme>/terrain-strips.png` | 1536x1024        | 16   | 3 полосы 96x16                      | `.../terrain/<theme>/rim.png`, `scorch.png`, `under.png` |
| заливка земли           | `assets-in/<theme>/terrain-fill.png`   | 1024x1024        | 16   | тайл 64x64                          | `.../terrain/<theme>/fill.png`                           |
| логотип                 | `assets-in/logo/logo.png`              | 1536x1024        | 4    | ~220x70 после обрезки               | `.../ui/logo.png`                                        |
| существа                | `assets-in/sheets/creatures.png`       | 1024x1024        | 8    | 16 ячеек по 32x32                   | `.../creatures/<имя>.png`                                |
| предметы                | `assets-in/sheets/props.png`           | 1024x1024        | 8    | 16 ячеек по 32x32 (обрезка по bbox) | `.../objects/<имя>.png`                                  |

`<theme>` = `meadow`, `desert`, `arctic`, `hell` (id как в `theme.ts`).

**Что делает `ingest.mjs` (спека):**

1. Определяет размер блока по автокорреляции (или берёт из таблицы) и делает даунскейл nearest с модой блока.
2. Вырезает `#ff00ff` (допуск ~40 по каналу), небо не вырезает.
3. Привязывает каждый пиксель к DB32 функцией `snap` из `palette.ts` (без дизеринга); печатает число уникальных цветов до/после.
4. Тайлы (far/mid/near/sky/fill/полосы): проверка шва по X; если разница колонок 0 и W-1 больше порога, делает кроссфейд-«лечение» (сдвиг на половину, смешивание полосы 24 px) и пишет предупреждение.
5. Обрезка до bbox (фоны: выравнивание по низу), контроль размеров по таблице, запись в `public/assets/...` и в `manifest.json`.
6. Листы существ/предметов: нарезка по пурпурным «островам» в порядке слева направо, сверху вниз (слева направо, сверху вниз).

**Как это сочетается с кодом сейчас (`background.ts`):** фон = полосы неба (`sky`, до 9) плюс ровно **3 слоя холмов** (`count = 3`), факторы параллакса 0.15 / 0.35 / 0.55 (`0.15 + i*0.2`), слой рисуется шириной `mapWidth*2 + 2000` с блоком-пикселем 4/7/10. Поэтому слоёв арта **4: sky + far + mid + near**. Тайл 384 px по X повторяется (карта 1920 px, вид 640 px, сдвиг слоя при факторе 0.55 максимум ~700 px, значит нужно 2-4 повтора). Подключение слоёв в `background.ts` вместо процедурных силуэтов выполняется в M5 (V3).

## 3. Чек-лист проверки результата (на каждую картинку, 2 минуты)

1. **Размер:** `identify -format '%wx%h\n' файл.png` совпадает с таблицей? Если нет, запишите реальный.
2. **Сетка (блоки одинаковые):** должна быть малая разница после «схлопывания в блоки и обратно» (для блока 4, на 1536x1024):
   ```
   magick файл.png -filter point -resize 25% -filter point -resize 400% /tmp/back.png
   magick compare -metric RMSE файл.png /tmp/back.png null:
   ```
   Хорошо: RMSE меньше ~3% (число в скобках меньше 0.03). Больше 8%: блоки плывут, перегенерировать (repair R1).
3. **Число цветов:** `identify -format '%k\n' файл.png`. Для блочного арта ожидаем десятки (до ~60 из-за краёв), для «градиентной каши» тысячи. Больше 200: repair R2. После нашего snap останется не больше 26-32.
4. **Фон под вырезку:** углы и пустые области ровно `#ff00ff`, без каймы и оттенков. Проверка: `magick файл.png -format '%[pixel:p{2,2}]\n' info:` должен дать `srgb(255,0,255)`.
5. **Шов (бесшовные слои):** положить два экземпляра рядом и смотреть стык:
   ```
   magick файл.png файл.png +append /tmp/seam.png
   ```
   Открыть `/tmp/seam.png`, смотреть середину: нет ступеньки силуэта, нет обрезанного облака/дерева. Не прошёл: repair R3.
6. **Содержание:** нет текста/подписей (кроме логотипа), нет теней на фоне, нет посторонних цветов поверх палитры, свет сверху-слева, слой не слился с соседним по яркости.
7. **Листы:** ровно столько ячеек, сколько нужно; ячейки не касаются друг друга и краёв; все персонажи смотрят вправо.

## 4. Repair-промпты (отправлять в том же чате, с приложенной проблемной картинкой и стиль-референсом)

Каждый начинается со слов `Edit the attached image (keep composition)`.

**R1 — блоки плывут / размыто:**

```
Edit the attached image, keep the composition and the colours. Redraw it as strict pixel art: every art pixel must be an exact {N}x{N} px square block of one flat colour on a perfect grid ({W}x{H} px canvas = {W/N}x{H/N} art pixels). Remove all blur, soft edges, anti-aliasing and interpolation. Hard stair-stepped edges only. Output exactly one image of {W}x{H} px, no text.
```

**R2 — слишком много цветов / градиенты:**

```
Edit the attached image, keep the composition. Reduce to a flat limited palette: use ONLY these colours: {HEX LIST}. Replace every gradient, glow and soft shadow with 2-3 flat tones per material and hard edges. Where two bands meet, use a 2x2-block checkerboard dither, not a blend. Same canvas size, no text.
```

**R3 — шов по горизонтали:**

```
Edit the attached image so it tiles horizontally without a seam: the leftmost column of art blocks must continue directly into the rightmost column, so the ridge height, colours and shapes at the left edge match the right edge exactly. Do not place any object touching the left or right edge. Keep everything else unchanged. Same canvas size, same magenta #ff00ff cutout background, no text.
```

**R4 — неверные размеры слоя / заполнение:**

```
Edit the attached image: the artwork must occupy only the bottom {H_BAND} px of the canvas ({H_BAND/4} art pixels tall); everything above it is flat solid #ff00ff. The bottom edge of the artwork touches the bottom of the canvas with no gap. Keep the shapes and colours. Same canvas size {W}x{H}, no text.
```

**R5 — лист: не то число ячеек / слиплись:**

```
Edit the attached image: the sheet must have exactly {COLS} columns and {ROWS} rows of equal square cells, exactly {N} sprites, one centred sprite per cell, the rest of the cell flat #ff00ff. Increase the empty gap so no sprite touches another sprite, a cell border or the image edge. Remove any labels, numbers, frames and background shadows. Same canvas size.
```

**R6 — лишний цвет магенты в арте / кайма:** `Remove every magenta or pink-purple fringe around the sprites; sprite edges must be hard with the dark outline #222034 only; the background must be exactly #ff00ff with no gradient.`

## 5. Небо и параллакс-фоны (4 темы x 4 слоя = 16 промптов)

Общие правила слоёв (вшиты в каждый промпт): вид строго сбоку, без перспективы, без персонажей и текста; дальше = светлее и холоднее (воздушная перспектива); внутри слоя 3 тона; контура у холмов нет, у ближнего слоя можно 1-арт-пиксельный контур `#222034` только по силуэту; каждый следующий (ближний) слой заметно темнее предыдущего, чтобы слои не слипались (особенно в `hell`, решение D7).

Параллакс-слои «далёкий / средний / ближний» кладутся так: высота арта до 160 / 128 / 96 арт-пикселей, выровнено по нижнему краю, сверху `#ff00ff`.

### 5.1 Луг / день (`meadow`)

**M-SKY (1024x1536, блок 4 → 256x384):**

```
Create one image, exactly 1024x1536 px (portrait). Pixel art made of large pixel blocks: every art pixel is an exact 4x4 px block of one flat colour on a strict grid (256x384 art pixels). Flat colours only, no anti-aliasing, no gradients, no blur, no text.
Content: a daytime sky for a 2D side-view game, as 9 horizontal flat colour bands from top to bottom: #5b6ee1, #5b6ee1, #639bff, #639bff, #639bff, #5fcde4, #5fcde4, #cbdbfc, #cbdbfc; where two different bands meet draw a 12 px tall strip of 2x2-block checkerboard dither. Add 4 small flat cloud shapes in #ffffff with #cbdbfc undersides (3 tones max), only in the upper two thirds, each cloud fully inside the image and not touching the left or right edge, no sun, no birds. Must tile horizontally without a seam (clouds are away from edges, bands are uniform). Use ONLY these colours: #5b6ee1 #639bff #5fcde4 #cbdbfc #ffffff #9badb7.
```

**M-FAR (1536x1024, блок 4 → 384x256):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outline.
Content: ONE horizontally seamless parallax layer, FAR distant rocky mountains with a few snowy peak highlights, hazy blue-grey, low contrast, side view, flat 2D, no perspective, light from the top-left. The mountain silhouette fills only the bottom 640 px of the canvas (160 art pixels tall at most); everything above it is flat solid #ff00ff (a cutout key, no other magenta anywhere). The silhouette touches the bottom canvas edge with no gaps. SEAMLESS: ridge height and colours on the left edge are identical to the right edge, so two copies side by side show no seam; no peak touches the left or right edge.
Use ONLY: #9badb7 (fill), #847e87 (shade), #696a6a (deep shade), #cbdbfc (snow highlight), #ff00ff (background).
```

**M-MID (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, MID rolling forested hills: soft round green hills with small pine-tree silhouettes along the ridge, side view, flat 2D, no perspective, light from the top-left. The artwork fills only the bottom 512 px of the canvas (128 art pixels tall at most); everything above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom with no gaps. SEAMLESS: left edge continues into the right edge exactly (same ridge height and colours); no tree touches the left or right edge. Clearly darker and more saturated than distant mountains.
Use ONLY: #37946e (fill), #306082 (shade), #222034 (tree silhouettes, sparingly), #4b692f (deep green), #ff00ff (background).
```

**M-NEAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, NEAR dark foreground: low dense bushes and a few tall pine trees with grass tufts on a dark green ridge, side view, flat 2D, no perspective, light from the top-left, 1-art-pixel outline #222034 on the outer silhouette only. The artwork fills only the bottom 384 px of the canvas (96 art pixels tall at most); everything above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom with no gaps. SEAMLESS: left edge continues into the right edge exactly; no tree touches the left or right edge. Darkest of all layers, but keep a few lighter #6abe30 highlight pixels on top-left edges.
Use ONLY: #4b692f (fill), #323c39 (shade), #222034 (outline), #6abe30 (highlights), #ff00ff (background).
```

### 5.2 Пустыня (`desert`)

**D-SKY (1024x1536, 4):**

```
Create one image, exactly 1024x1536 px (portrait). Pixel art as large pixel blocks: every art pixel is an exact 4x4 px block of one flat colour on a strict grid (256x384 art pixels). Flat colours only, no anti-aliasing, no gradients, no blur, no text.
Content: a hot desert sky for a 2D side-view game, 9 horizontal flat bands from top to bottom: #639bff, #639bff, #5fcde4, #cbdbfc, #eec39a, #eec39a, #d9a066, #d9a066, #d9a066; at each band boundary a 12 px tall strip of 2x2-block checkerboard dither. Add 3 thin flat streak clouds in #eec39a and #ffffff in the upper half, fully inside the image, not touching the left or right edge. No sun, no birds. Tiles horizontally without a seam. Use ONLY: #639bff #5fcde4 #cbdbfc #eec39a #d9a066 #ffffff.
```

**D-FAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outline.
Content: ONE horizontally seamless parallax layer, FAR distant desert: pale sand-coloured flat-topped mesas and long low dunes, hazy and low contrast, side view, flat 2D, no perspective, light from the top-left. The artwork fills only the bottom 640 px (160 art pixels at most); everything above is flat solid #ff00ff (cutout key, no other magenta). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; no mesa touches the left or right edge.
Use ONLY: #d9a066 (fill), #8a6f30 (shade), #8f563b (deep shade), #eec39a (top-left highlight), #ff00ff.
```

**D-MID (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, MID red rock buttes and canyon walls with horizontal strata lines, a few distant cactus silhouettes, side view, flat 2D, no perspective, light from the top-left. Fills only the bottom 512 px (128 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; no butte touches the left or right edge. Clearly darker than the distant mesas.
Use ONLY: #8f563b (fill), #663931 (shade), #45283c (deep shade), #d9a066 (strata highlight), #ff00ff.
```

**D-NEAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, NEAR dark foreground: jagged rock spires, boulders and two tall saguaro cactus silhouettes, side view, flat 2D, no perspective, light from the top-left, 1-art-pixel outline #222034 on the outer silhouette only. Fills only the bottom 384 px (96 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; nothing touches the left or right edge. Darkest layer, with a few #8f563b highlight pixels on top-left edges.
Use ONLY: #663931 (fill), #45283c (shade), #222034 (outline), #8f563b (highlights), #ff00ff.
```

### 5.3 Снег / Арктика (`arctic`)

**A-SKY (1024x1536, 4):**

```
Create one image, exactly 1024x1536 px (portrait). Pixel art as large pixel blocks: every art pixel is an exact 4x4 px block of one flat colour on a strict grid (256x384 art pixels). Flat colours only, no anti-aliasing, no gradients, no blur, no text.
Content: a cold polar sky for a 2D side-view game, 9 horizontal flat bands from top to bottom: #306082, #306082, #5b6ee1, #639bff, #639bff, #5fcde4, #cbdbfc, #cbdbfc, #ffffff; at each band boundary a 12 px tall strip of 2x2-block checkerboard dither. Add a few tiny flat snowflake/star dots in #ffffff in the top third and 2 flat thin cloud streaks in #cbdbfc, all inside the image, none touching the left or right edge. No sun. Tiles horizontally without a seam. Use ONLY: #306082 #5b6ee1 #639bff #5fcde4 #cbdbfc #ffffff.
```

**A-FAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outline.
Content: ONE horizontally seamless parallax layer, FAR icy mountain range with sharp snow-capped peaks, hazy and low contrast, side view, flat 2D, no perspective, light from the top-left (lit slopes face left). Fills only the bottom 640 px (160 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; no peak touches the left or right edge.
Use ONLY: #9badb7 (fill), #847e87 (shade), #696a6a (deep shade), #cbdbfc (snow caps), #ff00ff.
```

**A-MID (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, MID glaciers and rounded snowy hills with blue ice cliffs, a few small frosted pine silhouettes, side view, flat 2D, no perspective, light from the top-left. Fills only the bottom 512 px (128 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; nothing touches the left or right edge. Must read darker than the white foreground snow of the game.
Use ONLY: #cbdbfc (fill), #9badb7 (shade), #847e87 (deep shade), #5fcde4 (ice highlight), #306082 (pine silhouettes), #ff00ff.
```

**A-NEAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, NEAR foreground: snow-laden dark pine trees on a low snowy ridge and a few icy boulders, side view, flat 2D, no perspective, light from the top-left, 1-art-pixel outline #222034 on the outer silhouette only. Fills only the bottom 384 px (96 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; no tree touches the left or right edge. Darkest layer; NOT pure white (the game ground in front is white).
Use ONLY: #9badb7 (fill), #847e87 (shade), #306082 (tree masses), #222034 (outline), #cbdbfc (snow highlights), #ff00ff.
```

### 5.4 Ад / ночь (`hell`)

В `hell` риск: все слои чёрные и сливаются (решение D7). Поэтому значения яркости ступенчатые: дальний = самый светлый (багровый), ближний = самый тёмный, но с оранжевым контровым светом по гребню.

**H-SKY (1024x1536, 4):**

```
Create one image, exactly 1024x1536 px (portrait). Pixel art as large pixel blocks: every art pixel is an exact 4x4 px block of one flat colour on a strict grid (256x384 art pixels). Flat colours only, no anti-aliasing, no gradients, no blur, no text.
Content: an infernal night sky for a 2D side-view game, 9 horizontal flat bands from top to bottom: #222034, #222034, #45283c, #45283c, #663931, #663931, #ac3232, #ac3232, #df7126 (hot orange horizon at the bottom); at each band boundary a 12 px tall strip of 2x2-block checkerboard dither. Add 4 flat dark smoke streak clouds in #45283c and #222034, plus a few tiny #fbf236 ember dots, all inside the image, none touching the left or right edge. No moon. Tiles horizontally without a seam. Use ONLY: #222034 #45283c #663931 #ac3232 #df7126 #fbf236.
```

**H-FAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outline.
Content: ONE horizontally seamless parallax layer, FAR jagged volcano silhouettes with small glowing lava craters and thin lava streaks, side view, flat 2D, no perspective, light from the top-left. Fills only the bottom 640 px (160 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; no volcano touches the left or right edge. Lightest of all hill layers (it fades into the red haze).
Use ONLY: #663931 (fill), #45283c (shade), #222034 (deep shade), #df7126 and #fbf236 (tiny glow pixels, under 3 percent of area), #ff00ff.
```

**H-MID (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, MID charred cliffs and basalt columns with two thin glowing lava rivers running down, broken dead tree silhouettes, side view, flat 2D, no perspective, light from the top-left. Fills only the bottom 512 px (128 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; nothing touches the left or right edge. Clearly darker than the volcano layer but NOT black.
Use ONLY: #45283c (fill), #222034 (shade), #663931 (top-left highlight edge), #ac3232 and #df7126 (lava), #ff00ff.
```

**H-NEAR (1536x1024, 4):**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text.
Content: ONE horizontally seamless parallax layer, NEAR foreground: spiky black rock spires, bone-like thorns and ember-lit ridge, side view, flat 2D, no perspective, with a 1-art-pixel orange rim light #df7126 along the top-left edges of the silhouette (so it never merges into a black mass), a few #ac3232 glow pixels at the base. Fills only the bottom 384 px (96 art pixels at most); above is flat solid #ff00ff (cutout key). Bottom edge touches the canvas bottom, no gaps. SEAMLESS: left edge continues into the right edge exactly; nothing touches the left or right edge. Darkest layer.
Use ONLY: #222034 (fill), #000000 (deep shade), #45283c (inner highlight), #df7126 (rim light), #ac3232 (glow), #ff00ff.
```

## 6. Земля по темам: кромки и заливка (4 темы x 2 промпта)

Масштаб: «в масштабе червяка» значит в логических пикселях игры (червяк 24 px). Зерно почвы должно быть 1-4 арт-пикселя, камешки до 6, кромка 16 арт-пикселей высотой. Блок 16x16 (крупно, так надёжнее) → каждый арт-пиксель 16 px.

**Лист «кромки» (1536x1024, блок 16, сетка 96x64 арт-пикселей).** Три полосы по 96x16 арт-пикселя, одна над другой, между ними зазор 8 арт-пикселей пурпурного:

- полоса 1: строки 0-15 = верхняя кромка (трава/снег/песок/пепел);
- полоса 2: строки 24-39 = обугленный край кратера (общий вид у всех тем, цвета подогнаны под тему);
- полоса 3: строки 48-63 = нижний край / подбрюшье острова.
  Строки 16-23 и 40-47 = чистый `#ff00ff`.

### 6.1 Луг

**M-STRIPS:**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (96x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text. Light from the top-left. Side view, flat 2D.
Draw THREE horizontal terrain-edge strips, each exactly 96 art pixels wide and 16 art pixels tall, stacked with 8 art pixels of flat #ff00ff between them (strip 1 at art rows 0-15, strip 2 at rows 24-39, strip 3 at rows 48-63), full width, no margins. Every strip tiles horizontally: its leftmost column continues into its rightmost column with no seam.
Strip 1, GRASS RIM: top 3 rows are irregular grass blade tips poking up into #ff00ff, then a 1-pixel bright highlight line #99e550, 3 rows #6abe30, 2 rows #4b692f, then 1-2 rows of #8f563b soil; the bottom row is fully opaque soil #8f563b.
Strip 2, SCORCH: a jagged charred band in #222034 and #45283c with 4-6 single #df7126 ember pixels; top and bottom rows fully opaque.
Strip 3, UNDERSIDE: top row fully opaque #663931 soil, dark #45283c mass, a 1-pixel #222034 outline on the irregular bottom edge, with 3-5 small hanging roots and pebbles poking down into #ff00ff.
Use ONLY: #99e550 #6abe30 #4b692f #8f563b #663931 #45283c #222034 #df7126 #ff00ff.
```

**M-FILL (1024x1024, блок 16 → 64x64):**

```
Create one image, exactly 1024x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (64x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outlines.
Content: a seamless tileable 2D game ground texture of brown earth, viewed flat (no perspective, no lighting gradient): base #8f563b, darker clumps #663931, scattered single-pixel speckles #d9a066, a few small 2-3 pixel pebbles #45283c with a #d9a066 highlight on their top-left. Texture must tile in BOTH directions: the top row continues into the bottom row and the left column into the right column with no visible seam. Even density, no large features, no horizontal layering, no objects, no roots.
Use ONLY: #8f563b #663931 #d9a066 #45283c.
```

### 6.2 Пустыня

**D-STRIPS:**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (96x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text. Light from the top-left. Side view, flat 2D.
Draw THREE horizontal terrain-edge strips, each exactly 96 art pixels wide and 16 art pixels tall, stacked with 8 art pixels of flat #ff00ff between them (rows 0-15, 24-39, 48-63), full width. Every strip tiles horizontally: leftmost column continues into the rightmost column with no seam.
Strip 1, SAND RIM: a wavy dune crest, top rows tiny sand ripples against #ff00ff, 1-pixel highlight #eec39a, 4 rows #d9a066, 2 rows #8a6f30 shadow, bottom row fully opaque #d9a066.
Strip 2, SCORCH: a jagged charred band of #222034 and #45283c with 4-6 single #df7126 ember pixels; top and bottom rows opaque.
Strip 3, UNDERSIDE: top row opaque #d9a066, then #8f563b and #663931 sandstone layers, a 1-pixel #222034 outline along the irregular bottom edge with 3-5 small stones hanging down into #ff00ff.
Use ONLY: #eec39a #d9a066 #8a6f30 #8f563b #663931 #45283c #222034 #df7126 #ff00ff.
```

**D-FILL (1024x1024, 16):**

```
Create one image, exactly 1024x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (64x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outlines.
Content: a seamless tileable 2D ground texture of packed desert sandstone, viewed flat (no perspective): base #d9a066, diagonal wind-ripple bands in #eec39a (light) and #8a6f30 (dark), a few single-pixel specks #8f563b, two or three tiny 2-pixel pebbles #8f563b with #eec39a highlight. Must tile in BOTH directions: top row continues into bottom row and left column into right column with no visible seam. Even density, no objects, no large features.
Use ONLY: #d9a066 #eec39a #8a6f30 #8f563b.
```

### 6.3 Снег

**A-STRIPS:**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (96x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text. Light from the top-left. Side view, flat 2D.
Draw THREE horizontal terrain-edge strips, each exactly 96 art pixels wide and 16 art pixels tall, stacked with 8 art pixels of flat #ff00ff between them (rows 0-15, 24-39, 48-63), full width. Every strip tiles horizontally: leftmost column continues into the rightmost column with no seam.
Strip 1, SNOW RIM: a thick lumpy snow cap, top 2 rows irregular snow bumps and a few icicle-like tips against #ff00ff, 5 rows pure #ffffff, 3 rows #cbdbfc shadow side, 1 row #9badb7, then 1-2 rows frozen soil #847e87; bottom row fully opaque #847e87.
Strip 2, SCORCH: a melted-dark band of #222034 and #3f3f74 with 4-6 single #5fcde4 steam-bright pixels; top and bottom rows opaque.
Strip 3, UNDERSIDE: top row opaque #847e87, then #696a6a rock, a 1-pixel #222034 outline along the irregular bottom edge, 3-5 small icicles of #cbdbfc and #5fcde4 hanging down into #ff00ff.
Use ONLY: #ffffff #cbdbfc #9badb7 #847e87 #696a6a #5fcde4 #3f3f74 #222034 #ff00ff.
```

**A-FILL (1024x1024, 16):**

```
Create one image, exactly 1024x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (64x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outlines.
Content: a seamless tileable 2D ground texture of frozen blue-grey earth with ice crystals, viewed flat (no perspective): base #9badb7, darker clumps #847e87, light patches #cbdbfc, a few 2-4 pixel ice crystal glints #5fcde4 with a #ffffff centre pixel, single-pixel dark specks #696a6a. Must tile in BOTH directions: top row continues into bottom row and left column into right column with no visible seam. Even density, no objects, no large features.
Use ONLY: #9badb7 #847e87 #cbdbfc #5fcde4 #ffffff #696a6a.
```

### 6.4 Ад

**H-STRIPS:**

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (96x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text. Light from the top-left. Side view, flat 2D.
Draw THREE horizontal terrain-edge strips, each exactly 96 art pixels wide and 16 art pixels tall, stacked with 8 art pixels of flat #ff00ff between them (rows 0-15, 24-39, 48-63), full width. Every strip tiles horizontally: leftmost column continues into the rightmost column with no seam.
Strip 1, ASH RIM: a crusty ash crust, top rows ragged ash clumps against #ff00ff, 1-pixel highlight #696a6a, 3 rows #595652, 3 rows #323c39, a few single #df7126 ember pixels, then 2 rows dark soil #45283c; bottom row fully opaque #45283c.
Strip 2, SCORCH: a glowing crater edge: #000000 and #222034 jagged band with a 1-row line of #ac3232 and 5-8 pixels of #df7126 and #fbf236 embers; top and bottom rows opaque.
Strip 3, UNDERSIDE: top row opaque #45283c, then #663931 rock, a 1-pixel #222034 outline along the irregular bottom edge, 3-5 jagged stalactites with #ac3232 glowing tips hanging into #ff00ff.
Use ONLY: #696a6a #595652 #323c39 #45283c #663931 #222034 #000000 #ac3232 #df7126 #fbf236 #ff00ff.
```

**H-FILL (1024x1024, 16):**

```
Create one image, exactly 1024x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 16x16 px block of one flat colour on a strict grid (64x64 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no text, no outlines.
Content: a seamless tileable 2D ground texture of scorched volcanic rock, viewed flat (no perspective): base #663931, darker clumps #45283c, a few thin 1-pixel red cracks #ac3232 with single #df7126 glow pixels, single dark specks #222034. Must tile in BOTH directions: top row continues into bottom row and left column into right column with no visible seam. Even density, cracks short and not crossing the tile border, no objects, no large features.
Use ONLY: #663931 #45283c #ac3232 #df7126 #222034.
```

## 7. Логотип игры

### 7.1 Название: что выбрать (решение владельца)

Нельзя: «Worms», «Червяки/Worms» и любые производные (торговая марка Team17), также «Armageddon», «World Party», «Wormux» (проект с таким названием существует). Свободного названия ещё нет, выберите рабочее; перед релизом проверить поиском по базам знаков (WIPO Global Brand DB, USPTO TESS): это за пределами того, что я могу проверить.

| #   | Название      | Язык      | Комментарий                                                           |
| --- | ------------- | --------- | --------------------------------------------------------------------- |
| 1   | GRUB SQUAD    | латиница  | «личинка» вместо «червя», коротко, хорошо читается пиксельным шрифтом |
| 2   | BLAST GRUBS   | латиница  | подчёркивает взрывы                                                   |
| 3   | ЛИЧИНКИ В БОЮ | кириллица | прямой русский вариант, длиннее                                       |
| 4   | (ваш вариант) |           |                                                                       |

Латиница или кириллица: **рекомендую латиницу для картинки-логотипа**, а русское название/подзаголовок рисовать в игре пиксельным шрифтом (Public Pixel Font / Pixelify Sans, кириллица проверена, D5). Причина: GPT-генерация кириллицы чаще путает буквы (особенно Ы, Ж, Б), а логотип потом не поправить кодом; латиницу проверить проще. Если хотите кириллицу, смотрите результат буква за буквой (чек-лист пункт 6) и при ошибке просите R-промпт «fix only the letter».

### 7.2 Промпт логотипа (1536x1024, блок 4 → 384x256; логотип ~220x70 арт-пикселей по центру)

Подставьте `{TITLE}` (например `GRUB SQUAD`) и `{LETTERS}` — те же буквы через запятую для контроля.

```
Create one image, exactly 1536x1024 px. Pixel art as large pixel blocks: each art pixel is an exact 4x4 px block of one flat colour on a strict grid (384x256 art pixels). Flat colours, no anti-aliasing, no gradients, no blur, no glow.
Content: a game logo for a retro 2D artillery game, centred, the ONLY text in the image is exactly "{TITLE}" (letters: {LETTERS}), spelled exactly, no other words, no tagline, no watermark. Chunky blocky pixel letters about 30 art pixels tall, whole logo about 220 art pixels wide, with a 2-art-pixel dark outline #222034, a 2-tone fill (top half #fbf236, lower half #df7126), top-left highlight row #ffffff on each letter, hard drop shadow offset 2 art pixels down-right in #45283c. Behind the title a small flat starburst of #ac3232 and #d95763 shapes. A chubby peach-cream segmented grub character (#eec39a, #d9a066, outline #222034, big white eyes, cyan bandana #5fcde4) peeks over the top edge of the title with a mischievous grin. Solid flat #ff00ff background everywhere else (cutout key, no other magenta, no shadow on the background).
Use ONLY: #222034 #45283c #fbf236 #df7126 #ac3232 #d95763 #ffffff #eec39a #d9a066 #5fcde4 #ff00ff.
```

Проверка: буквы в точности как в названии; не добавил ли модель лишних слов; обводка цельная. Если буквы кривые: «Edit the attached image: redraw only the lettering so that it reads exactly "{TITLE}", same style, same colours, same layout».

Вариант без персонажа: удалите предложение про личинку. Логотип в игре показываем целочисленно (k), поэтому финальный размер подгоняет конвейер по bbox.

## 8. Лист существ (`creatures`, 1024x1024, блок 8, сетка 4x4 по 256 px = 32x32 арт-пикселей на ячейку)

Размеры внутри ячейки: персонаж занимает ~24x24 арт-пикселя (192 px) по центру, с полем не меньше 3 арт-пикселей вокруг. Все смотрят вправо, вид строго сбоку.

Порядок ячеек (слева направо, сверху вниз):

| Ряд | 1                         | 2                                    | 3                                 | 4                                  |
| --- | ------------------------- | ------------------------------------ | --------------------------------- | ---------------------------------- |
| 1   | `sheep_0` (шаг 1)         | `sheep_1` (шаг 2)                    | `supersheep_0` (полёт, плащ вниз) | `supersheep_1` (полёт, плащ вверх) |
| 2   | `pigeon_0` (крылья вверх) | `pigeon_1` (крылья вниз)             | `mole_0` (идёт)                   | `mole_1` (роет, нос вниз)          |
| 3   | `cow`                     | `oldwoman`                           | `donkey`                          | `skunk`                            |
| 4   | `banana_0` (целый)        | `banana_1` (повёрнут на 45 градусов) | `stink` (облако газа)             | `donkey_fall` (падает, ноги вверх) |

```
Create one image, exactly 1024x1024 px. Pixel art sprite sheet drawn as large pixel blocks: each art pixel is an exact 8x8 px block of one flat colour on a strict grid. Strict grid of exactly 4 columns by 4 rows of equal 256x256 px cells, exactly 16 sprites, one sprite centred in each cell, about 192 px (24 art pixels) in size, each cell otherwise flat solid #ff00ff, with wide empty gaps: nothing touches another sprite, a cell edge or the image edge. No text, no labels, no numbers, no frames, no shadows on the background, no glow. Flat colours, no anti-aliasing, no gradients. Side view, all characters face right, funny cartoon artillery-game weapons, 1-art-pixel outline #222034, 2-3 flat tones, light from the top-left.
Reading order: row 1: a fluffy white sheep walking (2 different leg poses), then a flying hero sheep with a red cape in two poses (cape down, cape up). Row 2: a grey pigeon flying (wings up, wings down), a brown mole walking, then the mole digging nose-down. Row 3: a black-and-white spotted cow, a grumpy little old woman with a handbag, a heavy grey donkey standing, a black skunk with a white back stripe and raised tail. Row 4: a yellow banana (whole), the same banana tilted 45 degrees, a small green stink cloud, then the donkey falling with legs up.
Use ONLY: #222034 #ffffff #cbdbfc #9badb7 #847e87 #696a6a #ac3232 #d95763 #663931 #8f563b #d9a066 #eec39a #d77bba #fbf236 #99e550 #6abe30 #000000 #ff00ff.
```

Нарезка: порядок ячеек как в таблице выше. Вручную (или будущим `ingest.mjs`) вырезаем каждую ячейку и сохраняем как `assets/creatures/<имя>.png`. Если персонажи перепутались местами, меняем имена при сохранении.

## 9. Лист предметов (`props`, 1024x1024, блок 8, 4x4 по 256 px)

Целевые размеры в игре (логические): ящик ~16x15, надгробие ~11x15, бочка ~13x14, мина ~8x5, парашют ~20x19. Модель не умеет держать масштаб, поэтому рисуем в ячейке крупно (до 20x20 арт-пикселей), а конвейер масштабирует до целевого размера по таблице после bbox-обрезки.

| Ряд | 1                              | 2                                     | 3                                   | 4                             |
| --- | ------------------------------ | ------------------------------------- | ----------------------------------- | ----------------------------- |
| 1   | `grave_cross`                  | `grave_round`                         | `grave_slab`                        | `grave_skull`                 |
| 2   | `crate_weapon` (дерево, ремни) | `crate_health` (белый, красный крест) | `crate_utility` (синий, шестерёнка) | `crate_open` (крышка снята)   |
| 3   | `barrel`                       | `barrel_burning`                      | `mine_off`                          | `mine_armed` (красный огонёк) |
| 4   | `parachute`                    | `crate_broken` (доски)                | `dynamite`                          | `canister` (газовый баллон)   |

```
Create one image, exactly 1024x1024 px. Pixel art props sheet drawn as large pixel blocks: each art pixel is an exact 8x8 px block of one flat colour on a strict grid. Strict grid of exactly 4 columns by 4 rows of equal 256x256 px cells, exactly 16 props, one prop centred in each cell, up to 160 px (20 art pixels) in size, each cell otherwise flat solid #ff00ff, wide gaps: nothing touches another prop, a cell edge or the image edge. No text, no letters, no numbers, no frames, no shadows on the background, no glow. Flat colours, no anti-aliasing, no gradients. Side view, 1-art-pixel outline #222034, 2-3 flat tones, light from the top-left. Chunky simple shapes.
Reading order: row 1: four gravestones (a cross, a round-top stone, a flat wide slab, a stone with a small skull). Row 2: a wooden supply crate with straps (tan #d9a066, #8f563b), a white first-aid crate with a red cross, a blue utility crate with a gear symbol, an open crate with the lid off. Row 3: a green oil barrel with a yellow band, the same barrel burning with orange flames, a small flat land mine with dark casing, the same mine armed with a red light. Row 4: a small parachute with two cords, a broken crate (loose planks), a bundle of two red dynamite sticks with a fuse, a grey gas canister.
Use ONLY: #222034 #d9a066 #8f563b #663931 #eec39a #ffffff #cbdbfc #9badb7 #ac3232 #d95763 #306082 #5b6ee1 #639bff #4b692f #6abe30 #fbf236 #df7126 #696a6a #847e87 #ff00ff.
```

## 10. Рекомендуемый порядок генерации

1. **Стиль-референс** (S0), утвердить. Без него дальше не идём.
2. **Один пробный слой**: `M-MID`. Прогнать чек-лист (раздел 3) и проверить конвейер на шве и палитре. Это дешёвая проверка всей идеи (особенно бесшовности и блока 4).
3. **Луг целиком**: M-SKY, M-FAR, M-NEAR, затем M-STRIPS, M-FILL. Луг первый, потому что это тема по умолчанию.
4. **Логотип** (после выбора названия), 3-6 попыток, ручная доводка в редакторе.
5. **Лист существ** и **лист предметов** (они сильно связаны с worm-стилем; генерируйте после утверждённого червяка).
6. **Остальные темы** в порядке: арктика, пустыня, ад (ад последним: сложнее всего удержать читаемость слоёв, D7).
7. После каждой темы: приёмка (вручную, позже `ingest`), скриншот в игре на 640x360 и 1280x720, сравнить с чек-листом, принимает дизайнер.

Организация чатов: один чат на тему (5 картинок) и один на логотип и листы; в каждом сообщении стиль-лок (1.3) с приложенным референсом.

## Открытые вопросы владельцу

1. Выбор названия и языка логотипа (раздел 7).
2. Рисовать ли персонажа в логотипе (наша личинка; решение по маскоту связано с `art-brief.md`, раздел 2).
3. Ширина тайла фона 384 логических px (из-за ограничения 1536 px по ширине вывода). Если нужен 640 px: придётся склеивать из двух запросов или рисовать вручную; сейчас считаю, что 384 с повтором достаточно.
4. Подтвердить, что в вашем ChatGPT вывод 1536x1024 и 1024x1536 действительно доступен (если нет, напишите реальные размеры, пересчитаю таблицу блоков).
5. `tools/art/ingest.mjs` ещё не написан (см. `docs/plans/visual-plan.md`): нужна задача для developer (спека в разделе 2); пока приёмка ручная.
