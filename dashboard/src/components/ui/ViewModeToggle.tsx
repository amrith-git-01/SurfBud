import React from 'react';
import { List, PieChart, BarChart3 } from 'lucide-react';
import type { ViewMode } from '@/types/ui.types';

const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
  list: <List size={16} />,
  pie: <PieChart size={16} />,
  bar: <BarChart3 size={16} />,
};

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-1">
      {(['list', 'pie', 'bar'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`view-mode-btn ${value === mode ? 'view-mode-btn--active' : ''}`}
          aria-label={`${mode} view`}
        >
          {VIEW_ICONS[mode]}
        </button>
      ))}
    </div>
  );
};
