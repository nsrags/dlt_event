import './App.css'
import { Routes, Route } from 'react-router-dom'
import Login from './components/Login/Login.jsx'
import LeaderDashboard from './components/LeaderDashboard/LeaderDashboard.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import DeployOwnContract from './components/DeployOwnContract/DeployOwnContract.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/deploy-contract" element={<DeployOwnContract />} />
  {/* Public route: does NOT require login */}
  <Route path="/leader-dashboard" element={<LeaderDashboard />} />
    </Routes>
  )
}

export default App
