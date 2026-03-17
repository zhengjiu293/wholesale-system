const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'wholesale.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
            db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category_id INTEGER, price REAL NOT NULL, stock INTEGER DEFAULT 0, unit TEXT DEFAULT '箱', status INTEGER DEFAULT 1)`);
            db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT)`);
            db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, customer_id INTEGER NOT NULL, total_amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash', payment_status TEXT DEFAULT 'unpaid', status TEXT DEFAULT 'pending', remark TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, subtotal REAL NOT NULL)`);
            db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`);
            
            db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
                if (row.count === 0) {
                    const cats = ['白酒','啤酒','葡萄酒','香烟','饮料','零食','调味品','日用品'];
                    cats.forEach(c => db.run("INSERT INTO categories (name) VALUES (?)", [c]));
                    db.run("INSERT INTO admins (username, password) VALUES ('admin', 'admin123')");
                    db.run("INSERT INTO customers (name, phone) VALUES ('张三', '13800138000')");
                    const prods = [
                        ['茅台酒 53度',1,1500,50,'箱'],['五粮液 52度',1,800,100,'箱'],['泸州老窖',1,600,80,'箱'],
                        ['青岛啤酒',2,50,200,'箱'],['雪花啤酒',2,45,250,'箱'],['长城干红',3,120,60,'箱'],
                        ['中华烟',4,450,30,'条'],['芙蓉王',4,220,50,'条'],['可口可乐',5,30,300,'箱'],['农夫山泉',5,20,400,'箱']
                    ];
                    prods.forEach(p => db.run("INSERT INTO products (name, category_id, price, stock, unit) VALUES (?,?,?,?,?)", p));
                }
                resolve();
            });
        });
    });
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }); });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });
}

module.exports = { db, initDatabase, query, run, get };
