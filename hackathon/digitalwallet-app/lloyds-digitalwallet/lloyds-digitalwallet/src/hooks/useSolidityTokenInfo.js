import { useState, useEffect } from "react";

export function useSolidityTokenInfo(fileContent, contractType = 'plain') {
  const [tokenName, setTokenName] = useState("");
  const [tradingSymbol, setTradingSymbol] = useState("");
  const [error, setError] = useState("");

  const extractTokenInfo = (code, type) => {
    if (!code) return { contractName: null, tradingSymbol: null };

    let contractName = null;
    let tradingSymbol = null;

    if (type === 'swap') {
      // For swap contracts: Extract from "contract * {"
      let contractMatch = code.match(/contract\s+(\S+)\s*\{/);
      contractName = contractMatch ? contractMatch[1] : null;
      
      // Trading symbol not applicable for swap contracts, use contract name
      tradingSymbol = contractName;
    } else {
      // For plain ERC20 contracts: Extract contract name from "contract <Name> is ERC20"
      let contractMatch = code.match(/contract\s+(\w+)\s+is\s+ERC20/);
      contractName = contractMatch ? contractMatch[1] : null;

      // Extract trading symbol from constructor() ERC20("Token Name", "Symbol")
      let constructorMatch = code.match(/constructor\s*\([^)]*\)\s*ERC20\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
      tradingSymbol = constructorMatch ? constructorMatch[2] : null; // Second parameter is the symbol
    }

    return { contractName, tradingSymbol };
  };

  useEffect(() => {
    if (fileContent) {
      const { contractName, tradingSymbol } = extractTokenInfo(fileContent, contractType);

      if (contractName || tradingSymbol) {
        setTokenName(contractName || "");
        setTradingSymbol(tradingSymbol || "");
        setError("");
      } else {
        setTokenName("");
        setTradingSymbol("");
        setError("Token name not found in this Solidity file.");
      }
    } else {
      setTokenName("");
      setTradingSymbol("");
      setError("");
    }
  }, [fileContent, contractType]);

  return { tokenName, tradingSymbol, error };
}
