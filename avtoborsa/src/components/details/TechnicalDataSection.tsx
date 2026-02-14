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
  PackageOpen,
  Clock,
  Wrench,
} from 'lucide-react';
import { getMainCategoryLabel } from '../../constants/mobileBgData';

interface TechnicalDataSectionProps {
  mainCategory?: string;
  year?: number | string | null;
  month?: number;
  fuel?: string;
  power?: number | string | null;
  displacement?: number | string | null;
  displacementCc?: number | string | null;
  gearbox?: string;
  category?: string;
  mileage?: number | string | null;
  color?: string;
  vin?: string;
  condition?: string;
  euroStandard?: string;
  heavyEuroStandard?: string;
  isMobile?: boolean;
  city?: string;

  wheelFor?: string;
  offerType?: string;
  tireBrand?: string;
  tireWidth?: string;
  tireHeight?: string;
  tireDiameter?: string;
  tireSeason?: string;
  tireSpeedIndex?: string;
  tireLoadIndex?: string;
  tireTread?: string;
  wheelBrand?: string;
  material?: string;
  bolts?: number | string | null;
  pcd?: string;
  centerBore?: string;
  offset?: string;
  width?: string;
  diameter?: string;
  count?: number | string | null;
  wheelType?: string;

  partFor?: string;
  partCategory?: string;
  partElement?: string;
  partYearFrom?: number | string | null;
  partYearTo?: number | string | null;

  transmission?: string;
  engineType?: string;
  axles?: number | string | null;
  seats?: number | string | null;
  loadKg?: number | string | null;

  equipmentType?: string;
  liftCapacityKg?: number | string | null;
  hours?: number | string | null;

  beds?: number | string | null;
  lengthM?: number | string | null;
  hasToilet?: boolean;
  hasHeating?: boolean;
  hasAirConditioning?: boolean;

  boatCategory?: string;
  engineCount?: number | string | null;
  widthM?: number | string | null;
  draftM?: number | string | null;

  trailerCategory?: string;

  classifiedFor?: string;
  accessoryCategory?: string;
  buyServiceCategory?: string;
}

type TechnicalItem = {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentType<any>;
};

const MONTH_NAMES = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

const FUEL_LABELS: Record<string, string> = {
  benzin: 'Бензин',
  dizel: 'Дизел',
  gaz_benzin: 'Газ/Бензин',
  hibrid: 'Хибрид',
  elektro: 'Електро',
};

const GEARBOX_LABELS: Record<string, string> = {
  ruchna: 'Ръчна',
  avtomatik: 'Автоматична',
};

