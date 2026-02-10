import React from 'react';
import {
  Calendar,
  Fuel,
  Gauge,
  Ruler,
  Cog,
  Car,
  Route,
  Palette,
  Barcode,
  ShieldCheck,
  Leaf,
} from 'lucide-react';

interface TechnicalDataSectionProps {
  year: number;
  month?: number;
  fuel: string;
  power?: number;
  displacement?: number;
  gearbox: string;
  category?: string;
  mileage: number;
  color?: string;
  vin?: string;
  condition?: string;
  euroStandard?: string;
  isMobile?: boolean;
}

const MONTH_NAMES = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'
];

const FUEL_LABELS: Record<string, string> = {
  'benzin': 'Бензин',
  'dizel': 'Дизел',
  'gaz_benzin': 'Газ/Бензин',
  'hibrid': 'Хибрид',
  'elektro': 'Електро',
};

const GEARBOX_LABELS: Record<string, string> = {
  'ruchna': 'Ръчна',
  'avtomatik': 'Автоматична',
};

const CAR_TYPE_LABELS: Record<string, string> = {
  'van': 'Ван',
  'jeep': 'Джип',
  'cabriolet': 'Кабрио',
  'wagon': 'Комби',
  'coupe': 'Купе',
  'minivan': 'Миниван',
  'pickup': 'Пикап',
  'sedan': 'Седан',
  'stretch_limo': 'Стреч лимузина',
  'hatchback': 'Хечбек',
};

const CONDITION_LABELS: Record<string, string> = {
  '0': 'Нов',
  '1': 'Употребяван',
  '2': 'Повреден/ударен',
  '3': 'За части',
};

const EURO_LABELS: Record<string, string> = {
  '1': 'Евро 1',
  '2': 'Евро 2',
  '3': 'Евро 3',
  '4': 'Евро 4',
  '5': 'Евро 5',
  '6': 'Евро 6',
};

const TechnicalDataSection: React.FC<TechnicalDataSectionProps> = ({
  year,
  month,
  fuel,
  power,
  displacement,
  gearbox,
  category,
  mileage,
  color,
  vin,
  condition,
  euroStandard,
  isMobile = false,
}) => {
  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: '#fff',
      borderRadius: 10,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    title: {
      fontSize: isMobile ? 15 : 19,
      fontWeight: 700,
      color: '#333',
      margin: 0,
      padding: 0,
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
    },
    subtitle: {
      fontSize: 11,
      color: '#9ca3af',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
      gap: isMobile ? 12 : 14,
    },
    itemCard: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 8,
      background: '#fafafa',
      border: '1px solid #e5e7eb',
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: '#ecfdf5',
      color: '#0f766e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    itemBody: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    },
    label: {
      fontSize: 11,
      color: '#6b7280',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
    },
    value: {
      fontSize: isMobile ? 13 : 14,
      color: '#111827',
      fontWeight: 600,
    },
  };

  const formatDate = (year: number, month?: number) => {
    if (month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return year.toString();
  };

  const items = [
    {
      key: 'date',
      label: 'Дата на производство',
      value: formatDate(year, month),
      icon: Calendar,
    },
    {
      key: 'fuel',
      label: 'Гориво',
      value: FUEL_LABELS[fuel] || fuel,
      icon: Fuel,
    },
    {
      key: 'power',
      label: 'Мощност',
      value: typeof power === 'number' ? `${power} к.с.` : null,
      icon: Gauge,
    },
    {
      key: 'displacement',
      label: 'Кубатура',
      value: typeof displacement === 'number' ? `${displacement} см³` : null,
      icon: Ruler,
    },
    {
      key: 'gearbox',
      label: 'Скоростна кутия',
      value: GEARBOX_LABELS[gearbox] || gearbox,
      icon: Cog,
    },
    {
      key: 'category',
      label: 'Категория',
      value: category ? (CAR_TYPE_LABELS[category] || category) : null,
      icon: Car,
    },
    {
      key: 'mileage',
      label: 'Пробег',
      value: `${mileage.toLocaleString('bg-BG')} км`,
      icon: Route,
    },
    {
      key: 'color',
      label: 'Цвят',
      value: color || null,
      icon: Palette,
    },
    {
      key: 'vin',
      label: 'VIN номер',
      value: vin || null,
      icon: Barcode,
    },
    {
      key: 'condition',
      label: 'Състояние',
      value: condition ? (CONDITION_LABELS[condition] || condition) : null,
      icon: ShieldCheck,
    },
    {
      key: 'euro',
      label: 'Евро стандарт',
      value: euroStandard ? (EURO_LABELS[euroStandard] || euroStandard) : null,
      icon: Leaf,
    },
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Технически данни</h2>
        <span style={styles.subtitle}>{items.length} параметъра</span>
      </div>
      <div style={styles.itemsGrid}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} style={styles.itemCard}>
              <div style={styles.iconWrap}>
                <Icon size={18} />
              </div>
              <div style={styles.itemBody}>
                <div style={styles.label}>{item.label}</div>
                <div style={styles.value}>{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TechnicalDataSection;

