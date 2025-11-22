export const getCurrentProfits = (tokens, initialbalance) => {
  if (!tokens || tokens.length === 0) return null;
  const lbgAddress =  import.meta.env.VITE_LBG_CONTRACT_ADDRESS;
  const token = tokens.find(
    (t) => t.contractaddress === lbgAddress
  );
  const result = token?.data?.result;
  console.log(result);
  return  result - initialbalance;
};

export const multiplyTokenAmount = (amount) => {

  return Number(amount) * Number(1000000000000000000);
}

export const truncateTokenAmount = (amount) => {
  
  return parseFloat(amount / 1000000000000000000).toFixed(2);
}

