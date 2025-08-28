import express from 'express';

console.log('✅ Express importado com sucesso');

const app = express();
const port = 3006;

app.get('/', (req, res) => {
  res.json({ message: 'Servidor de teste funcionando!' });
});

app.listen(port, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${port}`);
});