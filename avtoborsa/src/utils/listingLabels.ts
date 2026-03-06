const normalize = (value?: string | null) =>
  (value ?? "").toString().trim().toLocaleLowerCase("bg-BG");

const normalizeLookup = (value?: string | null) =>
  normalize(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-я]+/gi, "");

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

const TIRE_SEASON_LABELS: Record<string, string> = {
  летни: "Летни",
  letni: "Летни",
  summer: "Летни",
  summertires: "Летни",
  зимни: "Зимни",
  zimni: "Зимни",
  winter: "Зимни",
  wintertires: "Зимни",
  всесезонни: "Всесезонни",
  vsesezonni: "Всесезонни",
  allseason: "Всесезонни",
  allseasons: "Всесезонни",
  allweather: "Всесезонни",
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

export const formatEngineTypeLabel = (engineType?: string | null) => {
  if (!engineType) return "";
  const value = engineType.toString().trim();
  if (!value) return "";

  const lookup = normalizeLookup(value);
  if (!lookup) return value;

  if (
    lookup.includes("бездвигател") ||
    lookup.includes("nodvigatel") ||
    lookup.includes("noengine") ||
    lookup === "none"
  ) {
    return "Без двигател";
  }
  if (lookup.includes("pluginhibrid") || lookup.includes("phev")) {
    return "Plug-in хибрид";
  }
  if (lookup.includes("hibrid") || lookup.includes("hybrid")) {
    return "Хибрид";
  }
  if (
    lookup.includes("elektr") ||
    lookup.includes("electric") ||
    lookup === "ev"
  ) {
    return "Електро";
  }
  if (lookup.includes("dizel") || lookup.includes("diesel")) {
    return "Дизел";
  }
  if (
    lookup.includes("gaz") ||
    lookup.includes("gas") ||
    lookup.includes("lpg") ||
    lookup.includes("cng") ||
    lookup.includes("metan")
  ) {
    return "Газ";
  }
  if (lookup.includes("vodorod") || lookup.includes("hydrogen")) {
    return "Водород";
  }
  if (
    lookup.includes("benzin") ||
    lookup.includes("petrol") ||
    lookup.includes("gasoline")
  ) {
    return "Бензин";
  }

  return value;
};

export const formatTransmissionLabel = (transmission?: string | null) => {
  if (!transmission) return "";
  const value = transmission.toString().trim();
  if (!value) return "";

  const lookup = normalizeLookup(value);
  if (!lookup) return value;

  if (
    lookup.includes("poluavtomat") ||
    lookup.includes("semiauto") ||
    lookup.includes("semiautomatic") ||
    lookup.includes("robot")
  ) {
    return "Полуавтоматична";
  }
  if (
    lookup.includes("avtomat") ||
    lookup.includes("automatic") ||
    lookup.includes("cvt") ||
    lookup.includes("dct") ||
    lookup.includes("dsg")
  ) {
    return "Автоматична";
  }
  if (
    lookup.includes("ruchna") ||
    lookup.includes("manual") ||
    lookup.includes("stick")
  ) {
    return "Ръчна";
  }

  return value;
};

export const formatTireSeasonLabel = (season?: string | null) => {
  if (!season) return "";
  const value = season.toString().trim();
  if (!value) return "";

  const exact = TIRE_SEASON_LABELS[normalize(value)];
  if (exact) return exact;

  const lookup = normalizeLookup(value);
  return TIRE_SEASON_LABELS[lookup] || value;
};
