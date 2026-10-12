# Greenery Lab 6 — Express-сервер

## Описание
Express-сервер для магазина мебели Greenery.
Отдаёт HTML-страницу с фронтендом и REST API для работы с товарами и заказами.

## Установка и запуск

npm install
node server.js

Открыть в браузере: http://localhost:3000/page

## Сервисы

### 1. GET /page
Отдаёт HTML-страницу с фронтендом (файл `public/index.html`).

### 2. GET /api/products
Возвращает JSON со списком всех товаров.
Читает `data/products.json`.

### 3. GET /api/products/:id
Возвращает один товар по id.
- Если товар не найден → 404.

### 4. GET /api/orders
Возвращает JSON со списком всех заказов.
Читает `data/orders.json`.

### 5. POST /api/orders
Принимает данные заказа: `{ productId, quantity }`.
- Проверяет наличие `productId` и `quantity` → 400.
- Проверяет, что `quantity ≥ 1` → 400.
- Проверяет, что товар существует → 404.
- Проверяет, что товар в наличии → 400.
- Создаёт заказ, сохраняет в `data/orders.json`.
- Возвращает созданный заказ и обновлённый список.

### 6. POST /api/stats
Возвращает статистику по заказам: количество, общая сумма, средний чек.

### 7. DELETE /api/orders/:id
Удаляет заказ по id.
- Если заказ не найден → 404.

### 8. GET /api/products-format
Возвращает товары в формате, зависящем от заголовка `Accept`:
- `text/html` → HTML
- `application/xml` или `text/xml` → XML
- по умолчанию → JSON

### 9. GET /api/download/:format
Скачивает заказы в формате:
- `json` → orders.json
- `xml` → orders.xml
- `html` → orders.html

Устанавливает заголовок `Content-Disposition: attachment`.

## Обработка ошибок
- 400 — некорректные данные
- 404 — не найдено
- 500 — внутренняя ошибка
- 404 на неизвестный маршрут
- Middleware `(err, req, res, next)` для ошибок

## Структура проекта

lab6/
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── data/
│   ├── products.json
│   └── orders.json
└── public/
    └── index.html

## Хранение данных
- `data/products.json` — массив товаров
- `data/orders.json` — массив заказов

Файлы читаются при **каждом** запросе, поэтому изменения в JSON сразу видны серверу.

## Технологии
- Node.js
- Express
- fs.promises
- fetch API (на фронтенде)
- HTML + CSS + JS (без фреймворков)