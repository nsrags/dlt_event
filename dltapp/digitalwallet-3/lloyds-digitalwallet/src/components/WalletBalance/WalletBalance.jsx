import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTokens, fetchTokens, fetchExchangeRate, selectExchangeRate} from '../../store/walletSlice';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { contractMap } from '../../config/contractMap';

export default function WalletBalance() {
  const dispatch = useDispatch();
  const tokens = useSelector(selectTokens);
   const exchangeRate = useSelector(selectExchangeRate);
   console.log(exchangeRate);
  

  // Helper to truncate addresses for display
  const truncate = (s, start = 6, end = 4) => {
    if (!s) return '';
    if (s.length <= start + end + 3) return s;
    return `${s.slice(0, start)}...${s.slice(-end)}`;
  };

  

  useEffect(() => {
    // dispatch(fetchBalance());
    // also fetch tokens on mount
    dispatch(fetchTokens());
    dispatch(fetchExchangeRate());
    // Refresh balance every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchTokens());
      dispatch(fetchExchangeRate());
    }, 20000);
    
    return () => clearInterval(interval);
  }, [dispatch]);
 
  console.log(tokens);
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
        const tokenArray = Array.isArray(tokens) ? tokens : (tokens.results || tokens);
        if (!Array.isArray(tokenArray) || tokenArray.length === 0) return null;

        const items = tokenArray.map((t) => {
          const addr = (t.contractaddress || t.contractAddress || '').toString();
          const raw = t.data?.result;
          
          // Check if rate limited
          const isRateLimited = typeof raw === 'string' && raw.includes('Max calls per sec rate limit reached');
          
          let readable = 0;
          let balanceStr = '';
          
          if (isRateLimited) {
            // Signal that this token is rate limited
            balanceStr = 'RATE_LIMITED';
            readable = null;
          } else {
            balanceStr = raw !== undefined ? String(raw) : '';
            // Parse balance string safely (Etherscan returns decimal strings in wei)
            const parsed = balanceStr && !Number.isNaN(Number(balanceStr)) ? Number(balanceStr) : 0;
            // Convert wei -> token units (18 decimals)
            readable = parsed / 1e18;
          }
          
          const name = contractMap[addr] || addr;
          return { addr, name, balanceStr, readable, isRateLimited };
        });

        return (
          <div className="mt-4 w-[90%] m-auto text-left">
            <label className="block text-sm text-white/90 mb-2 text-center">Token Holdings</label>
            <ul className="space-y-2">
              {items.map(it => (
                <li key={it.addr} className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                  <div className="flex items-center gap-3">
                     {/* <img src={LBG_Test} alt="LBG Test" className="mx-auto w-14 h-auto" /> */}
                    <div className="font-medium text-sm">{it.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {it.isRateLimited ? (
                      <div className="w-4 h-4 border-2 border-t-2 border-t-white border-white/30 rounded-full animate-spin" title="Loading..."></div>
                    ) : (
                      <div className="text-sm font-semibold">{parseFloat(it.readable || 0).toFixed(2)}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}
