import React, { useState } from 'react';
import {
  Card, Form, InputNumber, Button, Alert, Divider, Table, Typography, Space, Tag, Tooltip,
} from 'antd';
import { InfoCircleOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { SCORING_CONFIG } from '../data/mockData';

const { Title, Text } = Typography;

export default function AdminConfig({ onClose }) {
  const [form] = Form.useForm();
  const [saved, setSaved] = useState(false);
  const [weightSum, setWeightSum] = useState(1.0);

  const initialValues = {
    weight_defects:      SCORING_CONFIG.wD,
    weight_wear:         SCORING_CONFIG.wW,
    weight_consequences: SCORING_CONFIG.wC,
    weight_tests:        SCORING_CONFIG.wT,
    defect_score_max:    SCORING_CONFIG.defect_score_max,
    wear_overdue_cap:    SCORING_CONFIG.wear_overdue_cap,
    threshold_critical:  SCORING_CONFIG.threshold_critical,
    threshold_high:      SCORING_CONFIG.threshold_high,
    threshold_medium:    SCORING_CONFIG.threshold_medium,
  };

  function handleValuesChange(_, all) {
    const sum = (
      (all.weight_defects      || 0) +
      (all.weight_wear         || 0) +
      (all.weight_consequences || 0) +
      (all.weight_tests        || 0)
    );
    setWeightSum(Math.round(sum * 100) / 100);
    setSaved(false);
  }

  function handleSave() {
    form.validateFields().then(() => {
      setSaved(true);
    });
  }

  const sumOk = Math.abs(weightSum - 1.0) < 0.001;

  const historyData = [
    { key: 1, date: '01.04.2025', author: 'admin', change: 'Первоначальная конфигурация' },
    { key: 2, date: '05.05.2025', author: 'Иванов А.', change: 'wD: 0.35 → 0.40; wW: 0.30 → 0.25' },
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Конфигурация скоринга</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Активная версия · последнее изменение: 05.05.2025 · Иванов А.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { form.setFieldsValue(initialValues); setWeightSum(1.0); setSaved(false); }}>
            Сбросить
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!sumOk}
            onClick={handleSave}
          >
            Сохранить конфигурацию
          </Button>
        </Space>
      </div>

      {saved && (
        <Alert
          type="success"
          message="Конфигурация сохранена. Запустить внеплановый пересчёт скоринговых карт?"
          action={<Button size="small" type="link">Пересчитать сейчас</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        {/* Веса компонент */}
        <Card
          size="small"
          title={
            <Space>
              Веса компонент скоринга
              <Tooltip title="Сумма весов должна быть равна 1.00">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          extra={
            <span style={{ fontWeight: 700, color: sumOk ? '#52c41a' : '#cf1322' }}>
              Σ = {weightSum.toFixed(2)} {sumOk ? '✓' : '≠ 1.00'}
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          {!sumOk && (
            <Alert
              type="error"
              message={`Сумма весов = ${weightSum.toFixed(2)}. Должна быть ровно 1.00. Сохранение заблокировано.`}
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { name: 'weight_defects',      label: 'D — Дефекты',      color: '#cf1322', desc: 'Дефектная нагрузка' },
              { name: 'weight_wear',         label: 'W — Износ',        color: '#fa8c16', desc: 'Возраст / нормативный срок' },
              { name: 'weight_consequences', label: 'C — Последствия',  color: '#722ed1', desc: 'Прокси-оценка последствий отказа' },
              { name: 'weight_tests',        label: 'T — Испытания',    color: '#1677ff', desc: 'Отклонения параметров' },
            ].map(f => (
              <Form.Item
                key={f.name}
                name={f.name}
                label={
                  <Tooltip title={f.desc}>
                    <span style={{ color: f.color, fontWeight: 600 }}>{f.label}</span>
                  </Tooltip>
                }
                rules={[{ required: true, type: 'number', min: 0, max: 1 }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={0} max={1} step={0.05}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            ))}
          </div>
        </Card>

        {/* Калибровочные константы */}
        <Card size="small" title="Калибровочные константы" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="defect_score_max"
              label={
                <Tooltip title="Объект, суммарный вес дефектов которого ≥ этого значения, получает D = 10">
                  D_max — знаменатель нормировки дефектов <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              }
              rules={[{ required: true, type: 'number', min: 1 }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="wear_overdue_cap"
              label={
                <Tooltip title="Объект, отработавший wear_overdue_cap × нормативный срок, получает W = 10">
                  Коэффициент превышения нормативного срока (W cap) <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              }
              rules={[{ required: true, type: 'number', min: 1 }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} step={0.1} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Card>

        {/* Пороги категорий */}
        <Card size="small" title="Пороги категорий приоритета" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { name: 'threshold_critical', label: 'Критичный (≥)', color: '#cf1322' },
              { name: 'threshold_high',     label: 'Высокий (≥)',   color: '#fa8c16' },
              { name: 'threshold_medium',   label: 'Средний (≥)',   color: '#d4b106' },
            ].map(f => (
              <Form.Item
                key={f.name}
                name={f.name}
                label={<span style={{ color: f.color }}>{f.label}</span>}
                rules={[{ required: true, type: 'number', min: 0, max: 10 }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={0} max={10} step={0.5} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: '#fafafa', borderRadius: 6, fontSize: 12, color: '#595959' }}>
            <strong>Низкий</strong>: P &lt; threshold_medium &nbsp;·&nbsp;
            <strong style={{ color: '#d4b106' }}>Средний</strong>: threshold_medium ≤ P &lt; threshold_high &nbsp;·&nbsp;
            <strong style={{ color: '#fa8c16' }}>Высокий</strong>: threshold_high ≤ P &lt; threshold_critical &nbsp;·&nbsp;
            <strong style={{ color: '#cf1322' }}>Критичный</strong>: P ≥ threshold_critical
          </div>
        </Card>
      </Form>

      {/* История изменений */}
      <Divider>История изменений конфигурации</Divider>
      <Table
        size="small"
        dataSource={historyData}
        pagination={false}
        columns={[
          { title: 'Дата', dataIndex: 'date', width: 110 },
          { title: 'Автор', dataIndex: 'author', width: 130 },
          { title: 'Изменения', dataIndex: 'change' },
        ]}
      />
    </div>
  );
}
