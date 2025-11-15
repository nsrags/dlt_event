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