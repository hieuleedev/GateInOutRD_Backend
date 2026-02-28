require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 👈 thêm
const {initDB} = require('./models');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const factoryRoutes = require('./routes/factory.route');
const accessRequestRoute = require('./routes/accessRequest.route');
const cardRoute = require('./routes/card.route');
const fileRoute = require('./routes/file.route');
const notificationRoute = require('./routes/notification.route');
const accessLogRoutes = require('./routes/accessLog.route');
const CardPrivateRoute = require('./routes/CartPrivate.route')
const path = require('path');

const app = express();

/* 🔥 CORS CONFIG */
app.use(cors({
  origin: '*', // FE port của bạn (Vite)
  credentials: true,
}));

app.use(express.json());

initDB();
app.use(
  '/uploads/avatar',
  express.static(path.join(__dirname, 'uploads/avatar'))
);
app.use('/api/notifications', notificationRoute);
app.use('/files', fileRoute);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/access-requests', accessRequestRoute);
app.use('/api/card', cardRoute);
app.use('/api/card-private', CardPrivateRoute);
app.use('/api/access-logs', accessLogRoutes);
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
