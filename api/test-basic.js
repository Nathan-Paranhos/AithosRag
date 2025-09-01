import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3005;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Basic server running' });
});

app.listen(PORT, () => {
  console.log(`✅ Basic server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});