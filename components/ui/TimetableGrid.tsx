
import React, { useEffect, useState } from 'react';
import { TimetableEntry } from '../../types';
import { getTimetable } from '../../services/api';
import LoadingSpinner from './LoadingSpinner';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const dayLabels: Record<string, string> = {
    'Monday': 'จันทร์',
    'Tuesday': 'อังคาร',
    'Wednesday': 'พุธ',
    'Thursday': 'พฤหัสบดี',
    'Friday': 'ศุกร์'
};
const dayColors: Record<string, string> = {
    'Monday': 'bg-yellow-400 text-yellow-900',
    'Tuesday': 'bg-pink-400 text-pink-900',
    'Wednesday': 'bg-green-400 text-green-900',
    'Thursday': 'bg-orange-400 text-orange-900',
    'Friday': 'bg-blue-400 text-blue-900'
};

const TimetableGrid: React.FC = () => {
    const [grade, setGrade] = useState('ม.4');
    const [classroom, setClassroom] = useState('1');
    const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, [grade, classroom]);

    const fetchSchedule = async () => {
        setLoading(true);
        const data = await getTimetable(grade, classroom);
        setSchedule(data);
        setLoading(false);
    };

    // Get unique periods for column headers
    const periods = Array.from(new Set(schedule.map(s => s.period_time))).sort();
    
    // Sort logic to ensure correct column order based on period_index if available, else time string
    // Assuming backend returns sorted by index, but let's be safe:
    const sortedPeriods = schedule
        .reduce((acc: {time: string, index: number}[], curr) => {
            if (!acc.find(p => p.time === curr.period_time)) {
                acc.push({ time: curr.period_time, index: curr.period_index });
            }
            return acc;
        }, [])
        .sort((a, b) => a.index - b.index)
        .map(p => p.time);


    const getEntry = (day: string, time: string) => {
        return schedule.find(s => s.day_of_week === day && s.period_time === time);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Controls */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">📅 ตารางเรียน</h3>
                    <p className="text-xs text-slate-500">เลือกชั้นเรียนเพื่อดูตาราง</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={grade} 
                        onChange={(e) => setGrade(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                        <option value="ม.4">ม.4</option>
                        <option value="ม.5">ม.5</option>
                        <option value="ม.6">ม.6</option>
                    </select>
                    <select 
                        value={classroom} 
                        onChange={(e) => setClassroom(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                        <option value="1">ห้อง 1</option>
                        <option value="2">ห้อง 2</option>
                        <option value="3">ห้อง 3</option>
                    </select>
                </div>
            </div>

            {/* Grid Content */}
            <div className="overflow-x-auto p-4">
                {loading ? (
                    <div className="py-12"><LoadingSpinner /></div>
                ) : schedule.length > 0 ? (
                    <div className="min-w-[800px]">
                        {/* Header Row (Times) */}
                        <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(120px,1fr))] gap-2 mb-2">
                            <div className="font-bold text-slate-400 text-xs text-center self-end">วัน/เวลา</div>
                            {sortedPeriods.map((time, i) => (
                                <div key={i} className="text-center bg-slate-100 rounded-lg py-2">
                                    <span className="text-xs font-bold text-slate-600 block">{time}</span>
                                    <span className="text-[10px] text-slate-400">คาบที่ {i + 1}</span>
                                </div>
                            ))}
                        </div>

                        {/* Rows (Days) */}
                        <div className="space-y-2">
                            {daysOfWeek.map(day => (
                                <div key={day} className="grid grid-cols-[80px_repeat(auto-fit,minmax(120px,1fr))] gap-2">
                                    {/* Day Label */}
                                    <div className={`rounded-lg flex items-center justify-center font-bold text-sm shadow-sm ${dayColors[day]}`}>
                                        {dayLabels[day]}
                                    </div>

                                    {/* Subject Cells */}
                                    {sortedPeriods.map((time, i) => {
                                        const entry = getEntry(day, time);
                                        return (
                                            <div key={i} className={`relative p-2 rounded-lg border min-h-[80px] flex flex-col justify-center items-center text-center transition hover:shadow-md ${entry ? entry.color : 'bg-slate-50 border-slate-100 border-dashed'}`}>
                                                {entry ? (
                                                    <>
                                                        <span className="text-sm font-bold leading-tight">{entry.subject}</span>
                                                        <span className="text-[10px] opacity-75 mt-1">{entry.teacher}</span>
                                                        <span className="absolute top-1 right-1 text-[9px] font-mono opacity-50 bg-white/50 px-1 rounded">{entry.room}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <span className="text-4xl block mb-2">📅</span>
                        <p className="text-slate-500">ยังไม่มีข้อมูลตารางเรียนสำหรับชั้นนี้</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableGrid;
