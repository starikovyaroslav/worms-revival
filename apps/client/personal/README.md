# personal (не коммитится)

Личные ассеты, которые нельзя публиковать (например, спрайты, скачанные для личного пользования).
Папка в `.gitignore`: ничего отсюда не попадает в git. Отдаётся **только dev-сервером** по адресу
`/personal/…`, в `npm run build` не копируется.

Структура такая же, как у `apps/client/public/assets`:

```
personal/manifest.json          { "version": 2, "assets": { "<id>": { "file": "<путь>.png", "w": 24, "h": 24 } } }
personal/worm/idle_0.png ...
```

Файлы из `personal/` перекрывают одноимённые (по `id`) из `public/assets`. Чего нет — берётся из `assets`.
