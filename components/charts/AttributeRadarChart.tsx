import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Attribute, Score } from '../../types';

interface AttributeRadarChartProps {
  attributes: Attribute[];
  scores: Score[];
}

const AttributeRadarChart: React.FC<AttributeRadarChartProps> = ({ attributes, scores }) => {
    const data = attributes.map(attr => {
    const relevantScores = scores.filter(s => s.attribute_id === attr.attribute_id);
    const averageScore = relevantScores.length > 0
      ? relevantScores.reduce((acc, s) => acc + s.score, 0) / relevantScores.length
      : 0;
    return {
      subject: attr.attribute_name,
      A: Math.round(averageScore),
      fullMark: 100,
    };
  });

  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid strokeOpacity={0.3}/>
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: '12px' }}/>
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }}/>
            <Radar name="คะแนน" dataKey="A" stroke="#8884d8" fill="#c3b4f2" fillOpacity={0.6} />
             <Tooltip
                contentStyle={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '1rem',
                }}
            />
        </RadarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default AttributeRadarChart;