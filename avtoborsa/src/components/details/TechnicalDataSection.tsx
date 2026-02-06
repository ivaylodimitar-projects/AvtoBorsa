import React from 'react';

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
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    title: {
      fontSize: isMobile ? 15 : 19,
      fontWeight: 700,
      color: '#1a1a1a',
      marginBottom: 16,
      margin: 0,
      padding: 0,
    },
    itemsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? 12 : 16,
    },
    item: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    label: {
      fontSize: isMobile ? 12 : 13,
      color: '#666',
      fontWeight: 600,
    },
    value: {
      fontSize: isMobile ? 13 : 14,
      color: '#1a1a1a',
      fontWeight: 500,
    },
  };

  const formatDate = (year: number, month?: number) => {
    if (month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return year.toString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Технически данни</h2>
      <div style={styles.itemsGrid}>
        <div style={styles.item}>
          <div style={styles.label}>Дата на производство</div>
          <div style={styles.value}>{formatDate(year, month)}</div>
        </div>

        <div style={styles.item}>
          <div style={styles.label}>Двигател</div>
          <div style={styles.value}>{FUEL_LABELS[fuel] || fuel}</div>
        </div>

        {power && (
          <div style={styles.item}>
            <div style={styles.label}>Мощност</div>
            <div style={styles.value}>{power} к.с.</div>
          </div>
        )}

        {displacement && (
          <div style={styles.item}>
            <div style={styles.label}>Кубатура [куб.см]</div>
            <div style={styles.value}>{displacement} см<sup>3</sup></div>
          </div>
        )}

        <div style={styles.item}>
          <div style={styles.label}>Скоростна кутия</div>
          <div style={styles.value}>{GEARBOX_LABELS[gearbox] || gearbox}</div>
        </div>

        {category && (
          <div style={styles.item}>
            <div style={styles.label}>Категория</div>
            <div style={styles.value}>{CAR_TYPE_LABELS[category] || category}</div>
          </div>
        )}

        <div style={styles.item}>
          <div style={styles.label}>Пробег [км]</div>
          <div style={styles.value}>{mileage.toLocaleString('bg-BG')} км</div>
        </div>

        {color && (
          <div style={styles.item}>
            <div style={styles.label}>Цвят</div>
            <div style={styles.value}>{color}</div>
          </div>
        )}

        {vin && (
          <div style={styles.item}>
            <div style={styles.label}>VIN номер</div>
            <div style={styles.value}>{vin}</div>
          </div>
        )}

        {condition && (
          <div style={styles.item}>
            <div style={styles.label}>Състояние</div>
            <div style={styles.value}>{CONDITION_LABELS[condition] || condition}</div>
          </div>
        )}

        {euroStandard && (
          <div style={styles.item}>
            <div style={styles.label}>Евро стандарт</div>
            <div style={styles.value}>{EURO_LABELS[euroStandard] || euroStandard}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalDataSection;

