import React, { useState } from 'react';
import {
  Drawer, Tag, Badge, Divider, Button, Space,
  Modal, Select, InputNumber, Form, List, Tooltip, Alert,
} from 'antd';
import {
  WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { ScoreDecomposition } from './ScoreBar';
import {
  PRIORITY_CONFIG, STATUS_CONFIG, SCORING_CONFIG,
  SEVERITY_LABELS, DEFECT_TYPES,
} from '../data/mockData';

const DEFECT_TYPES_MAP = Object.fromEntries(DEFECT_TYPES.map(d => [d.id, d]));

const REPAIR_COLORS = { КР: '#cf1322', СР: '#fa8c16', ТР: '#1677ff', ТО: '#52c41a' };
const SEVERITY_TAG_COLOR = { 1: 'default', 2: 'warning', 3: 'error' };
const POSTPONE_REASONS = [
  'Нет финансирования в текущем году',
  'Ресурсы подрядчика недоступны',
  'Ожидание поставки материалов',
  'Перенос по решению главного инженера',
  'Другое',
];

export default function AssetDrawer({ asset, open, onClose, onAddToPlan, onPostpone }) {
  const [postponeModal, setPostponeModal] = useState(false);
  const [form] = Form.useForm();

  if (!asset) return null;

  const priorityCfg = PRIORITY_CONFIG[asset.priority];
  const statusCfg = STATUS_CONFIG[asset.rec_status];
  const repairCfg = asset.repairRec;

  function handlePostponeOk() {
    form.validateFields().then(values => {
      onPostpone(asset.id, values);
      form.resetFields();
      setPostponeModal(false);
      onClose();
    });
  }

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThunderboltOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{asset.name}</span>
            </div>
            <Space size={6}>
              <Tag style={{ margin: 0 }}>{asset.type}</Tag>
              <Tag style={{ margin: 0 }}>{asset.voltage} кВ</Tag>
              <Tag style={{ margin: 0 }}>{asset.rес}</Tag>
              <Badge status={statusCfg.color} text={statusCfg.label} />
            </Space>
          </div>
        }
        open={open}
        onClose={onClose}
        width={520}
        extra={
          <Space>
            {asset.rec_status !== 'in_plan' && (
              <Button type="primary" onClick={() => { onAddToPlan(asset.id); onClose(); }}>
                + В план 2025
              </Button>
            )}
            {asset.rec_status === 'recommended' && (
              <Button onClick={() => setPostponeModal(true)}>Отложить</Button>
            )}
          </Space>
        }
        styles={{ body: { padding: '16px 24px' } }}
      >
        {asset.hasBlocking && (
          <Alert
            type="error"
            icon={<WarningOutlined />}
            showIcon
            message="Обнаружен блокирующий дефект"
            description="Объект принудительно переведён в категорию «Критичный» вне зависимости от скорингового балла."
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '12px 16px', borderRadius: 8,
          backgroundColor: priorityCfg.bg,
          border: `1px solid ${priorityCfg.border}`,
          marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>Итоговый балл P</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: priorityCfg.color, lineHeight: 1 }}>
              {asset.score.total}
            </div>
            <div style={{ fontSize: 10, color: '#8c8c8c' }}>из 10</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Категория приоритета</div>
            <Tag color={
              asset.priority === 'critical' ? 'error' :
              asset.priority === 'high' ? 'orange' :
              asset.priority === 'medium' ? 'gold' : 'success'
            } style={{ fontSize: 13, padding: '2px 10px' }}>
              {priorityCfg.label}
            </Tag>
            <div style={{ marginTop: 6, fontSize: 11, color: '#595959' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              Расчёт: {new Date(asset.calculated_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>Износ</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: asset.wearPct >= 100 ? '#cf1322' : '#fa8c16' }}>
              {asset.wearPct}%
            </div>
            <div style={{ fontSize: 10, color: '#8c8c8c' }}>{asset.age} / {asset.normative_lifetime} лет</div>
          </div>
        </div>

        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: '#8c8c8c' }}>
          Декомпозиция балла
        </Divider>
        <ScoreDecomposition
          score={asset.score}
          weights={{ wD: SCORING_CONFIG.wD, wW: SCORING_CONFIG.wW, wC: SCORING_CONFIG.wC, wT: SCORING_CONFIG.wT }}
        />

        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: '#8c8c8c', marginTop: 20 }}>
          Рекомендация вида ремонта
        </Divider>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '10px 14px', borderRadius: 8,
          backgroundColor: '#fafafa', border: '1px solid #f0f0f0',
        }}>
          <div style={{
            minWidth: 48, height: 48, borderRadius: 8,
            backgroundColor: REPAIR_COLORS[repairCfg.type] || '#1677ff',
            color: '#fff', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {repairCfg.type}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{repairCfg.label}</div>
            <div style={{ fontSize: 12, color: '#595959' }}>{repairCfg.reason}</div>
          </div>
        </div>

        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: '#8c8c8c', marginTop: 20 }}>
          Открытые дефекты ({asset.defects.length})
        </Divider>
        {asset.defects.length === 0 ? (
          <div style={{ color: '#52c41a', fontSize: 13 }}>
            <CheckCircleOutlined style={{ marginRight: 6 }} />
            Открытых дефектов нет
          </div>
        ) : (
          <List
            size="small"
            dataSource={asset.defects}
            renderItem={d => {
              const defType = DEFECT_TYPES_MAP[d.type_id];
              return (
                <List.Item style={{ padding: '8px 0', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {d.is_blocking && (
                        <Tooltip title="Блокирующий дефект — принудительная категория «Критичный»">
                          <WarningOutlined style={{ color: '#cf1322', fontSize: 13 }} />
                        </Tooltip>
                      )}
                      <Tag color={SEVERITY_TAG_COLOR[d.severity]} style={{ margin: 0, fontSize: 11 }}>
                        {d.severity} — {SEVERITY_LABELS[d.severity]}
                      </Tag>
                      {defType && (
                        <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                          вес {(defType.base_weight * (d.severity === 1 ? 0.5 : d.severity === 3 ? 2 : 1)).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#262626', marginBottom: 1 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {d.location} · {new Date(d.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}

        {asset.test_results && asset.test_results.length > 0 && (
          <>
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: '#8c8c8c', marginTop: 12 }}>
              Результаты испытаний
            </Divider>
            <List
              size="small"
              dataSource={asset.test_results}
              renderItem={t => {
                const dev = Math.abs(t.measured - t.norm) / t.norm;
                const devPct = (dev * 100).toFixed(0);
                const bad = dev > 0.1;
                return (
                  <List.Item style={{ padding: '6px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#262626', marginBottom: 2 }}>{t.param}</div>
                      <div style={{ fontSize: 11 }}>
                        <span style={{ color: bad ? '#cf1322' : '#52c41a', fontWeight: 600 }}>{t.measured}</span>
                        <span style={{ color: '#8c8c8c' }}> / норма {t.norm}</span>
                        {bad && <Tag color="error" style={{ marginLeft: 8, fontSize: 10 }}>откл. {devPct}%</Tag>}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </>
        )}
      </Drawer>

      <Modal
        title={<><ClockCircleOutlined style={{ marginRight: 8 }} />Отложить объект</>}
        open={postponeModal}
        onOk={handlePostponeOk}
        onCancel={() => { setPostponeModal(false); form.resetFields(); }}
        okText="Подтвердить перенос"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="reason" label="Причина переноса" rules={[{ required: true }]}>
            <Select placeholder="Выберите причину" options={POSTPONE_REASONS.map(r => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item name="target_year" label="Целевой год" rules={[{ required: true }]}>
            <InputNumber min={2025} max={2035} style={{ width: '100%' }} placeholder="напр. 2026" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
