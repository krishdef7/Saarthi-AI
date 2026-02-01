"use client";

import { memo, useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface RadarProps {
    data: Record<string, number>;
}

const EligibilityRadar = memo(function EligibilityRadar({ data }: RadarProps) {
    // Memoize chart data transformation
    const chartData = useMemo(() => {
        if (!data || Object.keys(data).length === 0) return null;

        return Object.entries(data).map(([subject, A]) => ({
            subject,
            A: A ?? 0,
            fullMark: 100,
        }));
    }, [data]);

    // Handle null/undefined/empty data gracefully
    if (!chartData) {
        return (
            <div className="w-full h-[250px] flex items-center justify-center text-slate-500 text-sm">
                No eligibility data available
            </div>
        );
    }

    return (
        <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 10, dy: 4 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name="Match"
                        dataKey="A"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="#06b6d4"
                        fillOpacity={0.2}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: number | string | undefined) => [`${value}%`, 'Score']}
                        separator=": "
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
});

export default EligibilityRadar;
