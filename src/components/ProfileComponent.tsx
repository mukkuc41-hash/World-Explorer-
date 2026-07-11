import React, { useState, useEffect } from 'react';

function ProfileComponent() {
  const [guestId, setGuestId] = useState('Guest'); // Default value

  useEffect(() => {
    // Retrieve the ID from localStorage
    const storedId = localStorage.getItem('world_explorer_guest_id');
    
    // If it exists, update the state
    if (storedId) {
      setGuestId(storedId);
    }
  }, []); // The empty array ensures this runs only once on mount

  return (
    <div className="p-6 bg-white dark:bg-stone-900 rounded-2xl shadow border border-slate-100 dark:border-stone-800">
      {/* This will now display the ID from localStorage */}
      <h2 className="text-lg font-bold text-slate-800 dark:text-stone-200">User: {guestId}</h2>
    </div>
  );
}

export default ProfileComponent;
