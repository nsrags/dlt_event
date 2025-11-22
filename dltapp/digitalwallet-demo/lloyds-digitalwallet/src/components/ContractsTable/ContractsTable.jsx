import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { 
  fetchContracts, 
  selectContracts, 
  selectContractsLoading, 
  selectContractsError
} from '../../store/contractsSlice';

export default function ContractsTable() {
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const contracts = useSelector(selectContracts) || [];
  const isLoading = useSelector(selectContractsLoading);
  const error = useSelector(selectContractsError);


  // Fetch contracts on component mount
  useEffect(() => {
    dispatch(fetchContracts());
  }, [dispatch]);

  const truncateAddress = (address, chars = 6) => {
    if (!address || address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  const handleRefresh = () => {
    dispatch(fetchContracts({ sort: 'desc' }));
  };

  return (
       <section className="bg-white rounded shadow p-6 h-full flex flex-col">
      <div className="flex items-center justify-center relative mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-[#094D34] uppercase">Deployed Contracts</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh contracts"
          className={`absolute right-0 p-2 rounded text-[#094D34] hover:bg-gray-100 transition ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <table className="w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-[#094D34] uppercase text-xs font-bold">
            <th className="text-left px-3 py-2">Contract Name</th>
            <th className="text-left px-3 py-2">Contract Address</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Updated Date</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="4" className="text-center py-4">
                <div className="animate-pulse">Loading contracts...</div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="4" className="text-center py-4 text-red-600">
                {error}
              </td>
            </tr>
          ) : contracts.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No contracts found
              </td>
            </tr>
          ) : (
            contracts
              .slice()
              .sort((a, b) => {
                const dateA = new Date(a.updatedDate || a.deployedAt || a.createdAt || 0).getTime();
                const dateB = new Date(b.updatedDate || b.deployedAt || b.createdAt || 0).getTime();
                return dateB - dateA; // Most recent first (descending)
              })
              .map((c, i) => {
              return (
              <tr key={c.contractAddress || c.id || i} className="bg-white border border-[#094D34] rounded">
                <td className="px-3 py-2 text-left">
                  {c.comments || c.name || c.contractName || '-'}
                </td>
                <td className="px-3 py-2 font-mono text-left">
                  <div className="flex items-center gap-2">
                    <span>{truncateAddress(c.contractAddress || c.address || '-')}</span>
                    <button
                      onClick={() => copyToClipboard(c.contractAddress || c.address || '')}
                      className="p-1 rounded hover:bg-gray-200 transition"
                      title="Copy full address"
                      type="button"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 text-[#094D34]" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 text-left">
                  <span className="bg-[#094D34] text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {c.isDeployed ? 'Deployed' : 'Pending'}
                  </span>
                </td>
                <td className="px-3 py-2 text-left">{c.updatedDate ? new Date(c.updatedDate).toLocaleString() : (c.deployedAt ? new Date(c.deployedAt).toLocaleString() : '-')}</td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>

      {/* Display info */}
      {!isLoading && !error && contracts.length > 0 && (
        <div className="mt-4 flex items-center justify-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            Showing all {contracts.length} contracts
          </div>
        </div>
      )}
    </section>
  );
}