const CAR_TYPE_LABELS: Record<string, string> = {
  van: 'Ван',
  jeep: 'Джип',
  cabriolet: 'Кабрио',
  wagon: 'Комби',
  coupe: 'Купе',
  minivan: 'Миниван',
  pickup: 'Пикап',
  sedan: 'Седан',
  stretch_limo: 'Стреч лимузина',
  hatchback: 'Хечбек',
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

const WHEEL_OFFER_TYPE_LABELS: Record<string, string> = {
  '1': 'Гуми',
  '2': 'Джанти',
  '3': 'Гуми с джанти',
};

const toText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toPositiveNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const formatDate = (year?: number | string | null, month?: number) => {
  const normalizedYear = toText(year);
  if (!normalizedYear) return '';
  if (month && month >= 1 && month <= 12) {
    return `${MONTH_NAMES[month - 1]} ${normalizedYear}`;
  }
  return normalizedYear;
};

const formatFuel = (fuel?: string) => {
  const normalized = toText(fuel);
  if (!normalized) return '';
  return FUEL_LABELS[normalized] || normalized;
};

const formatGearbox = (gearbox?: string) => {
  const normalized = toText(gearbox);
  if (!normalized) return '';
  return GEARBOX_LABELS[normalized] || normalized;
};

const formatCondition = (condition?: string) => {
  const normalized = toText(condition);
  if (!normalized) return '';
  return CONDITION_LABELS[normalized] || normalized;
};

const formatEuro = (euro?: string) => {
  const normalized = toText(euro);
  if (!normalized) return '';
  return EURO_LABELS[normalized] || normalized;
};

const formatTopmenuCategory = (value?: string) => {
  const normalized = toText(value);
  if (!normalized) return '';
  return getMainCategoryLabel(normalized) || normalized;
};

const formatTireSize = (tireWidth?: string, tireHeight?: string, tireDiameter?: string) => {
  const width = toText(tireWidth);
  const height = toText(tireHeight);
  const diameter = toText(tireDiameter);
  if (width && height && diameter) return `${width}/${height} R${diameter}`;
  if (diameter) return `R${diameter}`;
  return '';
};

const formatYearRange = (from?: number | string | null, to?: number | string | null) => {
  const fromYear = toText(from);
  const toYear = toText(to);
  if (fromYear && toYear) return `${fromYear} - ${toYear}`;
  return fromYear || toYear;
};

const TechnicalDataSection: React.FC<TechnicalDataSectionProps> = ({
  mainCategory,
  year,
  month,
  fuel,
  power,
  displacement,
  displacementCc,
  gearbox,
  category,
  mileage,
  color,
  vin,
  condition,
  euroStandard,
  heavyEuroStandard,
  isMobile = false,
  city,
  wheelFor,
  offerType,
  tireBrand,
  tireWidth,
  tireHeight,
  tireDiameter,
  tireSeason,
  tireSpeedIndex,
  tireLoadIndex,
  tireTread,
  wheelBrand,
  material,
  bolts,
  pcd,
  centerBore,
  offset,
  width,
  diameter,
  count,
  wheelType,
  partFor,
  partCategory,
  partElement,
  partYearFrom,
  partYearTo,
  transmission,
  engineType,
  axles,
  seats,
  loadKg,
  equipmentType,
  liftCapacityKg,
  hours,
  beds,
  lengthM,
  hasToilet,
  hasHeating,
  hasAirConditioning,
  boatCategory,
  engineCount,
  widthM,
  draftM,
  trailerCategory,
  classifiedFor,
  accessoryCategory,
  buyServiceCategory,
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
      wordBreak: 'break-word',
    },
  };

  const items: TechnicalItem[] = [];
  const pushedKeys = new Set<string>();
  const addItem = (key: string, label: string, value: unknown, icon: React.ComponentType<any>) => {
    const normalized = toText(value);
    if (!normalized || pushedKeys.has(key)) return;
    pushedKeys.add(key);
    items.push({ key, label, value: normalized, icon });
  };
  const addNumericItem = (
    key: string,
    label: string,
    value: unknown,
    unit: string,
    icon: React.ComponentType<any>,
    formatAsInt = true
  ) => {
    const numeric = toPositiveNumber(value);
    if (numeric === null) return;
    const rendered = formatAsInt ? Math.round(numeric).toString() : numeric.toString();
    addItem(key, label, unit ? `${rendered} ${unit}` : rendered, icon);
  };
  const addBooleanYes = (key: string, label: string, value: unknown, icon: React.ComponentType<any>) => {
    if (value === true || toText(value).toLowerCase() === 'true') {
      addItem(key, label, 'Да', icon);
    }
  };

  const normalizedMainCategory = toText(mainCategory);

  switch (normalizedMainCategory) {
    case 'u':
      addItem('part-category', 'Категория', partCategory, PackageOpen);
      addItem('part-element', 'Част', partElement, Wrench);
      addItem('part-for', 'Части за', formatTopmenuCategory(partFor), Car);
      addItem('part-years', 'Години', formatYearRange(partYearFrom, partYearTo), Calendar);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case 'w':
      addItem('offer-type', 'Тип оферта', WHEEL_OFFER_TYPE_LABELS[toText(offerType)] || offerType, PackageOpen);
      addItem('wheel-for', 'За', formatTopmenuCategory(wheelFor), Car);
      addItem('tire-brand', 'Марка гуми', tireBrand, Wrench);
      addItem('tire-size', 'Размер гуми', formatTireSize(tireWidth, tireHeight, tireDiameter), Ruler);
      addItem('tire-season', 'Сезонност', tireSeason, Leaf);
      addItem('tire-speed', 'Скоростен индекс', tireSpeedIndex, Gauge);
      addItem('tire-load', 'Тегловен индекс', tireLoadIndex, Gauge);
      addItem('tire-tread', 'Релеф', tireTread, Route);
      addItem('wheel-brand', 'Марка джанти', wheelBrand, Wrench);
      addItem('wheel-material', 'Материал', material, Palette);
      addItem('wheel-bolts', 'Болтове', bolts, Cog);
      addItem('wheel-pcd', 'PCD', pcd, Ruler);
      addItem('wheel-center', 'Централен отвор', centerBore, Ruler);
      addItem('wheel-offset', 'Офсет ET', offset, Ruler);
      addItem('wheel-width', 'Ширина', width, Ruler);
      addItem('wheel-diameter', 'Диаметър', diameter, Ruler);
      addItem('wheel-count', 'Брой', count, PackageOpen);
      addItem('wheel-type', 'Вид', wheelType, PackageOpen);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case 'v':
      addItem('accessory-category', 'Категория', accessoryCategory, PackageOpen);
      addItem('accessory-for', 'За', formatTopmenuCategory(classifiedFor), Car);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case 'y':
      addItem('buy-category', 'Категория', buyServiceCategory, PackageOpen);
      addItem('buy-for', 'За', formatTopmenuCategory(classifiedFor), Car);
      break;
    case 'z':
      addItem('service-category', 'Категория', buyServiceCategory, PackageOpen);
      addItem('service-for', 'За', formatTopmenuCategory(classifiedFor), Car);
      break;
    case '3':
    case '4':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addNumericItem('axles', 'Брой оси', axles, '', Cog);
      addNumericItem('seats', 'Брой места', seats, '', PackageOpen);
      addNumericItem('load', 'Товароносимост', loadKg, 'кг', Gauge);
      addItem('transmission', 'Трансмисия', transmission, Cog);
      addItem('engine-type', 'Вид двигател', engineType, Fuel);
      addNumericItem('power', 'Мощност', power, 'к.с.', Gauge);
      addItem('euro', 'Евро стандарт', formatEuro(heavyEuroStandard || euroStandard), Leaf);
      addNumericItem('mileage', 'Пробег', mileage, 'км', Route);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case '5':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('type', 'Категория', category, PackageOpen);
      addNumericItem('displacement-cc', 'Кубатура', displacementCc || displacement, 'см³', Ruler);
      addItem('engine-type', 'Вид двигател', engineType || formatFuel(fuel), Fuel);
      addItem('transmission', 'Трансмисия', transmission || formatGearbox(gearbox), Cog);
      addNumericItem('power', 'Мощност', power, 'к.с.', Gauge);
      addNumericItem('mileage', 'Пробег', mileage, 'км', Route);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case '6':
    case '7':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('equipment-type', 'Категория', equipmentType, PackageOpen);
      addItem('engine-type', 'Вид двигател', engineType || formatFuel(fuel), Fuel);
      addItem('transmission', 'Трансмисия', transmission || formatGearbox(gearbox), Cog);
      addNumericItem('power', 'Мощност', power, 'к.с.', Gauge);
      addNumericItem('mileage', 'Пробег', mileage, 'км', Route);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case '8':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('engine-type', 'Вид двигател', engineType || formatFuel(fuel), Fuel);
      addNumericItem('forklift-load', 'Товароподемност', liftCapacityKg, 'кг', Gauge);
      addNumericItem('hours', 'Часове работа', hours, 'ч', Clock);
      addNumericItem('power', 'Мощност', power, 'к.с.', Gauge);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case '9':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addNumericItem('beds', 'Легла', beds, '', PackageOpen);
      addNumericItem('length-m', 'Дължина', lengthM, 'м', Ruler, false);
      addBooleanYes('toilet', 'Тоалетна', hasToilet, ShieldCheck);
      addBooleanYes('heating', 'Отопление', hasHeating, ShieldCheck);
      addBooleanYes('ac', 'Климатик', hasAirConditioning, ShieldCheck);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case 'a':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('boat-category', 'Категория', boatCategory, PackageOpen);
      addItem('engine-type', 'Вид двигател', engineType || formatFuel(fuel), Fuel);
      addNumericItem('engine-count', 'Брой двигатели', engineCount, '', Cog);
      addItem('material', 'Материал', material, Palette);
      addNumericItem('length', 'Дължина', lengthM, 'м', Ruler, false);
      addNumericItem('width-m', 'Ширина', widthM, 'м', Ruler, false);
      addNumericItem('draft-m', 'Газене', draftM, 'м', Ruler, false);
      addNumericItem('hours', 'Часове работа', hours, 'ч', Clock);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    case 'b':
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('trailer-category', 'Категория', trailerCategory, PackageOpen);
      addNumericItem('load', 'Товароносимост', loadKg, 'кг', Gauge);
      addNumericItem('axles', 'Брой оси', axles, '', Cog);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      break;
    default:
      addItem('date', 'Дата на производство', formatDate(year, month), Calendar);
      addItem('fuel', 'Гориво', formatFuel(fuel), Fuel);
      addNumericItem('power', 'Мощност', power, 'к.с.', Gauge);
      addNumericItem('displacement', 'Кубатура', displacement, 'см³', Ruler);
      addItem('gearbox', 'Скоростна кутия', formatGearbox(gearbox), Cog);
      addItem('category', 'Категория', category ? (CAR_TYPE_LABELS[category] || category) : '', Car);
      addNumericItem('mileage', 'Пробег', mileage, 'км', Route);
      addItem('color', 'Цвят', color, Palette);
      addItem('vin', 'VIN номер', vin, Barcode);
      addItem('condition', 'Състояние', formatCondition(condition), ShieldCheck);
      addItem('euro', 'Евро стандарт', formatEuro(euroStandard), Leaf);
      break;
  }

  // Fallbacks when category-specific payload is sparse.
  if (items.length < 3) addItem('fallback-date', 'Дата на производство', formatDate(year, month), Calendar);
  if (items.length < 3) addNumericItem('fallback-power', 'Мощност', power, 'к.с.', Gauge);
  if (items.length < 3) addNumericItem('fallback-mileage', 'Пробег', mileage, 'км', Route);
  if (items.length < 3) addItem('fallback-fuel', 'Гориво', formatFuel(fuel), Fuel);
  if (items.length < 3) addItem('fallback-gearbox', 'Скоростна кутия', formatGearbox(gearbox), Cog);
  if (items.length < 3) addItem('fallback-city', 'Град', city, Route);
  if (items.length < 3) addItem('fallback-condition', 'Състояние', formatCondition(condition), ShieldCheck);
  if (items.length < 2) addItem('fallback-extra', 'Допълнителни данни', 'Няма налични', PackageOpen);

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
