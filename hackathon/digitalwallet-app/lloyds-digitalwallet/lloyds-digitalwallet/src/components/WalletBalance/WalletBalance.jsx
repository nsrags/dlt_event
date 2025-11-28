import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTokens, fetchTokens, fetchExchangeRate, selectExchangeRate, selectMintedContractInfo } from '../../store/walletSlice';
import { DocumentDuplicateIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

export default function WalletBalance() {
  const dispatch = useDispatch();
  const tokens = useSelector(selectTokens);
   const exchangeRate = useSelector(selectExchangeRate);
   const mintedContractInfo = useSelector(selectMintedContractInfo);
   console.log('Minted Contract Info:', mintedContractInfo);
  
  // Helper to truncate addresses for display
  const truncate = (s, start = 6, end = 4) => {
    if (!s) return '';
    if (s.length <= start + end + 3) return s;
    return `${s.slice(0, start)}...${s.slice(-end)}`;
  };

  

  useEffect(() => {
    dispatch(fetchTokens());
    dispatch(fetchExchangeRate());
    // Refresh balance every 60 seconds (increased from 20s to reduce API load)
    const interval = setInterval(() => {
      dispatch(fetchTokens());
      dispatch(fetchExchangeRate());
    }, 20000);
    
    return () => clearInterval(interval);
  }, [dispatch]);
 
  return (
  <section className="bg-[#0a4226] text-white rounded shadow-md p-6 text-center w-full max-w-md mx-auto">
      <h2 className="text-base font-semibold mb-2">Wallet Details</h2>
      <div className="flex items-center justify-center gap-2 mb-4">
        <p className="text-sm font-mono text-gray-300">{truncate(import.meta.env.VITE_WALLET_ADDRESS || '', 10, 8)}</p>
        <button
          onClick={() => {
            const addr = import.meta.env.VITE_WALLET_ADDRESS;
            if (addr) {
              navigator.clipboard.writeText(addr);
              alert('Address copied!');
            }
          }}
          className="p-1 hover:bg-white/20 rounded transition"
          title="Copy address"
        >
           <DocumentDuplicateIcon className="w-4 h-4 text-[#FFFFFF]" />

        </button>
      </div>

      {/* Exchange Rate Section - Beautified */}
      <div className="mt-6 mb-4 relative">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-5">
          {/* <div className="flex items-center justify-center gap-2 mb-3">
            <ArrowsRightLeftIcon className="w-5 h-5 text-emerald-300" />
            <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">Exchange Rate</h3>
          </div> */}
          
          {exchangeRate !== null ? (
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">1</div>
                <div className="text-xs text-gray-300 mt-1">MMF Token</div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-emerald-300 text-lg">=</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-300">
                  {parseFloat(exchangeRate.result / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {mintedContractInfo?.contractName || 'Token'} {mintedContractInfo?.contractName ? 'Tokens' : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-5 h-5 border-2 border-t-2 border-t-emerald-300 border-white/30 rounded-full animate-spin"></div>
              <span className="text-sm text-gray-300">Loading exchange rate...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tokens list (loaded from fetchTokens) */}
      {tokens && (() => {
        // New structure: tokens is an array of { contractAddress, contractName, tokens }
        if (!Array.isArray(tokens) || tokens.length === 0) return null;

        return (
          <div className="mt-4 w-[90%] m-auto text-left">
            <label className="block text-sm text-white/90 mb-2 text-center">Token Holdings</label>
            <ul className="space-y-3">
              {tokens.map((contractData) => {
                const { contractAddress, contractName, tokens: tokenDataArray, error } = contractData;
                
                // Handle error case
                if (error) {
                  return (
                    <li key={contractAddress} className="bg-white/5 p-3 rounded border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-red-300">{contractName || 'Unknown Contract'}</div>
                        <div className="text-xs text-red-400">Error loading</div>
                      </div>
                    </li>
                  );
                }
                
                // tokenDataArray is an array of token responses
                if (!Array.isArray(tokenDataArray) || tokenDataArray.length === 0) {
                  return (
                    <li key={contractAddress} className="bg-white/5 p-3 rounded border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-sm">{contractName || 'Unknown Contract'}</div>
                          <div className="text-xs text-gray-400 font-mono">{truncate(contractAddress, 6, 4)}</div>
                        </div>
                        <div className="text-sm text-gray-400">No tokens</div>
                      </div>
                    </li>
                  );
                }
                
                // Loop through each token in the array
                return tokenDataArray.map((tokenItem, idx) => {
                  const tokenContractAddress = tokenItem.contractaddress || tokenItem.contractAddress || '';
                  const raw = tokenItem.data?.result;
                  const isRateLimited = typeof raw === 'string' && raw.includes('Max calls per sec rate limit reached');
                  
                  let readable = 0;
                  if (!isRateLimited) {
                    const balanceStr = raw !== undefined ? String(raw) : '';
                    const parsed = balanceStr && !Number.isNaN(Number(balanceStr)) ? Number(balanceStr) : 0;
                    readable = parsed / 1e18;
                  }
                  
                  return (
                    <li key={`${contractAddress}-${tokenContractAddress}-${idx}`} className="bg-white/5 p-3 rounded border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-sm">{contractName || 'Unknown Contract'}</div>
                          <div className="text-xs text-gray-400 font-mono">{truncate(tokenContractAddress, 6, 4)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isRateLimited ? (
                            <div className="w-4 h-4 border-2 border-t-2 border-t-white border-white/30 rounded-full animate-spin" title="Loading..."></div>
                          ) : (
                            <div className="text-sm font-semibold">{parseFloat(readable || 0).toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                });
              })}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}
