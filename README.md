# UnblockPro — Обход блокировок Discord, YouTube и Telegram


<p align="center">
  <strong>Автоматический DPI bypass для macOS и Windows</strong><br>
  Разблокируй Discord, YouTube, Telegram и другие сервисы в один клик
</p>

<p align="center">
  <!-- Бейджи этого форка -->
  <a href="https://github.com/gagajo45/unblock-pro/releases/latest"><img src="https://img.shields.io/github/v/release/gagajo45/unblock-pro?style=for-the-badge&color=blue&label=version" alt="Version"></a>
  <a href="https://github.com/gagajo45/unblock-pro/releases/latest"><img src="https://img.shields.io/github/downloads/gagajo45/unblock-pro/total?style=for-the-badge&color=green&label=downloads" alt="Downloads"></a>
  <a href="https://github.com/gagajo45/unblock-pro/blob/main/LICENSE"><img src="https://img.shields.io/github/license/gagajo45/unblock-pro?style=for-the-badge&color=purple" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue?style=for-the-badge" alt="Platform">
</p>

<p align="center">
  <sub>Форк оригинального проекта <a href="https://github.com/by-sonic/unblock-pro">by-sonic/unblock-pro</a> с попыткой аккуратно следить за апстримом и выпускать свои сборки.</sub>
</p>

---

## Скачать

