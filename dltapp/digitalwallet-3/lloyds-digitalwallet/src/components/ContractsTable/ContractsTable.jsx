import { useState } from 'react';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import contractsData from '../../config/contractDetails.json';

export default function ContractsTable() {
  const [page, setPage] = useState(1);
  const [size] = useState(15);
  const contracts = Array.isArray(contractsData) ? contractsData : [];
  const isLoading = false;
  const error = null;
  const pagination = { total: contracts.length };

  // Safe JSON parse helper: returns parsed value or null on error
  const safeParse = (str) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const summarize = (value, max = 80) => {
    if (value === null || value === undefined) return '';
    let s = '';
    try {
      s = typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      s = String(value);
    }
    if (s.length <= max) return s;
    return s.slice(0, max) + '…';
  };

  const truncateAddress = (address, chars = 6) => {
    if (!address || address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  return (
       <section className="bg-white rounded shadow p-6">
      <div className="flex items-center justify-center relative mb-4">
        <h2 className="text-lg font-bold text-[#094D34] uppercase">Deployed Contracts</h2>
        {/* <button
          onClick={() => window.location.reload()}
          disabled={isLoading}
          aria-label="Refresh contracts"
          className={`absolute right-0 p-2 rounded text-[#094D34] hover:bg-gray-100 transition ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button> */}
      </div>
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
                const dateA = new Date(a.updatedDate || a.deployedAt || 0).getTime();
                const dateB = new Date(b.updatedDate || b.deployedAt || 0).getTime();
                return dateB - dateA; // Most recent first (descending)
              })
              .map((c, i) => {
              // Prepare a safe constructorArgs preview
              const parsedArgs = safeParse(c.constructorArgs);
              let ctorPreview = '';
              if (parsedArgs) {
                if (Array.isArray(parsedArgs) && parsedArgs.length > 0 && typeof parsedArgs[0] === 'string') {
                  // If constructorArgs is an array of strings, show the first string without truncation
                  ctorPreview = parsedArgs[0];
                } else {
                  ctorPreview = summarize(parsedArgs, 120);
                }
              }
              return (
              <tr key={c.contractAddress || c.id || i} className="bg-white border border-[#094D34] rounded">
                <td className="px-3 py-2 text-left" title={parsedArgs ? JSON.stringify(parsedArgs) : undefined}>
                  {/* <div className="font-medium">{c.name || c.contractName || '-'}</div> */}
                  {/* {ctorPreview && <div className="text-xs text-gray-500 mt-1">{ctorPreview}</div>} */}
                  {c.comments}
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

      {/* Pagination Controls */}
      {!isLoading && !error && contracts.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * size) + 1} to {Math.min(page * size, pagination.total)} of {pagination.total} contracts
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1 text-sm rounded border ${
                page === 1
                  ? 'border-gray-200 text-gray-400'
                  : 'border-[#094D34] text-[#094D34] hover:bg-[#094D34] hover:text-white'
              } transition`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * size >= pagination.total}
              className={`px-3 py-1 text-sm rounded border ${
                page * size >= pagination.total
                  ? 'border-gray-200 text-gray-400'
                  : 'border-[#094D34] text-[#094D34] hover:bg-[#094D34] hover:text-white'
              } transition`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
