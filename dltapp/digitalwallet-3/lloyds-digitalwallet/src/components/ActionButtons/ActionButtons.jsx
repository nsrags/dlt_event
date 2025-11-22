import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpIcon, ArrowDownIcon, ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/solid';
import {
  selectSendTransactionLoading,
  selectTransactionError,
  clearCurrentTransaction,
  sendTransaction,
  selectSendTransaction
} from '../../store/transactionSlice';
import {
  buyTokens,
  redeemTokens,
  selectBuyTokensLoading,
  selectBuyTokensError,
  selectRedeemTokensError,
  selectCurrentBuyOperation,
  clearCurrentBuyOperation,
  clearCurrentRedeemOperation,
  selectRedeemTokensLoading,
  selectCurrentRedeemOperation
} from '../../store/walletSlice';
import { getCurrentProfits , multiplyTokenAmount, truncateTokenAmount } from '../../utils';




export default function ActionButtons() {
  const dispatch = useDispatch();
  const initialbalance = import.meta.env.VITE_WALLET_INITIAL_BALANCE;
  const tokens = useSelector(state => state.wallet.tokens);
  const profits = getCurrentProfits(tokens, initialbalance);
  const readableProfits = Number(profits) / 1000000000000000000;
  const [tabIdx, setTabIdx] = useState(null);
  const [formData, setFormData] = useState({ to: '', amount: '', contractAddress: '' });
  const [localError, setLocalError] = useState('');
  const TABS = [
    {
      label: 'Buy MMF',
      icon: ArrowUpIcon,
      action: buyTokens,
      buttonLabel: 'Buy',
      clearAction: clearCurrentBuyOperation,
      isLoadingSelector: selectBuyTokensLoading,
      error: selectBuyTokensError,
      currentOperation: selectCurrentBuyOperation
    },
    {
      label: 'Redeem MMF',
      icon: ArrowDownIcon,
      action: redeemTokens,
      buttonLabel: 'Redeem',
      clearAction: clearCurrentRedeemOperation,
      isLoadingSelector: selectRedeemTokensLoading,
      error: selectRedeemTokensError,
      currentOperation: selectCurrentRedeemOperation
    },
    {
      label: 'Transfer Profits to Judge Wallet',
      icon: ArrowsRightLeftIcon,
      action: sendTransaction,
      buttonLabel: 'Transfer',
      isLoadingSelector: selectSendTransactionLoading,
      error: selectTransactionError,
      currentOperation: selectSendTransaction
    },
  ];


  // Determine which loading state to use based on active tab
  const currentTab = tabIdx !== null ? TABS[tabIdx] : null;
  const isLoading = useSelector(currentTab?.isLoadingSelector ?? (() => false));
  console.log(selectSendTransactionLoading, isLoading);
  const error = useSelector(currentTab?.error ?? (() => null));

  console.log(initialbalance);
  const currentOperation = useSelector(currentTab?.currentOperation ?? (() => null));



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const tab = TABS[tabIdx];
    if (!tab.action) return;
    try {
      let payload = tabIdx == 2 ? { amount: multiplyTokenAmount(readableProfits) } : {
        to: formData.to,
        amount: multiplyTokenAmount(formData.amount),
        contractAddress: formData.contractAddress
      };

      console.log(payload);


      await dispatch(tab.action(payload)).unwrap();
      setFormData({ to: '', amount: '', contractAddress: '' });
    } catch {
      setLocalError('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-3xl min-w-max 2mx-auto flex flex-row gap-6 items-start">
      <div className="flex flex-col w-28 border-r border-gray-200">
        {TABS.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setTabIdx(idx)}
            type="button"
            className={`flex-none flex flex-col items-center justify-center py-4 px-2 transition font-semibold text-sm focus:outline-none
              border-r-4 border-b-0
              ${tabIdx === idx ? 'border-[#0a4226] text-[#0a4226] bg-gray-50' : 'border-transparent text-gray-500 hover:text-[#0a4226]'}
            `}
          >
            <tab.icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{tab.buttonLabel}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="flex-1 bg-white min-w-[400px]  min-h-[250px] rounded-lg p-6 shadow-md animate-fade-in w-full relative">
        <h2 className="text-xl font-bold text-[#0a4226] mb-4 flex items-center text-center gap-2">
          {tabIdx !== null ? (
            <>
              {/* {(() => {
                const Icon = TABS[tabIdx].icon;
                return <Icon className="h-6 w-6" />;
              })()} */}
              {TABS[tabIdx].label}
            </>
          ) : (
            <>Select an action</>
          )}
        </h2>

        {(error || localError) && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tabIdx == 2 && (
            <div className="mb-6 flex gap-4">
            <div className='flex flex-col flex-wrap'>
              <p className="text-left"><label className="w-28 text-sm font-medium text-gray-700">Profits earned</label> {truncateTokenAmount(readableProfits)}</p>
              <div className='flex-col flex-wrap width-full'>
                {readableProfits <= 0 &&
                  <div class="flex items-center p-4 mb-4 text-sm text-red-800 ">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>

                    No profits made to transfer
                  </div>
                }
              </div>
            </div>


          </div>)}

          {tabIdx != 2 && (
            <div className="mb-6 flex flex-col gap-4">
              <label className="w-28 text-sm font-medium text-left items-left text-gray-700">Unit</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#0a4226] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0.0"
                step="0.000001"
                min="0"
                required
                disabled={!(tabIdx !== null && TABS[tabIdx].action)}
              />
            </div>)}


          {tabIdx != 2 && (<button
            type="submit"
            disabled={tabIdx != 2 && (isLoading || !(tabIdx !== null && TABS[tabIdx].action))}

            className={`w-full bg-[#0a4226] text-white py-2 px-4 rounded font-medium ${isLoading || !(tabIdx !== null && TABS[tabIdx].action) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#094D34]'} transition`}
          >
            {isLoading ? 'Processing...' : (tabIdx !== null ? TABS[tabIdx].buttonLabel : 'Select')}
          </button>)}

          {tabIdx == 2 && (<button
            type="submit"
            disabled={readableProfits <= 0}

            className={`w-full bg-[#0a4226]  text-white py-2 px-4 rounded font-medium ${isLoading || readableProfits <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#094D34]'} transition`}
          >
            {isLoading ? 'Processing...' : (tabIdx !== null ? TABS[tabIdx].buttonLabel : 'Select')}
          </button>)}


        </form>

        {/* Overlay: show loader while dispatch is in-flight, or show requestStatus when available */}
        {(isLoading || (currentOperation && currentOperation.requestStatus)) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
            {!isLoading && (
              <button
                onClick={() => {
                  // dispatch the configured clear action for the active tab where available
                  if (currentTab && currentTab.clearAction) {
                    dispatch(currentTab.clearAction());
                  } else {
                    dispatch(clearCurrentTransaction());
                  }
                }}
                className="absolute top-4 right-4 p-2 rounded hover:bg-gray-200 transition"
                title="Close overlay"
                type="button"
              >
                <XMarkIcon className="w-6 h-6 text-[#0a4226]" />
              </button>
            )}
            {isLoading ? (
              <>
                <div className="w-12 h-12 border-4 border-t-4 border-t-[#0a4226] border-gray-200 rounded-full animate-spin mb-3" />
                <div className="text-[#0a4226] font-semibold">Processing transaction...</div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-lg font-semibold text-[#0a4226] mb-2">Transaction Status</div>
                <div className="font-mono text-sm">Request ID: {currentOperation.requestId}</div>
                <div className="mt-2 text-sm">Status: <span className="font-mono">{currentOperation.requestStatus}</span></div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
