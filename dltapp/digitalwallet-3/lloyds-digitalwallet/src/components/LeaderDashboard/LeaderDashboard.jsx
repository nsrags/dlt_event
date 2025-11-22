import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TransactionsTable from '../TransactionsTable/TransactionsTable.jsx';
import {
  allWalletsTransactions as fetchAllWalletsTransactions,
  selectAllWalletsTransactions,
  selectAllWalletsTransactionsLoading,
  selectAllWalletsTransactionsError,
} from '../../store/transactionSlice';

// Public leader dashboard (no auth required). Intentionally does NOT check auth token.
export default function LeaderDashboard() {
  const dispatch = useDispatch();
  const list = useSelector(selectAllWalletsTransactions) || [];
  const loading = useSelector(selectAllWalletsTransactionsLoading);
  const error = useSelector(selectAllWalletsTransactionsError);

  useEffect(() => {
    dispatch(fetchAllWalletsTransactions());

  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 text-[#0a4226] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight">Leader Dashboard</h1>
          <p className="mt-2 text-gray-600 text-sm">Public view – aggregated transactions across configured wallets.</p>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded p-3">{String(error)}</div>
        )}

        {/* Render a TransactionsTable per wallet address from the list */}
        <div className="space-y-8">
          {list.length === 0 && !loading && (
            <div className="text-gray-600">No wallets configured or no data.</div>
          )}
          {list.map((entry, idx) => (
            <section key={entry.address || idx} className="bg-white rounded shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">Wallet: <span className="font-mono text-sm">{entry.address || 'N/A'}</span></h2>
                <div className="text-xs text-gray-500">Contract: <span className="font-mono">{entry.contractaddress || 'N/A'}</span></div>
              </div>
              <TransactionsTable transactions={entry} isLoading={loading} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
