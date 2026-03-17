import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { Users, Trash2, Shield, Mail, Calendar, UserCheck, UserPlus, Key, User as UserIcon, Loader2, X, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AdminPanel: React.FC = () => {
  const { users, removeUser, updateUserRole, addUser } = useAuth();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('LAWYER');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) {
      addToast('error', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setIsCreating(true);

    try {
      await addUser({
        name: newUserName,
        username: newUserUsername,
        password: newUserPassword,
        role: newUserRole
      });
      
      addToast('success', 'Kullanıcı başarıyla oluşturuldu.');
      setShowAddModal(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
    } catch (error: any) {
      console.error("Create User Error:", error);
      addToast('error', error.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingUsersCount = users.filter(u => u.role === 'PENDING').length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="text-blue-600" size={32} />
            Yönetim Paneli
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Kayıtlı kullanıcıları görüntüleyin ve yetkilerini düzenleyin.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {pendingUsersCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold animate-pulse border border-amber-200 dark:border-amber-800">
              <AlertCircle size={18} />
              {pendingUsersCount} Onay Bekleyen Kayıt
            </div>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition-all"
          >
            <UserPlus size={18} /> Yeni Kullanıcı Ekle
          </button>
          <div className="relative">
            <input 
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
            <Users className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Kayıtlı Kullanıcılar ({filteredUsers.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Kullanıcı</th>
                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Kullanıcı Adı</th>
                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Rol / Yetki</th>
                <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredUsers.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 dark:hover:hover:bg-slate-700/50 transition-colors group ${u.role === 'PENDING' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                        alt={u.name} 
                        className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600 shadow-sm" 
                      />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {u.name}
                          {u.role === 'PENDING' && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-[8px] text-white rounded-full uppercase">Yeni</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase">ID: {u.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-slate-400" />
                      {u.username}
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={u.role}
                      onChange={(e) => updateUserRole?.(u.id, e.target.value as UserRole)}
                      className={`px-2 py-1 rounded text-xs font-bold border outline-none cursor-pointer ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' 
                          : u.role === 'PENDING'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                          : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      }`}
                    >
                      <option value="PENDING">BEKLEMEDE</option>
                      <option value="LAWYER">AVUKAT</option>
                      <option value="ADMIN">YÖNETİCİ</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.role === 'PENDING' && (
                        <button 
                          onClick={() => updateUserRole?.(u.id, 'LAWYER')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <UserCheck size={12} /> Onayla
                        </button>
                      )}
                      <button 
                        onClick={() => removeUser(u.id)}
                        disabled={u.username === 'Hakan'} // Ana admin silinemez
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-400">
          <UserCheck size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 dark:text-blue-200">Kullanıcı Yönetimi Hakkında</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Yönetici olarak yeni kullanıcılar oluşturabilir ve onlara giriş bilgileri atayabilirsiniz. Kullanıcılar bu bilgilerle sisteme giriş yapabilirler.
          </p>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                Yeni Kullanıcı Oluştur
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Ad Soyad</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                  <UserIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Kullanıcı Adı</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="kullanici_adi"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                  <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Şifre</label>
                <div className="relative">
                  <input 
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                  <Key className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                  Kullanıcıyı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
