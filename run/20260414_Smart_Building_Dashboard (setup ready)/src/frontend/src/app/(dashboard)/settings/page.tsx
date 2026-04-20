'use client';

import { useState, useEffect } from 'react';
import { User, Shield, Save, Trash2, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, UserRole } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  // Profile state
  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Users state (admin only)
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'technician' as UserRole });
  const [addError, setAddError] = useState('');

  const isAdmin = user?.role === 'sys_admin';

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      setUsersLoading(true);
      api.get<{ data: UserItem[] }>('/users')
        .then((res) => setUsers(res.data))
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, isAdmin]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      await api.put('/users/me', { name });
      await refreshUser();
      setProfileMsg('Profile updated successfully');
    } catch (err: unknown) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to update profile');
    }
    setProfileSaving(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    try {
      await api.post('/auth/register', newUser);
      setShowAddUser(false);
      setNewUser({ email: '', name: '', password: '', role: 'technician' });
      // Refresh list
      const res = await api.get<{ data: UserItem[] }>('/users');
      setUsers(res.data);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await api.patch(`/users/${userId}`, { isActive: !currentActive });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentActive } : u));
    } catch {}
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'text-blue-400 border-blue-400'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-2"><User className="h-4 w-4" /> Profile</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> User Management</span>
          </button>
        )}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-md">
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-2xl font-medium text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <h2 className="text-lg font-medium text-slate-100">{user?.name}</h2>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <StatusBadge variant="blue" label={user?.role?.replace(/_/g, ' ') ?? ''} className="mt-1 capitalize" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="profile-name" className="label">Display Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input type="email" value={user?.email ?? ''} disabled className="input-field opacity-50 cursor-not-allowed" />
              </div>

              <div>
                <label className="label">Role</label>
                <input type="text" value={user?.role?.replace(/_/g, ' ') ?? ''} disabled className="input-field opacity-50 cursor-not-allowed capitalize" />
              </div>

              {profileMsg && (
                <p className={`text-sm ${profileMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                  {profileMsg}
                </p>
              )}

              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && isAdmin && (
        <div>
          {/* Actions bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input-field pl-9"
                placeholder="Search users..."
              />
            </div>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="card mb-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">New User</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input-field" required minLength={8} autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="input-field">
                    <option value="technician">Technician</option>
                    <option value="sys_admin">System Admin</option>
                    <option value="financial_decision_maker">Financial Decision Maker</option>
                  </select>
                </div>
                {addError && <p className="text-sm text-red-400 col-span-full">{addError}</p>}
                <div className="col-span-full flex gap-2">
                  <button type="submit" className="btn-primary text-sm">Create User</button>
                  <button type="button" onClick={() => setShowAddUser(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {usersLoading ? (
            <LoadingSpinner size="md" className="py-12" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Role</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Last Login</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-3 text-slate-200">{u.name}</td>
                      <td className="py-2 px-3 text-slate-300">{u.email}</td>
                      <td className="py-2 px-3">
                        <StatusBadge variant="blue" label={u.role.replace(/_/g, ' ')} className="capitalize" />
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge variant={u.isActive ? 'green' : 'red'} label={u.isActive ? 'Active' : 'Inactive'} dot />
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-xs">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`text-xs px-2 py-1 rounded ${u.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
