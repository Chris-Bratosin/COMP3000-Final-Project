const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Express server is running.');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
