
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DeployContract from '../DeployContract/DeployContract.jsx';
import { SolidityEditorComponent } from '../Editor/Editor';
import plainContractFile from '../../assets/simple_erc20_contract_template.sol?raw';
import swapContractFile from '../../assets/TokenSwapperWithExchangeRate.sol?raw';
import SolidityTokenNameReader from '../SolidityTokenNameReader/SolidityTokenNameReader.jsx';
import { useSolidityTokenInfo } from '../../hooks/useSolidityTokenInfo';

export default function DeployOwnContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractType = searchParams.get('type') || 'plain'; // Get type from URL params, default to 'plain'
  const swapContractAddress = searchParams.get('swapContractAddress') || ''; // Get swap contract address from URL params
  
  const [fileData, setFileData] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  
  // Use the custom hook to extract token info, passing contractType
  const { tokenName: contractName } = useSolidityTokenInfo(editorContent, contractType);

  // Automatically load the contract file on mount based on type
  useEffect(() => {
    const contractFile = contractType === 'swap' ? swapContractFile : plainContractFile;
    setEditorContent(contractFile);
  }, [contractType]);

  // Update fileData whenever editor content or contract name changes
  useEffect(() => {
    if (editorContent) {
      const fileName = contractName ? `${contractName}.sol` : 'contract.sol';
      setFileData({
        fileName,
        content: editorContent
      });
    }
  }, [editorContent, contractName]);

  const handleEditorChange = (value) => {
    setEditorContent(value || '');
  };

  const handleDeploymentSuccess = (statusData) => {
    setDeploymentStatus(statusData);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Success Screen
  if (deploymentStatus) {
    return (
      <div className="min-h-screen bg-[#0a4226] font-sans">
        <main className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-screen">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <CheckCircleIcon className="w-24 h-24 text-green-500" />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-[#0a4226] mb-4">
              Contract Deployed Successfully!
            </h1>
            
            {/* Status Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Deployment Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Request ID:</span>
                  <span className="font-medium text-gray-900">{deploymentStatus.requestId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">{deploymentStatus.status}</span>
                </div>
                {deploymentStatus.fileName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Name:</span>
                    <span className="font-medium text-gray-900">{deploymentStatus.fileName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 justify-center mx-auto px-6 py-3 bg-[#0a4226] text-white rounded-lg hover:bg-[#083620] transition-colors font-medium"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Regular Upload/Deploy Screen
  return (
    <div className="min-h-screen bg-[#0a4226] font-sans">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded shadow p-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-[#0a4226] transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-[#0a4226]">
              {contractType === 'swap' ? 'Deploy Swap Token Contract' : 'Deploy Your Own Contract'}
            </h1>
            <p className="text-gray-600 mt-2">
              {contractType === 'swap' 
                ? 'Create and deploy a token swap contract to the blockchain'
                : 'Create and deploy a new smart contract to the blockchain'}
            </p>
          </div>

          {/* Instructions Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Left side - Instructions */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0a4226] text-left mb-2">Contract Validation Instructions</h3>
                <ol className="list-decimal space-y-2 text-gray-700 text-left text-sm" style={{ paddingLeft: '20px' }}>
                  <li style={{ paddingLeft: '4px' }}>Copy the contract code from the editor below</li>
                  <li style={{ paddingLeft: '4px' }}>Click the "Validate on OpenZeppelin" button to open the OpenZeppelin Contract Wizard</li>
                  <li style={{ paddingLeft: '4px' }}>Paste your contract code in the wizard to validate and check for best practices</li>
                  <li style={{ paddingLeft: '4px' }}>Make any necessary changes or improvements suggested by the wizard</li>
                  <li style={{ paddingLeft: '4px' }}>Copy the updated code and paste it back into the editor below</li>
                  <li style={{ paddingLeft: '4px' }}>Once validated, proceed to deploy your contract</li>
                </ol>
              </div>
              
              {/* Right side - Button */}
              <div className="lg:flex-shrink-0">
                <button
                  onClick={() => window.open('https://remix.ethereum.org/?code=Ly8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVAovLyBDb21wYXRpYmxlIHdpdGggT3BlblplcHBlbGluIENvbnRyYWN0cyBeNS41LjAKcHJhZ21hIHNvbGlkaXR5IF4wLjguMjc7CgppbXBvcnQge0VSQzIwfSBmcm9tICJAb3BlbnplcHBlbGluL2NvbnRyYWN0c0A1LjUuMC90b2tlbi9FUkMyMC9FUkMyMC5zb2wiOwppbXBvcnQge0VSQzIwUGVybWl0fSBmcm9tICJAb3BlbnplcHBlbGluL2NvbnRyYWN0c0A1LjUuMC90b2tlbi9FUkMyMC9leHRlbnNpb25zL0VSQzIwUGVybWl0LnNvbCI7Cgpjb250cmFjdCBNeVRva2VuIGlzIEVSQzIwLCBFUkMyMFBlcm1pdCB7CiAgICBjb25zdHJ1Y3RvcigpIEVSQzIwKCJNeVRva2VuIiwgIk1USyIpIEVSQzIwUGVybWl0KCJNeVRva2VuIikge30KfQo', '_blank')}
                  className="px-4 py-2 bg-[#0a4226] text-white rounded-lg hover:bg-[#083620] transition-colors font-medium whitespace-nowrap"
                >
                  Validate your contract
                </button>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* Contract Editor Section - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              {/* <div className="flex items-center gap-2 text-gray-700">
                <DocumentTextIcon className="w-5 h-5 text-[#0a4226]" />
                <span className="font-medium">{fileName}</span>
              </div> */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <SolidityEditorComponent
                  value={editorContent}
                  onChange={handleEditorChange}
                />
              </div>
            </div>

            {/* Token Info Section - Takes 1 column */}
            <div className="lg:col-span-1">
              <SolidityTokenNameReader 
                fileContent={editorContent} 
                contractType={contractType}
                swapContractAddress={swapContractAddress}
              />
            </div>
          </div>

          {/* Deploy Contract Component */}
          <DeployContract 
            fileData={fileData}
            onDeploymentSuccess={handleDeploymentSuccess}
            contractName={contractName}
            contractType={contractType}
            swapContractAddress={swapContractAddress}
          />
        </div>
      </main>
    </div>
  );
}