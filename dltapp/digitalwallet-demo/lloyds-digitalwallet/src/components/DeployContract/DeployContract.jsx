

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectContractsLoading } from '../../store/contractsSlice';
import { contractAPI } from '../../services/api';

export default function DeployContract({ fileData, onDeploymentSuccess, contractName, contractType = 'plain', swapContractAddress = '' }) {
  const isLoading = useSelector(selectContractsLoading);
  const [isDeploying, setIsDeploying] = useState(false);

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

      // Deploy the contract
      const response = await contractAPI.deployCustomContract(formData, {
        headers: {'Content-Type': 'multipart/form-data'}
      });
      
      console.log('Deployment response:', response.data.requestId);
      
      // Get request status
      const requestStatus = await contractAPI.getRequestDetails(response.data.requestId);
      
      if (response.error) {
        // alert(`Deployment failed: ${response.error.message || 'Unknown error'}`);
        setIsDeploying(false);
      } else {
        // Pass deployment status to parent component
        if (onDeploymentSuccess) {
          onDeploymentSuccess({
            requestId: response.data.requestId,
            status: requestStatus.data?.requestStatus || 'Success',
            fileName: fileData.fileName,
            ...requestStatus.data
          });
        }
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error.message || 'Unknown error'}`);
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
    </>
  );
}