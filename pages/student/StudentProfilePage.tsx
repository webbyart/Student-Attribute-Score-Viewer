
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { StudentData, PortfolioItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { updateProfile, getPortfolio, addPortfolioItem, deletePortfolioItem, uploadFile } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const StudentProfilePage: React.FC = () => {
  const { student } = useOutletContext<StudentData>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // State for tabs
  const [activeTab, setActiveTab] = useState<'info' | 'portfolio'>('info');
  
  // State for Editing Profile
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
      student_name: student.student_name,
      email: student.email,
      password: '', // Only send if changed
      profileImageUrl: student.profileImageUrl
  });

  // State for Portfolio
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState<'All' | 'Award' | 'Project'>('All');
  
  // State for Add Portfolio Modal
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
      title: '',
      description: '',
      category: 'Award',
      date: new Date().toISOString().slice(0, 10),
      imageUrl: ''
  });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  // State for Logout
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'portfolio') {
        fetchPortfolio();
    }
  }, [activeTab]);

  const fetchPortfolio = async () => {
      setLoadingPortfolio(true);
      const items = await getPortfolio(student.student_id);
      setPortfolioItems(items);
      setLoadingPortfolio(false);
  }

  const handleLogout = () => {
    logout();
    navigate('/login-select');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  }

  const saveProfile = async () => {
      setIsSubmitting(true);
      const payload: any = {
          student_id: student.student_id,
          student_name: editFormData.student_name,
          email: editFormData.email,
          profile_image: editFormData.profileImageUrl
      };
      if (editFormData.password) {
          payload.password = editFormData.password;
      }
      
      const res = await updateProfile(student.student_id, payload);
      setIsSubmitting(false);
      
      if (res.success) {
          alert('บันทึกข้อมูลเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่เพื่ออัพเดทข้อมูล');
          setIsEditing(false);
          handleLogout();
      } else {
          alert('เกิดข้อผิดพลาด: ' + res.message);
      }
  }

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      let finalImageUrl = newPortfolioItem.imageUrl;
      if (portfolioFile) {
          finalImageUrl = await uploadFile(portfolioFile);
      }

      const itemPayload = {
          id: Math.random().toString(36).substr(2, 9),
          student_id: student.student_id,
          title: newPortfolioItem.title,
          description: newPortfolioItem.description,
          category: newPortfolioItem.category as any,
          imageUrl: finalImageUrl,
          date: newPortfolioItem.date
      };

      const res = await addPortfolioItem(itemPayload);
      setIsSubmitting(false);
      
      if (res.success) {
          setIsAddPortfolioOpen(false);
          setNewPortfolioItem({ title: '', description: '', category: 'Award', date: new Date().toISOString().slice(0, 10), imageUrl: '' });
          setPortfolioFile(null);
          fetchPortfolio();
      } else {
          alert('เกิดข้อผิดพลาด: ' + res.message);
      }
  }

  const handleDeletePortfolio = async (id: string) => {
      if (confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
          await deletePortfolioItem(id);
          fetchPortfolio();
      }
  }

  const filteredPortfolio = portfolioTab === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(p => p.category === portfolioTab);

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {/* Top Background Design */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-b-[2rem] shadow-lg -z-10"></div>
      
      <header className="pt-4 text-white flex justify-between items-center px-2">
        <div>
            <h1 className="text-2xl font-bold">ข้อมูลส่วนตัว</h1>
            <p className="text-sm opacity-90">จัดการข้อมูลและผลงาน</p>
        </div>
        <button onClick={() => setIsLogoutConfirmOpen(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition backdrop-blur-md">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </header>

      {/* Profile Header Card */}
      <div className="flex flex-col items-center mt-6">
        <div className="relative group">
            <img
            src={editFormData.profileImageUrl || student.profileImageUrl}
            alt={student.student_name}
            className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover bg-white"
            />
             {isEditing && (
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center cursor-pointer">
                     <span className="text-white text-xs font-bold">เปลี่ยนรูป</span>
                 </div>
             )}
             <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${student.lineUserId ? 'bg-green-500' : 'bg-slate-300'}`}>
                 {student.lineUserId ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 5 3.7 6.6.2.1.3.4.1.7-.2.6-.5 2.1-.5 2.2 0 .2.2.4.4.2.2-.1 2.3-1.4 3.2-1.9.3-.2.6-.2.9-.2.7.1 1.4.2 2.2.2 5.5 0 10-3.8 10-8.5C22 5.8 17.5 2 12 2z"/></svg> : <span className="text-white text-xs">OFF</span>}
             </div>
        </div>
        
        {!isEditing ? (
            <div className="text-center mt-3">
                <h2 className="text-2xl font-bold text-slate-800">{student.student_name}</h2>
                <p className="text-slate-500 font-medium">{student.student_id} | ชั้น {student.grade}/{student.classroom}</p>
                <button onClick={() => setIsEditing(true)} className="mt-3 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-full text-sm font-bold hover:bg-purple-100 transition border border-purple-100">
                    ✏️ แก้ไขข้อมูล
                </button>
            </div>
        ) : (
            <div className="w-full max-w-xs mt-4 space-y-3 bg-white p-4 rounded-xl shadow-lg border border-slate-100 animate-fade-in">
                <div>
                    <label className="text-xs font-bold text-slate-500">ชื่อ-นามสกุล</label>
                    <input name="student_name" value={editFormData.student_name} onChange={handleEditChange} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:outline-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500">รูปโปรไฟล์ (URL)</label>
                    <input name="profileImageUrl" value={editFormData.profileImageUrl} onChange={handleEditChange} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:outline-none" placeholder="https://..." />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500">อีเมล</label>
                    <input name="email" value={editFormData.email} onChange={handleEditChange} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:outline-none" />
                </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                    <input name="password" type="password" value={editFormData.password} onChange={handleEditChange} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200 focus:outline-none" placeholder="xxxxxx" />
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">ยกเลิก</button>
                    <button onClick={saveProfile} disabled={isSubmitting} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-purple-700">{isSubmitting ? '...' : 'บันทึก'}</button>
                </div>
            </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mx-auto max-w-md">
          <button 
            onClick={() => setActiveTab('info')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'info' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
              ข้อมูลทั่วไป
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'portfolio' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Portfolio & ผลงาน
          </button>
      </div>

      {/* Content Area */}
      {activeTab === 'info' ? (
        <div className="animate-fade-in space-y-4">
             <Card>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">ข้อมูลการติดต่อ</h3>
                <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">อีเมล</span>
                    <span className="font-medium text-slate-800">{student.email}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">LINE Status</span>
                    <span className={`font-medium ${student.lineUserId ? 'text-green-600' : 'text-slate-400'}`}>
                        {student.lineUserId ? 'เชื่อมต่อแล้ว ✅' : 'ยังไม่เชื่อมต่อ'}
                    </span>
                </div>
                </div>
            </Card>
             <Card>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">สถานะการเรียน</h3>
                 <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">ระดับชั้น</span>
                        <span className="font-medium text-slate-800">มัธยมศึกษาปีที่ {student.grade.replace('ม.', '')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">ห้อง</span>
                        <span className="font-medium text-slate-800">{student.classroom}</span>
                    </div>
                </div>
             </Card>
        </div>
      ) : (
          <div className="animate-fade-in space-y-4">
              {/* Portfolio Controls */}
              <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                      <button onClick={() => setPortfolioTab('All')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${portfolioTab === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>ทั้งหมด</button>
                      <button onClick={() => setPortfolioTab('Award')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${portfolioTab === 'Award' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-slate-500 border-slate-200'}`}>รางวัล/เกียรติบัตร</button>
                      <button onClick={() => setPortfolioTab('Project')} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${portfolioTab === 'Project' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200'}`}>โครงงาน/กิจกรรม</button>
                  </div>
                  <button onClick={() => setIsAddPortfolioOpen(true)} className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
              </div>

              {loadingPortfolio ? (
                  <LoadingSpinner />
              ) : filteredPortfolio.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredPortfolio.map(item => (
                          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition">
                              <div className="h-40 bg-slate-100 relative overflow-hidden">
                                  {item.imageUrl ? (
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                                          {item.category === 'Award' ? '🏆' : '📂'}
                                      </div>
                                  )}
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm text-white ${item.category === 'Award' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                                        {item.category === 'Award' ? 'เกียรติบัตร' : 'ผลงาน'}
                                    </span>
                                  </div>
                              </div>
                              <div className="p-4 relative">
                                  <button onClick={() => handleDeletePortfolio(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                  <h3 className="font-bold text-slate-800 leading-tight mb-1 pr-6">{item.title}</h3>
                                  <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">วันที่: {new Date(item.date).toLocaleDateString('th-TH')}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-16 bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl">
                      <span className="text-4xl block mb-2 opacity-50">🌟</span>
                      <p className="text-slate-500 font-medium">ยังไม่มีผลงานในหมวดนี้</p>
                      <button onClick={() => setIsAddPortfolioOpen(true)} className="mt-2 text-sm text-purple-600 font-bold hover:underline">เพิ่มผลงานใหม่</button>
                  </div>
              )}
          </div>
      )}

      <ConfirmModal 
        isOpen={isLogoutConfirmOpen}
        title="ออกจากระบบ"
        message="คุณต้องการออกจากระบบใช่หรือไม่?"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        confirmText="ออกจากระบบ"
        variant="danger"
      />

      {/* Add Portfolio Modal */}
      {isAddPortfolioOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold">เพิ่มผลงาน / เกียรติบัตร</h3>
                      <button onClick={() => setIsAddPortfolioOpen(false)} className="opacity-70 hover:opacity-100">✕</button>
                  </div>
                  <form onSubmit={handlePortfolioSubmit} className="p-4 space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">ประเภท</label>
                          <div className="flex gap-2">
                              <label className={`flex-1 py-2 text-center rounded-lg text-xs font-bold border cursor-pointer ${newPortfolioItem.category === 'Award' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  <input type="radio" className="hidden" name="category" checked={newPortfolioItem.category === 'Award'} onChange={() => setNewPortfolioItem({...newPortfolioItem, category: 'Award'})} />
                                  🏆 รางวัล/เกียรติบัตร
                              </label>
                              <label className={`flex-1 py-2 text-center rounded-lg text-xs font-bold border cursor-pointer ${newPortfolioItem.category === 'Project' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  <input type="radio" className="hidden" name="category" checked={newPortfolioItem.category === 'Project'} onChange={() => setNewPortfolioItem({...newPortfolioItem, category: 'Project'})} />
                                  📂 ผลงาน/กิจกรรม
                              </label>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">หัวข้อ</label>
                          <input required value={newPortfolioItem.title} onChange={e => setNewPortfolioItem({...newPortfolioItem, title: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder="เช่น รางวัลเหรียญทอง..." />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">รายละเอียด (สั้นๆ)</label>
                          <input value={newPortfolioItem.description} onChange={e => setNewPortfolioItem({...newPortfolioItem, description: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder="คำอธิบายเพิ่มเติม..." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">วันที่ได้รับ</label>
                              <input type="date" required value={newPortfolioItem.date} onChange={e => setNewPortfolioItem({...newPortfolioItem, date: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200" />
                          </div>
                           <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">รูปภาพ (URL)</label>
                              <input value={newPortfolioItem.imageUrl} onChange={e => setNewPortfolioItem({...newPortfolioItem, imageUrl: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder="https://..." />
                          </div>
                      </div>
                      
                      <div className="pt-2">
                           <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition disabled:opacity-50">
                               {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                           </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
