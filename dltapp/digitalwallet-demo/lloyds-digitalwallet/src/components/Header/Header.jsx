import { useDispatch } from 'react-redux';
import { setToken } from '../../store/walletSlice';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('access_token');
    dispatch(setToken(null));
    navigate('/');
  };

  return (
     <header className="bg-white text-[#0a4226] py-4 px-6 flex justify-between items-center">
      <div className="flex items-center space-x-4 -ml-2">
        <img src="/lloydslogo.svg" alt="Lloyds Logo" className="h-8 w-8" />
        <h1 className="text-xl font-bold uppercase text-[#094D34]">LLOYDS DIGITAL WALLET</h1>
      </div>
      <button onClick={handleLogout} className="bg-[#0a4226] hover:bg-[#094D34] px-4 py-2 rounded text-sm text-white">
        Logout
      </button>
    </header>
  );
}
