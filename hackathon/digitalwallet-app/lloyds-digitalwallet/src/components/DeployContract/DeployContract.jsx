

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectContractsLoading, deployCustomContract, setSwapContractAddress , setContractAddress} from '../../store/contractsSlice';
import { contractAPI } from '../../services/api';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function DeployContract({ fileData, onDeploymentSuccess, contractName, contractType = 'plain', swapContractAddress = '' }) {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectContractsLoading);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState(null);

  const handleDeploy = async () => {
    if (!fileData || !fileData.fileName || !fileData.content) {
      alert('Please upload a contract file first');
      return;
    }

    if (!contractName) {
      alert('Contract name not found. Please ensure your contract inherits from ERC20');
      return;
    }

    setIsDeploying(true);

    try {
      // Create a File object from the content
      const blob = new Blob([fileData.content], { type: 'text/plain' });
      const file = new File([blob], fileData.fileName, { type: 'text/plain' });
      
      // Create FormData object
      const formData = new FormData();
      formData.append('contractToDeploy', contractName);
      formData.append('comments', contractName);
      formData.append('file', file);
      
      // For swap contracts, add constructor params
      if (contractType === 'swap') {
        // Note: Environment variables will be read on the server side
        // The server will construct the params array with:
        // [swapContractAddress, MMF_TOKEN_WALLET_ADDRESS, EXCHANGE_RATE_CONTRACT_ADDRESS]
        formData.append('contractType', 'swap');
        formData.append('swapContractAddress', swapContractAddress);
      }

      // Deploy the contract using Redux thunk
      const response = await dispatch(deployCustomContract(formData)).unwrap();
      
      console.log(response);
      // Get request status
      const requestStatus = await contractAPI.getRequestDetails(response.requestId);
      
      if (response.error) {
         console.log(response);
        setDeploymentError(response.error.message || 'Deployment failed. Please try again.');
        setIsDeploying(false);
      } else {
        // Pass deployment status to parent component
        if (onDeploymentSuccess) {
           if (contractType === 'swap') { 
          dispatch(setSwapContractAddress(requestStatus.data.contractAddress));
           }
           else {
            dispatch(setContractAddress(requestStatus.data.contractAddress));
           }
          onDeploymentSuccess({
            requestId: response.requestId,
            status: requestStatus.data?.requestStatus || 'Success',
            fileName: fileData.fileName,
            ...requestStatus.data
          });
        }
        setIsDeploying(false);
      }
    } catch (error) {
      console.error('Deployment error:', error.response);
      setDeploymentError(error.error.message|| 'An unexpected error occurred during deployment.');
      setIsDeploying(false);
    }
  };

  const isDisabled = !fileData || !fileData.fileName || isLoading || isDeploying;

  return (
    <>
      <section className="text-center">
        <button
          disabled={isDisabled}
          className={`px-6 py-3 rounded shadow-md font-medium ${
            isDisabled
              ? 'bg-[#0a4226] text-white opacity-50 cursor-not-allowed'
              : 'bg-[#0a4226] hover:bg-[#094D34] text-white cursor-pointer'
          }`}
          onClick={handleDeploy}
        >
          {isDeploying ? 'Deploying...' : isLoading ? 'Deploying...' : 'Deploy Smart Contract'}
        </button>
      </section>

      {/* Loading Spinner Overlay */}
      {isDeploying && (
        <div className="fixed inset-0 flex items-center justify-center z-50 cursor-wait">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-2xl border-2 border-[#0a4226] pointer-events-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0a4226] mb-4"></div>
            <p className="text-lg font-semibold text-gray-800">Deploying Contract...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we deploy your smart contract</p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {deploymentError && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-md w-full">
            {/* Close button */}
            <button
              onClick={() => setDeploymentError(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Error content */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 mx-auto mb-6 flex items-center justify-center">
                <ExclamationCircleIcon className="w-12 h-12 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Deployment Failed
              </h3>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-800 font-medium break-words">
                  {deploymentError}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}