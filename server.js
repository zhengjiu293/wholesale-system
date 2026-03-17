const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

db.initDatabase().then(() => {
    console.log('数据库初始化完成');
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('数据库初始化失败:', err);
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.query("SELECT * FROM categories ORDER BY id");
        res.json({ success: true, data: categories });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { category_id, keyword, status = 1 } = req.query;
        let sql = "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?";
        const params = [status];
        if (category_id) { sql += " AND p.category_id = ?"; params.push(category_id); }
        if (keyword) { sql += " AND p.name LIKE ?"; params.push(`%${keyword}%`); }
        sql += " ORDER BY p.id DESC";
        const products = await db.query(sql, params);
        res.json({ success: true, data: products });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/customer/login', async (req, res) => {
    try {
        const { phone, name } = req.body;
        let customer = await db.get("SELECT * FROM customers WHERE phone = ?", [phone]);
        if (!customer) {
            const result = await db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", [name || '客户', phone]);
            customer = await db.get("SELECT * FROM customers WHERE id = ?", [result.lastID]);
        }
        res.json({ success: true, data: customer });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/customer/:id/orders', async (req, res) => {
    try {
        const orders = await db.query("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC", [req.params.id]);
        for (const order of orders) {
            order.items = await db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        }
        res.json({ success: true, data: orders });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/orders', async (req, res) => { // 客户注册
app.post('/api/customers/register', async (req, res) => {
    try {
        const { name, phone, password, address } = req.body;
        
        // 检查是否已存在
        const existing = await db.get("SELECT * FROM customers WHERE phone = ?", [phone]);
        if (existing) {
            return res.json({ success: false, error: '该手机号已注册' });
        }
        
        // 创建新客户
        const result = await db.run(
            "INSERT INTO customers (name, phone, password, address) VALUES (?, ?, ?, ?)",
            [name, phone, password || '', address || '']
        );
        
        const customer = await db.get("SELECT * FROM customers WHERE id = ?", [result.lastID]);
        res.json({ success: true, customer: customer });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// 客户登录
app.post('/api/customers/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        let customer = await db.get("SELECT * FROM customers WHERE phone = ?", [phone]);

        if (!customer) {
            return res.json({ success: false, error: '用户不存在' });
        }

        res.json({ success: true, customer: customer });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

    try {
        const { customer_id, items, payment_method, remark, total_amount } = req.body;
        const order_no = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
        const result = await db.run("INSERT INTO orders (order_no, customer_id, total_amount, payment_method, payment_status, remark) VALUES (?, ?, ?, ?, ?, ?)",
            [order_no, customer_id, total_amount, payment_method, payment_method === 'online' ? 'paid' : 'unpaid', remark || '']);
        const order_id = result.lastID;
        for (const item of items) {
            await db.run("INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
                [order_id, item.id, item.name, item.quantity, item.price, item.price * item.quantity]);
            await db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);
        }
        res.json({ success: true, data: { order_id, order_no } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await db.get("SELECT * FROM admins WHERE username = ? AND password = ?", [username, password]);
        if (admin) { res.json({ success: true, data: admin }); }
        else { res.json({ success: false, message: '用户名或密码错误' }); }
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const { status, payment_status } = req.query;
        let sql = "SELECT o.*, c.name as customer_name, c.phone as customer_phone FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1";
        const params = [];
        if (status) { sql += " AND o.status = ?"; params.push(status); }
        if (payment_status) { sql += " AND o.payment_status = ?"; params.push(payment_status); }
        sql += " ORDER BY o.created_at DESC";
        const orders = await db.query(sql, params);
        for (const order of orders) {
            order.items = await db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        }
        res.json({ success: true, data: orders });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/admin/orders/:id', async (req, res) => {
    try {
        const { status, payment_status } = req.body;
        let sql = "UPDATE orders SET ";
        const params = [];
        if (status) { sql += "status = ?"; params.push(status); }
        if (payment_status) {
            if (params.length > 0) sql += ", ";
            sql += "payment_status = ?";
            params.push(payment_status);
        }
        sql += " WHERE id = ?";
        params.push(req.params.id);
        await db.run(sql, params);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/admin/orders/:id', async (req, res) => {
    try {
        const order = await db.get("SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?", [req.params.id]);
        if (order) { order.items = await db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]); }
        res.json({ success: true, data: order });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/admin/customers', async (req, res) => {
    try {
        const customers = await db.query("SELECT * FROM customers ORDER BY created_at DESC");
        res.json({ success: true, data: customers });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/admin/products/low-stock', async (req, res) => {
    try {
        const products = await db.query("SELECT * FROM products WHERE stock < 10 AND status = 1");
        res.json({ success: true, data: products });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = await db.get("SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE date(created_at) = ?", [today]);
        const totalCustomers = await db.get("SELECT COUNT(*) as count FROM customers");
        const lowStockProducts = await db.get("SELECT COUNT(*) as count FROM products WHERE stock < 10 AND status = 1");
        res.json({ success: true, data: { todayOrders: todayOrders || { count: 0, total: 0 }, totalCustomers: totalCustomers || { count: 0 }, lowStockProducts: lowStockProducts || { count: 0 } } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });
