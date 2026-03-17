const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'akinrobotics-secret-key';

// Google AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'your-api-key' });

// Mock users (production'da database kullanılacak)
const users = [
  {
    id: 'admin-1',
    name: 'Sistem Yöneticisi',
    role: 'ADMIN',
    username: 'admin',
    password: 'password'
  },
  {
    id: 'u-hakan',
    name: 'Hakan',
    role: 'LAWYER',
    username: 'hakan',
    password: '12345'
  },
  {
    id: 'u-erdal',
    name: 'Erdal',
    role: 'LAWYER',
    username: 'erdal',
    password: '12345'
  },
  {
    id: 'u-arifegul',
    name: 'Arifegül',
    role: 'LAWYER',
    username: 'arifegul',
    password: '12345'
  }
];

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { text: contractText, context } = req.body;
    
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      Bu sözleşmeyi analiz et:
      ${contractText}
      
      Şirket bilgileri:
      ${JSON.stringify(context, null, 2)}
      
      JSON formatında yanıt ver:
      {
        "riskLevel": "LOW|MEDIUM|HIGH",
        "risks": ["risk1", "risk2"],
        "recommendations": ["rec1", "rec2"],
        "missingClauses": ["clause1", "clause2"],
        "summary": "Özet"
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // JSON parse et
    const analysis = JSON.parse(responseText);
    res.json(analysis);
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports.handler = serverless(app);
