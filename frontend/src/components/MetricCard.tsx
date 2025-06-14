import React from 'react';

interface MetricCardProps {
  metric: string;
  value: string;
  evaluation: string;
  target: string;
  advice: string;
  score: number | null;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  value,
  evaluation,
  target,
  advice,
  score,
  bgColor,
  textColor,
  borderColor
}) => {
  // スコアに基づく色の決定
  const getStatusColor = () => {
    if (score === null) return 'bg-gray-500';
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (score === null) return 'text-gray-700';
    if (score >= 0.9) return 'text-green-700';
    if (score >= 0.5) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className={`bg-gradient-to-br ${bgColor} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{metric}</h4>
        <span className={`w-3 h-3 rounded-full ${getStatusColor()}`}></span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>
        {value}
      </p>
      <div className={`mt-2 pt-2 border-t ${borderColor}`}>
        <p className={`text-xs font-semibold ${getTextColor()}`}>
          {evaluation}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          🎯 {target}
        </p>
        <p className="text-xs text-gray-700 mt-1">
          💡 {advice}
        </p>
      </div>
    </div>
  );
};

export default MetricCard;