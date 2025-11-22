
import React from 'react';
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux';
import { setToken, setLoading, setError, clearError } from '../../store/walletSlice';

// Read client credentials from Vite environment variables.
// Make sure to create a local `.env` (or use `.env.local`) with VITE_CLIENT_ID, VITE_CLIENT_SECRET and VITE_AUTH_URL.
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? ''
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET ?? ''
const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? ''

export default function Login() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.wallet);
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    
    if (!AUTH_URL) {
      dispatch(setError('No auth endpoint configured (VITE_AUTH_URL).'))
      return
    }

    dispatch(setLoading(true))
    
    try {
      const response = await axios.post('http://localhost:4000/api/token')
      
      if (response.data.access_token) {
        // Store token in both Redux and sessionStorage
        dispatch(setToken({
          access_token: response.data.access_token,
          token_type: response.data.token_type || 'Bearer'
        }))

        // Backup to sessionStorage
        try {
          sessionStorage.setItem('access_token', response.data.access_token)
          if (response.data.token_type) {
            sessionStorage.setItem('token_type', response.data.token_type)
          }
        } catch (storageErr) {
          console.warn('Could not write access token to sessionStorage', storageErr)
        }

        // Navigate to dashboard after successful login
        navigate('/dashboard')
      } else {
        dispatch(setError('Auth response missing access_token'))
      }
    } catch (err) {
      console.error(err)
      const serverMsg = err?.response?.data || err?.response?.data?.error || err?.response?.data?.error_description
      dispatch(setError(serverMsg || err.message || 'Request failed'))
    } finally {
      dispatch(setLoading(false))
    }

  }

  return (
    <div className="min-h-screen bg-[#003e2f] flex items-center justify-center font-sans">
      <div className="w-full max-w-sm px-6 py-8 bg-[#003e2f] text-white">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/lloydslogo.svg" alt="Lloyds Logo" className="h-20 w-20" />
        </div>

        {/* Title */}
        <h1 className="text-center text-2xl font-bold mb-8 tracking-wide">
          LLOYDS DIGITAL WALLET
        </h1>

  {/* Form */}
  <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium mb-1 text-left">
              Client ID
            </label>
            <input
              type="text"
              id="clientId"
              className="w-full px-4 py-2 rounded bg-white text-black text-sm focus:outline-none"
              value={CLIENT_ID}
              readOnly
              aria-readonly="true"
            />
          </div>

          <div>
            <label htmlFor="clientSecret" className="block text-sm font-medium mb-1 text-left">
              Client Secret
            </label>
            <input
              type="password"
              id="clientSecret"
              className="w-full px-4 py-2 rounded bg-white text-black text-sm focus:outline-none"
              value={CLIENT_SECRET}
              readOnly
              aria-readonly="true"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded text-sm font-semibold ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00a86b] hover:bg-[#00965f]'} text-white`}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
          {error && <p className="text-sm text-red-300 mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}
