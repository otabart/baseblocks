import React from 'react';

interface TransactionNode {
  id: string;
  txCount: number;
  isSender: boolean;
  isReceiver: boolean;
  lastActiveBlock: number;
}

interface TransactionLink {
  source: string | TransactionNode;
  target: string | TransactionNode;
  value: string;
  hash: string;
  block: number;
}

interface SideAppbarProps {
  nodes: TransactionNode[];
  links: TransactionLink[];
  totalTxs: number;
  currentBlock: number;
}

const SideAppbar: React.FC<SideAppbarProps> = ({ nodes, links, totalTxs, currentBlock }) => {
  const hotNode = nodes.length > 0 ? nodes.reduce((max, node) => (node.txCount > max.txCount ? node : max), nodes[0]) : null;

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto border-r border-gray-300 bg-white">
      <div className="bg-white p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Legend</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> Sender
          </li>
          <li className="flex items-center">
            <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span> Receiver
          </li>
          <li className="flex items-center">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span> Both
          </li>
        </ul>
      </div>
      <div className="bg-white p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Stats</h2>
        <p className="text-sm text-gray-700">Nodes: {nodes.length}</p>
        <p className="text-sm text-gray-700">Links: {links.length}</p>
        <p className="text-sm text-gray-700">Total Transactions: {totalTxs}</p>
        <p className="text-sm text-gray-700">Current Block: {currentBlock}</p>
      </div>
      {hotNode && (
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Hottest Node</h2>
          <p className="text-sm text-gray-700 font-mono">{truncateAddress(hotNode.id)}</p>
          <p className="text-sm text-gray-700">Transactions: {hotNode.txCount}</p>
        </div>
      )}
    </div>
  );
};

export default SideAppbar;

