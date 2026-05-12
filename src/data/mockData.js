// Демонстрационные данные для прототипа системы скоринга

export const DEFECT_TYPES = [
  { id: 'd1', name: 'Повреждение изоляции провода', base_weight: 8.5, is_blocking_capable: true, applicable_asset_types: ['ВЛ', 'КЛ'] },
  { id: 'd2', name: 'Коррозия конструктивных элементов', base_weight: 5.0, is_blocking_capable: false, applicable_asset_types: ['ВЛ', 'ТП', 'ПС'] },
  { id: 'd3', name: 'Пробой трансформаторного масла', base_weight: 9.5, is_blocking_capable: true, applicable_asset_types: ['ТП', 'КТП', 'ПС'] },
  { id: 'd4', name: 'Нарушение заземления', base_weight: 7.0, is_blocking_capable: true, applicable_asset_types: ['ВЛ', 'КЛ', 'ТП', 'КТП', 'ПС'] },
  { id: 'd5', name: 'Механическое повреждение опоры', base_weight: 6.5, is_blocking_capable: true, applicable_asset_types: ['ВЛ'] },
  { id: 'd6', name: 'Загрязнение изолятора', base_weight: 3.0, is_blocking_capable: false, applicable_asset_types: ['ВЛ', 'ПС'] },
  { id: 'd7', name: 'Трещина в корпусе оборудования', base_weight: 6.0, is_blocking_capable: false, applicable_asset_types: ['ТП', 'КТП'] },
  { id: 'd8', name: 'Несоответствие ПУЭ в кабельном вводе', base_weight: 4.5, is_blocking_capable: false, applicable_asset_types: ['КЛ', 'КТП'] },
];

const SEVERITY_MULTIPLIER = { 1: 0.5, 2: 1.0, 3: 2.0 };
const SEVERITY_LABELS = { 1: 'Малозначительный', 2: 'Значительный', 3: 'Критичный' };

function calcDefectScore(defects, D_MAX = 30.0) {
  const rawSum = defects.reduce((acc, d) => {
    const type = DEFECT_TYPES.find(t => t.id === d.type_id);
    const mult = SEVERITY_MULTIPLIER[d.severity] || 1.0;
    return acc + (type ? type.base_weight * mult : 0);
  }, 0);
  return Math.min(rawSum / D_MAX, 1.0) * 10;
}

function calcWearScore(commissionedYear, normativeLifetime, WEAR_CAP = 1.5) {
  const age = 2025 - commissionedYear;
  const ratio = age / normativeLifetime;
  return Math.min(ratio / WEAR_CAP, 1.0) * 10;
}

function calcConsequenceScore(voltageClass, reliabilityCategory, hasSocialObjects) {
  const voltageBonus = { '220': 5, '110': 4, '35': 3, '10': 2, '6': 2, '0.4': 1 };
  const relBonus = { 'I': 4, 'II': 2, 'III': 1 };
  const raw = (voltageBonus[voltageClass] || 1) + (relBonus[reliabilityCategory] || 1) + (hasSocialObjects ? 2 : 0);
  return Math.min(raw / 11, 1.0) * 10;
}

function calcTestScore(testResults, T_MAX = 5.0) {
  if (!testResults || testResults.length === 0) return 0;
  const raw = testResults.reduce((acc, t) => {
    const dev = Math.min(Math.abs(t.measured - t.norm) / t.norm, 1.0);
    return acc + (t.weight || 1.0) * dev;
  }, 0);
  return Math.min(raw / T_MAX, 1.0) * 10;
}

function calcPriority(score, hasBlocking, config) {
  if (hasBlocking) return 'critical';
  if (score >= config.threshold_critical) return 'critical';
  if (score >= config.threshold_high) return 'high';
  if (score >= config.threshold_medium) return 'medium';
  return 'low';
}

function calcRepairRecommendation(defects, wearPct) {
  const hasSev3 = defects.some(d => d.severity === 3);
  const hasSev2 = defects.some(d => d.severity === 2);
  const hasSev1only = defects.every(d => d.severity === 1);
  if (hasSev3 && wearPct >= 70) return { type: 'КР', label: 'Капитальный ремонт', reason: 'Критичный дефект при износе ≥70%: требуется комплексное восстановление' };
  if (hasSev3 && wearPct < 70) return { type: 'ТР', label: 'Текущий ремонт', reason: 'Критичный дефект при износе <70%: целевое устранение дефекта' };
  if (hasSev2 && wearPct >= 80) return { type: 'СР', label: 'Средний ремонт', reason: 'Значительный дефект при износе ≥80%: частичное восстановление' };
  if (hasSev1only && defects.length > 0) return { type: 'ТО', label: 'Техническое обслуживание', reason: 'Только малозначительные дефекты: плановые регламентные работы' };
  return { type: 'ТО', label: 'Техническое обслуживание', reason: 'Дефекты отсутствуют или не требуют ремонта' };
}

