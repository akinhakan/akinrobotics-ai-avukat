import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'akinrobotics-secret-key-2026';

// Veritabanı Başlatma
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [
      {
        id: 'admin-hakan',
        username: 'Hakan',
        password: bcrypt.hashSync('5265Hakan', 10),
        name: 'Hakan (Yönetici)',
        role: 'ADMIN',
        avatar: 'https://ui-avatars.com/api/?name=Hakan&background=0D8ABC&color=fff'
      }
    ],
    companyContext: {
      companyName: "AKINROBOTICS",
      industry: "Robotik ve Yapay Zeka",
      address: "Konya, Türkiye",
      taxInfo: "Konya V.D. / 1234567890",
      representative: "Özgür Akın",
      productPortfolio: "İnsansı Robotlar (ADA), Hizmet Robotları, Tarım Robotları",
      redLines: "Fikri mülkiyet devri yapılamaz. Ödeme vadesi 30 günü geçemez.",
      masterContracts: [],
      customRules: [],
      apiKeys: { google: '', openai: '', anthropic: '' },
      activeProvider: 'GOOGLE',
      preferredModel: 'gemini-3-flash-preview'
    }
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

const getData = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const saveData = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // --- AUTH API ---

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const data = getData();
    const user = data.users.find((u: any) => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
      if (user.role === 'PENDING') {
        return res.status(403).json({ error: 'Hesabınız henüz yönetici tarafından onaylanmamış.' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Yetkisiz' });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const data = getData();
      const user = data.users.find((u: any) => u.id === decoded.id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
    } catch (err) {
      res.status(401).json({ error: 'Geçersiz token' });
    }
  });

  // --- USER MANAGEMENT API ---

  app.get('/api/users', (req, res) => {
    const data = getData();
    const usersWithoutPasswords = data.users.map(({ password: _, ...u }: any) => u);
    res.json(usersWithoutPasswords);
  });

  app.post('/api/users', (req, res) => {
    const { username, password, name, role } = req.body;
    const data = getData();
    
    if (data.users.find((u: any) => u.username === username)) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten mevcut' });
    }

    const newUser = {
      id: Math.random().toString(36).substring(2, 15),
      username,
      password: bcrypt.hashSync(password, 10),
      name,
      role: role || 'PENDING',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    data.users.push(newUser);
    saveData(data);
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const data = getData();
    
    if (id === 'admin-hakan') {
      return res.status(403).json({ error: 'Ana yönetici silinemez' });
    }

    data.users = data.users.filter((u: any) => u.id !== id);
    saveData(data);
    res.json({ success: true });
  });

  app.patch('/api/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const data = getData();
    
    const user = data.users.find((u: any) => u.id === id);
    if (user) {
      user.role = role;
      saveData(data);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
  });

  // --- CONTEXT API ---

  app.get('/api/context', (req, res) => {
    const data = getData();
    res.json(data.companyContext);
  });

  app.post('/api/context', (req, res) => {
    const data = getData();
    data.companyContext = { ...data.companyContext, ...req.body };
    saveData(data);
    res.json(data.companyContext);
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Sunucu http://0.0.0.0:${PORT} adresinde aktif.`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Başlatma hatası:', err);
  process.exit(1);
});
