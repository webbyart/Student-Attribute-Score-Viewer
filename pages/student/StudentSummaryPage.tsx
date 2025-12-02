import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/ui/Card';
import FileChip from '../../components/ui/FileChip';
import { StudentData, TaskCategory, TaskCategoryLabel, Attribute } from '../../types';

const StudentSummaryPage: React.FC = () => {
  const { tasks, scores, attributes } = useOutletContext<StudentData>();
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'ALL'>('ALL');

  const filteredTasks = selectedCategory === 'ALL' 
    ? tasks 
    : tasks.filter(t => t.category === selectedCategory);

  const categories = Object.values(TaskCategory);

  // Calculate Average Scores for Display
  const attributeAverages = useMemo(() => {
    if (!attributes || !scores) return [];
    return attributes.map(attr => {
        const relevantScores = scores.filter(s => s.attribute_id === attr.attribute_id);
        const average = relevantScores.length > 0
            ? Math.round(relevantScores.reduce((sum, s) => sum + s.score, 0) / relevantScores.length)
            : 0;
        return { ...attr, average };
    }).sort((a, b) => b.average - a.average);
  }, [attributes, scores]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">สรุปผลงาน & กิจกรรม</h1>
        <p className="text-sm text-slate-500">ภาพรวมคะแนนคุณลักษณะและงานทั้งหมด</p>
      </header>

      {/* Score Highlights Badge Section */}
      {attributeAverages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {attributeAverages.map(attr => (
                  <div key={attr.attribute_id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className={`text-xl font-bold mb-1 ${attr.average >= 80 ? 'text-green-500' : (attr.average >= 50 ? 'text-orange-500' : 'text-red-500')}`}>
                          {attr.average}
                          <span className="text-xs text-slate-400 font-normal ml-0.5">/100</span>
                      </div>
                      <span className="text-xs font-medium text-slate-600 line-clamp-2">{attr.attribute_name}</span>
                  </div>
              ))}
          </div>
      )}

      {/* Horizontal Scroll Menu */}
      <div className="flex overflow-x-auto gap-2 pb-2 mt-6 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition ${selectedCategory === 'ALL' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-100'}`}
          >
              ทั้งหมด
          </button>
          {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition ${selectedCategory === cat ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                  {TaskCategoryLabel[cat]}
              </button>
          ))}
      </div>

      <div className="grid gap-4">
          {filteredTasks.length > 0 ? filteredTasks.map(task => (
              <Card key={task.id}>
                  <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-white bg-purple-500 px-2 py-0.5 rounded-full shadow-sm">{TaskCategoryLabel[task.category]}</span>
                      <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">{task.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                  <p className="text-xs text-slate-500 font-medium">วิชา: {task.subject}</p>
                   {task.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                เอกสารแนบ
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {task.attachments.map((file, i) => (
                                    <FileChip key={i} filename={file} className="bg-slate-50 border-slate-200 shadow-sm" />
                                ))}
                            </div>
                        </div>
                   )}
              </Card>
          )) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <span className="text-4xl mb-2">📭</span>
                  <span>ไม่พบข้อมูลในหมวดหมู่นี้</span>
              </div>
          )}
      </div>
    </div>
  );
};

export default StudentSummaryPage;