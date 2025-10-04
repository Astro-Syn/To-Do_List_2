
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import TodoApp from './components/TodoApp'
import Profile from './components/Profile'
import FindFriends from './components/FindFriends'

function App() {
  const { currentUser } = useAuth()
  const [currentPage, setCurrentPage] = useState<'friends' | 'todos' | 'profile'>('friends')
  
  if (!currentUser) {
    return <Login />
   
  }

  return (
    <div className="app">
      <div className="container">
        <nav className="main-nav">
          <button 
            className={`nav-button ${currentPage === 'friends' ? 'active' : ''}`}
            onClick={() => setCurrentPage('friends')}
          >
            🔍 FRIENDS
          </button>
          <button 
            className={`nav-button ${currentPage === 'todos' ? 'active' : ''}`}
            onClick={() => setCurrentPage('todos')}
          >
            📋 TODOS
          </button>
          <button 
            className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentPage('profile')}
          >
            👤 PROFILE
          </button>
        </nav>
        
        {currentPage === 'friends' ? <FindFriends /> : 
         currentPage === 'todos' ? <TodoApp /> : <Profile />}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)