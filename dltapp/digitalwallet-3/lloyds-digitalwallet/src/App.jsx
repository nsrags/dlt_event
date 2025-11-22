import './App.css'
import { Routes, Route } from 'react-router-dom'
import Login from './components/Login/Login.jsx'
import LeaderDashboard from './components/LeaderDashboard/LeaderDashboard.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
  {/* Public route: does NOT require login */}
  <Route path="/leader-dashboard" element={<LeaderDashboard />} />
    </Routes>
  )
}

export default App
