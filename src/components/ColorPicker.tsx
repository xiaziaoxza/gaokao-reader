import React from 'react';
import { PALETTE } from '../utils/colors';

interface Props {
  selected: number;
  onChange: (idx: number) => void;
}

export const ColorPicker: React.FC<Props> = ({ selected, onChange }) => {
  // 4 + 3 layout
  const cols = 2;
  const rows = Math.ceil(PALETTE.length / cols);
  const grid: Array<Array<{ idx: number; color: typeof PALETTE[0] }>> = [];
  for (let r = 0; r < rows; r++) {
    grid.push([]);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < PALETTE.length) {
        grid[r].push({ idx, color: PALETTE[idx] });
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {row.map(({ idx, color: c }) => {
            const isActive = idx === selected;
            return (
              <button
                key={idx}
                onClick={() => onChange(idx)}
                title={c.name}
                style={{
                  width: 26, height: 26,
                  borderRadius: '50%',
                  border: isActive ? `3px solid ${c.value}` : `2px solid #e0d8cf`,
                  background: c.value,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: isActive ? `0 0 0 3px ${c.bg}, 0 0 6px rgba(0,0,0,0.18)` : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative' as const,
                }}
              >
                {isActive && (
                  <span style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
