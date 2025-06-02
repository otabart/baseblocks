import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import 'dotenv/config';
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.RPC_URL),});

console.log('ready to monitor.');

