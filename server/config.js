require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  adminToken: process.env.ADMIN_TOKEN || 'changeme-secret-token',
  jwtSecret: process.env.JWT_SECRET || 'changeme-jwt-secret',
  maxClipDuration: 59,
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '500', 10) * 1024 * 1024,
  uploadsDir: require('path').join(__dirname, 'uploads'),
  databaseUrl: process.env.DATABASE_URL,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
};
