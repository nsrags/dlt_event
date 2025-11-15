import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectFetchTransactionsLoading, selectTransactions, fetchTransactions } from '../../store/transactionSlice';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
const sampleTransactions = [
  {
    transactionHash: '0xabc123...',
    blockNumber: 17452345,
    from: '0xA1b2C3d4E5f6...',
    to: '0xF6e5D4c3B2a1...',
    value: '1.25 ETH',
    gasUsed: 21000,
    status: 'success',
    timestamp: '2025-11-08T11:45:00Z'
  },
  {
    transactionHash: '0xdef456...',
    blockNumber: 17452346,
    from: '0xB7c8D9e0F1a2...',
    to: '0xC3d4E5f6A1b2...',
    value: '0.75 ETH',
    gasUsed: 30000,
    status: 'success',
    timestamp: '2025-11-08T11:46:10Z'
  },
  {
    transactionHash: '0x789ghi...',
    blockNumber: 17452347,
    from: '0xD1e2F3a4B5c6...',
    to: '0xE6f5D4c3B2a1...',
    value: '2.00 ETH',
    gasUsed: 45000,
    status: 'failed',
    timestamp: '2025-11-08T11:47:30Z'
  }
];

// Utility functions
const formatAddress = (address) => {
  if (!address) return '';
  return address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  // Etherscan returns unix seconds (string) in timeStamp or ISO in timestamp
  let date = null;
  if (/^\d+$/.test(String(timestamp))) {
    // unix seconds
    date = new Date(Number(timestamp) * 1000);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default function TransactionsTable() {
  const dispatch = useDispatch();
  const transactions = useSelector(selectTransactions) || {};
  const isLoading = useSelector(selectFetchTransactionsLoading);

  // The upstream response (Etherscan-like) is stored as transactions.data.result
  // Prefer using that array when available; otherwise fall back to sample data.
  const result = transactions.data?.result || sampleTransactions;

  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);

  return (
    <section className="bg-white rounded shadow p-6">
      <h2 className="text-lg font-bold text-[#094D34] mb-4 uppercase">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-[#094D34] uppercase text-xs font-bold">
              <th className="text-left px-3 py-2">Transactioon Hash</th>
              <th className="text-left px-3 py-2">Block</th>
              <th className="text-left px-3 py-2">Contract</th>
              <th className="text-left px-3 py-2">From</th>
              <th className="text-left px-3 py-2">To</th>
              <th className="text-left px-3 py-2">Value</th>
              {/* <th className="text-left px-3 py-2">Token</th> */}
              <th className="text-left px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <div className="animate-pulse">Loading transactions...</div>
                </td>
              </tr>
            ) : (result.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              result.map((tx, i) => {
                // Etherscan-like responses use timeStamp (unix seconds) and tokenName
                const hash = tx.hash;
                const blockNumber = tx.blockNumber ?? tx.blocknumber ?? tx.block;
                const contract = tx.contractAddress ?? tx.contractaddress ?? tx.contract;
                const from = tx.from;
                const to = tx.to;
                const value = tx.value ?? tx.amount ?? tx.tokenAmount ?? tx.valueRaw ?? tx.formattedValue ?? '-';
                // const tokenName = tx.tokenName ?? tx.token ?? tx.symbol ?? '-';
                const timeStamp = tx.timeStamp ?? tx.timestamp ?? tx.time; // may be unix seconds or ISO

                return (
                  <tr key={i} className="bg-white border border-[#094D34] rounded">
                    <td className="px-3 py-2 font-mono text-sm"><span>{formatAddress(hash)}</span>
                    <button
                      onClick={() => copyToClipboard(hash)}
                      className="p-1 rounded hover:bg-gray-200 transition"
                      title="Copy full address"
                      type="button"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 text-[#094D34]" />
                    </button></td>
                    <td className="px-3 py-2 font-mono text-sm">{blockNumber}</td>
                    <td className="px-3 py-2 font-mono text-sm">{formatAddress(contract)}</td>
                    <td className="px-3 py-2 font-mono text-sm">{formatAddress(from)}</td>
                    <td className="px-3 py-2 font-mono text-sm">{formatAddress(to)}</td>
                    <td className="px-3 py-2 font-semibold text-sm">{parseFloat(value / 1000000000000000000).toFixed(4) }</td>
                    {/* <td className="px-3 py-2 text-sm">{tokenName}</td> */}
                    <td className="px-3 py-2 text-gray-600 text-sm">{formatTimestamp(timeStamp)}</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}