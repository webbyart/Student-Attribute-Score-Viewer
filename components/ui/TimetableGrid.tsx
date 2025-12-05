
import React from 'react';
import { TimetableEntry } from '../../types';
import LoadingSpinner from './LoadingSpinner';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const dayLabels: Record<string, string> = {
    'Monday': 'จันทร์',
    'Tuesday': 'อังคาร',
    'Wednesday': 'พุธ',
    'Thursday': 'พฤหัสบดี',
    'Friday': 'ศุกร์'
};

const dayStyles: Record<string, { gradient: string, shadow: string, border: string }> = {
    'Monday': { gradient: 'from-amber-200 to-yellow-400', shadow: 'shadow-yellow-200', border: 'border-yellow-100' },
    'Tuesday': { gradient: 'from-pink-200 to-rose-400', shadow: 'shadow-pink-200', border: 'border-pink-100' },
    'Wednesday': { gradient: 'from-emerald-200 to-green-400', shadow: 'shadow-green-200', border: 'border-green-100' },
    'Thursday': { gradient: 'from-orange-200 to-amber-500', shadow: 'shadow-orange-200', border: 'border-orange-100' },
    'Friday': { gradient: 'from-sky-200 to-blue-400', shadow: 'shadow-blue-200', border: 'border-blue-100' }
};

const DEFAULT_PERIODS = [
    { label: 'คาบที่ 1', time: '08:15 - 09:05', index: 1 },
    { label: 'คาบที่ 2', time: '09:05 - 09:55', index: 2 },
    { label: 'คาบที่ 3', time: '10:10 - 11:00', index: 3 },
    { label: 'พักเที่ยง', time: '11:50 - 12:40', index: 99, isBreak: true },
    { label: 'คาบที่ 4', time: '12:40 - 13:30', index: 4 },
    { label: 'คาบที่ 5', time: '13:30 - 14:20', index: 5 },
    { label: 'คาบที่ 6', time: '14:20 - 15:10', index: 6 }
];

interface TimetableGridProps {
    grade: string;
    classroom: string;
    onGradeChange: (val: string) => void;
    onClassroomChange: (val: string) => void;
    scheduleData: TimetableEntry[];
    loading: boolean;
    onSlotDoubleClick?: (day: string, periodIndex: number, time: string, currentEntry?: TimetableEntry) => void;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ grade, classroom, onGradeChange, onClassroomChange, scheduleData, loading, onSlotDoubleClick }) => {
    
    // Instead of dynamic, we use the specific period structure requested
    const displayPeriods = DEFAULT_PERIODS;

    const getEntry = (day: string, index: number) => {
        return scheduleData.find(s => s.day_of_week === day && s.period_index === index);
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/40 overflow-hidden">
            {/* Header Controls */}
            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-gradient-to-r from-white to-slate-50">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-2xl tracking-tight">ตารางเรียน</h3>
                        <p className="text-xs text-slate-500 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded-full mt-1">Class Timetable</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative group">
                        <select 
                            value={grade} 
                            onChange={(e) => onGradeChange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 shadow-sm transition group-hover:border-purple-300 cursor-pointer"
                        >
                            <option value="ม.3">ม.3</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-hover:text-purple-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    <div className="relative group">
                        <select 
                            value={classroom} 
                            onChange={(e) => onClassroomChange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 shadow-sm transition group-hover:border-purple-300 cursor-pointer"
                        >
                            <option value="3">ห้อง 3</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-hover:text-purple-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="overflow-x-auto p-6">
                {loading ? (
                    <div className="py-24 flex justify-center"><LoadingSpinner /></div>
                ) : (
                    <div className="min-w-[900px]">
                        {/* Time Headers */}
                        <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-4">
                            <div className="font-bold text-slate-300 text-[10px] text-center self-end pb-2 uppercase tracking-widest">Day</div>
                            {displayPeriods.map((period, i) => (
                                <div key={i} className={`text-center rounded-2xl py-3 shadow-sm border border-slate-100 relative overflow-hidden ${period.isBreak ? 'bg-slate-50 opacity-80' : 'bg-white'}`}>
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${period.isBreak ? 'from-slate-200 to-slate-300' : 'from-purple-200 to-indigo-200'}`}></div>
                                    <div className="text-[10px] font-black text-slate-300 mb-0.5 tracking-wide uppercase">{period.label}</div>
                                    <span className="text-sm font-bold text-slate-600 block">{period.time}</span>
                                </div>
                            ))}
                        </div>

                        {/* Days Rows */}
                        <div className="space-y-4">
                            {daysOfWeek.map(day => {
                                const style = dayStyles[day] || { gradient: 'from-slate-200 to-slate-300', shadow: 'shadow-slate-200', border: 'border-slate-200' };
                                return (
                                <div key={day} className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] gap-4 group/row">
                                    {/* Day Header Card */}
                                    <div className={`rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br ${style.gradient} ${style.shadow} transition-transform group-hover/row:scale-105 duration-300 relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-white opacity-0 group-hover/row:opacity-10 transition-opacity"></div>
                                        <span className="text-xl drop-shadow-sm">{dayLabels[day].charAt(0)}</span>
                                        <span className="text-[10px] font-medium opacity-90">{dayLabels[day].substring(1)}</span>
                                    </div>

                                    {/* Subject Cards */}
                                    {displayPeriods.map((period, i) => {
                                        if (period.isBreak) {
                                            return (
                                                 <div key={i} className="rounded-2xl flex items-center justify-center bg-slate-50/50 border border-slate-100 border-dashed">
                                                     <span className="text-xs font-medium text-slate-400">พัก</span>
                                                 </div>
                                            );
                                        }

                                        const entry = getEntry(day, period.index);
                                        return (
                                            <div 
                                                key={i} 
                                                onDoubleClick={() => onSlotDoubleClick && onSlotDoubleClick(day, period.index, period.time, entry)}
                                                className={`relative p-3 rounded-2xl flex flex-col justify-between items-start text-left min-h-[100px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${entry ? `bg-white border-2 ${style.border} shadow-sm` : 'bg-slate-50/30 border border-slate-100 hover:bg-white hover:border-purple-200'}`}
                                            >
                                                {entry ? (
                                                    <>
                                                        <div className="w-full">
                                                            <div className="flex justify-between items-start mb-1.5">
                                                                <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full bg-slate-800/80 backdrop-blur-sm">{entry.room}</span>
                                                            </div>
                                                            <span className="text-sm font-bold leading-snug block text-slate-800 line-clamp-2">{entry.subject}</span>
                                                        </div>
                                                        <div className="w-full pt-2 mt-auto border-t border-slate-50 flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">👨‍🏫</div>
                                                            <span className="text-[10px] font-semibold text-slate-500 truncate">{entry.teacher}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                                                         <span className="text-slate-400 text-2xl font-light">+</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )})}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableGrid;
