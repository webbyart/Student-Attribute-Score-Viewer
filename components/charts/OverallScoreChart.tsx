import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Attribute, Score } from '../../types';

interface OverallScoreChartProps {
  attributes: Attribute[];
  scores: Score[];
}

const COLORS = ['#F7DFFF', '#CDE8FF', '#FFF7DC', '#D4F0F0', '#FFE5E5', '#E5E5FF', '#DFF2D9', '#FFDBC7'];

const OverallScoreChart: React.FC<OverallScoreChartProps> = ({ attributes, scores }) => {
  const data = attributes.map(attr => {
    const relevantScores = scores.filter(s => s.attribute_id === attr.attribute_id);
    const averageScore = relevantScores.length > 0
      ? relevantScores.reduce((acc, s) => acc + s.score, 0) / relevantScores.length
      : 0;
    return {
      name: attr.attribute_name,
      score: Math.round(averageScore),
    };
  });

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
          <YAxis tick={{ fill: '#64748b' }} domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: 'rgba(233, 213, 255, 0.3)' }}
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '1rem',
            }}
          />
          <Bar dataKey="score" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OverallScoreChart;