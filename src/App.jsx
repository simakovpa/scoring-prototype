import React, { useState, useMemo } from 'react';
import {
  ConfigProvider, Layout, Menu, Typography, Select, Space, Badge,
  Table, Tag, Button, Tooltip, Statistic, Row, Col, Card, Tabs,
  theme, notification, Dropdown,
} from 'antd';
import {
  ThunderboltOutlined, WarningOutlined, SettingOutlined,
  ReloadOutlined, PlusOutlined, FilterOutlined,
  BellOutlined, UserOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import ruRU from 'antd/locale/ru_RU';

import { ASSETS, PRIORITY_CONFIG, STATUS_CONFIG, SCORING_CONFIG } from './data/mockData';
import RiskMatrix from './components/RiskMatrix';
import AssetDrawer from './components/AssetDrawer';
import AdminConfig from './components/AdminConfig';
import { ScoreBar } from './components/ScoreBar';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const VOLTAGE_OPTIONS = [
  { value: '0.4', label: '0,4 кВ' },
  { value: '6',   label: '6 кВ' },
  { value: '10',  label: '10 кВ' },
  { value: '35',  label: '35 кВ' },
  { value: '110', label: '110 кВ' },
  { value: '220', label: '220 кВ' },
];
const TYPE_OPTIONS = ['ВЛ', 'КЛ', 'ТП', 'КТП', 'ПС'].map(t => ({ value: t, label: t }));
const PRIORITY_OPTIONS = [
  { value: 'all',      label: 'Все категории' },
  { value: 'critical', label: 'Критичный' },
  { value: 'high',     label: 'Высокий' },
  { value: 'medium',   label: 'Средний' },
  { value: 'low',      label: 'Низкий' },
];
const RES_OPTIONS = ['РЭС-1', 'РЭС-2', 'РЭС-3'].map(r => ({ value: r, label: r }));

export default function App() {
  const [assets, setAssets] = useState(ASSETS);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterVoltages, setFilterVoltages] = useState([]);
  const [filterRES, setFilterRES] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [drawerAsset, setDrawerAsset] = useState(null);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [api, contextHolder] = notification.useNotification();

  // Фильтрация
  const filteredAssets = useMemo(() => {
    let list = [...assets].sort((a, b) => b.score.total - a.score.total);
    if (filterPriority !== 'all') list = list.filter(a => a.priority === filterPriority);
    if (filterTypes.length > 0) list = list.filter(a => filterTypes.includes(a.type));
    if (filterVoltages.length > 0) list = list.filter(a => filterVoltages.includes(a.voltage));
    if (filterRES.length > 0) list = list.filter(a => filterRES.includes(a.rес));
    if (selectedCell) {
      list = list.filter(a => `${a.matrix.probability_level}_${a.matrix.consequence_level}` === selectedCell);
    }
    return list;
  }, [assets, filterPriority, filterTypes, filterVoltages, filterRES, selectedCell]);

  // Статистика
  const stats = useMemo(() => ({
    critical: assets.filter(a => a.priority === 'critical').length,
    high:     assets.filter(a => a.priority === 'high').length,
    medium:   assets.filter(a => a.priority === 'medium').length,
    in_plan:  assets.filter(a => a.rec_status === 'in_plan').length,
  }), [assets]);

  function handleAddToPlan(id) {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, rec_status: 'in_plan' } : a));
    const asset = assets.find(a => a.id === id);
    api.success({
      message: 'Объект включён в план',
      description: `«${asset?.name}» добавлен в ремонтную программу 2025.`,
      duration: 4,
    });
  }

  function handlePostpone(id, values) {
    setAssets(prev => prev.map(a =>
      a.id === id ? { ...a, rec_status: 'deferred', postpone: values } : a
    ));
    const asset = assets.find(a => a.id === id);
    api.info({
      message: 'Объект отложен',
      description: `«${asset?.name}» перенесён на ${values.target_year}. Причина: ${values.reason}`,
      duration: 4,
    });
  }

  function handleRecalculate() {
    api.info({ message: 'Пересчёт запущен', description: 'Скоринговые карты обновятся в течение нескольких секунд.', duration: 3 });
  }

  // Столбцы таблицы
  const columns = [
    {
      title: 'Объект',
      dataIndex: 'name',
      width: 260,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#262626', marginBottom: 2 }}>{name}</div>
          <Space size={4}>
            <Tag style={{ margin: 0, fontSize: 11 }}>{record.type}</Tag>
            <Tag style={{ margin: 0, fontSize: 11 }}>{record.voltage} кВ</Tag>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>{record.rес}</span>
          </Space>
          {record.hasBlocking && (
            <div style={{ marginTop: 4 }}>
              <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: 11 }}>
                Блокирующий дефект
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Балл / Приоритет',
      dataIndex: 'score',
      width: 180,
      sorter: (a, b) => a.score.total - b.score.total,
      defaultSortOrder: 'descend',
      render: (score, record) => (
        <div>
          <ScoreBar value={score.total} priority={record.priority} />
          <div style={{ marginTop: 4 }}>
            <Tag color={
              record.priority === 'critical' ? 'error' :
              record.priority === 'high' ? 'orange' :
              record.priority === 'medium' ? 'gold' : 'success'
            } style={{ fontSize: 11 }}>
              {PRIORITY_CONFIG[record.priority]?.label}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Дефекты',
      dataIndex: 'defects',
      width: 100,
      render: (defects) => {
        const crit = defects.filter(d => d.severity === 3).length;
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: crit > 0 ? '#cf1322' : '#262626' }}>
              {defects.length}
            </div>
            {crit > 0 && <div style={{ fontSize: 11, color: '#cf1322' }}>крит: {crit}</div>}
          </div>
        );
      },
    },
    {
      title: 'Износ',
      dataIndex: 'wearPct',
      width: 90,
      sorter: (a, b) => a.wearPct - b.wearPct,
      render: (pct, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: pct >= 100 ? '#cf1322' : pct >= 80 ? '#fa8c16' : '#52c41a',
          }}>
            {pct}%
          </div>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>{record.age}/{record.normative_lifetime} л.</div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'rec_status',
      width: 130,
      render: (status) => {
        const cfg = STATUS_CONFIG[status];
        return <Badge status={cfg.color} text={cfg.label} />;
      },
    },
    {
      title: 'Рекомендация',
      dataIndex: 'repairRec',
      width: 80,
      render: (rec) => {
        const colors = { КР: 'error', СР: 'orange', ТР: 'processing', ТО: 'success' };
        return (
          <Tooltip title={rec.reason}>
            <Tag color={colors[rec.type] || 'default'} style={{ fontWeight: 700, cursor: 'help' }}>
              {rec.type}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Действие',
      width: 120,
      render: (_, record) => (
        record.rec_status === 'in_plan'
          ? <Button size="small" type="link" onClick={() => setDrawerAsset(record)}>Открыть</Button>
          : <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={(e) => { e.stopPropagation(); handleAddToPlan(record.id); }}
            >
              В план
            </Button>
      ),
    },
  ];

  return (
    <ConfigProvider locale={ruRU} theme={{
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 6,
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
      },
      components: {
        Layout: { headerBg: '#001529', siderBg: '#001d3d' },
      },
    }}>
      {contextHolder}
      <Layout style={{ minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sider width={200} style={{ background: '#001d3d' }}>
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThunderboltOutlined style={{ color: '#4096ff', fontSize: 18 }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>ЭАМ Система</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>
              Электрические сети 0,4–220 кВ
            </div>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => setActiveTab(key)}
            style={{ background: 'transparent', border: 'none' }}
            items={[
              {
                key: 'recommendations',
                icon: <AppstoreOutlined />,
                label: 'Рекомендации',
              },
              {
                key: 'admin',
                icon: <SettingOutlined />,
                label: 'Конфигурация',
              },
            ]}
          />
        </Sider>

        <Layout>
          {/* Header */}
          <Header style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
          }}>
            <div>
              <Text style={{ fontSize: 16, fontWeight: 600, color: '#262626' }}>
                {activeTab === 'recommendations' ? 'Рекомендации к включению в ремонтную программу' : 'Настройка конфигурации скоринга'}
              </Text>
              {activeTab === 'recommendations' && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
                  Планирование 2025 · ОТС
                </Text>
              )}
            </div>
            <Space>
              {activeTab === 'recommendations' && (
                <Button icon={<ReloadOutlined />} onClick={handleRecalculate} size="small">
                  Пересчитать
                </Button>
              )}
              <Tooltip title="Уведомления">
                <Badge count={stats.critical} size="small">
                  <Button icon={<BellOutlined />} shape="circle" size="small" />
                </Badge>
              </Tooltip>
              <Tooltip title="Роль: Администратор системы">
                <Button icon={<UserOutlined />} shape="circle" size="small" />
              </Tooltip>
            </Space>
          </Header>

          <Content style={{ padding: 24, background: '#f5f5f5', overflowY: 'auto' }}>
            {activeTab === 'recommendations' ? (
              <>
                {/* Панель фильтров */}
                <Card
                  size="small"
                  style={{ marginBottom: 16 }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <FilterOutlined style={{ color: '#8c8c8c' }} />
                    <Select
                      value={filterPriority}
                      onChange={setFilterPriority}
                      options={PRIORITY_OPTIONS}
                      style={{ width: 160 }}
                      size="small"
                    />
                    <Select
                      mode="multiple"
                      placeholder="Тип актива"
                      value={filterTypes}
                      onChange={setFilterTypes}
                      options={TYPE_OPTIONS}
                      style={{ minWidth: 160 }}
                      size="small"
                      allowClear
                      maxTagCount={2}
                    />
                    <Select
                      mode="multiple"
                      placeholder="Класс напряжения"
                      value={filterVoltages}
                      onChange={setFilterVoltages}
                      options={VOLTAGE_OPTIONS}
                      style={{ minWidth: 160 }}
                      size="small"
                      allowClear
                      maxTagCount={2}
                    />
                    <Select
                      mode="multiple"
                      placeholder="РЭС"
                      value={filterRES}
                      onChange={setFilterRES}
                      options={RES_OPTIONS}
                      style={{ minWidth: 120 }}
                      size="small"
                      allowClear
                    />
                    {(selectedCell || filterTypes.length > 0 || filterVoltages.length > 0 || filterRES.length > 0 || filterPriority !== 'all') && (
                      <Button
                        size="small"
                        onClick={() => {
                          setFilterPriority('all');
                          setFilterTypes([]);
                          setFilterVoltages([]);
                          setFilterRES([]);
                          setSelectedCell(null);
                        }}
                        type="link"
                        style={{ padding: 0 }}
                      >
                        Сбросить фильтры
                      </Button>
                    )}
                    <div style={{ marginLeft: 'auto', color: '#8c8c8c', fontSize: 12 }}>
                      Показано: <strong>{filteredAssets.length}</strong> из {assets.length}
                    </div>
                  </div>
                </Card>

                {/* Статистика */}
                <Row gutter={12} style={{ marginBottom: 16 }}>
                  {[
                    { key: 'critical', label: 'Критичных',     value: stats.critical, color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
                    { key: 'high',     label: 'Высокий',        value: stats.high,     color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
                    { key: 'medium',   label: 'Средний',        value: stats.medium,   color: '#7c5e00', bg: '#feffe6', border: '#eaff8f' },
                    { key: 'in_plan',  label: 'Включено в план',value: stats.in_plan,  color: '#135200', bg: '#f6ffed', border: '#b7eb8f' },
                  ].map(s => (
                    <Col key={s.key} span={6}>
                      <Card
                        size="small"
                        style={{
                          backgroundColor: s.bg,
                          border: `1px solid ${s.border}`,
                          cursor: s.key !== 'in_plan' ? 'pointer' : 'default',
                        }}
                        bodyStyle={{ padding: '10px 16px' }}
                        onClick={() => s.key !== 'in_plan' && setFilterPriority(filterPriority === s.key ? 'all' : s.key)}
                      >
                        <Statistic
                          title={<span style={{ fontSize: 11, color: s.color }}>{s.label}</span>}
                          value={s.value}
                          valueStyle={{ fontSize: 24, fontWeight: 800, color: s.color }}
                          suffix={<span style={{ fontSize: 12, color: s.color }}>объ.</span>}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>

                {/* Матрица + Таблица */}
                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
                  {/* Матрица риска */}
                  <Card size="small" title="Матрица риска" bodyStyle={{ padding: '12px 16px' }}>
                    <RiskMatrix
                      assets={assets}
                      selectedCell={selectedCell}
                      onCellClick={setSelectedCell}
                    />
                    {selectedCell && (
                      <div style={{
                        marginTop: 8, padding: '4px 10px', fontSize: 12,
                        backgroundColor: '#e6f4ff', borderRadius: 4, color: '#0958d9',
                      }}>
                        Фильтр: ячейка {selectedCell.replace('_', '×')} ·{' '}
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => setSelectedCell(null)}
                        >
                          сбросить
                        </span>
                      </div>
                    )}
                  </Card>

                  {/* Таблица объектов */}
                  <Card size="small" title={`Объекты (${filteredAssets.length})`} bodyStyle={{ padding: 0 }}>
                    <Table
                      dataSource={filteredAssets}
                      columns={columns}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
                      scroll={{ x: 900 }}
                      onRow={record => ({
                        onClick: () => setDrawerAsset(record),
                        style: { cursor: 'pointer' },
                      })}
                      rowClassName={record =>
                        record.hasBlocking ? 'row-blocking' : ''
                      }
                    />
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <AdminConfig />
              </Card>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Drawer детализации */}
      <AssetDrawer
        asset={drawerAsset}
        open={!!drawerAsset}
        onClose={() => setDrawerAsset(null)}
        onAddToPlan={handleAddToPlan}
        onPostpone={handlePostpone}
      />

      <style>{`
        .row-blocking { background: #fff2f0 !important; }
        .row-blocking:hover > td { background: #ffe7e0 !important; }
        .ant-table-tbody > tr:hover > td { background: #f0f7ff; }
      `}</style>
    </ConfigProvider>
  );
}
