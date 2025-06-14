import React from 'react';

interface CoreWebVitalCardProps {
  metric: string;
  data: {
    value: number | null;
    displayValue: string;
    score: number | null;
    description: string;
  };
  evaluation: {
    status: string;
    color: string;
    evaluation: string;
    advice: string;
    target: string;
  };
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const CoreWebVitalCard: React.FC<CoreWebVitalCardProps> = ({
  metric,
  data,
  evaluation,
  bgColor,
  textColor,
  borderColor
}) => {
  return (
    <div className={`bg-gradient-to-br ${bgColor} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{metric}</h4>
        <span className={`w-3 h-3 rounded-full bg-${evaluation.color}-500`}></span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>
        {data.displayValue}
      </p>
      <div className={`mt-2 pt-2 border-t ${borderColor}`}>
        <p className={`text-xs font-semibold text-${evaluation.color}-700`}>
          {evaluation.evaluation}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          🎯 {evaluation.target}
        </p>
        <p className="text-xs text-gray-700 mt-1">
          💡 {evaluation.advice}
        </p>
      </div>
    </div>
  );
};

export default CoreWebVitalCard;