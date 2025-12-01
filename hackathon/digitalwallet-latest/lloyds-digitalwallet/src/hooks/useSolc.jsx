import { useEffect, useState } from "react";

export function useSolc() {
  const [solcInstance, setSolcInstance] = useState(null);

  useEffect(() => {
    async function loadSolc() {
      // Load specific compiler version
      const solc = await window.Module; // if using CDN
      setSolcInstance(solc);
    }
    loadSolc();
  }, []);

  return solcInstance;
}
