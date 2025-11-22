export const CompileContract = (sourceCode, solcInstance) => {
  if (!solcInstance) return null;

  const input = {
    language: "Solidity",
    sources: {
      "Contract.sol": { content: sourceCode }
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };

  const output = JSON.parse(solcInstance.compile(JSON.stringify(input)));
  return output.contracts["Contract.sol"];
}
