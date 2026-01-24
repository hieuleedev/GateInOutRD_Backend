require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 👈 thêm
const {initDB} = require('./models');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const factoryRoutes = require('./routes/factory.route');

const app = express();

/* 🔥 CORS CONFIG */
app.use(cors({
  origin: '*', // FE port của bạn (Vite)
  credentials: true,
}));

app.use(express.json());

initDB();

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/factories', factoryRoutes);

app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
