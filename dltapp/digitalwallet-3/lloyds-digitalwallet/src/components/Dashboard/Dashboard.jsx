import React, { useEffect, useState } from 'react';
import Header from '../Header/Header.jsx';
import WalletBalance from '../WalletBalance/WalletBalance.jsx';
import DeployContract from '../DeployContract/DeployContract.jsx';
import ContractsTable from '../ContractsTable/ContractsTable.jsx';
import TransactionsTable from '../TransactionsTable/TransactionsTable.jsx';
import ActionButtons from '../ActionButtons/ActionButtons.jsx';
import { DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/solid';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, selectTransactions, selectFetchTransactionsLoading } from '../../store/transactionSlice';

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const dispatch = useDispatch();
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectFetchTransactionsLoading);

  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);

  return (
   <div className="min-h-screen bg-[#0a4226] font-sans">
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded shadow p-6 space-y-6">
          <Header />

          {/* Layout: left column stacks WalletBalance and DeployContract; ActionButtons sits to the right of both on md+ screens */}
          <div className="md:flex md:items-start md:space-x-6 justify-between">
            <div className="w-full md:w-1/4 space-y-3">
              <div className="w-full mx-auto">
                <WalletBalance />
              </div>

            </div>

            <div className="w-full md:w-1/2 flex justify-end">
              <div className="md:sticky md:top-6" >
                <ActionButtons />
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-6">
            {/* Tailwind Tabs with Icons */}
            <div className="w-full mb-6">
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none transition border-b-2 ${tab === 0 ? 'border-[#0a4226] text-[#0a4226] bg-gray-50' : 'border-transparent text-gray-500 hover:text-[#0a4226]'}`}
                  onClick={() => setTab(0)}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                  Contracts
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none transition border-b-2 ${tab === 1 ? 'border-[#0a4226] text-[#0a4226] bg-gray-50' : 'border-transparent text-gray-500 hover:text-[#0a4226]'}`}
                  onClick={() => setTab(1)}
                >
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  Transactions
                </button>
                
              </div>
              <div>
                {tab === 0 && <ContractsTable />}
                {tab === 1 && (
                  <TransactionsTable
                    transactions={transactions}
                    isLoading={transactionsLoading}
                  />
                )}
                
                
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
