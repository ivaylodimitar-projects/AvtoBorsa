# Kar.bg Copart Importer (Chrome Extension)

Това е MV3 Chrome extension, което добавя бутон **"Добави в Kar.bg"** в страница на обява в `copart.ca`.

При клик extension-ът изпраща данните към:

`POST /api/auth/import/copart/`

и създава **чернова** в Kar.bg профила, към който принадлежи API ключът, като
опитва да импортира и снимките от Copart обявата.

## 1) Подготви API ключ в Kar.bg

1. Влез в Kar.bg.
2. Отвори `Settings` -> таб `API ключ`.
3. Натисни `Генерирай API ключ` и копирай стойността.

## 2) Инсталация в Chrome

1. Отвори `chrome://extensions`.
2. Включи `Developer mode`.
3. Натисни `Load unpacked`.
4. Избери папката:
   `chrome-extension/copart-karbg-importer`

## 3) Конфигурация

1. Кликни иконата на extension-а.
2. Попълни:
   - `Backend URL` (пример: `http://localhost:8000`)
   - `API ключ` от Kar.bg Settings
3. Натисни `Запази`.

## 4) Използване

1. Отвори обява в `https://www.copart.ca/`.
2. Ще видиш бутон `Добави в Kar.bg`.
3. Натисни бутона и обявата ще се импортира като **draft**.

## Бележки

- API ключът се пази в `chrome.storage.sync`.
- При регенериране на ключа в Kar.bg трябва да обновиш ключа и в extension-а.
- Ако backend URL или API ключът са грешни, ще видиш съобщение за грешка.
