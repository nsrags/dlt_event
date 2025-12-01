import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header/Header.jsx';
import WalletBalance from '../WalletBalance/WalletBalance.jsx';
import ContractsTable from '../ContractsTable/ContractsTable.jsx';
import TransactionsTable from '../TransactionsTable/TransactionsTable.jsx';
import { 
  CheckCircleIcon, 
  DocumentDuplicateIcon, 
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { XMarkIcon, CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { multiplyTokenAmount, getCurrentProfits } from '../../utils';
import { walletAPI } from '../../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { sendTransaction, fetchTransactions, selectTransactions, selectFetchTransactionsLoading } from '../../store/transactionSlice';
import { selectContracts , selectContractAddress, selectSwapContractAddress} from '../../store/contractsSlice';
import { 
  mintTokens, 
  buyTokens,
  redeemTokens,
  fetchBalance,
  fetchTokens,
  selectMintTokensLoading, 
  selectMintTokensError, 
  selectCurrentMintOperation,
  clearCurrentMintOperation,
  selectBuyTokensLoading,
  selectBuyTokensError,
  selectCurrentBuyOperation,
  clearCurrentBuyOperation,
  selectRedeemTokensLoading,
  selectRedeemTokensError,
  selectCurrentRedeemOperation,
  clearCurrentRedeemOperation,
  selectMintedContractAddress,
  selectMintedContractInfo,
  setMintedContractInfo,
  selectBalance,
  selectTokens
} from '../../store/walletSlice';

const steps = [
  { id: 1, name: 'Deploy Contract', icon: DocumentDuplicateIcon },
  { id: 2, name: 'Mint Token', icon: CurrencyDollarIcon },
  { id: 3, name: 'Swap Token Contract', icon: ArrowsRightLeftIcon },
  { id: 4, name: 'Buy MMF', icon: ShoppingCartIcon },
  { id: 5, name: 'Sell MMF', icon: BanknotesIcon },
  { id: 6, name: 'Trading', icon: ChartBarIcon },
  { id: 7, name: 'Transfer', icon: PaperAirplaneIcon }
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tab, setTab] = useState(0);
 const contractAddress = useSelector(selectContractAddress);
 const swapContractAddressFromRedux = useSelector(selectSwapContractAddress);
 
 // Use swap contract address from Redux if available, otherwise fall back to env variable
 const swapContractAddress = swapContractAddressFromRedux;

  // Form states for each step
  const [mintForm, setMintForm] = useState({ contractAddress: '', amount: '' });
  const [swapForm, setSwapForm] = useState({ contractAddress: '' });
  const [buyForm, setBuyForm] = useState({ swapContractAddress: '', amount: '' });
  const [redeemForm, setRedeemForm] = useState({ swapContractAddress: '', amount: '' });
  const [transferForm, setTransferForm] = useState({ contractAddress: '' });
  const [tradingForm, setTradingForm] = useState({ swapContractAddress: '', unit: '' });
  const [tradingSuccessMessage, setTradingSuccessMessage] = useState("");
  
  // Completion states for each step
  const [buyCompleted, setBuyCompleted] = useState(false);
  const [redeemCompleted, setRedeemCompleted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  
  // Transfer modal states
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null);
  
  // Trading timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tradeError, setTradeError] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectFetchTransactionsLoading);
  const contracts = useSelector(selectContracts);
  
  // Mint selectors
  const mintLoading = useSelector(selectMintTokensLoading);
  const mintError = useSelector(selectMintTokensError);
  const mintOperation = useSelector(selectCurrentMintOperation);
  const mintedContractAddress = useSelector(selectMintedContractAddress);
  const mintedContractInfo = useSelector(selectMintedContractInfo);
  
  // Buy selectors
  const buyLoading = useSelector(selectBuyTokensLoading);
  const buyError = useSelector(selectBuyTokensError);
  const buyOperation = useSelector(selectCurrentBuyOperation);
  
  // Redeem selectors
  const redeemLoading = useSelector(selectRedeemTokensLoading);
  const redeemError = useSelector(selectRedeemTokensError);
  const redeemOperation = useSelector(selectCurrentRedeemOperation);
  
  // Balance and tokens selectors
  const balance = useSelector(selectBalance);
  const tokens = useSelector(selectTokens);
  
  // State to track initial values for profit calculation
  const [initialBalance, setInitialBalance] = useState(null);
  const [initialTokens, setInitialTokens] = useState(null);
  

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchBalance());
    dispatch(fetchTokens());
  }, [dispatch, mintedContractAddress]);
  
  // Store initial balance when component mounts or step 1 starts
  useEffect(() => {
    if (currentStep === 1 && initialBalance === null) {
      setInitialBalance(balance);
      setInitialTokens(tokens);
    }
  }, [currentStep, balance, tokens, initialBalance]);
  
  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      const maxTimerSeconds = parseInt(import.meta.env.VITE_MAX_TIMER_SECONDS) || 600;
      interval = setInterval(() => {
        setElapsedTime(prev => {
          // Stop timer at max timer value
          if (prev >= maxTimerSeconds) {
            setIsTimerRunning(false);
            return maxTimerSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);
  
  // Stop timer when switching away from trading step (step 6)
  useEffect(() => {
    if (currentStep !== 6 && isTimerRunning) {
      console.log('Switching away from trading step, stopping timer...');
      stopTimer();
    }
  }, [currentStep, isTimerRunning]);
  
  // Interval function trigger effect
  useEffect(() => {
    let intervalTrigger;
    if (isTimerRunning) {
      const intervalSeconds = parseInt(import.meta.env.VITE_TIMER_INTERVAL_SECONDS) || 30;
      
      console.log('Setting up interval trigger with interval:', intervalSeconds, 'seconds');
      console.log('Initial check - unit:', tradingForm.unit, 'swapContractAddress:', swapContractAddress);
      
      intervalTrigger = setInterval(() => {
        console.log('Interval triggered!');
        console.log('Current unit:', tradingForm.unit);
        console.log('Current swapContractAddress:', swapContractAddress);
        
        // Execute trade if unit is provided
        if (tradingForm.unit && swapContractAddress) {
          console.log('Conditions met, executing trade...');
          const executeTrade = async () => {
            try {
              setTradeError(null); // Clear previous errors
              
              // Validate inputs before making API call
              if (!tradingForm.unit || isNaN(tradingForm.unit) || Number(tradingForm.unit) <= 0) {
                throw new Error('Invalid unit value. Please enter a valid number greater than 0.');
              }
              
              if (!swapContractAddress || typeof swapContractAddress !== 'string') {
                throw new Error('Invalid swap contract address.');
              }
              
              const amount = multiplyTokenAmount(tradingForm.unit);
              console.log('Executing trade with swapContractAddress:', swapContractAddress, 'and amount:', amount);
              
              const response = await walletAPI.executeTrade({
                swapContractAddress: swapContractAddress,
                amount: amount
              });
              console.log('Trade executed successfully:', response.data);

              if(response.data && response.data.requestStatus) {
                const status = String(response.data.requestStatus).toUpperCase();
                const timestamp = new Date().toLocaleTimeString();
                
                if (status === 'SUCCESS') {
                  setTradingSuccessMessage(`Trade executed successfully at ${timestamp}`);
                  setTradeHistory(prev => [...prev, {
                    id: Date.now(),
                    time: timestamp,
                    status: 'success',
                    message: `Trade executed successfully`,
                    requestId: response.data.requestId,
                    tradeStatus: response.data.tradeStatus,
                    amount: tradingForm.unit
                  }]);
                } else if (status === 'FAILURE') {
                  const errorMsg = response.data.errorMessage || 'Unknown error';
                  setIsTimerRunning(false);
                  setTradeError('Trade execution failed: ' + errorMsg);
                  setTradeHistory(prev => [...prev, {
                    id: Date.now(),
                    time: timestamp,
                    status: 'failure',
                    message: `Trade failed: ${errorMsg}`,
                    requestId: response.data.requestId,
                    tradeStatus: response.data.tradeStatus,
                    amount: tradingForm.unit
                  }]);
                }
              }
            } catch (error) {
              console.error('Trade execution failed:', error);
              let errorMessage = 'Failed to execute trade';
              
              // Safely extract error message
              try {
                if (error.response && error.response.data) {
                  if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                  } else if (error.response.data.error) {
                    errorMessage = String(error.response.data.error);
                  } else if (error.response.data.message) {
                    errorMessage = String(error.response.data.message);
                  }
                } else if (error.message) {
                  errorMessage = String(error.message);
                }
              } catch (parseError) {
                console.error('Error parsing error message:', parseError);
                errorMessage = 'An unexpected error occurred during trade execution';
              }
              
              setTradeError(errorMessage);
              
              // Add to trade history
              setTradeHistory(prev => [...prev, {
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                status: 'error',
                message: errorMessage,
                amount: tradingForm.unit
              }]);
              
              // Stop the timer when error occurs
              setIsTimerRunning(false);
            }
          };
          executeTrade().catch(err => {
            console.error('Uncaught error in executeTrade:', err);
            setTradeError('An unexpected error occurred');
            setIsTimerRunning(false);
          });
        } else {
          console.log('Conditions NOT met for trade execution');
          console.log('- unit present:', !!tradingForm.unit);
          console.log('- swapContractAddress present:', !!swapContractAddress);
        }
      }, intervalSeconds * 1000);
    }
    return () => {
      if (intervalTrigger) {
        console.log('Cleaning up interval trigger');
        clearInterval(intervalTrigger);
      }
    };
  }, [isTimerRunning, tradingForm.unit, swapContractAddress]);
  
  // Timer control functions
  const startTimer = () => {
    // Validate unit is within limit
    const unitValue = parseFloat(tradingForm.unit);
    if (unitValue > 20) {
      alert('Unit cannot exceed 20');
      return;
    }
    if (!unitValue || unitValue <= 0) {
      alert('Please enter a valid unit value');
      return;
    }
    
    setTradeError(null); // Clear any previous errors when starting
    setTradingSuccessMessage(''); // Clear any previous success messages
    setIsTimerRunning(true);
  };
  
  const stopTimer = () => {
    setIsTimerRunning(false);
  };
  
  // Format elapsed time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper function to check if 100 units have been minted for a contract address
  const hasReachedMintLimit = (contractAddress) => {
    if (!contractAddress || !tokens || !Array.isArray(tokens)) return false;
    
    // Find the token data for the given contract address
    const contractData = tokens.find(t => t.contractAddress === contractAddress);
    if (!contractData || !contractData.tokens || !Array.isArray(contractData.tokens)) return false;
    
    // Get the balance from the first token item (API returns array with single balance)
    const tokenItem = contractData.tokens[0];
    if (!tokenItem || !tokenItem.data) return false;
    
    const raw = tokenItem.data.result;
    const isRateLimited = typeof raw === 'string' && raw.includes('Max calls per sec rate limit reached');
    
    if (isRateLimited) return false; // Can't determine, allow mint
    
    // Convert balance from wei to readable units
    const balanceStr = raw !== undefined ? String(raw) : '';
    const parsed = balanceStr && !Number.isNaN(Number(balanceStr)) ? Number(balanceStr) : 0;
    const readable = parsed / 1e18;
    
    // Check if balance is >= 100 units
    return readable >= 100;
  };

  // Form handlers
  const handleMintFormChange = (e) => {
    const { name, value } = e.target;
    setMintForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMintSubmit = async (e) => {
    e.preventDefault();
    if (!mintForm.contractAddress || !mintForm.amount) return;

    // Validate amount is within limit
    const amount = parseFloat(mintForm.amount);
    if (amount > 100) {
      alert('Amount cannot exceed 100 units');
      return;
    }

    try {
      // Store contract address in Redux store for fetchTokens
      // dispatch(setMintedContractAddress(mintForm.contractAddress));
      
      // Find the contract name from the contracts list
      const contract = contracts.find(c => c.contractAddress === mintForm.contractAddress);
      const contractName = contract?.comments || contract?.name || contract?.contractName;
      
     // Store both contract address and name mapping
      dispatch(setMintedContractInfo({
        contractAddress: mintForm.contractAddress,
        contractName: contractName
      }));
      
      const payload = {
        contractAddress: mintForm.contractAddress,
        amount: multiplyTokenAmount(mintForm.amount),
        contractName: contractName
      };
      await dispatch(mintTokens(payload)).unwrap();
      // Modal will stay open until user clicks Continue
      setMintForm({ contractAddress: '', amount: '' });
    } catch (error) {
      console.error('Mint failed:', error);
    }
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!buyForm.amount || !buyForm.swapContractAddress) return;

    try {
      const payload = {
        swapContractAddress: buyForm.swapContractAddress,
        amount: multiplyTokenAmount(buyForm.amount)
      };
      await dispatch(buyTokens(payload)).unwrap();
      setBuyCompleted(true);
      // Modal will stay open until user clicks Continue
      setBuyForm({ swapContractAddress: '', amount: '' });
    } catch (error) {
      console.error('Buy failed:', error);
    }
  };

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!redeemForm.amount || !redeemForm.swapContractAddress) return;

    try {
      const payload = {
        swapContractAddress: redeemForm.swapContractAddress,
        amount: multiplyTokenAmount(redeemForm.amount)
      };
      await dispatch(redeemTokens(payload)).unwrap();
      setRedeemCompleted(true);
      // Modal will stay open until user clicks Continue
      setRedeemForm({ swapContractAddress: '', amount: '' });
    } catch (error) {
      console.error('Redeem failed:', error);
    }
  };

  const handleTransferSubmit = async (e, profitAmount) => {
    e.preventDefault();
    if (profitAmount === null || profitAmount === undefined || !transferForm.contractAddress) return;
    
    setTransferLoading(true);
    setTransferError(null);
    setTransferSuccess(null);
    
    try {
      // Send profitAmount and contract address to transfer API
      const transactionData = {
        amount: multiplyTokenAmount(profitAmount),
        contractAddress: transferForm.contractAddress
      };
      const result = await dispatch(sendTransaction(transactionData)).unwrap();
      setTransferCompleted(true);
      setTransferSuccess(result);
      setTransferForm({ contractAddress: '' });
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferError(error.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0a4226]">Deploy Smart Contract</h3>
            <p className="text-sm text-gray-600">Navigate to deploy your own contract.</p>
            <button
              onClick={() => navigate('/deploy-contract?type=plain')}
              className="w-full bg-[#0a4226] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#0a4226]/90 transition-colors"
            >
              Go to Deploy Contract
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-semibold text-[#0a4226]">Mint Tokens</h3>
            <form onSubmit={handleMintSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Contract Address</label>
                <input
                  type="text"
                  name="contractAddress"
                  value={mintForm.contractAddress}
                  onChange={handleMintFormChange}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={mintLoading}
                  required
                />
              </div>
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
                <input
                  type="text"
                  name="address"
                  value={mintForm.address}
                  onChange={handleMintFormChange}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={mintLoading}
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Amount (Max: 100 units)</label>
                <input
                  type="number"
                  name="amount"
                  value={mintForm.amount}
                  onChange={handleMintFormChange}
                  max="100"
                  min="0"
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={mintLoading}
                  required
                />
                {mintForm.amount && parseFloat(mintForm.amount) > 100 && (
                  <p className="text-red-600 text-xs mt-1">Amount cannot exceed 100 units</p>
                )}
              </div>
              {mintError && !mintLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {typeof mintError === 'string' ? mintError : mintError.error || 'Failed to mint tokens'}
                </div>
              )}
              {mintForm.contractAddress && hasReachedMintLimit(mintForm.contractAddress) && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">
                  ⚠️ This contract has already reached the 100 unit mint limit
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-[#0a4226] text-white px-4 py-2 rounded-md hover:bg-[#0a4226]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  mintLoading || 
                  !mintForm.contractAddress || 
                  !mintForm.amount || 
                  (mintForm.amount && parseFloat(mintForm.amount) > 100) ||
                  hasReachedMintLimit(mintForm.contractAddress)
                }
              >
                {mintLoading ? 'Processing...' : 'Mint Tokens'}
              </button>
            </form>
            
            {/* Overlay: show loader while dispatch is in-flight, or show requestStatus when available */}
            {(mintLoading || mintOperation || mintError) && (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-lg w-full border border-gray-200 transform transition-all duration-300 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button - Only show when not loading */}
                  {!mintLoading && (
                    <button
                      onClick={() => {
                        dispatch(clearCurrentMintOperation());
                      }}
                      className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 group"
                      title="Close"
                      type="button"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                    </button>
                  )}
                  
                  {/* Loading State */}
                  {mintLoading && !mintError && (
                    <div className="text-center py-6">
                      <div className="relative inline-flex mb-8">
                        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-t-[#0a4226] border-r-[#0a4226] rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Minting Tokens</h3>
                      <p className="text-gray-600">Please wait while we process your mint request...</p>
                      <div className="mt-6 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {mintError && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50">
                        <ExclamationCircleIcon className="w-12 h-12 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Mint Failed</h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                        <p className="text-red-800 text-sm font-medium">{mintError}</p>
                      </div>
                      <button
                        onClick={() => dispatch(clearCurrentMintOperation())}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {!mintLoading && !mintError && mintOperation && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-100 shadow-lg">
                        <CheckCircleIconSolid className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Mint Successful!</h3>
                      <p className="text-gray-600 mb-6">Your tokens have been minted successfully</p>
                      
                      {/* Handle mint response with request1/request2 structure */}
                      {mintOperation.request1 && mintOperation.request2 ? (
                        <div className="space-y-3 mb-4">
                          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 text-left shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet Mint</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                {mintOperation.request1.requestStatus}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-gray-700 break-all bg-white px-2 py-1.5 rounded border border-gray-100">
                              {mintOperation.request1.requestId}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 text-left shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MMF Wallet Mint</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                {mintOperation.request2.requestStatus}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-gray-700 break-all bg-white px-2 py-1.5 rounded border border-gray-100">
                              {mintOperation.request2.requestId}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 mb-4 text-left shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request ID</span>
                            {mintOperation.requestStatus && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                {mintOperation.requestStatus}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-sm text-gray-800 break-all bg-white px-3 py-2 rounded-lg border border-gray-100">
                            {mintOperation.requestId || JSON.stringify(mintOperation)}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          dispatch(clearCurrentMintOperation());
                          setCurrentStep(3); // Move to next step after successful mint
                        }}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#0a4226] to-[#0d5530] hover:from-[#0d5530] hover:to-[#0a4226] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0a4226]">Deploy Swap Token Contract</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Contract Address</label>
                <input
                  type="text"
                  name="contractAddress"
                  value={swapForm.contractAddress}
                  onChange={(e) => setSwapForm({ contractAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226] text-sm"
                />
              </div>
              <button
                onClick={() => navigate(`/deploy-contract?type=swap&swapContractAddress=${swapForm.contractAddress}`)}
                disabled={!swapForm.contractAddress}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                  !swapForm.contractAddress
                    ? 'bg-[#0a4226] text-white opacity-50 cursor-not-allowed'
                    : 'bg-[#0a4226] text-white hover:bg-[#0a4226]/90 cursor-pointer'
                }`}
              >
                Go to Deploy Contract
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-semibold text-[#0a4226]">Buy MMF Tokens</h3>
            <form onSubmit={handleBuySubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Swap Contract Address</label>
                <input
                  type="text"
                  value={buyForm.swapContractAddress}
                  onChange={(e) => setBuyForm(prev => ({ ...prev, swapContractAddress: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={buyLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Unit</label>
                <input
                  type="number"
                  value={buyForm.amount}
                  onChange={(e) => setBuyForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.0"
                  step="0.000001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={buyLoading}
                  required
                />
              </div>
              {buyError && !buyLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {typeof buyError === 'string' ? buyError : buyError.error || 'Failed to buy tokens'}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-[#0a4226] text-white px-4 py-2 rounded-md hover:bg-[#0a4226]/90 transition-colors disabled:opacity-50"
                disabled={buyLoading}
              >
                {buyLoading ? 'Processing...' : 'Buy MMF'}
              </button>
            </form>
            
            {/* Overlay: show loader while dispatch is in-flight, or show requestStatus when available */}
            {(buyLoading || buyOperation || buyError) && (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-lg w-full border border-gray-200 transform transition-all duration-300 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button - Only show when not loading */}
                  {!buyLoading && (
                    <button
                      onClick={() => {
                        dispatch(clearCurrentBuyOperation());
                      }}
                      className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 group"
                      title="Close"
                      type="button"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                    </button>
                  )}
                  
                  {/* Loading State */}
                  {buyLoading && !buyError && (
                    <div className="text-center py-6">
                      <div className="relative inline-flex mb-8">
                        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-t-[#0a4226] border-r-[#0a4226] rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Processing Purchase</h3>
                      <p className="text-gray-600">Please wait while we buy your MMF tokens...</p>
                      <div className="mt-6 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {buyError && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50">
                        <ExclamationCircleIcon className="w-12 h-12 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Purchase Failed</h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                        <p className="text-red-800 text-sm font-medium">{buyError}</p>
                      </div>
                      <button
                        onClick={() => dispatch(clearCurrentBuyOperation())}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {!buyLoading && !buyError && buyOperation && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-100 shadow-lg">
                        <CheckCircleIconSolid className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Purchase Successful!</h3>
                      <p className="text-gray-600 mb-6">Your MMF tokens have been purchased successfully</p>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 mb-4 text-left shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request ID</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                            {buyOperation.requestStatus}
                          </span>
                        </div>
                        <p className="font-mono text-sm text-gray-800 break-all bg-white px-3 py-2 rounded-lg border border-gray-100">
                          {buyOperation.requestId}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => dispatch(clearCurrentBuyOperation())}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#0a4226] to-[#0d5530] hover:from-[#0d5530] hover:to-[#0a4226] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-semibold text-[#0a4226]">Sell MMF Tokens</h3>
            <form onSubmit={handleRedeemSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Swap Contract Address</label>
                <input
                  type="text"
                  value={redeemForm.swapContractAddress}
                  onChange={(e) => setRedeemForm(prev => ({ ...prev, swapContractAddress: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={redeemLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Unit</label>
                <input
                  type="number"
                  value={redeemForm.amount}
                  onChange={(e) => setRedeemForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.0"
                  step="0.000001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={redeemLoading}
                  required
                />
              </div>
              {redeemError && !redeemLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {typeof redeemError === 'string' ? redeemError : redeemError.error || 'Failed to redeem tokens'}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-[#0a4226] text-white px-4 py-2 rounded-md hover:bg-[#0a4226]/90 transition-colors disabled:opacity-50"
                disabled={redeemLoading}
              >
                {redeemLoading ? 'Processing...' : 'Sell MMF'}
              </button>
            </form>
            
            {/* Overlay: show loader while dispatch is in-flight, or show requestStatus when available */}
            {(redeemLoading || redeemOperation || redeemError) && (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-lg w-full border border-gray-200 transform transition-all duration-300 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button - Only show when not loading */}
                  {!redeemLoading && (
                    <button
                      onClick={() => {
                        dispatch(clearCurrentRedeemOperation());
                      }}
                      className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 group"
                      title="Close"
                      type="button"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                    </button>
                  )}
                  
                  {/* Loading State */}
                  {redeemLoading && !redeemError && (
                    <div className="text-center py-6">
                      <div className="relative inline-flex mb-8">
                        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-t-[#0a4226] border-r-[#0a4226] rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Processing Sale</h3>
                      <p className="text-gray-600">Please wait while we sell your MMF tokens...</p>
                      <div className="mt-6 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {redeemError && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50">
                        <ExclamationCircleIcon className="w-12 h-12 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Sale Failed</h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                        <p className="text-red-800 text-sm font-medium">{redeemError}</p>
                      </div>
                      <button
                        onClick={() => dispatch(clearCurrentRedeemOperation())}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {!redeemLoading && !redeemError && redeemOperation && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-100 shadow-lg">
                        <CheckCircleIconSolid className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Sale Successful!</h3>
                      <p className="text-gray-600 mb-6">Your MMF tokens have been sold successfully</p>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 mb-4 text-left shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request ID</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                            {redeemOperation.requestStatus}
                          </span>
                        </div>
                        <p className="font-mono text-sm text-gray-800 break-all bg-white px-3 py-2 rounded-lg border border-gray-100">
                          {redeemOperation.requestId}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => dispatch(clearCurrentRedeemOperation())}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#0a4226] to-[#0d5530] hover:from-[#0d5530] hover:to-[#0a4226] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0a4226]">Trading</h3>
            <p className="text-sm text-gray-600">Execute trading operations here.</p>
            
            {/* Important Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Note:</span> Please make sure you've implemented <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">executeTrade</code> functionality as part of Token Swapper Contract Implementation
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#0a4226]/5 to-emerald-50 border-2 border-[#0a4226]/20 px-4 py-8 rounded-lg">
              <div className="text-lg font-semibold text-[#0a4226] mb-6">Trading Dashboard</div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side - Trading controls */}
                <div className="lg:col-span-2 space-y-6">
              
              {/* Trading Form */}
              <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Unit (Max: 20)</label>
                  <input
                    type="number"
                    value={tradingForm.unit}
                    onChange={(e) => setTradingForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="0.0"
                    step="0.000001"
                    min="0"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                    disabled={isTimerRunning}
                  />
                </div>
                {tradingForm.unit && parseFloat(tradingForm.unit) > 20 && (
                  <p className="text-xs text-red-600 text-left font-semibold">
                    Unit exceeds maximum limit of 20
                  </p>
                )}
                <p className="text-xs text-gray-500 text-left">
                  {isTimerRunning ? 'Unit cannot be changed while trading is active' : 'Set unit value before starting trading'}
                </p>
                {tradingSuccessMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                    <div className="font-semibold mb-1">Trade Execution Success</div>
                    <div className="break-words">{tradingSuccessMessage}</div>
                  </div>
                )}
                {/* Error Message Display */}
                {tradeError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    <div className="font-semibold mb-1">Trade Execution Failed</div>
                    <div className="break-words">{String(tradeError)}</div>
                  </div>
                )}
              </div>
              
              {/* Timer Display */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-5xl font-mono font-bold text-[#0a4226] mb-6 text-center">
                  {formatTime(elapsedTime)}
                </div>
                
                {/* Timer Control Buttons */}
                <div className="flex gap-3 justify-center">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      disabled={!tradingForm.unit || parseFloat(tradingForm.unit) <= 0 || parseFloat(tradingForm.unit) > 20}
                      className="px-6 py-2 bg-[#0a4226] text-white rounded-md hover:bg-[#0a4226]/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Trading
                    </button>
                  ) : (
                    <button
                      onClick={stopTimer}
                      className="px-6 py-2 bg-[#0a4226] text-white rounded-md hover:bg-[#0a4226]/90 transition-colors font-semibold"
                    >
                      Stop Trading
                    </button>
                  )}
                </div>
              </div>
                </div>
                
                {/* Right side - Trade History */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg p-4 shadow-sm h-full">
                    <h4 className="text-sm font-semibold text-[#0a4226] mb-3 flex items-center justify-between">
                      <span>Trade History</span>
                      <span className="text-xs text-gray-500">({tradeHistory.length} trades)</span>
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {tradeHistory.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No trades executed yet</p>
                      ) : (
                        tradeHistory.slice().reverse().map((trade) => (
                          <div
                            key={trade.id}
                            className={`p-3 rounded border text-xs ${
                              trade.status === 'success'
                                ? 'bg-green-50 border-green-200'
                                : trade.status === 'failure'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-700">{trade.time}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  trade.status === 'success'
                                    ? 'bg-green-200 text-green-800'
                                    : trade.status === 'failure'
                                    ? 'bg-red-200 text-red-800'
                                    : 'bg-orange-200 text-orange-800'
                                }`}
                              >
                                {trade.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-1">{trade.message}</p>
                            <p className="text-gray-600 mb-1">{trade.tradeStatus}</p>
                            <div className="text-gray-500 text-xs">
                              <div>Unit: {trade.amount}</div>
                              {trade.requestId && <div className="truncate">ID: {trade.requestId}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7: {
        const initialBalance = import.meta.env.VITE_WALLET_INITIAL_BALANCE ? parseFloat(import.meta.env.VITE_WALLET_INITIAL_BALANCE) : 0;
        const profitData = getCurrentProfits(tokens, initialBalance);
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0a4226]">Transfer Tokens & Profit Summary</h3>
            
            {/* Profit Calculation Display */}
            {profitData !== null && profitData !== undefined && (
              <div className={`rounded-lg p-4 ${profitData >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300' : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300'}`}>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-sm ${profitData >= 0 ? 'text-green-700' : 'text-red-700'} mb-2`}>
                      💰 {profitData >= 0 ? 'Profit' : 'Loss'}
                    </div>
                    <div className={`text-5xl font-bold ${profitData >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {profitData >= 0 ? '+' : ''}{profitData}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={(e) => handleTransferSubmit(e, profitData)} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Contract Address</label>
                <input
                  type="text"
                  value={transferForm.contractAddress}
                  onChange={(e) => setTransferForm({ contractAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={profitData === null || profitData === undefined || !transferForm.contractAddress || profitData < 0}
                className="w-full bg-[#0a4226] text-white px-4 py-2 rounded-md hover:bg-[#0a4226]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer Profit
              </button>
            </form>
            {transferCompleted && !transferLoading && !transferSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                All steps completed! 🎉
              </div>
            )}
            
            {/* Transfer Modal */}
            {(transferLoading || transferSuccess || transferError) && (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-lg w-full border border-gray-200 transform transition-all duration-300 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button - Only show when not loading */}
                  {!transferLoading && (
                    <button
                      onClick={() => {
                        setTransferSuccess(null);
                        setTransferError(null);
                      }}
                      className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 group"
                      title="Close"
                      type="button"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                    </button>
                  )}
                  
                  {/* Loading State */}
                  {transferLoading && !transferError && (
                    <div className="text-center py-6">
                      <div className="relative inline-flex mb-8">
                        <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-t-[#0a4226] border-r-[#0a4226] rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Processing Transfer</h3>
                      <p className="text-gray-600">Please wait while we transfer your tokens...</p>
                      <div className="mt-6 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#0a4226] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {transferError && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50">
                        <ExclamationCircleIcon className="w-12 h-12 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Transfer Failed</h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                        <p className="text-red-800 text-sm font-medium">{transferError}</p>
                      </div>
                      <button
                        onClick={() => setTransferError(null)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {!transferLoading && !transferError && transferSuccess && (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-100 shadow-lg">
                        <CheckCircleIconSolid className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h3>
                      <p className="text-gray-600 mb-6">Your tokens have been transferred successfully</p>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 mb-4 text-left shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction Details</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                            Success
                          </span>
                        </div>
                        {transferSuccess.requestId && (
                          <p className="font-mono text-sm text-gray-800 break-all bg-white px-3 py-2 rounded-lg border border-gray-100 mb-2">
                            {transferSuccess.requestId}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">All steps completed! 🎉</p>
                      </div>
                      
                      <button
                        onClick={() => setTransferSuccess(null)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#0a4226] to-[#0d5530] hover:from-[#0d5530] hover:to-[#0a4226] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a4226] font-sans">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded shadow p-6 space-y-6">
          <Header />

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-1 h-auto">
              <WalletBalance />
            </div>
            <div className="md:col-span-2 h-[350px] overflow-hidden">
              <ContractsTable />
            </div>
          </div>

          {/* Stepper */}
          <div className="py-6">
            <nav aria-label="Progress">
              <ol className="flex items-center justify-between">
                {steps.map((step, stepIdx) => {
                  const StepIcon = step.icon;
                  const isComplete = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                    <React.Fragment key={step.id}>
                    <li className="relative flex-1">
                      {stepIdx !== steps.length - 1 && (
                        <div className="absolute top-5 left-1/2 w-full h-0.5 -ml-1">
                          <div className={`h-full ${isComplete ? 'bg-[#0a4226]' : 'bg-gray-200'}`} />
                          {/* Show cycle icon between Buy MMF (step 4) and Sell MMF (step 5) */}
                          {step.id === 4 && (
                            <div className="absolute top-1/2 left-[20%] transform -translate-x-1/2 -translate-y-1/2 bg-white px-1 py-0.5 rounded-full border-2 border-[#0a4226]">
                              <ArrowPathIcon className="w-5 h-5 text-[#0a4226]" /*style={{animation: 'spin 3s linear infinite'}}*/ />
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className="relative flex flex-col items-center group"
                      >
                        <span className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                          isComplete 
                            ? 'bg-[#0a4226] border-[#0a4226]' 
                            : isCurrent 
                            ? 'bg-white border-[#0a4226]' 
                            : 'bg-white border-gray-300'
                        }`}>
                          {isComplete ? (
                            <CheckCircleIcon className="w-6 h-6 text-white" />
                          ) : (
                            <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-[#0a4226]' : 'text-gray-400'}`} />
                          )}
                        </span>
                        <span className={`mt-2 text-xs font-medium text-center ${
                          isCurrent ? 'text-[#0a4226]' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                      </button>
                    </li>
                    </React.Fragment>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Step Content */}
          <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
            <div className={`mx-auto ${currentStep === 6 ? 'w-full max-w-6xl' : 'w-[400px]'}`}>
              {renderStepContent()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
              disabled={
                currentStep === 7 ||
                (currentStep === 4 && !buyCompleted) ||
                (currentStep === 5 && !redeemCompleted)
              }
              className="px-4 py-2 bg-[#0a4226] text-white rounded-md hover:bg-[#0a4226]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 7 ? 'Finish' : 'Next'}
            </button>
          </div>

          {/* Tabs for Contracts and Transactions */}
          {/* <div className="flex flex-col space-y-6 pt-6 border-t">
            <div className="w-full">
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none transition border-b-2 ${
                    tab === 0 ? 'border-[#0a4226] text-[#0a4226] bg-gray-50' : 'border-transparent text-gray-500 hover:text-[#0a4226]'
                  }`}
                  onClick={() => setTab(0)}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                  Contracts
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none transition border-b-2 ${
                    tab === 1 ? 'border-[#0a4226] text-[#0a4226] bg-gray-50' : 'border-transparent text-gray-500 hover:text-[#0a4226]'
                  }`}
                  onClick={() => setTab(1)}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
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
          </div> */}
        </div>
      </main>
    </div>
  );
}
