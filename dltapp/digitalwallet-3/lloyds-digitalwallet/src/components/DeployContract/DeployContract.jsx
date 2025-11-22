import { useDispatch } from 'react-redux';
import { deployContract } from '../../store/contractsSlice';

export default function DeployContract() {
  const dispatch = useDispatch();

  const handleDeploy = () => {
    const contractData = {
      contractStandard: 'ERC20',
      params: [ 'Postman20-ERC20TXT-TEST','FT-ERC20']
    };
    dispatch(deployContract(contractData));
  };

  return (
    <section className="text-center">
      <button
        disabled
        aria-disabled
        className="bg-[#0a4226] hover:bg-[#094D34] text-white px-6 py-3 rounded shadow-md font-medium opacity-50 cursor-not-allowed"
        onClick={handleDeploy}
      >
        Deploy Smart Contract
      </button>
    </section>
  );
}
