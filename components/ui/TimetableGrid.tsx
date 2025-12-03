
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

// Beautiful Gradients for Days
const dayHeaders: Record<string, string> = {
    'Monday': 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-yellow-200',
    'Tuesday': 'bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-pink-200',
    'Wednesday': 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-green-200',
    'Thursday': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-200',
    'Friday': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-blue-200'
};

interface TimetableGridProps {
    grade: string;
    classroom: string;
    onGradeChange: (val: string) => void;
    onClassroomChange: (val: string) => void;
    scheduleData: TimetableEntry[];
    loading: boolean;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ grade, classroom, onGradeChange, onClassroomChange, scheduleData, loading }) => {
    
    // Get unique periods for column headers
    const periods = Array.from(new Set(scheduleData.map(s => s.period_time))).sort();
    
    // Sort logic
    const sortedPeriods = scheduleData
        .reduce((acc: {time: string, index: number}[], curr) => {
            if (!acc.find(p => p.time === curr.period_time)) {
                acc.push({ time: curr.period_time, index: curr.period_index });
            }
            return acc;
        }, [])
        .sort((a, b) => a.index - b.index)
        .map(p => p.time);

    const getEntry = (day: string, time: string) => {
        return scheduleData.find(s => s.day_of_week === day && s.period_time === time);
    };

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Header Controls */}
            <div className="p-6 bg-white border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-xl tracking-tight">ตารางเรียน</h3>
                        <p className="text-xs text-slate-500 font-medium">Class Timetable</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select 
                            value={grade} 
                            onChange={(e) => onGradeChange(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 hover:border-purple-300 transition cursor-pointer"
                        >
                            <option value="ม.3">ม.3</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    <div className="relative">
                        <select 
                            value={classroom} 
                            onChange={(e) => onClassroomChange(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 hover:border-purple-300 transition cursor-pointer"
                        >
                            <option value="3">ห้อง 3</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="overflow-x-auto p-6 bg-slate-50/50">
                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                ) : scheduleData.length > 0 ? (
                    <div className="min-w-[900px]">
                        {/* Time Headers */}
                        <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-3">
                            <div className="font-bold text-slate-400 text-[10px] text-center self-end pb-2 uppercase tracking-wider">Day / Time</div>
                            {sortedPeriods.map((time, i) => (
                                <div key={i} className="text-center bg-white rounded-2xl py-3 shadow-sm border border-slate-100 relative group">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-200 text-slate-500 text-[9px] font-bold px-2 rounded-full">
                                        P.{i + 1}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 block">{time}</span>
                                </div>
                            ))}
                        </div>

                        {/* Days Rows */}
                        <div className="space-y-3">
                            {daysOfWeek.map(day => (
                                <div key={day} className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-3">
                                    {/* Day Header Card */}
                                    <div className={`rounded-2xl flex flex-col items-center justify-center font-bold text-sm shadow-lg ${dayHeaders[day]} transition-transform hover:scale-105`}>
                                        <span className="text-lg">{dayLabels[day].charAt(0)}</span>
                                        <span className="text-[10px] opacity-80 font-normal">{dayLabels[day].substring(1)}</span>
                                    </div>

                                    {/* Subject Cards */}
                                    {sortedPeriods.map((time, i) => {
                                        const entry = getEntry(day, time);
                                        return (
                                            <div key={i} className={`relative p-3 rounded-2xl border flex flex-col justify-between items-start text-left min-h-[90px] transition-all duration-300 hover:shadow-lg group ${entry ? `${entry.color} bg-white border-transparent shadow-sm` : 'bg-slate-50/50 border-slate-100 border-dashed'}`}>
                                                {entry ? (
                                                    <>
                                                        <div className="w-full">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">วิชา</span>
                                                                <span className="text-[9px] font-bold bg-white/60 px-1.5 py-0.5 rounded text-slate-700 backdrop-blur-sm shadow-sm">{entry.room}</span>
                                                            </div>
                                                            <span className="text-sm font-bold leading-tight block mb-1 line-clamp-2">{entry.subject}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-auto opacity-80">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                            <span className="text-[10px] font-medium truncate">{entry.teacher}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                         <span className="text-slate-200 text-xl opacity-20 group-hover:opacity-50 transition">●</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <span className="text-6xl block mb-4">🗓️</span>
                        <h3 className="text-lg font-bold text-slate-700">ไม่พบตารางเรียน</h3>
                        <p className="text-slate-500 text-sm">ยังไม่มีข้อมูลตารางเรียนสำหรับชั้น {grade}/{classroom}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableGrid;
