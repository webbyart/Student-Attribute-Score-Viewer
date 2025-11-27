import React from 'react';
import { Score } from '../../types';

interface TimelineProps {
  scores: Score[];
}

const Timeline: React.FC<TimelineProps> = ({ scores }) => {
  if (scores.length === 0) {
    return <p className="text-center text-slate-500 mt-4">ไม่มีประวัติสำหรับคุณลักษณะนี้</p>;
  }

  const sortedScores = [...scores].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 h-full w-0.5 bg-purple-200"></div>
      {sortedScores.map((score) => (
        <div key={score.score_id} className="relative mb-8">
          <div className="absolute -left-1.5 top-1.5 h-4 w-4 rounded-full bg-purple-500 border-4 border-white"></div>
          <div className="ml-4">
            <p className="text-sm text-slate-500">
              {new Date(score.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            </p>
            <div className="flex items-baseline space-x-2">
              <p className="text-xl font-bold text-purple-700">{score.score}</p>
              <p className="text-sm font-medium text-slate-600">โดย {score.teacherName || 'คุณครู'}</p>
            </div>
            <p className="mt-1 text-slate-700 bg-purple-50 p-3 rounded-lg">"{score.comment}"</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;