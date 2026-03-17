# Git и релизы для форка UnblockPro

Краткая инструкция: как залить проект в свой GitHub и выпускать обновления, чтобы приложение проверяло версии **именно в твоём репо** (gagajo45/unblock-pro).

---

## 1. Установить Git

- Сайт: https://git-scm.com/download/win  
- Скачай установщик для Windows, установи (можно оставить настройки по умолчанию).

---

## 2. Один раз привязать папку проекта к своему репо

Открой **PowerShell** или **Командную строку** и перейди в папку проекта:

```powershell
cd "C:\Users\alex\projects\test vpn\unblock-pro"
```

Проверь, есть ли уже git (часто бывает, если клонировал с Cursor/другого места):

```powershell
git status
```

- Если пишет что-то вроде «not a git repository» — инициализируй и привяжи репо:

```powershell
git init
git remote add origin https://github.com/gagajo45/unblock-pro.git
```

- Если `git status` уже работает — проверь, куда смотрит `origin`:

```powershell
git remote -v
```

Если там указан чужой репозиторий (например by-sonic), замени на свой:

```powershell
git remote set-url origin https://github.com/gagajo45/unblock-pro.git
```

---

## 3. Первый раз отправить код на GitHub

```powershell
git add .
git commit -m "Fork UnblockPro: без рекламы, Telegram, свои правки"
git branch -M main
git push -u origin main
```

Если GitHub попросит логин/пароль — используй **Personal Access Token** вместо пароля (настройка: GitHub → Settings → Developer settings → Personal access tokens). Или войди через браузер, если включён GitHub CLI.

---

## 4. Как выпускать версию (релиз), чтобы приложение её подхватило

Автообновление смотрит в **твой** репо (gagajo45/unblock-pro) — это уже настроено в `package.json` (поле `build.publish`).

### Шаг 1: Поднять версию в проекте

В файле **`package.json`** в начале измени строку `"version"`:

- Было: `"version": "2.0.15"`
- Стало: `"version": "2.0.16"` (или 2.0.17, 2.1.0 — как захочешь).

Сохрани файл.

### Шаг 2: Собрать приложение

В той же папке в терминале:

```powershell
npm run build:win
```

Готовые файлы появятся в папке **`dist`**:
- `UnblockPro-2.0.16-win-setup.exe`
- `UnblockPro-2.0.16-win-portable.exe`

(подставь свою версию вместо 2.0.16).

### Шаг 3: Закоммитить и запушить

```powershell
git add .
git commit -m "v2.0.16"
git push origin main
```

### Шаг 4: Создать релиз на GitHub

1. Открой в браузере: https://github.com/gagajo45/unblock-pro  
2. Вкладка **Releases** → кнопка **Create a new release**.  
3. **Choose a tag** → нажми **Find or create a new tag**, введи версию **без буквы v**, например: `2.0.16` → Create new tag.  
4. **Release title** можно сделать таким: `v2.0.16`.  
5. В описание можно написать кратко, что изменилось.  
6. В блок **Attach binaries** перетащи файлы из папки `dist`:
   - `UnblockPro-2.0.16-win-setup.exe`
   - `UnblockPro-2.0.16-win-portable.exe`
7. Нажми **Publish release**.

После этого приложение (если у пользователя стоит версия ниже 2.0.16) сможет предложить обновление с твоего GitHub.

---

## 5. Сверять версии с оригиналом (by-sonic)

Чтобы смотреть, какая версия у автора:

- Репозиторий оригинала: https://github.com/by-sonic/unblock-pro  
- Открой **Releases** или **Code** и посмотри теги/версии в `package.json` там.

Подтянуть изменения оригинала к себе (если хочешь мержить):

```powershell
git remote add upstream https://github.com/by-sonic/unblock-pro.git
git fetch upstream
git merge upstream/main
```

Конфликты (если будут) нужно будет разрешить вручную. После мержа можно снова пушить в свой репо: `git push origin main`.

---

## Краткая шпаргалка

| Действие              | Команды |
|-----------------------|--------|
| Отправить изменения   | `git add .` → `git commit -m "описание"` → `git push origin main` |
| Выпустить новую версию | Поднять `version` в package.json → `npm run build:win` → пуш → создать Release на GitHub и приложить .exe из `dist` |
| Репозиторий для обновлений | Уже настроен: **gagajo45/unblock-pro** (в `package.json` → `build.publish`) |

Если что-то пойдёт не так, пришли текст ошибки из терминала или скрин — подскажу по шагам.
