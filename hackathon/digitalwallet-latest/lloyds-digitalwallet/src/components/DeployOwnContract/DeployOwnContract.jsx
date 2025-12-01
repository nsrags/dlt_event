
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DeployContract from '../DeployContract/DeployContract.jsx';
import { SolidityEditorComponent } from '../Editor/Editor';
import plainContractFile from '../../assets/simple_erc20_contract_template.sol?raw';
import swapContractFile from '../../assets/token_swapper_conversion_rate_template.sol?raw';
import SolidityTokenNameReader from '../SolidityTokenNameReader/SolidityTokenNameReader.jsx';
import SolidityCompiler from '../SolidityCompiler/SolidityCompiler.jsx';
import { useSolidityTokenInfo } from '../../hooks/useSolidityTokenInfo';
import { WebSolcProvider } from "@web-solc/react";

export default function DeployOwnContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractType = searchParams.get('type') || 'plain'; // Get type from URL params, default to 'plain'
  const swapContractAddress = searchParams.get('swapContractAddress') || ''; // Get swap contract address from URL params
  
  const [fileData, setFileData] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [compileError, setCompileError] = useState(null);
  const [compileResult, setCompileResult] = useState(null);
  const compilerRef = React.useRef();
  
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
    console.log("in handle deployment status Deployment Success Data:", statusData);
    setDeploymentStatus(statusData);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Success Screen
  if (deploymentStatus) {
    return (
     
      <div className="min-h-screen bg-[#0a4226] font-sans">
        <main className="w-[90vw] mx-auto p-6 flex items-center justify-center min-h-screen">
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
     <WebSolcProvider>
    <div className="min-h-screen bg-[#0a4226] font-sans">
      <main className="w-[90vw] mx-auto p-6 space-y-8">
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
          {/* <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              
              <div className="flex-1 text-right md:text-right">
                <div className="flex items-center gap-2 mb-4 justify-end">
                  <DocumentTextIcon className="w-6 h-6 text-[#0a4226]" />
                  <h3 className="text-xl font-bold text-[#0a4226]">Contract Validation Instructions</h3>
                </div>
                <ol className="list-decimal text-right space-y-3 text-gray-700 text-sm leading-relaxed mr-5">
                  <li className="pl-2">Copy the contract code from the editor below</li>
                  <li className="pl-2">Click the <span className="font-semibold text-[#0a4226]">"Validate your contract"</span> button to open the Remix compiler</li>
                  <li className="pl-2">Paste your contract code in the wizard to compile and check for errors</li>
                  <li className="pl-2">Make any necessary corrections and update the code in the editor</li>
                </ol>
              </div>
              
           
              <div className="flex justify-end items-start md:pl-4">
                <button
                  onClick={() => window.open('https://remix.ethereum.org/?code=Ly8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVAovLyBDb21wYXRpYmxlIHdpdGggT3BlblplcHBlbGluIENvbnRyYWN0cyBeNS41LjAKcHJhZ21hIHNvbGlkaXR5IF4wLjguMjc7CgppbXBvcnQge0VSQzIwfSBmcm9tICJAb3BlbnplcHBlbGluL2NvbnRyYWN0c0A1LjUuMC90b2tlbi9FUkMyMC9FUkMyMC5zb2wiOwppbXBvcnQge0VSQzIwUGVybWl0fSBmcm9tICJAb3BlbnplcHBlbGluL2NvbnRyYWN0c0A1LjUuMC90b2tlbi9FUkMyMC9leHRlbnNpb25zL0VSQzIwUGVybWl0LnNvbCI7Cgpjb250cmFjdCBNeVRva2VuIGlzIEVSQzIwLCBFUkMyMFBlcm1pdCB7CiAgICBjb25zdHJ1Y3RvcigpIEVSQzIwKCJNeVRva2VuIiwgIk1USyIpIEVSQzIwUGVybWl0KCJNeVRva2VuIikge30KfQo', '_blank')}
                  className="px-6 py-3 bg-gradient-to-r from-[#0a4226] to-[#0d5230] text-white rounded-xl hover:from-[#083620] hover:to-[#0a4226] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap flex items-center gap-2"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  Validate Your Contract
                </button>
              </div>
            </div>
          </div> */}
           {/* Deploy Contract Component */}
          <DeployContract 
            fileData={fileData}
            onDeploymentSuccess={handleDeploymentSuccess}
            contractName={contractName}
            contractType={contractType}
            swapContractAddress={swapContractAddress}
          />
         
          {/* Two Column Layout */}
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-2">
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
               <SolidityCompiler editorContent={editorContent} fileName={contractName} />
              <SolidityTokenNameReader 
                fileContent={editorContent} 
                contractType={contractType}
                swapContractAddress={swapContractAddress}
              />
              
               
            </div>
          </div>

         
        </div>
      </main>
    </div>
      </WebSolcProvider>
  );
}