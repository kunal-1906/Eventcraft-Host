import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../redux/userSlice';
import userService from '../services/userService';
import fileUploadService from '../services/fileUploadService';
import ticketService from '../services/ticketService';
import { useNotification } from '../components/NotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  TicketIcon, 
  CalendarIcon, 
  UserIcon, 
  PencilIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [activeTab, setActiveTab] = useState('profile'); // profile, tickets
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || user?.picture || 'https://via.placeholder.com/150');
  const [isUploading, setIsUploading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch user tickets (only for attendees)
  useEffect(() => {
    if (activeTab === 'tickets' && user?.role === 'attendee') {
      const fetchTickets = async () => {
        try {
          setLoading(true);
          const response = await ticketService.getMyTickets();
          setTickets(Array.isArray(response) ? response : []);
        } catch (err) {
          console.error('Error loading tickets:', err);
          showError('Failed to load tickets');
        } finally {
          setLoading(false);
        }
      };
      
      fetchTickets();
    }
  }, [activeTab, user?.role, showError]);

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const updatedUser = {
        ...user,
        name,
        email,
        bio,
        phone,
        location,
        profilePicture
      };
      
      // Update user in backend
      const response = await userService.updateProfile(updatedUser);
      
      // Update user in Redux
      dispatch(setUser(response.data));
      
      setIsEditing(false);
      success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      showError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle profile picture upload
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size should be less than 5MB');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Upload profile picture
      const response = await fileUploadService.uploadProfilePicture(file);
      
      // Update profile picture URL
      setProfilePicture(response.data.url);
      
      success('Profile picture uploaded successfully');
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      showError('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Navigate to settings
  const goToSettings = () => {
    navigate('/settings');
  };
  
  // Update local state when user object changes (after successful profile update)
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
      setProfilePicture(user.profilePicture || user.picture || 'https://via.placeholder.com/150');
    }
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Debug Info - Remove this in production */}
      {/* <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Info:</h3>
        <p className="text-sm text-yellow-700">
          Current User: {user ? `${user.name} (${user.email}) - Role: ${user.role}` : 'No user logged in'}
        </p>
        <p className="text-sm text-yellow-700">
          API URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}
        </p>
      </div> */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">View and manage your personal information</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="outline" 
            onClick={goToSettings}
          >
            Account Settings
          </Button>
          {!isEditing ? (
            <Button 
              variant="primary" 
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img 
                  src={profilePicture || 'https://via.placeholder.com/150'} 
                  alt={user?.name} 
                  className="w-32 h-32 rounded-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer">
                    <PencilIcon className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleProfilePictureUpload}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
              <div className="mt-4 w-full">
                <nav className="flex flex-col space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'profile'
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <UserIcon className="w-5 h-5 mr-2" />
                    Profile Information
                  </button>
                  {/* Only show My Tickets tab for attendees */}
                  {user?.role === 'attendee' && (
                    <button
                      onClick={() => setActiveTab('tickets')}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'tickets'
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <TicketIcon className="w-5 h-5 mr-2" />
                      My Tickets
                    </button>
                  )}
                </nav>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
              
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 p-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 p-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 p-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="mt-1 p-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="mt-1 p-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <UserIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-gray-900">{user?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-gray-900">{user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <PhoneIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="text-gray-900">{user?.location || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Member Since</p>
                        <p className="text-gray-900">{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {(user?.bio) && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-start space-x-3">
                        <InformationCircleIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Bio</p>
                          <p className="text-gray-900">{user.bio}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          
          {/* Only show tickets tab for attendees */}
          {activeTab === 'tickets' && user?.role === 'attendee' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">My Tickets</h3>
                <span className="text-sm text-gray-500">{tickets.length} tickets</span>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{ticket.event?.title || 'Event'}</h4>
                          <p className="text-sm text-gray-600 mt-1">{ticket.event?.description?.substring(0, 100)}...</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <TicketIcon className="w-4 h-4 mr-1" />
                              {ticket.ticketType}
                            </span>
                            <span className="flex items-center">
                              <MapPinIcon className="w-4 h-4 mr-1" />
                              {ticket.event?.location || 'Location not specified'}
                            </span>
                            <span className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-1" />
                              {ticket.event?.date ? formatDate(ticket.event.date) : 'Date not specified'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            ticket.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ticket.status}
                          </span>
                          <div className="mt-4 flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/event/${ticket.event?._id}/ticket/${ticket._id}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                  <p className="text-gray-500 mb-6">You haven't purchased any tickets yet.</p>
                  <Button 
                    variant="primary"
                    onClick={() => navigate('/attendee/dashboard')}
                  >
                    Explore Events
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
