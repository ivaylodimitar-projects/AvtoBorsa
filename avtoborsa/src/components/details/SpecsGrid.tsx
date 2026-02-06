import React from 'react';
import { Calendar, Fuel, Gauge, Settings, Palette, Zap } from 'lucide-react';

interface SpecsGridProps {
  year: number;
  fuel: string;
  mileage: number;
  gearbox: string;
  color?: string;
  power?: number;
}

const FUEL_LABELS: Record<string, string> = {
  benzin: 'Бензин',
  dizel: 'Дизел',
  gaz_benzin: 'Газ/Бензин',
  hibrid: 'Хибрид',
  elektro: 'Електро',
};

const GEARBOX_LABELS: Record<string, string> = {
  ruchna: 'Ръчна',
  avtomatik: 'Автоматик',
};

const SpecsGrid: React.FC<SpecsGridProps> = ({
  year,
  fuel,
  mileage,
  gearbox,
  color,
  power,
}) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const specs = [
    {
      icon: Calendar,
      label: 'Година',
      value: year.toString(),
    },
    {
      icon: Fuel,
      label: 'Гориво',
      value: FUEL_LABELS[fuel] || fuel,
    },
    {
      icon: Gauge,
      label: 'Пробег',
      value: `${mileage.toLocaleString('bg-BG')} км`,
    },
    {
      icon: Settings,
      label: 'Скоростна кутия',
      value: GEARBOX_LABELS[gearbox] || gearbox,
    },
    ...(power
      ? [
          {
            icon: Zap,
            label: 'Мощност',
            value: `${power} hp`,
          },
        ]
      : []),
    ...(color
      ? [
          {
            icon: Palette,
            label: 'Цвят',
            value: color,
          },
        ]
      : []),
  ];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : window.innerWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: isMobile ? 12 : 16,
      padding: isMobile ? 16 : 20,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    specItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: isMobile ? 6 : 8,
      padding: isMobile ? 8 : 12,
      borderRadius: 6,
      transition: 'background 0.2s',
    },
    iconContainer: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: '50%',
      background: '#f0f4ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0066cc',
      transition: 'background 0.2s, transform 0.2s',
    },
    label: {
      fontSize: isMobile ? 11 : 12,
      color: '#666',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    value: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: 700,
      color: '#1a1a1a',
      wordBreak: 'break-word',
    },
  };

  return (
    <div style={styles.container}>
      {specs.map((spec, index) => {
        const Icon = spec.icon;
        return (
          <div key={index} style={styles.specItem}>
            <div style={styles.iconContainer}>
              <Icon size={24} />
            </div>
            <div style={styles.label}>{spec.label}</div>
            <div style={styles.value}>{spec.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export default SpecsGrid;
