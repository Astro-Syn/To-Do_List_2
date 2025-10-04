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
    }
  }

  const handleSave = async () => {
    if (!currentUser) return

    setSaving(true)
    try {
      let finalProfilePictureUrl = profilePictureUrl

      // Upload new profile picture if selected
      if (profilePicture) {
        // Delete old profile picture if exists
        if (profilePictureUrl) {
          try {
            const oldImageRef = ref(storage, `profile-pictures/${currentUser.uid}`)
            await deleteObject(oldImageRef)
          } catch (error) {
            console.log('No old image to delete or error deleting:', error)
          }
        }

        // Upload new image
        const imageRef = ref(storage, `profile-pictures/${currentUser.uid}`)
        const snapshot = await uploadBytes(imageRef, profilePicture)
        finalProfilePictureUrl = await getDownloadURL(snapshot.ref)
      }

      // Update profile in Firestore
      const profileData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: displayName.trim(),
        aboutMe: aboutMe.trim(),
        profilePictureUrl: finalProfilePictureUrl,
        updatedAt: serverTimestamp()
      }

      if (profile) {
        await updateDoc(doc(db, 'profiles', currentUser.uid), profileData)
      } else {
        await setDoc(doc(db, 'profiles', currentUser.uid), {
          ...profileData,
          createdAt: serverTimestamp()
        })
      }

      // Update local state
      const updatedProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: displayName.trim(),
        aboutMe: aboutMe.trim(),
        profilePictureUrl: finalProfilePictureUrl,
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date()
      }

      setProfile(updatedProfile)
      setProfilePictureUrl(finalProfilePictureUrl)
      setProfilePicture(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
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
      <div className="container">
        <div className="profile-header">
          <button className="logout-button" onClick={logout}>
            LOGOUT
          </button>
          <h1>PROFILE</h1>
          <p className="subtitle">Customize your cyber identity</p>
        </div>

        <div className="profile-content">
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt="Profile" 
                  className="profile-picture"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  <span>📷</span>
                </div>
              )}
            </div>
            
            <div className="file-upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
                id="profile-picture-input"
              />
              <label htmlFor="profile-picture-input" className="file-upload-button">
                {profilePicture ? '📁 Change Picture' : '📁 Upload Picture'}
              </label>
              {profilePicture && (
                <div className="selected-file">
                  Selected: {profilePicture.name}
                </div>
              )}
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
