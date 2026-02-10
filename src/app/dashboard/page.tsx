// app/dashboard/page.tsx
'use client';

import { useAuth } from '../../wrappers/AuthProvider';
import { useApi } from '@/hooks/useApi';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const api = useApi();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSites();
    }
  }, [user]);

  const loadSites = async () => {
    try {
      const data = await api.get<any[]>(`/api/sites?studyId=${user?.studyId}`);
      setSites(data);
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.name}!</h2>
        <p>Email: {user.email}</p>
        <p>Roles: {user.roles.join(', ')}</p>
        <p>Study ID: {user.studyId}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Your Assigned Sites</h3>
        
        {loading ? (
          <p>Loading sites...</p>
        ) : sites.length > 0 ? (
          <ul className="space-y-2">
            {sites.map((site) => (
              <li key={site.id} className="p-3 border rounded">
                {site.number}: {site.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No sites assigned</p>
        )}
      </div>
    </div>
  );
}