function calcMatrixPosition(D, W, T, C, weights) {
  const prob_input = (weights.wD * D + weights.wW * W + weights.wT * T) / (weights.wD + weights.wW + weights.wT);
  const probability_level = Math.min(5, Math.max(1, Math.ceil(prob_input / 2)));
  const consequence_level = Math.min(5, Math.max(1, Math.ceil(C / 2)));
  return { probability_level, consequence_level };
}

const SCORING_CONFIG = {
  wD: 0.40, wW: 0.25, wC: 0.20, wT: 0.15,
  defect_score_max: 30.0,
  wear_overdue_cap: 1.5,
  threshold_critical: 7.5,
  threshold_high: 5.0,
  threshold_medium: 2.5,
};

const RAW_ASSETS = [
  {
    id: 'a1',
    name: 'ВЛ 110 кВ Северная — Промышленная',
    type: 'ВЛ',
    voltage: '110',
    reliability_category: 'I',
    commissioned_year: 1988,
    normative_lifetime: 40,
    has_social: true,
    rес: 'РЭС-1',
    defects: [
      { id: 'df1', type_id: 'd1', severity: 3, name: 'Повреждение изоляции провода', location: 'Пролёт 14–15', date: '2025-03-12', is_blocking: true },
      { id: 'df2', type_id: 'd2', severity: 2, name: 'Коррозия конструктивных элементов', location: 'Опора №18', date: '2025-01-20', is_blocking: false },
      { id: 'df3', type_id: 'd6', severity: 1, name: 'Загрязнение изолятора', location: 'Опора №22', date: '2024-11-05', is_blocking: false },
    ],
    test_results: [
      { param: 'Сопротивление изоляции, МОм', measured: 8.5, norm: 150, weight: 2.0 },
      { param: 'Угол диэлектрических потерь, %', measured: 3.8, norm: 1.5, weight: 1.5 },
    ],
    rec_status: 'recommended',
  },
  {
    id: 'a2',
    name: 'ТП-47/0,4 кВ ул. Гагарина',
    type: 'ТП',
    voltage: '0.4',
    reliability_category: 'II',
    commissioned_year: 1999,
    normative_lifetime: 25,
    has_social: true,
    rес: 'РЭС-2',
    defects: [
      { id: 'df4', type_id: 'd3', severity: 3, name: 'Пробой трансформаторного масла', location: 'Трансформатор Т-1', date: '2025-04-01', is_blocking: true },
    ],
    test_results: [
      { param: 'Пробивное напряжение масла, кВ', measured: 18, norm: 40, weight: 2.5 },
    ],
    rec_status: 'recommended',
  },
  {
    id: 'a3',
    name: 'КЛ 10 кВ Ф-12 от ПС «Центральная»',
    type: 'КЛ',
    voltage: '10',
    reliability_category: 'II',
    commissioned_year: 2003,
    normative_lifetime: 30,
    has_social: false,
    rес: 'РЭС-3',
    defects: [
      { id: 'df5', type_id: 'd8', severity: 2, name: 'Несоответствие ПУЭ в кабельном вводе', location: 'Муфта №3', date: '2025-02-14', is_blocking: false },
      { id: 'df6', type_id: 'd4', severity: 2, name: 'Нарушение заземления', location: 'Ячейка 12', date: '2025-01-30', is_blocking: false },
    ],
    test_results: [],
    rec_status: 'in_plan',
  },
  {
    id: 'a4',
    name: 'КТП 400 кВА №112 промзона',
    type: 'КТП',
    voltage: '0.4',
    reliability_category: 'III',
    commissioned_year: 2012,
    normative_lifetime: 25,
    has_social: false,
    rес: 'РЭС-1',
    defects: [
      { id: 'df7', type_id: 'd7', severity: 1, name: 'Трещина в корпусе оборудования', location: 'Боковая стенка', date: '2024-09-18', is_blocking: false },
    ],
    test_results: [
      { param: 'Сопротивление изоляции обмоток, МОм', measured: 92, norm: 100, weight: 1.0 },
    ],
    rec_status: 'deferred',
  },
  {
    id: 'a5',
    name: 'ПС «Западная» 35/10 кВ',
    type: 'ПС',
    voltage: '35',
    reliability_category: 'I',
    commissioned_year: 1979,
    normative_lifetime: 45,
    has_social: false,
    rес: 'РЭС-2',
    defects: [
      { id: 'df8', type_id: 'd2', severity: 2, name: 'Коррозия конструктивных элементов', location: 'Порталы ОРУ-35', date: '2024-12-10', is_blocking: false },
      { id: 'df9', type_id: 'd4', severity: 2, name: 'Нарушение заземления', location: 'Шины ОРУ', date: '2025-03-05', is_blocking: false },
      { id: 'df10', type_id: 'd6', severity: 1, name: 'Загрязнение изолятора', location: 'Трансформаторы Т1/Т2', date: '2025-01-15', is_blocking: false },
    ],
    test_results: [
      { param: 'Ток холостого хода, %', measured: 2.8, norm: 1.5, weight: 1.0 },
      { param: 'Коэффициент трансформации', measured: 3.62, norm: 3.5, weight: 1.0 },
    ],
    rec_status: 'recommended',
  },
  {
    id: 'a6',
    name: 'ВЛ 0,4 кВ ул. Лесная (ф.1)',
    type: 'ВЛ',
    voltage: '0.4',
    reliability_category: 'III',
    commissioned_year: 2018,
    normative_lifetime: 40,
    has_social: false,
    rес: 'РЭС-3',
    defects: [],
    test_results: [],
    rec_status: 'recommended',
  },
  {
    id: 'a7',
    name: 'ТП-23/10 кВ Больничный к-с',
    type: 'ТП',
    voltage: '10',
    reliability_category: 'I',
    commissioned_year: 1995,
    normative_lifetime: 25,
    has_social: true,
    rес: 'РЭС-2',
    defects: [
      { id: 'df11', type_id: 'd2', severity: 2, name: 'Коррозия конструктивных элементов', location: 'Кровля', date: '2025-02-28', is_blocking: false },
      { id: 'df12', type_id: 'd4', severity: 3, name: 'Нарушение заземления', location: 'Контур заземления', date: '2025-04-10', is_blocking: false },
    ],
    test_results: [
      { param: 'Сопротивление контура заземления, Ом', measured: 8.5, norm: 4, weight: 2.0 },
    ],
    rec_status: 'recommended',
  },
  {
    id: 'a8',
    name: 'КЛ 6 кВ Завод «Машпром» фидер 8',
    type: 'КЛ',
    voltage: '6',
    reliability_category: 'II',
    commissioned_year: 2007,
    normative_lifetime: 30,
    has_social: false,
    rес: 'РЭС-1',
    defects: [
      { id: 'df13', type_id: 'd1', severity: 2, name: 'Повреждение изоляции провода', location: 'Секция 2', date: '2025-03-20', is_blocking: false },
    ],
    test_results: [
      { param: 'Сопротивление изоляции, МОм', measured: 45, norm: 100, weight: 1.5 },
    ],
    rec_status: 'recommended',
  },
];

