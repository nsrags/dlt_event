import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTokens, fetchTokens, fetchExchangeRate, selectExchangeRate } from '../../store/walletSlice';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export default function WalletBalance() {
  const dispatch = useDispatch();
  const tokens = useSelector(selectTokens);
   const exchangeRate = useSelector(selectExchangeRate);
  
  console.log(tokens);
  // Helper to truncate addresses for display
  const truncate = (s, start = 6, end = 4) => {
    if (!s) return '';
    if (s.length <= start + end + 3) return s;
    return `${s.slice(0, start)}...${s.slice(-end)}`;
  };

  

  useEffect(() => {
    dispatch(fetchTokens());
    dispatch(fetchExchangeRate());
    // Refresh balance every 30 seconds
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
      <div className="mt-4 text-white text-sm">
        Exchange Rate: {exchangeRate !== null ? exchangeRate.result : 'Loading...'}
      </div>  

      {/* Brand image */}
      {/* <div className="mt-4">
        <img src={LBG_Test} alt="LBG Test" className="mx-auto w-24 h-auto" />
      </div> */}

      {/* {isLoading ? (
        <p className="text-2xl font-bold animate-pulse">Loading...</p>
      ) : (
        <p className="text-2xl font-bold">{(balance || 0).toFixed(4)}</p>

      )} */}
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
