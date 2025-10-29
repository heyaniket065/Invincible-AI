import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import GlassmorphismCard from '../components/GlassmorphismCard';
// FIX: Corrected icon imports from the new Icons.tsx file.
import { PencilSquareIcon, UserIcon } from '../components/icons/Icons';

const weeklyActivityData = [
  { name: 'Mon', minutes: 60 },
  { name: 'Tue', minutes: 90 },
  { name: 'Wed', minutes: 45 },
  { name: 'Thu', minutes: 75 },
  { name: 'Fri', minutes: 120 },
  { name: 'Sat', minutes: 150 },
  { name: 'Sun', minutes: 30 },
];

const xpGrowthData = [
  { day: 1, xp: 50 },
  { day: 2, xp: 120 },
  { day: 3, xp: 150 },
  { day: 4, xp: 280 },
  { day: 5, xp: 400 },
  { day: 6, xp: 600 },
  { day: 7, xp: 650 },
];

const repAccuracyData = [
  { name: 'Manual', value: 400 },
  { name: 'Sensor', value: 120 },
];

const photoEditsData = [
    { name: 'Jan', edits: 15 },
    { name: 'Feb', edits: 25 },
    { name: 'Mar', edits: 22 },
];

const COLORS = ['#1E90FF', '#FFFFFF'];

const USER_PROFILE_KEY = 'noxz_user_profile';

const ProfileScreen: React.FC = () => {
    const [username, setUsername] = useState('Invincible User');
    const [bio, setBio] = useState('AI Photo Editor & Life Assistant');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedProfile = localStorage.getItem(USER_PROFILE_KEY);
        if (savedProfile) {
            const { username, bio, profilePic } = JSON.parse(savedProfile);
            setUsername(username);
            setBio(bio);
            setProfilePic(profilePic);
        }
    }, []);

    const handleSave = () => {
        const profileData = { username, bio, profilePic };
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
        setIsEditing(false);
    };

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePic(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

  return (
    <div className="p-4 pt-12 pb-28">
      
      <GlassmorphismCard className="mb-8">
        <div className="flex flex-col items-center md:flex-row md:items-start text-center md:text-left gap-6 p-4">
            <div className="relative group cursor-pointer" onClick={() => isEditing && fileInputRef.current?.click()}>
                {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-white/20"/>
                ) : (
                    <div className="w-28 h-28 rounded-full bg-black/30 flex items-center justify-center border-4 border-white/20">
                        {/* FIX: Added className for styling. */}
                        <UserIcon className="w-16 h-16 text-white/50" />
                    </div>
                )}
                {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                        {/* FIX: Added className for styling. */}
                        <PencilSquareIcon className="w-8 h-8 text-white" />
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} accept="image/*" className="hidden"/>
            </div>
            <div className="flex-grow">
                {isEditing ? (
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="text-3xl font-bold bg-transparent border-b-2 border-white/20 focus:outline-none focus:border-[#1E90FF] w-full"/>
                ) : (
                    <h1 className="text-3xl font-bold">{username}</h1>
                )}
                {isEditing ? (
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="text-gray-300 mt-2 bg-transparent border border-white/20 rounded-lg p-2 w-full h-20 resize-none focus:outline-none focus:border-[#1E90FF]"/>
                ) : (
                    <p className="text-gray-300 mt-2">{bio}</p>
                )}
            </div>
            <div>
            {isEditing ? (
                <button onClick={handleSave} className="bg-[#1E90FF] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200">
                    Save
                </button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200">
                    Edit
                </button>
            )}
            </div>
        </div>
      </GlassmorphismCard>

      <h2 className="text-2xl font-bold text-center mb-6">Your Progress Charts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassmorphismCard className="h-80">
          <h3 className="text-xl font-semibold mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #1E90FF' }} />
              <Legend />
              <Bar dataKey="minutes" fill="#1E90FF" />
            </BarChart>
          </ResponsiveContainer>
        </GlassmorphismCard>
        
        <GlassmorphismCard className="h-80">
          <h3 className="text-xl font-semibold mb-4">XP Growth</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={xpGrowthData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="day" stroke="#9ca3af" label={{ value: 'Day', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}/>
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #1E90FF' }}/>
              <Legend />
              <Line type="monotone" dataKey="xp" stroke="#1E90FF" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassmorphismCard>

        <GlassmorphismCard className="h-80">
          <h3 className="text-xl font-semibold mb-4">Rep Accuracy (Mock)</h3>
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               {/* Fix: The `percent` property from recharts' Pie component can be undefined. Defaulted to 0 to prevent a TypeError. */}
               <Pie data={repAccuracyData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                 {repAccuracyData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #1E90FF' }} />
               <Legend />
             </PieChart>
           </ResponsiveContainer>
        </GlassmorphismCard>

        <GlassmorphismCard className="h-80">
          <h3 className="text-xl font-semibold mb-4">Monthly Photo Edits</h3>
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={photoEditsData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #1E90FF' }} />
              <Legend />
              <Bar dataKey="edits" fill="#1E90FF" />
            </BarChart>
          </ResponsiveContainer>
        </GlassmorphismCard>
      </div>
    </div>
  );
};

export default ProfileScreen;