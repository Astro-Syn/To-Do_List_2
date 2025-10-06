import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
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
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setProfilePictureUrl(previewUrl)
    }
  }

  const uploadProfilePicture = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('No current user')
    
    // Create a unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `profile-pictures/${currentUser.uid}/profile.${fileExtension}`
    const storageRef = ref(storage, fileName)
    
    // Upload file
    await uploadBytes(storageRef, file)
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  }

  const removeProfilePicture = async () => {
    if (!currentUser || !profile?.profilePictureUrl) return
    
    try {
      // Delete from storage if it's a Firebase Storage URL
      if (profile.profilePictureUrl.includes('firebasestorage')) {
        const fileName = `profile-pictures/${currentUser.uid}/profile.jpg` // Default extension
        const storageRef = ref(storage, fileName)
        await deleteObject(storageRef)
      }
      
      // Update profile to remove picture URL
      await updateDoc(doc(db, 'profiles', currentUser.uid), {
        profilePictureUrl: '',
        updatedAt: serverTimestamp()
      })
      
      setProfilePictureUrl('')
      setProfilePicture(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log('Profile picture removed successfully')
    } catch (error) {
      console.error('Error removing profile picture:', error)
      alert('Failed to remove profile picture. Please try again.')
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

      let profilePictureUrlToSave = profilePictureUrl

      // Upload profile picture if one is selected
      if (profilePicture) {
        console.log('Uploading profile picture...')
        profilePictureUrlToSave = await uploadProfilePicture(profilePicture)
        console.log('Profile picture uploaded:', profilePictureUrlToSave)
      }

      // Update profile in Firestore
      const profileData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: displayName.trim(),
        aboutMe: aboutMe.trim(),
        profilePictureUrl: profilePictureUrlToSave,
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
          <p className="subtitle">Customize your identity</p>
        </div>

        <div className="profile-content">
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt="Profile" 
                  className="profile-picture"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <div className={`profile-picture-placeholder ${profilePictureUrl ? 'hidden' : ''}`}>
                <span>👤</span>
              </div>
            </div>
            
            <div className="file-upload-section">
              <h3>Profile Picture</h3>
              <div className="upload-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button 
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📸 UPLOAD PHOTO
                </button>
                {profilePictureUrl && (
                  <button 
                    className="remove-btn"
                    onClick={removeProfilePicture}
                  >
                    🗑️ REMOVE
                  </button>
                )}
              </div>
              <p className="upload-hint">JPG, PNG, GIF up to 5MB</p>
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
