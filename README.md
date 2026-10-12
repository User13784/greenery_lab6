# Greenery Lab 6 — Express-сервер

## Описание
Express-сервер для магазина мебели Greenery.
Отдаёт HTML-страницу с фронтендом и REST API.

## Запуск
npm install
node server.js

Открыть: http://localhost:3000/page

## Сервисы
- GET /page — HTML-страница
- GET /api/products — все товары (JSON)
- GET /api/products/:id — один товар
- GET /api/orders — все заказы
- POST /api/orders — создать заказ
- POST /api/stats — статистика
- DELETE /api/orders/:id — отменить заказ
- GET /api/products-format — XML/HTML/JSON по Accept
- GET /api/download/:format — скачать файл

## Технологии
- Node.js
- Express
- fs.promises
- fetch API