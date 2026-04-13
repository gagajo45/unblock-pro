# Windows 7 — сборка и требования

Основная линия UnblockPro использует **Electron 28** и **не запускается** на Windows 7. Для этой ОС собирается отдельная линия на **Electron 22.3.27** (последняя ветка Electron с поддержкой Windows 7; ветка EOL, без регулярных обновлений безопасности).

## Сборка

```bash
npm ci
npm run build:win7
```

Артефакты по умолчанию в каталог `dist-win7/`. Если сборка падает с «Access is denied» при удалении `win-unpacked` (часто из‑за запущенного exe из этой папки), соберите в другой каталог:

```bash
# Windows PowerShell
$env:UNBLOCKPRO_WIN7_DIST="dist-win7-new"; npm run build:win7
```

- `UnblockPro-sonic*-v*-win7-setup.exe` — установщик NSIS
- `UnblockPro-sonic*-v*-win7-portable.exe` — portable
- `win7.yml` — метаданные автообновления для установщика (канал `win7`; имя файла задаёт electron-builder)

`appId` для Win7: `com.sonic.unblockpro.win7`. В упакованное `package.json` добавляется флаг `win7Build: true`.

## Системные требования (пользователь)

- Windows 7 **SP1**, 64-bit.
- Обновления для **TLS 1.2** и современных корневых сертификатов (иначе не откроются `https://api.github.com` и загрузка zapret).
- **PowerShell 2.0** достаточно для базовых сценариев: распаковка ZIP через .NET `ZipFile`, HTTP-проверки в elevated-batch через `System.Net.WebRequest`, WebSocket-тест Discord без `Get-Random`. Для стабильного **HTTPS (TLS 1.2)** к современным сайтам и меньше сюрпризов по-прежнему рекомендуется **WMF 4+ / PowerShell 5.1** и обновления ОС.
- Для распаковки скачанного zapret (ZIP) на старых системах используется **.NET** `ZipFile` (нужен **.NET Framework 4.5+**; на обновлённой Win7 обычно уже есть). Раньше использовался `Expand-Archive`, которого нет в PowerShell до версии 5.
- Права **администратора** для WinDivert / `winws.exe`.

## Автообновление

- Установщик Win7 подписывается на канал **`win7`** (в релизе публикуется `win7.yml`), чтобы не получать сборку под Electron 28.
- Portable Win7 при обновлении выбирает ассет с **`win7`** и **`portable`** в имени файла.

## Проверка нативных компонентов (ручная)

На **VM или ПК с Windows 7 x64 SP1** с актуальными обновлениями и WMF:

1. Установить или распаковать сборку `*-win7-setup.exe` / `*-win7-portable.exe`.
2. Запустить от администратора, нажать «Подключить».
3. Убедиться, что подбирается стратегия и сервисы открываются.
4. При ошибках драйвера — проверить антивирус/Defender (исключения для папки с `winws.exe` и `WinDivert64.sys`), при необходимости см. логи приложения.

Бинарник `winws.exe` поставляется из [релизов zapret](https://github.com/bol-van/zapret/releases); совместимость конкретной версии с Windows 7 определяется составом WinDivert и тулчейна upstream — при смене версии zapret в проекте повторите smoke-тест на Win7.
