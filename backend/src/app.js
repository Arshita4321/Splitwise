// src/app.js
import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';

// existing
import authRoutes    from './routes/auth.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

// new routes
import groupRoutes   from './routes/group.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import balanceRoutes from './routes/balance.routes.js';
import messageRoutes from './routes/message.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get("/db-proof", async (req, res) => {
  try {
    const db = await pool.query("SELECT current_database()");
    const schema = await pool.query("SELECT current_schema()");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    res.json({
      database: db.rows[0],
      schema: schema.rows[0],
      tables: tables.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json(err.message);
  }
});

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/groups',   groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/messages', messageRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});



// Centralized error handler — must be last
app.use(errorHandler);