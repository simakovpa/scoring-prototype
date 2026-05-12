import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { RISK_MATRIX_ZONES, PRIORITY_CONFIG } from '../data/mockData';

const ZONE_COLORS = {
  critical: '#fff1f0',
  high:     '#fff7e6',
  medium:   '#feffe6',
  low:      '#f6ffed',
};

const ZONE_BORDER = {
  critical: '#ffa39e',
  high:     '#ffd591',
  medium:   '#eaff8f',
  low:      '#b7eb8f',
};

const PROB_LABELS = ['', 'Пренебрежимая', 'Низкая', 'Средняя', 'Высокая', 'Очень высокая'];
const CONS_LABELS = ['', 'Незначит.', 'Малые', 'Умеренные', 'Серьёзные', 'Катастроф.'];

export default function RiskMatrix({ assets, selectedCell, onCellClick }) {
  // Группируем объекты по ячейкам матрицы
  const cellAssets = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const key = `${a.matrix.probability_level}_${a.matrix.consequence_level}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assets]);

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ marginBottom: 8, fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }}>
        Матрица риска 5×5 · ISO 31000 · клик по ячейке — фильтр таблицы
      </div>

      {/* Ось X label */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 2 }}>
        <div style={{ width: 90 }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#595959', fontWeight: 600, paddingBottom: 4 }}>
          Последствия отказа →
        </div>
      </div>

      {/* Заголовки колонок */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ width: 90 }} />
        {[1, 2, 3, 4, 5].map(c => (
          <div key={c} style={{
            flex: 1, textAlign: 'center', fontSize: 10, color: '#595959',
            lineHeight: '1.2', padding: '0 2px',
          }}>
            {c}<br />
            <span style={{ fontSize: 9, color: '#8c8c8c' }}>{CONS_LABELS[c]}</span>
          </div>
        ))}
      </div>

      {/* Строки матрицы (prob 5 → 1) */}
      {[5, 4, 3, 2, 1].map(prob => (
        <div key={prob} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 2 }}>
          {/* Метка строки */}
          <div style={{
            width: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'flex-end', paddingRight: 8,
            fontSize: 10, color: '#595959', lineHeight: 1.2, textAlign: 'right',
          }}>
            <span style={{ fontWeight: 600 }}>{prob}</span>
            <span style={{ fontSize: 9, color: '#8c8c8c' }}>{PROB_LABELS[prob]}</span>
          </div>

          {[1, 2, 3, 4, 5].map(cons => {
            const key = `${prob}_${cons}`;
            const zone = RISK_MATRIX_ZONES[key];
            const cellData = cellAssets[key] || [];
            const isSelected = selectedCell === key;

            const dotsByPriority = {};
            cellData.forEach(a => {
              if (!dotsByPriority[a.priority]) dotsByPriority[a.priority] = [];
              dotsByPriority[a.priority].push(a);
            });

            return (
              <Tooltip
                key={cons}
                title={
                  cellData.length > 0
                    ? (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Зона: {PRIORITY_CONFIG[zone]?.label || zone}
                        </div>
                        <div style={{ fontSize: 12 }}>Объектов: {cellData.length}</div>
                        {cellData.map(a => (
                          <div key={a.id} style={{ fontSize: 11, marginTop: 2 }}>
                            • {a.name} — <b>{a.score.total}</b>
                          </div>
                        ))}
                      </div>
                    )
                    : `Нет объектов · Зона: ${PRIORITY_CONFIG[zone]?.label || zone}`
                }
                placement="top"
              >
                <div
                  onClick={() => onCellClick(isSelected ? null : key)}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    backgroundColor: ZONE_COLORS[zone],
                    border: `2px solid ${isSelected ? '#1677ff' : ZONE_BORDER[zone]}`,
                    borderRadius: 4,
                    marginRight: 2,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 0 0 2px #1677ff40' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: 4,
                  }}
                >
                  {Object.entries(dotsByPriority).map(([priority, items]) =>
                    items.map((a, i) => (
                      <Tooltip key={a.id} title={a.name} placement="top">
                        <div style={{
                          width: 10, height: 10,
                          borderRadius: '50%',
                          backgroundColor: PRIORITY_CONFIG[priority]?.color || '#666',
                          border: '1.5px solid rgba(0,0,0,0.15)',
                          flexShrink: 0,
                        }} />
                      </Tooltip>
                    ))
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      ))}

      {/* Ось Y label */}
      <div style={{
        display: 'flex', alignItems: 'center', marginTop: 6,
        fontSize: 11, color: '#595959', fontWeight: 600,
      }}>
        <div style={{ width: 90, textAlign: 'right', paddingRight: 8 }}>↑</div>
        <div>Вероятность отказа</div>
      </div>

      {/* Легенда */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: cfg.color,
            }} />
            <span style={{ color: '#595959' }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
