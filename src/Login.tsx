import React, { useState } from 'react'
import { useAuth } from './AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email || !password) {
      return setError('Please fill in all fields')
    }

    try {
      setError('')
      setLoading(true)
      if (isSignup) {
        await signup(email, password)
      } else {
        await login(email, password)
      }
    } catch (error: any) {
      setError('Failed to ' + (isSignup ? 'create account' : 'log in'))
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <div className="container">
        <h1>My To Do List</h1>
        <p className="subtitle">Never miss a Note</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="email"
              className="auth-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'PROCESSING...' : (isSignup ? 'CREATE ACCOUNT' : 'LOGIN')}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button 
              type="button" 
              className="switch-button"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'LOGIN' : 'SIGN UP'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
