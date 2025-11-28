import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TransactionsTable from '../TransactionsTable/TransactionsTable.jsx';
import {
  allWalletsTransactions as fetchAllWalletsTransactions,
  selectAllWalletsTransactions,
  selectAllWalletsTransactionsLoading,
  selectAllWalletsTransactionsError,
} from '../../store/transactionSlice';
import {
  fetchAllWalletsTokens,
  selectAllWalletsTokens,
  selectAllWalletsTokensLoading,
  selectAllWalletsTokensError,
} from '../../store/walletSlice';
import { contractMap } from '../../config/contractMap';
import { DocumentDuplicateIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { WalletIcon } from '@heroicons/react/24/solid';

// Public leader dashboard (no auth required). Intentionally does NOT check auth token.
export default function LeaderDashboard() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState(0);
  const list = useSelector(selectAllWalletsTransactions) || [];
  const loading = useSelector(selectAllWalletsTransactionsLoading);
  const error = useSelector(selectAllWalletsTransactionsError);
  
  const tokensList = useSelector(selectAllWalletsTokens) || [];
  const tokensLoading = useSelector(selectAllWalletsTokensLoading);
  const tokensError = useSelector(selectAllWalletsTokensError);

  useEffect(() => {
    // Initial fetch
    dispatch(fetchAllWalletsTransactions());
    dispatch(fetchAllWalletsTokens());

    // Set up 40-second interval to re-trigger transaction fetch
    // const interval = setInterval(() => {
    //   console.log('Re-triggering fetchAllWalletsTransactions (40s interval)');
    //   dispatch(fetchAllWalletsTransactions());
    // }, 40000);

    // Cleanup interval on component unmount
    // return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[#0a4226] text-white">
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight">Leader Dashboard</h1>
          <p className="mt-2 text-gray-100 text-sm">Public view – aggregated transactions across configured wallets.</p>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded p-3">{String(error)}</div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/20 mb-4">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium focus:outline-none transition border-b-2 ${tab === 0 ? 'border-white text-white bg-white/10' : 'border-transparent text-white/70 hover:text-white'}`}
            onClick={() => setTab(0)}
          >
            <ArrowTrendingUpIcon className="w-5 h-5" />
            Transactions
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium focus:outline-none transition border-b-2 ${tab === 1 ? 'border-white text-white bg-white/10' : 'border-transparent text-white/70 hover:text-white'}`}
            onClick={() => setTab(1)}
          >
            <WalletIcon className="w-5 h-5" />
            Token Balances
          </button>
        </div>

        {/* Tab Content */}
        {tab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {list.length === 0 && !loading && (
            <div className="text-gray-600">No wallets configured or no data.</div>
          )}
          {list.map((entry, idx) => (
            <section key={entry.address.wallet_address || idx} className="bg-white rounded shadow p-4" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <div className="flex flex-col mb-2">
                <h2 className="text-base font-semibold">Wallet: <span className="font-mono text-sm">{entry.address.wallet_address || 'N/A'}</span></h2>
                <div className="text-xs text-gray-500 mt-1">Contract: <span className="font-mono">{entry.contractaddress || 'N/A'}</span></div>
              </div>
              {entry?.data?.message === 'OK' ? (
                <TransactionsTable transactions={entry} isLoading={loading} />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-t-4 border-t-[#0a4226] border-gray-200 rounded-full animate-spin" title="Loading"></div>
                </div>
              )}
            </section>
          ))}
          </div>
        )}

        {tab === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-8">
            {tokensError && (
              <div className="bg-red-50 text-red-600 border border-red-200 rounded p-3 col-span-full">{String(tokensError)}</div>
            )}
            {tokensList.length === 0 && !tokensLoading && (
              <div className="text-gray-100">No wallets configured or no data.</div>
            )}
            {tokensList.map((wallet, idx) => (
              <section key={wallet.address || idx} className="bg-white rounded shadow p-4 text-[#0a4226]" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div className="flex flex-col mb-3">
                  <h2 className="text-sm font-semibold mb-2">Wallet</h2>
                  <div className="font-mono text-xs text-gray-600 break-all">{wallet.address || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  {wallet.tokens && wallet.tokens.length > 0 ? (
                    wallet.tokens.map((token, tidx) => {
                      const addr = token.contractaddress || '';
                      const name = contractMap[addr] || addr.slice(0, 6) + '...';
                      const raw = token.data?.result;
                      const isRateLimited = typeof raw === 'string' && raw.includes('Max calls per sec rate limit reached');
                      let balance = 0;
                      if (!isRateLimited && raw !== undefined) {
                        const parsed = !Number.isNaN(Number(raw)) ? Number(raw) : 0;
                        balance = parsed / 1e18;
                      }
                      return (
                        <div key={tidx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                          <div className="font-medium">{name}</div>
                          {isRateLimited ? (
                            <div className="w-3 h-3 border-2 border-t-2 border-t-[#0a4226] border-gray-300 rounded-full animate-spin" title="Loading"></div>
                          ) : (
                            <div className="font-semibold">{balance.toFixed(2)}</div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-500">No tokens</div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
