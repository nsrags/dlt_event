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
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { multiplyTokenAmount, getCurrentProfits } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { sendTransaction, fetchTransactions, selectTransactions, selectFetchTransactionsLoading } from '../../store/transactionSlice';
import { selectContracts } from '../../store/contractsSlice';
import { 
  mintTokens, 
  buyTokens,
  redeemTokens,
  fetchBalance,
  fetchTokens,
  selectMintTokensLoading, 
  selectMintTokensError, 
  selectCurrentMintOperation,
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
  { id: 6, name: 'Transfer', icon: PaperAirplaneIcon }
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tab, setTab] = useState(0);
  
  // Form states for each step
  const [mintForm, setMintForm] = useState({ contractAddress: '', amount: '' });
  const [swapForm, setSwapForm] = useState({ contractAddress: '' });
  const [buyForm, setBuyForm] = useState({ swapContractAddress: '', amount: '' });
  const [redeemForm, setRedeemForm] = useState({ swapContractAddress: '', amount: '' });
  const [transferForm, setTransferForm] = useState({ contractAddress: '' });
  
  // Completion states for each step
  const [buyCompleted, setBuyCompleted] = useState(false);
  const [redeemCompleted, setRedeemCompleted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  
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
  
  console.log(mintedContractInfo);

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchBalance());
    dispatch(fetchTokens());
    console.log('Minted Contract Address from Redux:', mintedContractAddress);
  }, [dispatch, mintedContractAddress]);
  
  // Store initial balance when component mounts or step 1 starts
  useEffect(() => {
    if (currentStep === 1 && initialBalance === null) {
      setInitialBalance(balance);
      setInitialTokens(tokens);
    }
  }, [currentStep, balance, tokens, initialBalance]);

  // Form handlers
  const handleMintFormChange = (e) => {
    const { name, value } = e.target;
    setMintForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMintSubmit = async (e) => {
    e.preventDefault();
    if (!mintForm.contractAddress || !mintForm.amount) return;

    try {
      // Store contract address in Redux store for fetchTokens
      // dispatch(setMintedContractAddress(mintForm.contractAddress));
      
      // Find the contract name from the contracts list
      const contract = contracts.find(c => c.contractAddress === mintForm.contractAddress);
      const contractName = contract?.comments || contract?.name || contract?.contractName;
      console.log(contractName);
      console.log(contract);
      
     // Store both contract address and name mapping
      dispatch(setMintedContractInfo({
        contractAddress: mintForm.contractAddress,
        contractName: contractName
      }));
      
      const payload = {
        contractAddress: mintForm.contractAddress,
        amount: multiplyTokenAmount(mintForm.amount)
      };
      await dispatch(mintTokens(payload)).unwrap();
      setTimeout(() => {
        setMintForm({ contractAddress: '', amount: '' });
        setCurrentStep(3);
      }, 2000);
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
      setTimeout(() => {
        setBuyForm({ swapContractAddress: '', amount: '' });
      }, 2000);
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
      setTimeout(() => {
        setRedeemForm({ swapContractAddress: '', amount: '' });
      }, 2000);
    } catch (error) {
      console.error('Redeem failed:', error);
    }
  };

  const handleTransferSubmit = async (e, profitAmount) => {
    e.preventDefault();
    if (profitAmount === null || profitAmount === undefined || !transferForm.contractAddress) return;
    
    try {
      // Send profitAmount and contract address to transfer API
      console.log('Transfer amount (profit):', profitAmount);
      console.log('Contract address:', transferForm.contractAddress);
      const transactionData = {
        amount: multiplyTokenAmount(profitAmount),
        contractAddress: transferForm.contractAddress
      };
      await dispatch(sendTransaction(transactionData)).unwrap();
      setTransferCompleted(true);
      setTransferForm({ contractAddress: '' });
    } catch (error) {
      console.error('Transfer failed:', error);
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
          <div className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Amount</label>
                <input
                  type="text"
                  name="amount"
                  value={mintForm.amount}
                  onChange={handleMintFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0a4226]"
                  disabled={mintLoading}
                  required
                />
              </div>
              {mintError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {typeof mintError === 'string' ? mintError : mintError.error || 'Failed to mint tokens'}
                </div>
              )}
              {mintOperation && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                  Mint successful! Request ID: {mintOperation.requestId}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-[#0a4226] text-white px-4 py-2 rounded-md hover:bg-[#0a4226]/90 transition-colors disabled:opacity-50"
                disabled={mintLoading}
              >
                {mintLoading ? 'Minting...' : 'Mint Tokens'}
              </button>
            </form>
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
            {(buyLoading || (buyOperation && buyOperation.requestStatus)) && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                {!buyLoading && (
                  <button
                    onClick={() => dispatch(clearCurrentBuyOperation())}
                    className="absolute top-4 right-4 p-2 rounded hover:bg-gray-200 transition"
                    title="Close overlay"
                    type="button"
                  >
                    <XMarkIcon className="w-6 h-6 text-[#0a4226]" />
                  </button>
                )}
                {buyLoading ? (
                  <>
                    <div className="w-12 h-12 border-4 border-t-4 border-t-[#0a4226] border-gray-200 rounded-full animate-spin mb-3" />
                    <div className="text-[#0a4226] font-semibold">Processing transaction...</div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[#0a4226] mb-2">Transaction Status</div>
                    <div className="font-mono text-sm">Request ID: {buyOperation.requestId}</div>
                    <div className="mt-2 text-sm">Status: <span className="font-mono">{buyOperation.requestStatus}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-semibold text-[#0a4226]">Redeem MMF Tokens</h3>
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
            {(redeemLoading || (redeemOperation && redeemOperation.requestStatus)) && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                {!redeemLoading && (
                  <button
                    onClick={() => dispatch(clearCurrentRedeemOperation())}
                    className="absolute top-4 right-4 p-2 rounded hover:bg-gray-200 transition"
                    title="Close overlay"
                    type="button"
                  >
                    <XMarkIcon className="w-6 h-6 text-[#0a4226]" />
                  </button>
                )}
                {redeemLoading ? (
                  <>
                    <div className="w-12 h-12 border-4 border-t-4 border-t-[#0a4226] border-gray-200 rounded-full animate-spin mb-3" />
                    <div className="text-[#0a4226] font-semibold">Processing transaction...</div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[#0a4226] mb-2">Transaction Status</div>
                    <div className="font-mono text-sm">Request ID: {redeemOperation.requestId}</div>
                    <div className="mt-2 text-sm">Status: <span className="font-mono">{redeemOperation.requestStatus}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 6: {
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
            {transferCompleted && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                All steps completed! 🎉
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
                    <li key={step.id} className="relative flex-1">
                      {stepIdx !== steps.length - 1 && (
                        <div className="absolute top-5 left-1/2 w-full h-0.5 -ml-1">
                          <div className={`h-full ${isComplete ? 'bg-[#0a4226]' : 'bg-gray-200'}`} />
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
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Step Content */}
          <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
            <div className="w-[400px] mx-auto">
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
              onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
              disabled={
                currentStep === 6 ||
                (currentStep === 4 && !buyCompleted) ||
                (currentStep === 5 && !redeemCompleted)
              }
              className="px-4 py-2 bg-[#0a4226] text-white rounded-md hover:bg-[#0a4226]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 6 ? 'Finish' : 'Next'}
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
