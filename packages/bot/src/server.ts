import express from 'express';
import cors from 'cors';
import { BlockchainMonitor } from './blockchain.js'; 
import 'dotenv/config';

console.log('Starting server...');
console.log('RPC_URL from env:', process.env.RPC_URL);

if (!process.env.RPC_URL) {
  throw new Error('RPC_URL is not defined in .env');
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const monitor = new BlockchainMonitor();
const activeClients: express.Response[] = [];

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  activeClients.push(res);
  res.write('data: {"message": "Connected to SSE"}\n\n');

  req.on('close', () => {
    const index = activeClients.indexOf(res);
    if (index !== -1) {
      activeClients.splice(index, 1);
    }
  });
});

monitor.on('new_transactions', (transactions: string[]) => {
  const data = { type: 'new_transactions', data: transactions };
  const message = `data: ${JSON.stringify(data)}\n\n`;
  activeClients.forEach((client) => client.write(message));
});

app.get('/', (req, res) => {
  res.send('Bot API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  monitor.startMonitoring();
});