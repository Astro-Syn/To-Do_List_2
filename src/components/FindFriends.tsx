import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { collection, query, where, getDocs, getDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

interface User {
  uid: string
  email: string
  displayName?: string
  profilePictureUrl?: string
  createdAt?: any
  lastLoginAt?: any
}

interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: any
}



export default function FindFriends() {
  const { currentUser } = useAuth()
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingRequest, setSendingRequest] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser) {
      fetchSuggestedUsers()
      fetchFriendRequests()
    }
  }, [currentUser])

  


  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true)
      
      // First get all users
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '!=', currentUser?.email))
      const usersQuerySnapshot = await getDocs(q);
      
      const users: User[] = []
      usersQuerySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as User)
      })
       console.log('users', users);
      // Then get profile information for each user
      const usersWithProfiles: User[] = []
      for (const user of users) {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid))
          if (profileDoc.exists()) {
            const profileData = profileDoc.data()
            usersWithProfiles.push({
              ...user,
              displayName: profileData.displayName || '',
              profilePictureUrl: profileData.profilePictureUrl || ''
            })
          } else {
            usersWithProfiles.push(user)
          }
        } catch (error) {
          console.error('Error fetching profile for user:', user.uid, error)
          usersWithProfiles.push(user)
        }
      }
      
      // Filter out users who already have pending/accepted requests
      const filteredUsers = usersWithProfiles.filter(user => 
        !friendRequests.some(req => 
          (req.fromUserId === currentUser?.uid && req.toUserId === user.uid) ||
          (req.fromUserId === user.uid && req.toUserId === currentUser?.uid)
        )
      )
      
      setSuggestedUsers(filteredUsers.slice(0, 10)) // Show first 10 suggestions
    } catch (error) {
      console.error('Error fetching suggested users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFriendRequests = async () => {
    if (!currentUser) return
    
    try {
      const requestsRef = collection(db, 'friendRequests')
      const q = query(
        requestsRef,
        where('fromUserId', '==', currentUser.uid)
      )
      const querySnapshot = await getDocs(q)
      
      const requests: FriendRequest[] = []
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as FriendRequest)
      })
      
      setFriendRequests(requests)
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }

  const sendFriendRequest = async (toUserId: string) => {
    if (!currentUser) return
    
    try {
      setSendingRequest(toUserId)
      
      const requestData = {
        fromUserId: currentUser.uid,
        toUserId: toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      }
      
      await setDoc(doc(collection(db, 'friendRequests')), requestData)
      
      // Update local state
      const newRequest: FriendRequest = {
        id: Date.now().toString(),
        fromUserId: requestData.fromUserId,
        toUserId: requestData.toUserId,
        status: requestData.status as 'pending' | 'accepted' | 'declined',
        createdAt: new Date()
      }
      setFriendRequests([...friendRequests, newRequest])
      
      // Remove user from suggestions
      setSuggestedUsers(suggestedUsers.filter(user => user.uid !== toUserId))
      
      console.log('Friend request sent successfully')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request. Please try again.')
    } finally {
      setSendingRequest(null)
    }
  }

  

  const formatDate = (date: any) => {
    if (!date) return 'Unknown'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString()
  }

  return (
    <div className="app">
      <div className="container">
        <h1>🔍 FIND FRIENDS</h1>
        <p className="subtitle">Connect with other users</p>
        
        <div className="friends-section">
          <div className="friends-header">
            <h2>SUGGESTED USERS</h2>
            <p>Discover other users in the network</p>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Scanning the network...</p>
            </div>
          ) : suggestedUsers.length === 0 ? (
            <div className="no-users">
              <p>No new users to suggest at this time</p>
              <p className="subtext">Check back later for new connections!</p>
            </div>
          ) : (
            <div className="users-grid">
              {suggestedUsers.map((user) => (
                <div key={user.uid} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.profilePictureUrl ? (
                        <img 
                          src={user.profilePictureUrl} 
                          alt={user.displayName || user.email} 
                          className="user-avatar-img"
                          onError={(e) => {
                            // Fallback to letter if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`user-avatar-letter ${user.profilePictureUrl ? 'hidden' : ''}`}>
                        {(user.displayName || user.email)?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    <div className="user-details">
                      <h3>{user.displayName || user.email}</h3>
                      {user.displayName && <p className="user-email">{user.email}</p>}
                      <p>Joined: {formatDate(user.createdAt)}</p>
                      <p>Last active: {formatDate(user.lastLoginAt)}</p>
                    </div>
                  </div>
                  <button 
                    className="add-friend-btn"
                    onClick={() => sendFriendRequest(user.uid)}
                    disabled={sendingRequest === user.uid}
                  >
                    {sendingRequest === user.uid ? 'SENDING...' : '+ ADD FRIEND'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {friendRequests.length > 0 && (
          <div className="sent-requests-section">
            <h2>SENT REQUESTS</h2>
            <div className="requests-list">
              {friendRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <span>Request sent to: {request.toUserId}</span>
                  <span className={`status ${request.status}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
