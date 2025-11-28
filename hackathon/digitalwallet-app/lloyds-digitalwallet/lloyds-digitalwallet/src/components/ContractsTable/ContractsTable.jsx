import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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

  const truncateAddress = (address, chars = 10) => {
    if (!address || address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  return (
       <section className="bg-white rounded shadow p-6 h-full flex flex-col">
      <div className="flex items-center justify-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-[#094D34] uppercase">Deployed Contracts</h2>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <table className="w-full border-separate text-sm table-fixed" style={{borderSpacing: '12px 8px'}}>
        <thead>
          <tr className="text-[#094D34] uppercase text-xs font-bold">
            <th className="text-left px-4 py-2" style={{width: '20%'}}>Contract Name</th>
            <th className="text-left px-4 py-2" style={{width: '32%'}}>Contract Address</th>
            <th className="text-left px-4 py-2" style={{width: '15%'}}>Status</th>
            <th className="text-left px-4 py-2" style={{width: '33%'}}>Updated Date</th>
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
                <td className="px-4 py-2 text-left truncate">
                  {c.comments || c.name || c.contractName || '-'}
                </td>
                <td className="px-4 py-2 font-mono text-left">
                  <div className="flex items-center gap-2">
                    <span>{truncateAddress(c.contractAddress || c.address || '-')}</span>
                    <button
                      onClick={() => copyToClipboard(c.contractAddress || c.address || '')}
                      className="p-1 rounded hover:bg-gray-200 transition flex-shrink-0"
                      title="Copy full address"
                      type="button"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 text-[#094D34]" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 text-left">
                  <span className="bg-[#094D34] text-white text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                    {c.isDeployed ? 'Deployed' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-2 text-left text-xs">{c.updatedDate ? new Date(c.updatedDate).toLocaleString() : (c.deployedAt ? new Date(c.deployedAt).toLocaleString() : '-')}</td>
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
