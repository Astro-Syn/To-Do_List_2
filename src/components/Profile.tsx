import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { UserProfile } from '../types/Profile'

export default function Profile() {
  const { currentUser, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [aboutMe, setAboutMe] = useState('')
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load user profile on component mount
  useEffect(() => {
    if (!currentUser) return

    const loadProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid))
        
        if (profileDoc.exists()) {
          const data = profileDoc.data()
          const profileData: UserProfile = {
            uid: data.uid,
            email: data.email,
            displayName: data.displayName || '',
            aboutMe: data.aboutMe || '',
            profilePictureUrl: data.profilePictureUrl || '',
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          }
          setProfile(profileData)
          setDisplayName(profileData.displayName || '')
          setAboutMe(profileData.aboutMe || '')
          setProfilePictureUrl(profileData.profilePictureUrl || '')
        } else {
          // Create new profile if doesn't exist
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: '',
            aboutMe: '',
            profilePictureUrl: '',
            createdAt: new Date(),
            updatedAt: new Date()
          }
          setProfile(newProfile)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [currentUser])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setProfilePicture(file)
    }
  }

  const handleSave = async () => {
    if (!currentUser) {
      console.error('No current user found')
      alert('You must be logged in to save your profile.')
      return
    }

    setSaving(true)
    try {
      console.log('Starting profile save for user:', currentUser.uid)
      console.log('Profile data:', { displayName, aboutMe })

      // Update profile in Firestore (without image for now)
      const profileData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: displayName.trim(),
        aboutMe: aboutMe.trim(),
        profilePictureUrl: '', // Temporarily disabled
        updatedAt: serverTimestamp()
      }

      console.log('Attempting to save to Firestore...')
      
      // Always use setDoc with merge: true to create or update
      console.log('Creating/updating profile...')
      await setDoc(doc(db, 'profiles', currentUser.uid), {
        ...profileData,
        createdAt: profile?.createdAt ? serverTimestamp() : serverTimestamp()
      }, { merge: true })

      console.log('Profile saved successfully to Firestore')

      // Update local state
      const updatedProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: displayName.trim(),
        aboutMe: aboutMe.trim(),
        profilePictureUrl: '', // Temporarily disabled
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date()
      }

      setProfile(updatedProfile)
      setProfilePicture(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Detailed error saving profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorCode = (error as any)?.code || 'No code available'
      console.error('Error code:', errorCode)
      console.error('Error message:', errorMessage)
      alert(`Failed to save profile. Error: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading-message">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <button className="logout-button" onClick={logout}>
            LOGOUT
          </button>
      <div className="container">
        <div className="profile-header">
          
          <h1>PROFILE</h1>
          <p className="subtitle">Customize your cyber identity</p>
        </div>

        <div className="profile-content">
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              <div className="profile-picture-placeholder">
                <span>👤</span>
              </div>
            </div>
            
            <div className="file-upload-section">
              <div className="coming-soon">
                📷 Profile pictures coming soon!
              </div>
            </div>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="display-name" className="form-label">
                DISPLAY NAME
              </label>
              <input
                id="display-name"
                type="text"
                className="form-input"
                placeholder="Enter your display name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="about-me" className="form-label">
                ABOUT ME
              </label>
              <textarea
                id="about-me"
                className="form-textarea"
                placeholder="Tell us about yourself..."
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                EMAIL
              </label>
              <div className="email-display">
                {currentUser?.email}
              </div>
            </div>

            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'SAVING...' : 'SAVE PROFILE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
