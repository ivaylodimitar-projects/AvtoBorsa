export interface MotoFeatureGroup {
  key: string;
  title: string;
  description?: string;
  items: string[];
}

export const MOTO_CATEGORY_OPTIONS = [
  "ATV/UTV",
  "Ендуро",
  "Кросов",
  "Круизър",
  "Пистов",
  "Ретро",
  "Скутер",
  "Супермото",
  "Турър",
  "Чопър",
  "Други",
];

export const MOTO_COOLING_TYPE_OPTIONS = [
  "Въздушно",
  "Водно",
  "Водно/маслено",
  "Маслено",
];

export const MOTO_ENGINE_KIND_OPTIONS = [
  "2-тактов",
  "4-тактов",
  "Едноцилиндров",
  "Двуцилиндров",
  "Трицилиндров",
  "Четирицилиндров",
  "Боксер",
  "V-образен",
  "Роторен",
  "Електромотор",
];

export const MOTO_FEATURE_GROUPS: MotoFeatureGroup[] = [
  {
    key: "безопасност",
    title: "Безопасност",
    description: "Системи за активна безопасност",
    items: [
      "GPS система за проследяване",
      "Автоматичен контрол на стабилността",
      "Антиблокираща система",
      "Катализатор",
      "Система за контрол на сцеплението",
    ],
  },
  {
    key: "комфорт",
    title: "Комфорт",
    description: "Удобства и оборудване",
    items: [
      "Багажен куфар",
      "Бордкомпютър",
      "Електрически стартер",
      "Навигация",
      "Стерео уредба",
    ],
  },
  {
    key: "защита",
    title: "Защита",
    description: "Противокражбени и защитни системи",
    items: [
      "Аларма",
      "Защитна клетка",
      "Имобилайзер",
      "Каско",
    ],
  },
  {
    key: "екстериор",
    title: "Екстериор",
    description: "Външно оборудване",
    items: [
      "LED фарове",
      "Кош",
      "Ксенонови фарове",
      "Металик",
      "Предно стъкло",
      "Ролбар",
    ],
  },
  {
    key: "други",
    title: "Други",
    description: "Допълнителни характеристики",
    items: [
      "Buy back",
      "Бартер",
      "За каскади",
      "Инжекционна горивна система",
      "Капариран/Продаден",
      "Катастрофирал",
      "Лизинг",
      "Маслен радиатор",
      "На части",
      "Напълно обслужен",
      "С регистрация",
      "Сервизна книжка",
      "Тунинг",
    ],
  },
];

const MOTO_CATEGORY_PREFIX = "Категория: ";
const MOTO_COOLING_PREFIX = "Охлаждане: ";
const MOTO_ENGINE_KIND_PREFIX = "Вид двигател: ";

const normalizeText = (value: unknown): string => String(value ?? "").trim();

export const buildMotoMetaFeatures = ({
  motoCategory,
  motoCoolingType,
  motoEngineKind,
}: {
  motoCategory?: string | null;
  motoCoolingType?: string | null;
  motoEngineKind?: string | null;
}): string[] => {
  const next: string[] = [];
  const category = normalizeText(motoCategory);
  const coolingType = normalizeText(motoCoolingType);
  const engineKind = normalizeText(motoEngineKind);

  if (category) next.push(`${MOTO_CATEGORY_PREFIX}${category}`);
  if (coolingType) next.push(`${MOTO_COOLING_PREFIX}${coolingType}`);
  if (engineKind) next.push(`${MOTO_ENGINE_KIND_PREFIX}${engineKind}`);

  return Array.from(new Set(next));
};

export const isMotoMetaFeature = (feature: unknown): boolean => {
  const value = normalizeText(feature);
  if (!value) return false;
  return (
    value.startsWith(MOTO_CATEGORY_PREFIX) ||
    value.startsWith(MOTO_COOLING_PREFIX) ||
    value.startsWith(MOTO_ENGINE_KIND_PREFIX)
  );
};

export const extractMotoMetaFromFeatures = (rawFeatures: string[] | null | undefined) => {
  let motoCategory = "";
  let motoCoolingType = "";
  let motoEngineKind = "";
  const plainFeatures: string[] = [];

  (rawFeatures || []).forEach((rawFeature) => {
    const feature = normalizeText(rawFeature);
    if (!feature) return;

    if (feature.startsWith(MOTO_CATEGORY_PREFIX)) {
      if (!motoCategory) motoCategory = feature.slice(MOTO_CATEGORY_PREFIX.length).trim();
      return;
    }
    if (feature.startsWith(MOTO_COOLING_PREFIX)) {
      if (!motoCoolingType) motoCoolingType = feature.slice(MOTO_COOLING_PREFIX.length).trim();
      return;
    }
    if (feature.startsWith(MOTO_ENGINE_KIND_PREFIX)) {
      if (!motoEngineKind) motoEngineKind = feature.slice(MOTO_ENGINE_KIND_PREFIX.length).trim();
      return;
    }

    plainFeatures.push(feature);
  });

  return {
    motoCategory,
    motoCoolingType,
    motoEngineKind,
    plainFeatures: Array.from(new Set(plainFeatures)),
  };
};