function buildScoringCard(asset) {
  const D = calcDefectScore(asset.defects, SCORING_CONFIG.defect_score_max);
  const W = calcWearScore(asset.commissioned_year, asset.normative_lifetime, SCORING_CONFIG.wear_overdue_cap);
  const C = calcConsequenceScore(asset.voltage, asset.reliability_category, asset.has_social);
  const T = calcTestScore(asset.test_results);
  const hasBlocking = asset.defects.some(d => d.is_blocking);
  const total = SCORING_CONFIG.wD * D + SCORING_CONFIG.wW * W + SCORING_CONFIG.wC * C + SCORING_CONFIG.wT * T;
  const priority = calcPriority(total, hasBlocking, SCORING_CONFIG);
  const age = 2025 - asset.commissioned_year;
  const wearPct = Math.round((age / asset.normative_lifetime) * 100);
  const repair = calcRepairRecommendation(asset.defects, wearPct);
  const matrix = calcMatrixPosition(D, W, T, C, { wD: SCORING_CONFIG.wD, wW: SCORING_CONFIG.wW, wT: SCORING_CONFIG.wT });

  return {
    ...asset,
    score: {
      D: +D.toFixed(2),
      W: +W.toFixed(2),
      C: +C.toFixed(2),
      T: +T.toFixed(2),
      total: +total.toFixed(2),
    },
    priority,
    hasBlocking,
    wearPct,
    age,
    repairRec: repair,
    matrix,
    calculated_at: '2025-05-07T06:00:00',
  };
}

export const ASSETS = RAW_ASSETS.map(buildScoringCard);
export { SCORING_CONFIG, SEVERITY_LABELS, SEVERITY_MULTIPLIER };

export const PRIORITY_CONFIG = {
  critical: { label: 'Критичный', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
  high:     { label: 'Высокий',   color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
  medium:   { label: 'Средний',   color: '#7c5e00', bg: '#feffe6', border: '#eaff8f' },
  low:      { label: 'Низкий',    color: '#135200', bg: '#f6ffed', border: '#b7eb8f' },
};

export const STATUS_CONFIG = {
  recommended: { label: 'Рекомендован',    color: 'processing' },
  in_plan:     { label: 'Включён в план',  color: 'success' },
  deferred:    { label: 'Отложен',         color: 'default' },
};

// Матрица риска 5×5 — зоны по ISO 31000
export const RISK_MATRIX_ZONES = (() => {
  const raw = [
    ['medium','high','high','critical','critical'],   // prob=5 (row)
    ['medium','medium','high','high','critical'],      // prob=4
    ['low','medium','medium','high','high'],           // prob=3
    ['low','low','medium','medium','high'],            // prob=2
    ['low','low','low','medium','medium'],             // prob=1
  ];
  const result = {};
  raw.forEach((row, rowIdx) => {
    const prob = 5 - rowIdx;
    row.forEach((zone, colIdx) => {
      const cons = colIdx + 1;
      result[`${prob}_${cons}`] = zone;
    });
  });
  return result;
})();
