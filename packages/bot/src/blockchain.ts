import { EventEmitter } from 'events';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export class BlockchainMonitor extends EventEmitter {
  private client;

  constructor() {
    super();
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL),
    });
  }

  async startMonitoring() {
    try {
      this.client.watchBlockNumber({
        onBlockNumber: async (blockNumber) => {
          const block = await this.client.getBlock({
            blockNumber,
            includeTransactions: true,
          });

          // Extract relevant transaction fields
          const simplifiedTxs = block.transactions.map((tx) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '0x0', 
            value: tx.value.toString(), 
          }));

          this.emit('new_transactions', simplifiedTxs);
        },
        onError: (error) => {
          console.error('Error watching blocks:', error);
        },
      });
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }
}