import React from 'react';
import { Progress, Tooltip } from 'antd';

// Мини-полоска для таблицы
export function ScoreBar({ value, priority }) {
  const COLOR_MAP = {
    critical: '#cf1322',
    high:     '#fa8c16',
    medium:   '#d4b106',
    low:      '#52c41a',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 80 }}>
        <Progress
          percent={value * 10}
          showInfo={false}
          strokeColor={COLOR_MAP[priority] || '#1677ff'}
          size={['100%', 8]}
          style={{ marginBottom: 0 }}
        />
      </div>
      <span style={{
        fontWeight: 700,
        fontSize: 15,
        color: COLOR_MAP[priority] || '#333',
        minWidth: 32,
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

// Детализация компонент в drawer
export function ScoreDecomposition({ score, weights }) {
  const components = [
    { key: 'D', label: 'Дефектная нагрузка', value: score.D, weight: weights.wD, color: '#cf1322', hint: 'Взвешенная сумма открытых дефектов' },
    { key: 'W', label: 'Износ',              value: score.W, weight: weights.wW, color: '#fa8c16', hint: 'Фактический возраст / нормативный срок' },
    { key: 'C', label: 'Последствия отказа', value: score.C, weight: weights.wC, color: '#722ed1', hint: 'Прокси: класс напряжения + категория надёжности + соцобъекты' },
    { key: 'T', label: 'Результаты испытаний', value: score.T, weight: weights.wT, color: '#1677ff', hint: 'Суммарное отклонение параметров от нормы' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {components.map(c => (
        <Tooltip key={c.key} title={c.hint} placement="left">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: '50%',
                  backgroundColor: c.color, color: '#fff',
                  fontWeight: 700, fontSize: 11,
                }}>
                  {c.key}
                </span>
                <span style={{ fontSize: 13, color: '#262626' }}>{c.label}</span>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>вес {(c.weight * 100).toFixed(0)}%</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: c.color }}>
                {c.value} <span style={{ fontWeight: 400, color: '#8c8c8c', fontSize: 11 }}>/10</span>
              </span>
            </div>
            <Progress
              percent={c.value * 10}
              showInfo={false}
              strokeColor={c.color}
              trailColor="#f0f0f0"
              size={['100%', 10]}
            />
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
