const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Налаштування папок
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Налаштування збереження фото
const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// База даних у файлі (тимчасова)
const DB_FILE = path.join(__dirname, 'products.json');
let products = [];
if (fs.existsSync(DB_FILE)) {
    products = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2));

// Авторизація (Пароль: xxxshop)
app.post('/api/auth', (req, res) => {
    const { code } = req.body;
    if (code === 'xxxshop') {
        res.json({ token: 'admin-session-active' });
    } else {
        res.status(401).json({ error: 'Невірний код' });
    }
});

// Отримати товари
app.get('/api/products', (req, res) => {
    const isAdmin = req.headers['x-session'] === 'admin-session-active';
    res.json(products.map(p => ({ ...p, isOwner: isAdmin })));
});

// Додати товар
app.post('/api/products', upload.single('image'), (req, res) => {
    if (req.headers['x-session'] !== 'admin-session-active') return res.status(403).json({ error: 'No access' });
    
    const newProduct = {
        id: 'ID' + Math.floor(1000 + Math.random() * 9000),
        title: req.body.title,
        price: req.body.price,
        desc: req.body.desc,
        img: req.file ? `/uploads/${req.file.filename}` : null
    };
    
    products.push(newProduct);
    saveDB();
    res.json(newProduct);
});

// Видалити товар
app.delete('/api/products/:id', (req, res) => {
    if (req.headers['x-session'] !== 'admin-session-active') return res.status(403).json({ error: 'No access' });
    products = products.filter(p => p.id !== req.params.id);
    saveDB();
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Сервер працює на порту ${PORT}`));
