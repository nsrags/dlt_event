import React, { useEffect, useState } from "react";
import { useSolidityTokenInfo } from "../../hooks/useSolidityTokenInfo";
import { contractAPI } from "../../services/api";

export default function SolidityTokenNameReader({ fileContent, contractType = 'plain', swapContractAddress = '' }) {
  const { tokenName, tradingSymbol, error } = useSolidityTokenInfo(fileContent, contractType);
  const [swapConfig, setSwapConfig] = useState({ mmfContractAddress: '', exchangeRateContractAddress: '' });
  
  const fileName = tokenName ? `${tokenName}.sol` : 'contract.sol';

  useEffect(() => {
    if (contractType === 'swap') {
      contractAPI.getSwapContractConfig()
        .then(response => {
          setSwapConfig(response.data);
        })
        .catch(err => {
          console.error('Failed to fetch swap contract config:', err);
        });
    }
  }, [contractType]);

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ 
        fontSize: '20px',
        fontWeight: '600',
        color: '#0a4226',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #0a4226',
        textAlign: 'left'
      }}>
        {contractType === 'swap' ? 'Swap Contract Information' : 'ERC-20 Token Information'}
      </h2>

      {(tokenName || tradingSymbol) && (
        <div style={{ marginTop: 0 }}>
          {tokenName && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                Contract to Deploy
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', textAlign: 'left' }}>
                {tokenName}
              </div>
            </div>
          )}
          
          {contractType !== 'swap' && tradingSymbol && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                Trading Symbol
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', textAlign: 'left' }}>
                {tradingSymbol}
              </div>
            </div>
          )}
          
          {contractType === 'swap' && (
            <div style={{ 
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#ecfdf5',
              borderRadius: '8px',
              border: '1px solid #6ee7b7',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                <svg style={{ width: '18px', height: '18px', marginRight: '6px' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                Contracts used for Swap
              </div>
              
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#047857', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px', textAlign: 'left' }}>
                  1. User Token Contract Address
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  wordBreak: 'break-all', 
                  color: '#064e3b',
                  backgroundColor: '#d1fae5',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  border: '1px solid #a7f3d0',
                  textAlign: 'left'
                }}>
                  {swapContractAddress || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Awaiting input...</span>}
                </div>
              </div>
              
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#047857', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px', textAlign: 'left' }}>
                  2. MMF Token Contract Address
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  wordBreak: 'break-all', 
                  color: '#064e3b',
                  backgroundColor: '#d1fae5',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  border: '1px solid #a7f3d0',
                  textAlign: 'left'
                }}>
                  {swapConfig.mmfContractAddress || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Loading...</span>}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '11px', color: '#047857', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.3px', textAlign: 'left' }}>
                  3. Conversion Rate Contract Address
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  wordBreak: 'break-all', 
                  color: '#064e3b',
                  backgroundColor: '#d1fae5',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  border: '1px solid #a7f3d0',
                  textAlign: 'left'
                }}>
                  {swapConfig.exchangeRateContractAddress || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Loading...</span>}
                </div>
              </div>
            </div>
          )}
          
          <div style={{ 
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
              File Name
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', fontFamily: 'monospace', textAlign: 'left' }}>
              {fileName}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: 20, 
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '14px',
          textAlign: 'left'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
