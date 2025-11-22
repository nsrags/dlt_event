export const getCurrentProfits = (tokens, initialbalance) => {
  if (!tokens || tokens.length === 0) return null;
  // const lbgAddress =  import.meta.env.VITE_LBG_CONTRACT_ADDRESS;
  const token = tokens[tokens.length - 2];
  const netbalance = token?.tokens[0]?.data?.result;
  console.log(initialbalance);
  console.log(netbalance);
  // if (netbalance === undefined || initialbalance === undefined) return null;

  return  truncateTokenAmount(netbalance - initialbalance);
};

export const multiplyTokenAmount = (amount) => {

  return Number(amount) * Number(1000000000000000000);
}

export const truncateTokenAmount = (amount) => {
  
  return parseFloat(amount / 1000000000000000000).toFixed(2);
}

