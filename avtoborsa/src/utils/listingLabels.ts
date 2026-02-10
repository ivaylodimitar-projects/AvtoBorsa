const normalize = (value?: string | null) => (value ?? "").toString().trim().toLowerCase();

const FUEL_LABELS: Record<string, string> = {
  benzin: "Бензин",
  бензин: "Бензин",
  petrol: "Бензин",
  gasoline: "Бензин",
  dizel: "Дизел",
  дизел: "Дизел",
  diesel: "Дизел",
  gaz_benzin: "Газ/Бензин",
  "газ/бензин": "Газ/Бензин",
  "gas/benzin": "Газ/Бензин",
  "gas/benzine": "Газ/Бензин",
  "gasoline+gas": "Газ/Бензин",
  газ: "Газ/Бензин",
  hibrid: "Хибрид",
  хибрид: "Хибрид",
  hybrid: "Хибрид",
  elektro: "Електро",
  електро: "Електро",
  electric: "Електро",
  ev: "Електро",
};

const GEARBOX_LABELS: Record<string, string> = {
  ruchna: "Ръчна",
  ръчна: "Ръчна",
  manual: "Ръчна",
  stick: "Ръчна",
  avtomatik: "Автоматик",
  avctomatik: "Автоматик",
  автоматик: "Автоматик",
  автоматична: "Автоматик",
  automatic: "Автоматик",
  auto: "Автоматик",
};

const CONDITION_LABELS: Record<string, string> = {
  "0": "Нов",
  "1": "Употребяван",
  "2": "Повреден/ударен",
  "3": "За части",
  нов: "Нов",
  нова: "Нов",
  използван: "Употребяван",
  употребяван: "Употребяван",
  damaged: "Повреден/ударен",
  ударен: "Повреден/ударен",
  повреден: "Повреден/ударен",
  parts: "За части",
  "за части": "За части",
};

const EURO_LABELS: Record<string, string> = {
  "1": "Евро 1",
  "2": "Евро 2",
  "3": "Евро 3",
  "4": "Евро 4",
  "5": "Евро 5",
  "6": "Евро 6",
};

export const formatFuelLabel = (fuel?: string | null) => {
  if (!fuel) return "";
  const key = normalize(fuel);
  return FUEL_LABELS[key] || fuel;
};

export const formatGearboxLabel = (gearbox?: string | null) => {
  if (!gearbox) return "";
  const key = normalize(gearbox);
  return GEARBOX_LABELS[key] || gearbox;
};

export const formatConditionLabel = (condition?: string | null) => {
  if (!condition) return "";
  const key = normalize(condition);
  return CONDITION_LABELS[key] || condition;
};

export const formatEuroStandardLabel = (euro?: string | null) => {
  if (!euro) return "";
  const key = normalize(euro);
  const direct = EURO_LABELS[key];
  if (direct) return direct;
  const match = key.match(/\d+/);
  if (match) return `Евро ${match[0]}`;
  return euro;
};