| Платформа | Файл | Описание |
|-----------|------|----------|
| **macOS** Apple Silicon (M1/M2/M3/M4) | [UnblockPro-mac-arm64.zip](https://github.com/gagajo45/unblock-pro/releases/latest) | Для Mac с M-процессором |
| **macOS** Intel | [UnblockPro-mac-x64.zip](https://github.com/gagajo45/unblock-pro/releases/latest) | Для Mac с Intel |
| **Windows** | [UnblockPro-win-setup.exe](https://github.com/gagajo45/unblock-pro/releases/latest) | Установщик |
| **Windows** | [UnblockPro-win-portable.exe](https://github.com/gagajo45/unblock-pro/releases/latest) | Портативная версия (без установки) |

> Перейдите в [Releases](https://github.com/gagajo45/unblock-pro/releases/latest) и скачайте версию для вашей ОС

---

## Что это?

**UnblockPro** — десктопное приложение для обхода DPI-блокировок, которое позволяет пользоваться Discord, YouTube, Telegram и другими сервисами без VPN. Работает на macOS и Windows.

### Ключевые возможности

- **Один клик** — нажмите «Подключить» и всё заработает
- **Автоматический подбор стратегии** — приложение само находит рабочий метод обхода для вашего провайдера
- **Проверка подключения** — стратегия проверяется реальным запросом, а не гаданием
- **macOS + Windows** — полная поддержка обеих платформ
- **Автозапуск** — запускается вместе с системой
- **Автоподключение** — подключается автоматически при старте
- **Системный трей** — работает в фоне, не мешает
- **Безопасная очистка** — прокси-настройки автоматически сбрасываются при выходе

---

## Как это работает

UnblockPro использует технологию [zapret](https://github.com/bol-van/zapret) для обхода Deep Packet Inspection (DPI):

| Платформа | Метод |
|-----------|-------|
| **macOS** | `tpws` — SOCKS5 прокси с модификацией пакетов. Приложение автоматически настраивает системный прокси |
| **Windows** | `winws` — перехватывает пакеты на уровне драйвера через WinDivert. Не требует настройки прокси |

Приложение последовательно тестирует несколько стратегий (split+disorder, split-tls, methodeol, oob и другие), пока не найдёт работающую для вашего провайдера.

---

## Установка

### macOS

1. Скачайте `UnblockPro-*-mac.zip` из [Releases](https://github.com/gagajo45/unblock-pro/releases/latest)
2. Распакуйте ZIP и перетащите `UnblockPro.app` в папку «Программы»
3. **Откройте Терминал** и выполните команду:

```bash
xattr -cr /Applications/UnblockPro.app
```

4. Запустите приложение и нажмите «Подключить»

> **Зачем нужна команда?** macOS блокирует приложения без платной подписи Apple Developer ($99/год). Команда `xattr -cr` снимает карантинный флаг — это безопасно, код проекта полностью открыт. Работает на Intel и Apple Silicon (M1/M2/M3).

### Windows

1. Скачайте установщик или портативную версию из [Releases](https://github.com/gagajo45/unblock-pro/releases/latest)
2. Запустите от имени администратора
3. Нажмите «Подключить»

> **Важно:** На Windows требуются права администратора для работы WinDivert

---

## Скриншоты

<p align="center">
  <em>Главный экран — Discord, YouTube, Telegram. Статус подключения, управление в один клик</em>
</p>

---

## FAQ

<details>
<summary><strong>Это VPN?</strong></summary>
Нет. UnblockPro не шифрует трафик и не маршрутизирует его через удалённый сервер. Он модифицирует сетевые пакеты локально, чтобы DPI-системы провайдера не могли распознать и заблокировать запросы к Discord, YouTube, Telegram и другим сервисам.
</details>

<details>
<summary><strong>Безопасно ли это?</strong></summary>
Да. Приложение open-source, не собирает данные, не отправляет трафик через сторонние серверы. Весь код доступен для аудита.
</details>

<details>
<summary><strong>Что если приложение крашнется?</strong></summary>
Прокси-настройки автоматически сбрасываются при любом завершении: штатном, аварийном или через kill. При следующем запуске настройки также очищаются для надёжности.
</details>

<details>
<summary><strong>Discord/YouTube/Telegram всё ещё не работает</strong></summary>
Попробуйте отключиться и подключиться заново — приложение переберёт другие стратегии. Если ни одна не помогла, возможно, ваш провайдер использует продвинутый DPI — создайте Issue.
</details>

<details>
<summary><strong>macOS: «файл не был открыт» / Gatekeeper</strong></summary>

Откройте Терминал и выполните:
```bash
xattr -cr /Applications/UnblockPro.app
```
После этого приложение запустится нормально. Это нужно сделать только один раз.

Если скачали `.zip` и распаковали в другую папку — укажите путь к `.app` вместо `/Applications/UnblockPro.app`.
</details>

---

## Разработка

```bash
# Клонировать этот форк
git clone https://github.com/gagajo45/unblock-pro.git
cd unblock-pro

# Установить зависимости
npm install

# Скачать бинарники zapret (tpws/winws) — нужны для работы
npm run download-binaries

# Запустить в режиме разработки
npm start

# Собрать для текущей ОС
npm run build

# Собрать для macOS
npm run build:mac

# Собрать для Windows
npm run build:win
```

### Подтянуть обновления от sonic (upstream)

Оригинал: https://github.com/by-sonic/unblock-pro

```bash
# Один раз добавить upstream (если ещё нет)
git remote add upstream https://github.com/by-sonic/unblock-pro.git

# Подтянуть и смержить
git fetch upstream
git merge upstream/main   # или upstream/master
```

**После мержа:** обнови `versionSonic` в `package.json` — поставь версию из upstream (см. их `package.json`). Наша версия (`version`) остаётся своей, `versionSonic` — база sonic.

---

## Стек

- **Electron** — кроссплатформенный фреймворк
- **zapret** — движок обхода DPI ([bol-van/zapret](https://github.com/bol-van/zapret))
- **electron-builder** — сборка и дистрибуция
- **GitHub Actions** — автоматические билды при релизе

---

## Лицензия

[MIT](LICENSE) — свободное использование, модификация и распространение.

---

<p align="center">
  <strong>Fork by gagajo45</strong> · original by sonic (upstream)<br>
  <sub><a href="https://github.com/gagajo45/unblock-pro">gagajo45/unblock-pro</a> · v2.0.22</sub>
</p>

---

### Ключевые слова / Keywords

> discord разблокировка, youtube разблокировка, telegram разблокировка, обход блокировки discord, обход блокировки youtube, обход блокировки telegram, dpi bypass, антиблокировка, разблокировать дискорд, discord россия, youtube россия, telegram россия, zapret gui, обход dpi, discord unblock russia, youtube unblock russia, telegram unblock russia, anti dpi, bypass discord block, unblock discord, unblock youtube, unblock telegram
