const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { create } = require('xmlbuilder2');

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ===== ЭКРАНИРОВАНИЕ HTML =====
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== УТИЛИТЫ ЧТЕНИЯ/ЗАПИСИ JSON =====
async function readJSON(file) {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(file, '[]');
      return [];
    }
    console.error(`Ошибка чтения ${file}:`, err.message);
    return [];
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ===== 1. GET /page — HTML-страница фронтенда =====
app.get('/page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== 2. GET /api/products — JSON со всеми товарами =====
app.get('/api/products', async (req, res) => {
  try {
    const products = await readJSON(PRODUCTS_FILE);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения товаров' });
  }
});

// ===== 3. GET /api/products/:id — один товар =====
app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await readJSON(PRODUCTS_FILE);
    const product = products.find(p => p.id === Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== 4. GET /api/orders — JSON со всеми заказами =====
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await readJSON(ORDERS_FILE);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения заказов' });
  }
});

// ===== 5. POST /api/orders — принять заказ =====
app.post('/api/orders', async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Нужны productId и quantity' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Количество должно быть > 0' });
    }

    const products = await readJSON(PRODUCTS_FILE);
    const product = products.find(p => p.id === Number(productId));

    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    if (!product.inStock) {
      return res.status(400).json({ error: 'Товара нет в наличии' });
    }

    const orders = await readJSON(ORDERS_FILE);
    const newOrder = {
      id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: Number(quantity),
      total: product.price * Number(quantity),
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    await writeJSON(ORDERS_FILE, orders);

    res.json({ message: 'Заказ оформлен', order: newOrder, orders });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при оформлении заказа' });
  }
});

// ===== 6. POST /api/stats — статистика заказов =====
app.post('/api/stats', async (req, res) => {
  try {
    const orders = await readJSON(ORDERS_FILE);
    const totalOrders = orders.length;
    const totalSum = orders.reduce((sum, o) => sum + o.total, 0);

    res.json({
      totalOrders,
      totalSum,
      averageOrder: totalOrders > 0 ? totalSum / totalOrders : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

// ===== 7. DELETE /api/orders/:id — удалить заказ =====
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const orders = await readJSON(ORDERS_FILE);
    const filtered = orders.filter(o => o.id !== id);

    if (filtered.length === orders.length) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    await writeJSON(ORDERS_FILE, filtered);
    res.json({ message: 'Заказ отменён', orders: filtered });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отмены заказа' });
  }
});

// ===== 8. GET /api/products-format — XML/HTML/JSON по Accept =====
app.get('/api/products-format', async (req, res) => {
  try {
    const products = await readJSON(PRODUCTS_FILE);
    const accept = req.headers.accept || '';

    // --- HTML ---
    if (accept.includes('text/html')) {
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Товары</title></head><body>';
      html += '<h1>Товары Greenery</h1>';
      html += '<table border="1" cellpadding="8">';
      html += '<tr><th>ID</th><th>Название</th><th>Категория</th><th>Цена</th><th>В наличии</th></tr>';
      products.forEach(p => {
        html += `<tr>
          <td>${escapeHtml(p.id)}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>£${escapeHtml(p.price)}</td>
          <td>${p.inStock ? 'Да' : 'Нет'}</td>
        </tr>`;
      });
      html += '</table></body></html>';
      return res.type('text/html').send(html);
    }

    // --- XML через xmlbuilder2 ---
    if (accept.includes('application/xml') || accept.includes('text/xml')) {
      const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('products');

      products.forEach(p => {
        root.ele('product')
          .ele('id').txt(String(p.id)).up()
          .ele('name').txt(String(p.name)).up()
          .ele('category').txt(String(p.category)).up()
          .ele('price').txt(String(p.price)).up()
          .ele('inStock').txt(String(p.inStock)).up();
      });

      const xml = root.end({ prettyPrint: true });
      return res.type('application/xml').send(xml);
    }

    // --- JSON (по умолчанию) ---
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ===== 9. GET /api/download/:format — скачивание файла =====
app.get('/api/download/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const orders = await readJSON(ORDERS_FILE);

    // --- JSON ---
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="orders.json"');
      res.type('application/json');
      return res.send(JSON.stringify(orders, null, 2));
    }

    // --- XML через xmlbuilder2 ---
    if (format === 'xml') {
      const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('orders');

      orders.forEach(o => {
        root.ele('order')
          .ele('id').txt(String(o.id)).up()
          .ele('product').txt(String(o.productName)).up()
          .ele('quantity').txt(String(o.quantity)).up()
          .ele('total').txt(String(o.total)).up()
          .ele('createdAt').txt(String(o.createdAt)).up();
      });

      const xml = root.end({ prettyPrint: true });
      res.setHeader('Content-Disposition', 'attachment; filename="orders.xml"');
      res.type('application/xml');
      return res.send(xml);
    }

    // --- HTML ---
    if (format === 'html') {
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Заказы</title></head><body>';
      html += '<h1>Заказы Greenery</h1>';
      html += '<table border="1" cellpadding="8">';
      html += '<tr><th>ID</th><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Дата</th></tr>';
      orders.forEach(o => {
        html += `<tr>
          <td>${escapeHtml(o.id)}</td>
          <td>${escapeHtml(o.productName)}</td>
          <td>${escapeHtml(o.quantity)}</td>
          <td>£${escapeHtml(o.price)}</td>
          <td>£${escapeHtml(o.total)}</td>
          <td>${escapeHtml(new Date(o.createdAt).toLocaleString('ru-RU'))}</td>
        </tr>`;
      });
      html += '</table></body></html>';
      res.setHeader('Content-Disposition', 'attachment; filename="orders.html"');
      res.type('text/html');
      return res.send(html);
    }

    res.status(400).json({ error: 'Формат: json, xml или html' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка скачивания' });
  }
});

// ===== 10. 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// ===== 11. Обработка ошибок =====
app.use((err, req, res, next) => {
  console.error('Ошибка:', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}/page`);
});