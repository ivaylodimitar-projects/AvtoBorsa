import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiClipboard,
  FiFileText,
  FiImage,
  FiPhone,
  FiSettings,
  FiStar,
  FiTag,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { BULGARIAN_CITIES_BY_REGION } from "../constants/bulgarianCities";
import ListingFormStepper from "./ListingFormStepper";
import AdvancedImageUpload from "./AdvancedImageUpload";
import FormFieldWithTooltip from "./FormFieldWithTooltip";
import ListingPreview from "./ListingPreview";
import ListingQualityIndicator from "./ListingQualityIndicator";
import { CAR_FEATURE_GROUPS, normalizeCarFeatures } from "../constants/carFeatures";
import type { CarFeatureGroup } from "../constants/carFeatures";
import { HEAVY_FEATURE_GROUPS } from "../constants/heavyFeatures";
import {
  MOTO_CATEGORY_OPTIONS,
  MOTO_COOLING_TYPE_OPTIONS,
  MOTO_ENGINE_KIND_OPTIONS,
  MOTO_FEATURE_GROUPS,
  buildMotoMetaFeatures,
  extractMotoMetaFromFeatures,
} from "../constants/motoData";
import { groupOptionsByInitial, sortUniqueOptions } from "../utils/alphabeticalOptions";
import {
  APP_MAIN_CATEGORY_OPTIONS,
  CLASSIFIED_FOR_OPTIONS as MOBILE_CLASSIFIED_FOR_OPTIONS,
  getAccessoryCategories,
  getBrandOptionsByMainCategory,
  getMainCategoryLabel as getMobileMainCategoryLabel,
  getModelOptionsByMainCategory,
  getPartCategories,
  getPartElements,
  getTopmenuFromMainCategory,
  getWheelOfferTypeOptions,
  getWheelPcdOptions,
  type AppMainCategory,
} from "../constants/mobileBgData";

const BULGARIA_REGIONS = [
  { value: "Благоевград", label: "обл. Благоевград" },
  { value: "Бургас", label: "обл. Бургас" },
  { value: "Варна", label: "обл. Варна" },
  { value: "Велико Търново", label: "обл. Велико Търново" },
  { value: "Видин", label: "обл. Видин" },
  { value: "Враца", label: "обл. Враца" },
  { value: "Габрово", label: "обл. Габрово" },
  { value: "Добрич", label: "обл. Добрич" },
  { value: "Дупница", label: "общ. Дупница" },
  { value: "Кърджали", label: "обл. Кърджали" },
  { value: "Кюстендил", label: "обл. Кюстендил" },
  { value: "Ловеч", label: "обл. Ловеч" },
  { value: "Монтана", label: "обл. Монтана" },
  { value: "Пазарджик", label: "обл. Пазарджик" },
  { value: "Перник", label: "обл. Перник" },
  { value: "Плевен", label: "обл. Плевен" },
  { value: "Пловдив", label: "обл. Пловдив" },
  { value: "Разград", label: "обл. Разград" },
  { value: "Русе", label: "обл. Русе" },
  { value: "Силистра", label: "обл. Силистра" },
  { value: "Сливен", label: "обл. Сливен" },
  { value: "Смолян", label: "обл. Смолян" },
  { value: "София", label: "обл. София" },
  { value: "Стара Загора", label: "обл. Стара Загора" },
  { value: "Търговище", label: "обл. Търговище" },
  { value: "Хасково", label: "обл. Хасково" },
  { value: "Шумен", label: "обл. Шумен" },
  { value: "Ямбол", label: "обл. Ямбол" },
  { value: "Извън страната", label: "Извън страната" },
];

type MainCategoryKey = AppMainCategory;

interface PublishFormData {
  mainCategory: MainCategoryKey;
  category: string;
  title: string;
  brand: string;
  model: string;
  yearFrom: string;
  month: string;
  vin: string;
  locationCountry: string;
  locationRegion: string;
  price: string;
  city: string;
  fuel: string;
  gearbox: string;
  mileage: string;
  color: string;
  condition: string;
  power: string;
  displacement: string;
  euroStandard: string;
  description: string;
  phone: string;
  email: string;
  pictures: File[];
  features: string[];
  listingType: "normal" | "top";
  wheelFor: string;
  wheelOfferType: string;
  wheelBrand: string;
  wheelMaterial: string;
  wheelBolts: string;
  wheelPcd: string;
  wheelCenterBore: string;
  wheelOffset: string;
  wheelWidth: string;
  wheelDiameter: string;
  wheelCount: string;
  wheelType: string;
  partFor: string;
  partCategory: string;
  partElement: string;
  partYearFrom: string;
  partYearTo: string;
  heavyAxles: string;
  heavySeats: string;
  heavyLoad: string;
  transmission: string;
  engineType: string;
  heavyEuroStandard: string;
  motoDisplacement: string;
  motoCategory: string;
  motoCoolingType: string;
  motoEngineKind: string;
  equipmentType: string;
  agriDriveType: string;
  forkliftLoad: string;
  forkliftHours: string;
  caravanBeds: string;
  caravanLength: string;
  caravanHasToilet: boolean;
  caravanHasHeating: boolean;
  caravanHasAc: boolean;
  boatCategory: string;
  boatEngineCount: string;
  boatMaterial: string;
  boatLength: string;
  boatWidth: string;
  boatDraft: string;
  boatHours: string;
  boatFeatures: string[];
  trailerCategory: string;
  trailerLoad: string;
  trailerAxles: string;
  trailerFeatures: string[];
  classifiedFor: string;
  accessoryCategory: string;
  buyServiceCategory: string;
}

const MAIN_CATEGORY_OPTIONS: Array<{ value: MainCategoryKey; label: string }> =
  APP_MAIN_CATEGORY_OPTIONS as Array<{ value: MainCategoryKey; label: string }>;

const CLASSIFIED_FOR_OPTIONS = MOBILE_CLASSIFIED_FOR_OPTIONS;

const CONDITION_OPTIONS = [
  { value: "0", label: "Нов" },
  { value: "1", label: "Употребяван" },
  { value: "2", label: "Повреден/ударен" },
  { value: "3", label: "За части" },
];

const CAR_FUEL_OPTIONS = [
  { value: "benzin", label: "Бензин" },
  { value: "dizel", label: "Дизел" },
  { value: "gaz_benzin", label: "Газ/Бензин" },
  { value: "hibrid", label: "Хибрид" },
  { value: "elektro", label: "Електро" },
];

const CAR_GEARBOX_OPTIONS = [
  { value: "ruchna", label: "Ръчна" },
  { value: "avtomatik", label: "Автоматик" },
];

const ENGINE_TYPE_OPTIONS = [
  "Без двигател",
  "Бензинов",
  "Дизелов",
  "Електрически",
  "Хибриден",
  "Plug-in хибрид",
  "Газ",
  "Водород",
];

const TRANSMISSION_OPTIONS = ["Ръчна", "Автоматична", "Полуавтоматична"];

const HEAVY_EURO_STANDARD_OPTIONS = [
  "Евро 1",
  "Евро 2",
  "Евро 3",
  "Евро 4",
  "Евро 5",
  "Евро 6",
];

const COLOR_OPTIONS = [
  "Бял",
  "Черен",
  "Сив",
  "Сребърен",
  "Син",
  "Червен",
  "Зелен",
  "Жълт",
  "Оранжев",
  "Кафяв",
  "Бежов",
  "Златист",
  "Виолетов",
  "Бордо",
];

const WHEEL_OFFER_TYPE_OPTIONS = ["Гуми", "Джанти", "Гуми с джанти"];
const WHEEL_MATERIAL_OPTIONS = ["алуминиеви", "магнезиеви", "железни", "други"];
const WHEEL_BOLT_OPTIONS = ["3", "4", "5", "6", "8", "9", "10", "12"];
const WHEEL_TYPE_OPTIONS = ["Неразглобяеми", "Разглобяеми"];
const WHEEL_BRAND_OPTIONS = [
  "OEM",
  "AEZ",
  "Alutec",
  "ATS",
  "BBS",
  "Borbet",
  "Dezent",
  "Dotz",
  "Enkei",
  "Fondmetal",
  "MAK",
  "Momo",
  "MSW",
  "OZ",
  "Rial",
  "Ronal",
  "Rota",
  "TSW",
  "Други",
];
const WHEEL_PCD_OPTIONS = [
  "3x98",
  "4x98",
  "4x100",
  "4x108",
  "5x100",
  "5x108",
  "5x110",
  "5x112",
  "5x114.3",
  "5x120",
  "5x127",
  "6x139.7",
];
const WHEEL_CENTER_BORE_OPTIONS = [
  "56.1",
  "57.1",
  "60.1",
  "63.4",
  "64.1",
  "65.1",
  "66.1",
  "66.6",
  "67.1",
  "70.1",
  "71.6",
  "72.6",
  "73.1",
  "74.1",
];
const WHEEL_OFFSET_OPTIONS = [
  "-30-20",
  "-20-10",
  "-10-0",
  "0-10",
  "10-20",
  "20-30",
  "30-40",
  "40-50",
  "50-60",
  "60-70",
  "70-80",
  "80-90",
  "90-100",
];
const WHEEL_WIDTH_OPTIONS = [
  "3.5",
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
  "7.5",
  "8.0",
  "8.5",
  "9.0",
  "9.5",
  "10.0",
  "10.5",
  "11.0",
  "11.5",
  "12.0",
  "13.0",
  "14.0",
];
const WHEEL_DIAMETER_OPTIONS = [
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "15.5",
  "16",
  "16.5",
  "17",
  "17.5",
  "18",
  "19",
  "19.5",
  "20",
  "21",
  "22",
  "22.5",
  "23",
  "24",
  "26",
  "28",
];
const WHEEL_COUNT_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const PART_CATEGORY_OPTIONS = [
  "Ауспуси, Гърнета",
  "Газови и метанови уредби",
  "Горивна система",
  "Двигател",
  "Електрическа система",
  "Запалителна система",
  "Интериор и аксесоари",
  "Климатична система",
  "Консумативи",
  "Кормилна система",
  "Окачване",
  "Охладителна система",
  "Рама и Каросерия",
  "Ремъци, Ролки, Вериги",
  "Светлини",
  "Спирачна система",
  "Трансмисия",
  "Филтри",
  "Ходова част",
];

const PART_ELEMENT_OPTIONS = [
  "Двигател",
  "Скоростна кутия",
  "Турбо",
  "Стартер",
  "Алтернатор",
  "Инжектори",
  "Дюзи",
  "Окачване",
  "Амортисьори",
  "Спирачни апарати",
  "Фарове",
  "Стопове",
  "Броня",
  "Калник",
  "Врата",
  "Седалки",
  "Табло",
  "Огледало",
  "Радиатор",
  "Други",
];

const ACCESSORY_CATEGORY_OPTIONS = [
  "CD, DVD",
  "LED крушки и светлини",
  "Xenon",
  "Авто крушки",
  "Акумулатори",
  "Аларми и централно заключване",
  "Вериги за сняг",
  "Видеорегистратори",
  "Инструменти",
  "Интериорни аксесоари",
  "Навигация",
  "Парктроници",
  "Седалки - обикновени, спортни",
  "Спойлери, брони и аксесоари към тях",
  "Стелки",
  "Тасове",
  "Тонколони",
  "Усилватели",
  "Фолио",
  "Чистачки",
  "Други",
];

const BUY_CATEGORY_OPTIONS = [
  "Автомобил",
  "АВТОЧАСТИ",
  "Бус",
  "Джанти",
  "Джип",
  "Други",
  "Едрогабаритни каросерийни части",
  "За двигатели",
  "За електрическа система",
  "Инструменти",
  "Камион",
  "Осветление",
  "РАЗНИ",
  "Седалки - обикновени, спортни",
  "Трактор",
  "Щори",
];

const SERVICE_CATEGORY_OPTIONS = [
  "Rent a car",
  "Taxi",
  "Автоаларми",
  "Автоклиматици",
  "Автоключарски",
  "Автомивки",
  "Автопарк",
  "Автотапицерски",
  "Автотенекеджийски и автобояджийски",
  "Административни",
  "Вулканизатор, баланс на гуми",
  "Застраховки",
  "Изкупуване на коли за скраб",
  "Лизинг",
  "Мобилна смяна на гуми/джанти",
  "Пастиране",
  "Полиране",
  "Пътна помощ",
  "Ремонт на двигатели",
  "Ремонт на ел. инсталации",
  "Ремонт на изпускателна система",
  "Ремонт на ходова част",
  "Сервизни услуги",
  "Товарни превози",
  "Тунинг",
  "Шофьорски курсове",
];

const EQUIPMENT_TYPE_OPTIONS = [
  "Трактор",
  "Комбайн",
  "Пръскачка",
  "Сеялка",
  "Косачка",
  "Багер",
  "Булдозер",
  "Валяк",
  "Грейдер",
  "Телехендлер",
  "Кран",
  "Друго",
];

const BOAT_MATERIAL_OPTIONS = [
  "Алуминий",
  "Желязо",
  "Пластмаса",
  "Дърво",
  "Бетон",
  "Кевлар",
  "PVC",
  "Hypalon",
  "Стъклопласт",
];

const buildNumericOptions = (
  from: number,
  to: number,
  step = 1,
  fractionDigits = 0
): string[] => {
  const options: string[] = [];
  for (let value = from; value <= to + Number.EPSILON; value += step) {
    options.push(value.toFixed(fractionDigits));
  }
  return options;
};

const HEAVY_AXLE_OPTIONS = buildNumericOptions(1, 8);
const HEAVY_SEAT_OPTIONS = buildNumericOptions(1, 80);
const HEAVY_LOAD_OPTIONS = buildNumericOptions(500, 50000, 500);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, idx) => String(idx + 1));
const FORKLIFT_LOAD_OPTIONS = buildNumericOptions(500, 10000, 250);
const FORKLIFT_HOUR_OPTIONS = buildNumericOptions(0, 50000, 500);
const CARAVAN_BED_OPTIONS = buildNumericOptions(1, 10);
const CARAVAN_LENGTH_OPTIONS = buildNumericOptions(3, 12, 0.5, 1);
const BOAT_ENGINE_COUNT_OPTIONS = buildNumericOptions(1, 4);
const BOAT_LENGTH_OPTIONS = buildNumericOptions(2, 20, 0.5, 1);
const BOAT_WIDTH_OPTIONS = buildNumericOptions(1, 6, 0.5, 1);
const BOAT_DRAFT_OPTIONS = buildNumericOptions(0.2, 4, 0.2, 1);
const BOAT_HOUR_OPTIONS = buildNumericOptions(0, 20000, 500);
const TRAILER_LOAD_OPTIONS = buildNumericOptions(500, 50000, 500);
const TRAILER_AXLE_OPTIONS = buildNumericOptions(1, 8);

const CAR_CATEGORY_OPTIONS = [
  { value: "van", label: "Ван" },
  { value: "jeep", label: "Джип" },
  { value: "cabriolet", label: "Кабрио" },
  { value: "wagon", label: "Комби" },
  { value: "coupe", label: "Купе" },
  { value: "minivan", label: "Миниван" },
  { value: "pickup", label: "Пикап" },
  { value: "sedan", label: "Седан" },
  { value: "stretch_limo", label: "Стреч лимузина" },
  { value: "hatchback", label: "Хечбек" },
];

const AGRI_DRIVE_TYPE_OPTIONS = ["2x4", "4x4", "Верижно", "Друго"];

const CATEGORY_AS_BRAND_MAIN_CATEGORIES = new Set<MainCategoryKey>(["6", "a", "b"]);
const UNSORTED_BRAND_OPTION_MAIN_CATEGORIES = new Set<MainCategoryKey>(["6", "a", "b"]);

type AgriFieldVisibility = {
  showEngineType: boolean;
  showPower: boolean;
  showTransmission: boolean;
  showDriveType: boolean;
  showHours: boolean;
  showEuroStandard: boolean;
};

const DEFAULT_AGRI_FIELD_VISIBILITY: AgriFieldVisibility = {
  showEngineType: false,
  showPower: false,
  showTransmission: false,
  showDriveType: false,
  showHours: false,
  showEuroStandard: false,
};

const AGRI_FIELD_VISIBILITY_BY_CATEGORY: Record<string, AgriFieldVisibility> = {
  "трактор": {
    showEngineType: true,
    showPower: true,
    showTransmission: true,
    showDriveType: true,
    showHours: true,
    showEuroStandard: true,
  },
  "комбайн": {
    showEngineType: true,
    showPower: true,
    showTransmission: true,
    showDriveType: false,
    showHours: true,
    showEuroStandard: true,
  },
  "телескопичен товарач": {
    showEngineType: false,
    showPower: false,
    showTransmission: false,
    showDriveType: false,
    showHours: false,
    showEuroStandard: false,
  },
};

const getAgriFieldVisibility = (category: string): AgriFieldVisibility => {
  const normalizedCategory = category.trim().toLocaleLowerCase("bg-BG");
  if (!normalizedCategory) return DEFAULT_AGRI_FIELD_VISIBILITY;
  return AGRI_FIELD_VISIBILITY_BY_CATEGORY[normalizedCategory] ?? DEFAULT_AGRI_FIELD_VISIBILITY;
};

const CATEGORIES_WITHOUT_BRAND_AND_MODEL = new Set<MainCategoryKey>(["w", "u", "v", "y", "z"]);
const CATEGORIES_WITHOUT_PRICE = new Set<MainCategoryKey>(["y", "z"]);

const requiresBrandAndModel = (mainCategory: MainCategoryKey) =>
  !CATEGORIES_WITHOUT_BRAND_AND_MODEL.has(mainCategory);

const requiresPrice = (mainCategory: MainCategoryKey) => !CATEGORIES_WITHOUT_PRICE.has(mainCategory);

const isHeavyMainCategory = (mainCategory: MainCategoryKey) =>
  mainCategory === "3" || mainCategory === "4";

const INDUSTRIAL_FEATURE_GROUPS = (["komfort", "drugi", "zashtita"] as const)
  .map((groupKey) => HEAVY_FEATURE_GROUPS.find((group) => group.key === groupKey))
  .filter((group): group is NonNullable<(typeof HEAVY_FEATURE_GROUPS)[number]> => Boolean(group));

const AGRI_FEATURE_GROUPS = INDUSTRIAL_FEATURE_GROUPS;

const TRAILER_FEATURE_GROUPS: CarFeatureGroup[] = [
  {
    key: "bezopasnost",
    title: "Безопасност",
    items: [
      "Антиблокираща система",
      "Въздушно окачване",
      "Дискови спирачки",
      "Електронна система за завиване",
      "Завиващ мост",
      "Инерционен теглич",
      "Люлеещ теглич",
      "Пневматична спирачна система",
      "Твърд теглич",
    ],
  },
  {
    key: "drugi",
    title: "Други",
    items: [
      "Бартер",
      "Капариран/Продаден",
      "Лизинг",
      "Нов внос",
      "Подвижен под",
      "Подсилен под",
      "Ресьори",
      "С регистрация",
    ],
  },
  {
    key: "zashtita",
    title: "Защита",
    items: ["Каско"],
  },
  {
    key: "specializirani",
    title: "Специализирани",
    items: [
      "Автовоз",
      "Бордово",
      "Гондола",
      "За превоз на животни",
      "За превоз на лодка/яхта",
      "За превоз на опасни товари",
      "За превоз на стъкло",
      "За превоз на трупи/дървесина",
      "Зърновоз",
      "Изотермично",
      "Контейнеровоз",
      "Магазин",
      "Мобилно заведение",
      "Открито",
      "Палетоносач",
      "Платформа",
      "С ниска товарна площадка",
      "Самосвал",
      "Туристическо",
      "Фургон",
      "Хенгер",
      "Хладилно",
      "Циментовоз",
      "Цистерна",
      "Шаси",
    ],
  },
  {
    key: "eksterior",
    title: "Екстериор",
    items: [
      "2/3 странно изсипване",
      "Алуминиев кош",
      "Брезент",
      "Капаци",
      "Лети джанти",
      "Повдигащи се оси",
      "Тристранна щора",
      "Тристранно разтоварване",
    ],
  },
];

const BOAT_FEATURE_GROUPS: CarFeatureGroup[] = [
  {
    key: "bezopasnost",
    title: "Безопасност",
    items: ["Автопилот", "Ехолот", "Радар", "Радиостанция", "Чартплотер"],
  },
  {
    key: "komfort",
    title: "Комфорт",
    items: [
      "DVD, TV",
      "Климатик",
      "Навигация",
      "Печка",
      "Стерео уредба",
      "Хидрофорна система",
      "Хладилник",
    ],
  },
  {
    key: "drugi",
    title: "Други",
    items: [
      "Бартер",
      "Воден резервоар",
      "Генератор",
      "Капариран/Продаден",
      "Лизинг",
      "Нов внос",
      "Помпа",
      "С регистрация",
      "С ремарке",
      "Тента",
      "Кран",
    ],
  },
  {
    key: "zashtita",
    title: "Защита",
    items: ["Каско", "Лебедка", "Покривало", "Противопожарно оборудване", "Хидравлични стабилизатори"],
  },
  {
    key: "interior",
    title: "Интериор",
    items: ["Баня", "Кухня", "Тоалетна"],
  },
];

const getFeatureGroupsByMainCategory = (mainCategory: MainCategoryKey) => {
  if (mainCategory === "1") return CAR_FEATURE_GROUPS;
  if (isHeavyMainCategory(mainCategory)) return HEAVY_FEATURE_GROUPS;
  if (mainCategory === "5") return MOTO_FEATURE_GROUPS;
  if (mainCategory === "6") return AGRI_FEATURE_GROUPS;
  if (mainCategory === "7") return INDUSTRIAL_FEATURE_GROUPS;
  if (mainCategory === "a") return BOAT_FEATURE_GROUPS;
  if (mainCategory === "b") return TRAILER_FEATURE_GROUPS;
  return [];
};

const supportsFeaturesStep = (mainCategory: MainCategoryKey) =>
  getFeatureGroupsByMainCategory(mainCategory).length > 0;

const getMainCategoryLabel = (mainCategory: MainCategoryKey) =>
  getMobileMainCategoryLabel(mainCategory) || "Обява";

const getBuyServiceCategoryOptions = (mainCategory: MainCategoryKey) =>
  mainCategory === "y" ? BUY_CATEGORY_OPTIONS : SERVICE_CATEGORY_OPTIONS;

const mapEngineTypeToFuelValue = (engineType: string): string => {
  const normalized = engineType.trim().toLocaleLowerCase("bg-BG");
  if (!normalized) return "benzin";
  if (normalized.includes("дизел")) return "dizel";
  if (normalized.includes("електр")) return "elektro";
  if (normalized.includes("хибрид")) return "hibrid";
  if (normalized.includes("газ") || normalized.includes("метан")) return "gaz_benzin";
  return "benzin";
};

const mapTransmissionToGearboxValue = (transmission: string): string => {
  const normalized = transmission.trim().toLocaleLowerCase("bg-BG");
  if (!normalized) return "ruchna";
  if (normalized.includes("автомат")) return "avtomatik";
  return "ruchna";
};

const getClassifiedForLabel = (topmenu: string): string => {
  const normalized = topmenu.trim();
  if (!normalized) return "";
  return CLASSIFIED_FOR_OPTIONS.find((option) => option.value === normalized)?.label || normalized;
};

const getWheelOfferTypeLabel = (wheelFor: string, offerType: string, defaultTopmenu: string): string => {
  const normalizedOffer = offerType.trim();
  if (!normalizedOffer) return "";
  const options = getWheelOfferTypeOptions(wheelFor || defaultTopmenu);
  const option = options.find(
    (entry) => entry.value === normalizedOffer || entry.label === normalizedOffer
  );
  return option?.label || normalizedOffer;
};

const joinTitleParts = (...parts: Array<string | null | undefined>): string =>
  parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");

const TITLE_SUFFIX_MAX_LENGTH = 60;
const LISTING_TITLE_MAX_LENGTH = 100;

const trimToMaxLength = (value: string, maxLength: number): string =>
  value.trim().slice(0, maxLength).trimEnd();

const normalizeTitleSuffix = (rawTitle: string, baseTitle: string): string => {
  const title = trimToMaxLength(rawTitle, TITLE_SUFFIX_MAX_LENGTH);
  if (!title) return "";

  const base = baseTitle.trim();
  if (!base) return title;

  const loweredTitle = title.toLocaleLowerCase("bg-BG");
  const loweredBase = base.toLocaleLowerCase("bg-BG");

  if (loweredTitle === loweredBase) {
    return "";
  }

  if (loweredTitle.startsWith(loweredBase)) {
    let suffix = title.slice(base.length).trim();
    suffix = suffix.replace(/^[-:|,]+/, "").trim();
    return suffix;
  }

  return title;
};

const finalizeListingTitle = (title: string, fallbackTitle: string): string => {
  const candidate = title.trim() || fallbackTitle;
  return trimToMaxLength(candidate, LISTING_TITLE_MAX_LENGTH);
};

const getFallbackBrandModel = (
  data: PublishFormData,
  defaultClassifiedTopmenu: string
): { brand: string; model: string } => {
  const classifiedLabel = getClassifiedForLabel(defaultClassifiedTopmenu);

  switch (data.mainCategory) {
    case "w": {
      const wheelForLabel = getClassifiedForLabel(data.wheelFor || defaultClassifiedTopmenu);
      const offerLabel =
        getWheelOfferTypeLabel(data.wheelFor, data.wheelOfferType, defaultClassifiedTopmenu) ||
        "Гуми/джанти";
      return {
        brand: data.wheelBrand.trim() || offerLabel,
        model: wheelForLabel || classifiedLabel || "Обява",
      };
    }
    case "u": {
      const partForLabel = getClassifiedForLabel(data.partFor || defaultClassifiedTopmenu);
      return {
        brand: data.partCategory.trim() || "Авточасти",
        model: data.partElement.trim() || partForLabel || "Обява",
      };
    }
    case "v": {
      const accessoryForLabel = getClassifiedForLabel(data.classifiedFor || defaultClassifiedTopmenu);
      return {
        brand: data.accessoryCategory.trim() || "Аксесоари",
        model: accessoryForLabel || classifiedLabel || "Обява",
      };
    }
    case "y":
    case "z": {
      const categoryLabel = data.mainCategory === "y" ? "Купува" : "Услуга";
      const serviceForLabel = getClassifiedForLabel(data.classifiedFor || defaultClassifiedTopmenu);
      return {
        brand: data.buyServiceCategory.trim() || categoryLabel,
        model: serviceForLabel || classifiedLabel || "Обява",
      };
    }
    default:
      return {
        brand: getMainCategoryLabel(data.mainCategory),
        model: "Обява",
      };
  }
};

const buildListingTitle = (data: PublishFormData, defaultClassifiedTopmenu: string): string => {
  const categoryLabel = getMainCategoryLabel(data.mainCategory);

  switch (data.mainCategory) {
    case "1": {
      const baseCarTitle = joinTitleParts(data.brand, data.model);
      const optionalSuffix = normalizeTitleSuffix(data.title, baseCarTitle);
      return finalizeListingTitle(joinTitleParts(baseCarTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    case "5": {
      const motoCategoryTag = data.motoCategory ? `(${data.motoCategory})` : "";
      const baseMotoTitle = joinTitleParts(data.brand, data.model, motoCategoryTag);
      const optionalSuffix = normalizeTitleSuffix(data.title, baseMotoTitle);
      return finalizeListingTitle(joinTitleParts(baseMotoTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    case "w": {
      const wheelForLabel = getClassifiedForLabel(data.wheelFor || defaultClassifiedTopmenu);
      const offerLabel =
        getWheelOfferTypeLabel(data.wheelFor, data.wheelOfferType, defaultClassifiedTopmenu) ||
        "Гуми/джанти";
      const mainPart = joinTitleParts(offerLabel, data.wheelBrand);
      const baseWheelTitle = joinTitleParts(mainPart, wheelForLabel ? `за ${wheelForLabel}` : "");
      const optionalSuffix = normalizeTitleSuffix(data.title, baseWheelTitle);
      return finalizeListingTitle(joinTitleParts(baseWheelTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    case "u": {
      const partForLabel = getClassifiedForLabel(data.partFor || defaultClassifiedTopmenu);
      const partBase = data.partElement.trim() || data.partCategory.trim() || "Авточаст";
      const partCategoryTag =
        data.partElement.trim() && data.partCategory.trim() ? `(${data.partCategory.trim()})` : "";
      const basePartTitle = joinTitleParts(partBase, partCategoryTag, partForLabel ? `за ${partForLabel}` : "");
      const optionalSuffix = normalizeTitleSuffix(data.title, basePartTitle);
      return finalizeListingTitle(joinTitleParts(basePartTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    case "v": {
      const accessoryForLabel = getClassifiedForLabel(data.classifiedFor || defaultClassifiedTopmenu);
      const baseAccessoryTitle = joinTitleParts(
        data.accessoryCategory || "Аксесоари",
        accessoryForLabel ? `за ${accessoryForLabel}` : ""
      );
      const optionalSuffix = normalizeTitleSuffix(data.title, baseAccessoryTitle);
      return finalizeListingTitle(joinTitleParts(baseAccessoryTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    case "y":
    case "z": {
      const actionLabel = data.mainCategory === "y" ? "Купува" : "Услуга";
      const serviceForLabel = getClassifiedForLabel(data.classifiedFor || defaultClassifiedTopmenu);
      const baseServiceTitle = joinTitleParts(
        actionLabel,
        data.buyServiceCategory,
        serviceForLabel ? `за ${serviceForLabel}` : ""
      );
      const optionalSuffix = normalizeTitleSuffix(data.title, baseServiceTitle);
      return finalizeListingTitle(joinTitleParts(baseServiceTitle, optionalSuffix), `${categoryLabel} обява`);
    }
    default: {
      const baseTitle = joinTitleParts(data.brand, data.model);
      const optionalSuffix = normalizeTitleSuffix(data.title, baseTitle);
      return finalizeListingTitle(joinTitleParts(baseTitle, optionalSuffix), `${categoryLabel} обява`);
    }
  }
};

const createInitialFormData = (): PublishFormData => ({
  mainCategory: "1",
  category: "",
  title: "",
  brand: "",
  model: "",
  yearFrom: "",
  month: "",
  vin: "",
  locationCountry: "",
  locationRegion: "",
  price: "",
  city: "",
  fuel: "",
  gearbox: "",
  mileage: "",
  color: "",
  condition: "0",
  power: "",
  displacement: "",
  euroStandard: "",
  description: "",
  phone: "",
  email: "",
  pictures: [],
  features: [],
  listingType: "normal",
  wheelFor: getTopmenuFromMainCategory("1") || "1",
  wheelOfferType: "",
  wheelBrand: "",
  wheelMaterial: "",
  wheelBolts: "",
  wheelPcd: "",
  wheelCenterBore: "",
  wheelOffset: "",
  wheelWidth: "",
  wheelDiameter: "",
  wheelCount: "",
  wheelType: "",
  partFor: getTopmenuFromMainCategory("1") || "1",
  partCategory: "",
  partElement: "",
  partYearFrom: "",
  partYearTo: "",
  heavyAxles: "",
  heavySeats: "",
  heavyLoad: "",
  transmission: "",
  engineType: "",
  heavyEuroStandard: "",
  motoDisplacement: "",
  motoCategory: "",
  motoCoolingType: "",
  motoEngineKind: "",
  equipmentType: "",
  agriDriveType: "",
  forkliftLoad: "",
  forkliftHours: "",
  caravanBeds: "",
  caravanLength: "",
  caravanHasToilet: false,
  caravanHasHeating: false,
  caravanHasAc: false,
  boatCategory: "",
  boatEngineCount: "",
  boatMaterial: "",
  boatLength: "",
  boatWidth: "",
  boatDraft: "",
  boatHours: "",
  boatFeatures: [],
  trailerCategory: "",
  trailerLoad: "",
  trailerAxles: "",
  trailerFeatures: [],
  classifiedFor: getTopmenuFromMainCategory("1") || "1",
  accessoryCategory: "",
  buyServiceCategory: "",
});

interface ImageItem {
  file: File;
  preview: string;
  isCover: boolean;
}

const PublishPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, user, updateBalance } = useAuth();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);
  const TOP_LISTING_PRICE_EUR = 3;

  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showTopConfirm, setShowTopConfirm] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [formData, setFormData] = useState<PublishFormData>(createInitialFormData());
  const defaultClassifiedTopmenu = getTopmenuFromMainCategory("1") || "1";

  const availableBrandOptions = useMemo(() => {
    const options = getBrandOptionsByMainCategory(formData.mainCategory);
    return options.length > 0 ? options : getBrandOptionsByMainCategory("1");
  }, [formData.mainCategory]);

  const orderedBrandOptions = useMemo(
    () => Array.from(new Set(availableBrandOptions.map((option) => option.trim()).filter(Boolean))),
    [availableBrandOptions]
  );

  const groupedBrandOptions = useMemo(
    () => groupOptionsByInitial(sortUniqueOptions(orderedBrandOptions)),
    [orderedBrandOptions]
  );

  const availableModelOptions = useMemo(() => {
    if (!formData.brand) return [];
    return getModelOptionsByMainCategory(formData.mainCategory, formData.brand);
  }, [formData.brand, formData.mainCategory]);

  const orderedModelOptions = useMemo(
    () => Array.from(new Set(availableModelOptions.map((option) => option.trim()).filter(Boolean))),
    [availableModelOptions]
  );

  const groupedModelOptions = useMemo(
    () => groupOptionsByInitial(sortUniqueOptions(orderedModelOptions)),
    [orderedModelOptions]
  );

  const isCategoryBasedBrandModel = CATEGORY_AS_BRAND_MAIN_CATEGORIES.has(formData.mainCategory);
  const useUnsortedBrandOptions = UNSORTED_BRAND_OPTION_MAIN_CATEGORIES.has(formData.mainCategory);

  const agriFieldVisibility = useMemo(
    () =>
      formData.mainCategory === "6"
        ? getAgriFieldVisibility(formData.brand)
        : DEFAULT_AGRI_FIELD_VISIBILITY,
    [formData.brand, formData.mainCategory]
  );

  const wheelOfferTypeOptions = useMemo(() => {
    const options = getWheelOfferTypeOptions(formData.wheelFor || defaultClassifiedTopmenu);
    if (options.length > 0) return options;
    return WHEEL_OFFER_TYPE_OPTIONS.map((label, index) => ({
      value: String(index + 1),
      label,
    }));
  }, [defaultClassifiedTopmenu, formData.wheelFor]);

  const partCategoryOptions = useMemo(() => {
    const options = getPartCategories(formData.partFor || defaultClassifiedTopmenu);
    return options.length > 0 ? options : PART_CATEGORY_OPTIONS;
  }, [defaultClassifiedTopmenu, formData.partFor]);

  const partElementOptions = useMemo(() => {
    const options = getPartElements(
      formData.partFor || defaultClassifiedTopmenu,
      formData.partCategory
    );
    return options.length > 0 ? options : PART_ELEMENT_OPTIONS;
  }, [defaultClassifiedTopmenu, formData.partCategory, formData.partFor]);

  const accessoryCategoryOptions = useMemo(() => {
    const options = getAccessoryCategories(formData.classifiedFor || defaultClassifiedTopmenu);
    return options.length > 0 ? options : ACCESSORY_CATEGORY_OPTIONS;
  }, [defaultClassifiedTopmenu, formData.classifiedFor]);

  const wheelPcdOptions = useMemo(() => {
    const options = getWheelPcdOptions(formData.wheelBolts);
    return options.length > 0 ? options : WHEEL_PCD_OPTIONS;
  }, [formData.wheelBolts]);

  const featureCategories = useMemo(
    () =>
      getFeatureGroupsByMainCategory(formData.mainCategory).map((group) => ({
        id: group.key,
        title: group.title,
        description: group.description,
        items: group.items,
      })),
    [formData.mainCategory]
  );

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.partCategory) return prev;
      if (partCategoryOptions.includes(prev.partCategory)) return prev;
      return { ...prev, partCategory: "", partElement: "" };
    });
  }, [partCategoryOptions]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.partElement) return prev;
      if (partElementOptions.includes(prev.partElement)) return prev;
      return { ...prev, partElement: "" };
    });
  }, [partElementOptions]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.accessoryCategory) return prev;
      if (accessoryCategoryOptions.includes(prev.accessoryCategory)) return prev;
      return { ...prev, accessoryCategory: "" };
    });
  }, [accessoryCategoryOptions]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.wheelOfferType) return prev;
      if (wheelOfferTypeOptions.some((option) => option.value === prev.wheelOfferType)) return prev;
      return { ...prev, wheelOfferType: "" };
    });
  }, [wheelOfferTypeOptions]);

  useEffect(() => {
    if (!user?.email) return;
    setFormData((prev) =>
      prev.email === user.email
        ? prev
        : {
            ...prev,
            email: user.email,
          }
    );
  }, [user?.email]);

  const initialFormSnapshotRef = useRef<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null);

  type PublishStepKey =
    | "basic"
    | "details"
    | "pricing"
    | "images"
    | "features"
    | "description"
    | "contact"
    | "listingType";

  type StepRequirement = {
    key: keyof PublishFormData;
    label: string;
    when?: (data: PublishFormData) => boolean;
  };

  const publishSteps: Array<{
    key: PublishStepKey;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      key: "basic",
      label: "Основна информация",
      icon: <FiClipboard size={16} />,
      description: "Категория и основни данни",
    },
    {
      key: "details",
      label: "Детайли",
      icon: <FiSettings size={16} />,
      description: "Параметри по категория",
    },
    {
      key: "pricing",
      label: "Цена и локация",
      icon: <FiTag size={16} />,
      description: "Цена и местоположение",
    },
    {
      key: "images",
      label: "Снимки",
      icon: <FiImage size={16} />,
      description: "Качи снимки",
    },
    ...(supportsFeaturesStep(formData.mainCategory)
      ? [
          {
            key: "features" as const,
            label: "Екстри",
            icon: <FiStar size={16} />,
            description: "Опции и екстри",
          },
        ]
      : []),
    {
      key: "description",
      label: "Описание",
      icon: <FiFileText size={16} />,
      description: "Описание",
    },
    {
      key: "contact",
      label: "Контакт",
      icon: <FiPhone size={16} />,
      description: "Телефон",
    },
    {
      key: "listingType",
      label: "Тип обява",
      icon: <FiStar size={16} />,
      description: "Топ или нормална",
    },
  ];

  const totalSteps = publishSteps.length;
  const currentStepKey = publishSteps[currentStep - 1]?.key ?? "basic";

  useEffect(() => {
    if (currentStep > totalSteps) {
      setCurrentStep(totalSteps);
    }
  }, [currentStep, totalSteps]);

  const updateFormField = <K extends keyof PublishFormData>(key: K, value: PublishFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForMainCategory = (
    mainCategory: MainCategoryKey,
    previous: PublishFormData
  ): PublishFormData => {
    const next = createInitialFormData();
    return {
      ...next,
      mainCategory,
      description: previous.description,
      phone: previous.phone,
      email: previous.email,
      locationCountry: previous.locationCountry,
      locationRegion: previous.locationRegion,
      city: previous.city,
      listingType: previous.listingType,
    };
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    const key = name as keyof PublishFormData;

    if (key === "mainCategory") {
      const selectedMainCategory = (e.target as HTMLSelectElement).value as MainCategoryKey;
      setFormData((prev) => resetForMainCategory(selectedMainCategory, prev));
      setCurrentStep(1);
      setErrors({});
      return;
    }

    const inputElement = e.target as HTMLInputElement;
    const nextValue =
      inputElement.type === "checkbox" ? inputElement.checked : (e.target as HTMLInputElement).value;

    setFormData((prev) => {
      const next = { ...prev, [key]: nextValue } as PublishFormData;

      if (key === "brand") {
        next.model = "";
        if (prev.mainCategory === "a") {
          next.boatCategory = String(nextValue ?? "").trim();
        }
        if (prev.mainCategory === "b") {
          next.trailerCategory = String(nextValue ?? "").trim();
        }
        if (prev.mainCategory === "6") {
          next.equipmentType = String(nextValue ?? "").trim();
          next.engineType = "";
          next.transmission = "";
          next.power = "";
          next.forkliftHours = "";
          next.agriDriveType = "";
          next.euroStandard = "";
        }
      }
      if (key === "partFor") {
        next.partCategory = "";
        next.partElement = "";
      }
      if (key === "partCategory") {
        next.partElement = "";
      }
      if (key === "classifiedFor") {
        next.accessoryCategory = "";
      }
      if (key === "wheelFor") {
        next.wheelOfferType = "";
      }
      if (key === "wheelBolts") {
        next.wheelPcd = "";
      }

      return next;
    });
  };

  const handleListingTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as PublishFormData["listingType"];
    if (value === "top" && formData.listingType !== "top") {
      setShowTopConfirm(true);
      return;
    }
    updateFormField("listingType", value);
  };

  const getRequiredFieldsByStep = (
    mainCategory: MainCategoryKey
  ): Record<PublishStepKey, StepRequirement[]> => {
    const pricingRequirements: StepRequirement[] = [
      { key: "locationCountry", label: "Регион" },
      {
        key: "city",
        label: "Град",
        when: (data) => !!data.locationCountry && data.locationCountry !== "Извън страната",
      },
    ];

    if (requiresPrice(mainCategory)) {
      pricingRequirements.unshift({ key: "price", label: "Цена" });
    }

    const requirements: Record<PublishStepKey, StepRequirement[]> = {
      basic: [{ key: "mainCategory", label: "Основна категория" }],
      details: [],
      pricing: pricingRequirements,
      images: [],
      features: [],
      description: [{ key: "description", label: "Описание" }],
      contact: [
        { key: "phone", label: "Телефон" },
        { key: "email", label: "Имейл" },
      ],
      listingType: [],
    };

    if (supportsFeaturesStep(mainCategory)) {
      requirements.features.push({ key: "features", label: "Поне една екстра" });
    }

    if (requiresBrandAndModel(mainCategory)) {
      const brandLabel = CATEGORY_AS_BRAND_MAIN_CATEGORIES.has(mainCategory)
        ? "Категория"
        : "Марка";
      const modelLabel = CATEGORY_AS_BRAND_MAIN_CATEGORIES.has(mainCategory)
        ? "Марка"
        : "Модел";
      requirements.basic.push(
        { key: "brand", label: brandLabel },
        { key: "model", label: modelLabel },
        { key: "yearFrom", label: "Година" }
      );
    }

    if (mainCategory === "1") {
      requirements.basic.push({ key: "category", label: "Тип автомобил" });
    }

    if (mainCategory === "w") {
      requirements.basic.push(
        { key: "wheelFor", label: "Гуми/джанти за" },
        { key: "wheelOfferType", label: "Тип оферта" },
        { key: "wheelBrand", label: "Марка джанти" }
      );
    }

    if (mainCategory === "u") {
      requirements.basic.push(
        { key: "partFor", label: "Части за" },
        { key: "partCategory", label: "Категория на частта" },
        { key: "partElement", label: "Част" },
        { key: "partYearFrom", label: "Година от" }
      );
    }

    if (mainCategory === "v") {
      requirements.basic.push(
        { key: "classifiedFor", label: "Аксесоари за" },
        { key: "accessoryCategory", label: "Категория" }
      );
    }

    if (mainCategory === "y" || mainCategory === "z") {
      requirements.basic.push(
        {
          key: "classifiedFor",
          label: mainCategory === "y" ? "Купува за" : "Услуга за",
        },
        { key: "buyServiceCategory", label: "Категория" }
      );
    }

    if (mainCategory === "1") {
      requirements.details.push(
        { key: "fuel", label: "Гориво" },
        { key: "gearbox", label: "Скоростна кутия" },
        { key: "mileage", label: "Пробег" },
        { key: "power", label: "Мощност" },
        { key: "displacement", label: "Кубатура" },
        { key: "euroStandard", label: "Евростандарт" }
      );
    }

    if (mainCategory === "3" || mainCategory === "4") {
      requirements.details.push(
        { key: "transmission", label: "Трансмисия" },
        { key: "mileage", label: "Пробег" },
        { key: "heavyAxles", label: "Брой оси" },
        { key: "heavySeats", label: "Брой места" },
        { key: "heavyLoad", label: "Товароносимост" },
        { key: "heavyEuroStandard", label: "Евростандарт" },
        { key: "power", label: "Мощност" }
      );
      requirements.details.push({ key: "engineType", label: "Вид двигател" });
    }

    if (mainCategory === "5") {
      requirements.basic.push({ key: "motoCategory", label: "Категория" });
      requirements.details.push(
        { key: "motoDisplacement", label: "Кубатура" },
        { key: "power", label: "Мощност" },
        { key: "engineType", label: "Вид двигател" },
        { key: "motoCoolingType", label: "Вид охлаждане" },
        { key: "motoEngineKind", label: "Вид двигател (конфигурация)" }
      );
    }

    if (mainCategory === "6") {
      requirements.details.push(
        {
          key: "engineType",
          label: "Двигател",
          when: (data) => getAgriFieldVisibility(data.brand).showEngineType,
        },
        {
          key: "power",
          label: "Мощност",
          when: (data) => getAgriFieldVisibility(data.brand).showPower,
        },
        {
          key: "transmission",
          label: "Скоростна кутия",
          when: (data) => getAgriFieldVisibility(data.brand).showTransmission,
        },
        {
          key: "agriDriveType",
          label: "Задвижване",
          when: (data) => getAgriFieldVisibility(data.brand).showDriveType,
        },
        {
          key: "forkliftHours",
          label: "Часове работа",
          when: (data) => getAgriFieldVisibility(data.brand).showHours,
        },
        {
          key: "euroStandard",
          label: "Евростандарт",
          when: (data) => getAgriFieldVisibility(data.brand).showEuroStandard,
        }
      );
    }

    if (mainCategory === "7") {
      requirements.details.push(
        { key: "equipmentType", label: "Вид техника" },
        { key: "power", label: "Мощност" }
      );
    }

    if (mainCategory === "8") {
      requirements.details.push(
        { key: "engineType", label: "Вид двигател" },
        { key: "forkliftLoad", label: "Товароподемност" },
        { key: "forkliftHours", label: "Часове работа" }
      );
    }

    if (mainCategory === "9") {
      requirements.details.push(
        { key: "caravanBeds", label: "Брой спални места" },
        { key: "caravanLength", label: "Дължина" }
      );
    }

    if (mainCategory === "a") {
      requirements.details.push(
        { key: "engineType", label: "Вид двигател" },
        { key: "boatEngineCount", label: "Брой двигатели" },
        { key: "boatLength", label: "Дължина" }
      );
    }

    if (mainCategory === "b") {
      requirements.details.push(
        { key: "trailerLoad", label: "Товароносимост" },
        { key: "trailerAxles", label: "Брой оси" }
      );
    }

    requirements.details.push(
      {
        key: "color",
        label: "Цвят",
        when: (data) => !["y", "z", "u"].includes(data.mainCategory),
      },
      {
        key: "condition",
        label: "Състояние",
        when: (data) => !["y", "z"].includes(data.mainCategory),
      },
      {
        key: "vin",
        label: "VIN номер",
        when: (data) => !["y", "z", "u", "v", "w", "5", "6", "7", "a", "b"].includes(data.mainCategory),
      }
    );

    return requirements;
  };

  const isFieldMissing = (value: unknown) => {
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "boolean") return false;
    return String(value ?? "").trim().length === 0;
  };

  const hasPositiveNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  };

  const getMissingFields = (step: number, data: PublishFormData) => {
    const stepKey = publishSteps[step - 1]?.key;
    if (!stepKey) return [];
    const requiredByStep = getRequiredFieldsByStep(data.mainCategory);
    const fields = requiredByStep[stepKey] ?? [];
    return fields
      .filter((field) => (field.when ? field.when(data) : true))
      .filter((field) => isFieldMissing(data[field.key]))
      .map((field) => field.label);
  };

  const getFirstInvalidStep = (data: PublishFormData) => {
    for (let step = 1; step <= totalSteps; step += 1) {
      const missing = getMissingFields(step, data);
      if (missing.length > 0) {
        return { step, missing };
      }
    }
    return null;
  };

  const formatMissingMessage = (fields: string[]) =>
    fields.length ? `Моля, попълнете: ${fields.join(", ")}` : "";

  const confirmTopListing = () => {
    setFormData((prev) => ({ ...prev, listingType: "top" }));
    setShowTopConfirm(false);
  };

  const cancelTopListing = () => {
    setShowTopConfirm(false);
  };

  const normalizeStringList = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const toStringOrEmpty = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const toBoolean = (value: unknown): boolean => {
    if (value === true || value === "true" || value === "1" || value === 1) return true;
    return false;
  };

  const normalizeCarEuroStandard = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return "";
    if (["1", "2", "3", "4", "5", "6"].includes(normalized)) return normalized;
    const idx = HEAVY_EURO_STANDARD_OPTIONS.indexOf(normalized);
    return idx >= 0 ? String(idx + 1) : normalized;
  };

  const normalizeWheelOfferTypeValue = (value: string, topmenu: string): string => {
    const normalized = value.trim();
    if (!normalized) return "";
    const options = getWheelOfferTypeOptions(topmenu || defaultClassifiedTopmenu);
    if (options.some((option) => option.value === normalized)) return normalized;
    const byLabel = options.find((option) => option.label === normalized);
    return byLabel?.value || normalized;
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    const ACCESS_TOKEN_KEY = "authToken";
    const REFRESH_TOKEN_KEY = "refreshToken";
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) return null;

    try {
      const probeResponse = await fetch("http://localhost:8000/api/auth/me/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (probeResponse.ok) {
        return accessToken;
      }

      if (probeResponse.status !== 401 && probeResponse.status !== 403) {
        return accessToken;
      }

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        return null;
      }

      const refreshResponse = await fetch("http://localhost:8000/api/auth/token/refresh/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!refreshResponse.ok) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return null;
      }

      const refreshData = await refreshResponse.json();
      const nextAccessToken = typeof refreshData?.access === "string" ? refreshData.access : "";
      if (!nextAccessToken) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return null;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
      return nextAccessToken;
    } catch {
      return accessToken;
    }
  };

  const normalizeMainCategory = (value: unknown): MainCategoryKey => {
    const rawValue = String(value ?? "1");
    const exists = MAIN_CATEGORY_OPTIONS.some((option) => option.value === rawValue);
    return exists ? (rawValue as MainCategoryKey) : "1";
  };

  const normalizeFormSnapshot = (data: PublishFormData) => {
    const { pictures: _pictures, ...rest } = data;
    return JSON.stringify({
      ...rest,
      features: [...data.features].sort(),
      boatFeatures: [...data.boatFeatures].sort(),
      trailerFeatures: [...data.trailerFeatures].sort(),
    });
  };

  const applyListingToForm = (data: any) => {
    const normalizedMainCategory = normalizeMainCategory(data.main_category ?? data.mainCategory ?? "1");
    const rawBrand = toStringOrEmpty(data.brand);
    const rawModel = toStringOrEmpty(data.model);
    const rawTitle = toStringOrEmpty(data.title);
    const normalizedFeatures = normalizeCarFeatures(data.features);
    const normalizedBoatFeatures = normalizeCarFeatures(data.boat_features ?? data.boatFeatures);
    const normalizedTrailerFeatures = normalizeCarFeatures(
      data.trailer_features ?? data.trailerFeatures
    );
    const parsedMotoFeatures =
      normalizedMainCategory === "5" ? extractMotoMetaFromFeatures(normalizedFeatures) : null;

    const normalizedWheelFor =
      toStringOrEmpty(data.wheel_for ?? data.wheelFor) || defaultClassifiedTopmenu;
    const normalizedPartFor =
      toStringOrEmpty(data.part_for ?? data.partFor) || defaultClassifiedTopmenu;
    const normalizedClassifiedFor =
      toStringOrEmpty(data.classified_for ?? data.classifiedFor) || defaultClassifiedTopmenu;
    const normalizedTrailerCategoryValue = toStringOrEmpty(
      data.trailer_category ?? data.trailerCategory
    );
    const normalizedBoatCategoryValue = toStringOrEmpty(data.boat_category ?? data.boatCategory);
    const normalizedAgriCategoryValue = toStringOrEmpty(data.equipment_type ?? data.equipmentType);

    const nextFormData: PublishFormData = {
      ...createInitialFormData(),
      mainCategory: normalizedMainCategory,
      category: toStringOrEmpty(data.category),
      title: rawTitle,
      brand:
        normalizedMainCategory === "b"
          ? normalizedTrailerCategoryValue || rawBrand
          : normalizedMainCategory === "a"
            ? normalizedBoatCategoryValue || rawBrand
          : normalizedMainCategory === "6"
            ? normalizedAgriCategoryValue || rawBrand
          : rawBrand,
      model: rawModel,
      yearFrom: toStringOrEmpty(data.year_from ?? data.yearFrom),
      month: toStringOrEmpty(data.month),
      vin: toStringOrEmpty(data.vin),
      locationCountry: toStringOrEmpty(data.location_country ?? data.locationCountry),
      locationRegion: toStringOrEmpty(data.location_region ?? data.locationRegion),
      price: toStringOrEmpty(data.price),
      city: toStringOrEmpty(data.city),
      fuel: toStringOrEmpty(data.fuel),
      gearbox: toStringOrEmpty(data.gearbox),
      mileage: toStringOrEmpty(data.mileage),
      color: toStringOrEmpty(data.color),
      condition: toStringOrEmpty(data.condition || "0"),
      power: toStringOrEmpty(data.power),
      displacement: toStringOrEmpty(data.displacement),
      euroStandard: normalizeCarEuroStandard(toStringOrEmpty(data.euro_standard ?? data.euroStandard)),
      description: toStringOrEmpty(data.description),
      phone: toStringOrEmpty(data.phone),
      email: user?.email || toStringOrEmpty(data.email),
      pictures: [],
      features: parsedMotoFeatures
        ? parsedMotoFeatures.plainFeatures
        : normalizedMainCategory === "b"
          ? Array.from(new Set([...normalizedFeatures, ...normalizedTrailerFeatures]))
          : normalizedMainCategory === "a"
            ? Array.from(new Set([...normalizedFeatures, ...normalizedBoatFeatures]))
          : normalizedFeatures,
      listingType: data.listing_type === "top" || data.listingType === "top" ? "top" : "normal",
      wheelFor: normalizedWheelFor,
      wheelOfferType: normalizeWheelOfferTypeValue(
        toStringOrEmpty(data.offer_type ?? data.wheelOfferType),
        normalizedWheelFor
      ),
      wheelBrand: toStringOrEmpty(data.wheel_brand ?? data.wheelBrand),
      wheelMaterial: toStringOrEmpty(data.material ?? data.wheelMaterial),
      wheelBolts: toStringOrEmpty(data.bolts ?? data.wheelBolts),
      wheelPcd: toStringOrEmpty(data.pcd ?? data.wheelPcd),
      wheelCenterBore: toStringOrEmpty(data.center_bore ?? data.wheelCenterBore),
      wheelOffset: toStringOrEmpty(data.offset ?? data.wheelOffset),
      wheelWidth: toStringOrEmpty(data.width ?? data.wheelWidth),
      wheelDiameter: toStringOrEmpty(data.diameter ?? data.wheelDiameter),
      wheelCount: toStringOrEmpty(data.count ?? data.wheelCount),
      wheelType: toStringOrEmpty(data.wheel_type ?? data.wheelType),
      partFor: normalizedPartFor,
      partCategory: toStringOrEmpty(data.part_category ?? data.partCategory),
      partElement: toStringOrEmpty(data.part_element ?? data.partElement),
      partYearFrom: toStringOrEmpty(data.part_year_from ?? data.partYearFrom),
      partYearTo: toStringOrEmpty(data.part_year_to ?? data.partYearTo),
      heavyAxles: toStringOrEmpty(data.axles ?? data.heavyAxles),
      heavySeats: toStringOrEmpty(data.seats ?? data.heavySeats),
      heavyLoad: toStringOrEmpty(data.load_kg ?? data.heavyLoad),
      transmission: toStringOrEmpty(data.transmission),
      engineType: toStringOrEmpty(data.engine_type ?? data.engineType),
      heavyEuroStandard: toStringOrEmpty(data.heavy_euro_standard ?? data.heavyEuroStandard),
      motoDisplacement: toStringOrEmpty(data.displacement_cc ?? data.motoDisplacement),
      motoCategory: parsedMotoFeatures?.motoCategory || "",
      motoCoolingType: parsedMotoFeatures?.motoCoolingType || "",
      motoEngineKind: parsedMotoFeatures?.motoEngineKind || "",
      equipmentType: normalizedAgriCategoryValue,
      agriDriveType: toStringOrEmpty(data.drive_type ?? data.agriDriveType),
      forkliftLoad: toStringOrEmpty(data.lift_capacity_kg ?? data.forkliftLoad),
      forkliftHours: toStringOrEmpty(data.hours ?? data.forkliftHours),
      caravanBeds: toStringOrEmpty(data.beds ?? data.caravanBeds),
      caravanLength: toStringOrEmpty(data.length_m ?? data.caravanLength),
      caravanHasToilet: toBoolean(data.has_toilet ?? data.caravanHasToilet),
      caravanHasHeating: toBoolean(data.has_heating ?? data.caravanHasHeating),
      caravanHasAc: toBoolean(data.has_air_conditioning ?? data.caravanHasAc),
      boatCategory: normalizedBoatCategoryValue || rawBrand,
      boatEngineCount: toStringOrEmpty(data.engine_count ?? data.boatEngineCount),
      boatMaterial: toStringOrEmpty(data.boat_material ?? data.boatMaterial ?? data.material),
      boatLength: toStringOrEmpty(data.boat_length ?? data.boatLength ?? data.length_m),
      boatWidth: toStringOrEmpty(data.width_m ?? data.boatWidth),
      boatDraft: toStringOrEmpty(data.draft_m ?? data.boatDraft),
      boatHours: toStringOrEmpty(data.boat_hours ?? data.boatHours ?? data.hours),
      boatFeatures:
        normalizedMainCategory === "a"
          ? normalizedBoatFeatures.length > 0
            ? normalizedBoatFeatures
            : normalizeStringList(data.features)
          : normalizedBoatFeatures,
      trailerCategory:
        normalizedMainCategory === "b"
          ? normalizedTrailerCategoryValue || rawBrand
          : normalizedTrailerCategoryValue,
      trailerLoad: toStringOrEmpty(data.trailer_load ?? data.trailerLoad ?? data.load_kg),
      trailerAxles: toStringOrEmpty(data.trailer_axles ?? data.trailerAxles ?? data.axles),
      trailerFeatures: normalizedTrailerFeatures,
      classifiedFor: normalizedClassifiedFor,
      accessoryCategory: toStringOrEmpty(data.accessory_category ?? data.accessoryCategory),
      buyServiceCategory: toStringOrEmpty(data.buy_service_category ?? data.buyServiceCategory),
    };
    const baseGeneratedTitle = buildListingTitle({ ...nextFormData, title: "" }, defaultClassifiedTopmenu);
    nextFormData.title = normalizeTitleSuffix(rawTitle, baseGeneratedTitle);

    setFormData(nextFormData);
    initialFormSnapshotRef.current = normalizeFormSnapshot(nextFormData);

    setImages([]);
    setExistingCoverImage(data.image_url || data.coverImage || null);
    setCurrentStep(1);
    setErrors({});
  };

  const calculateCompletionStats = () => {
    const requiredByStep = getRequiredFieldsByStep(formData.mainCategory);
    const requiredKeys = new Set<keyof PublishFormData>();

    publishSteps.forEach((step) => {
      (requiredByStep[step.key] ?? []).forEach((field) => {
        if (!field.when || field.when(formData)) {
          requiredKeys.add(field.key);
        }
      });
    });

    let filled = 0;
    requiredKeys.forEach((key) => {
      if (!isFieldMissing(formData[key])) {
        filled += 1;
      }
    });

    const hasImage = images.length > 0 || !!existingCoverImage;
    const totalRequired = requiredKeys.size + 1;
    const totalFilled = filled + (hasImage ? 1 : 0);
    const percentage =
      totalRequired <= 0 ? 0 : Math.round((totalFilled / totalRequired) * 100);

    return {
      percentage,
      filledFields: filled,
      totalFields: requiredKeys.size,
      hasImage,
    };
  };

  const completionStats = calculateCompletionStats();
  const completionPercentage = completionStats.percentage;
  const currentFormSnapshot = normalizeFormSnapshot(formData);
  const isDirty =
    isEditMode &&
    !!initialFormSnapshotRef.current &&
    (currentFormSnapshot !== initialFormSnapshotRef.current || images.length > 0);
  const priceSummary = {
    price: requiresPrice(formData.mainCategory)
      ? formData.price
        ? `${formData.price} EUR`
        : "не е въведена"
      : "не се използва",
    region: formData.locationCountry ? formData.locationCountry : "не е избран",
    city:
      formData.locationCountry === "Извън страната"
        ? "извън страната"
        : formData.city
          ? formData.city
          : "не е избран",
  };
  const coverPreview =
    images.find((img) => img.isCover)?.preview || existingCoverImage || undefined;
  const previewTitle = buildListingTitle(formData, defaultClassifiedTopmenu);
  const previewYear =
    formData.mainCategory === "u" ? formData.partYearFrom : formData.yearFrom;
  const previewPrice = requiresPrice(formData.mainCategory) ? formData.price : "";
  const previewMileage =
    formData.mainCategory === "1" || isHeavyMainCategory(formData.mainCategory)
      ? formData.mileage
      : "";
  const previewFuel =
    formData.mainCategory === "1"
      ? formData.fuel
      : isHeavyMainCategory(formData.mainCategory)
        ? mapEngineTypeToFuelValue(formData.engineType)
        : "";
  const previewGearbox =
    formData.mainCategory === "1"
      ? formData.gearbox
      : isHeavyMainCategory(formData.mainCategory)
        ? mapTransmissionToGearboxValue(formData.transmission)
        : "";
  const previewImageCount = images.length + (existingCoverImage ? 1 : 0);
  const hasValidPriceSignal = requiresPrice(formData.mainCategory)
    ? hasPositiveNumber(formData.price)
    : true;
  const stepMissingFields = getMissingFields(currentStep, formData);
  const validationMessage = formatMissingMessage(stepMissingFields);
  const isNextDisabled = currentStep < totalSteps && stepMissingFields.length > 0;

  useEffect(() => {
    const editIdParam = searchParams.get("edit");
    if (!editIdParam) {
      setIsEditMode(false);
      setEditingListingId(null);
      setExistingCoverImage(null);
      initialFormSnapshotRef.current = null;
      return;
    }

    if (authLoading || !isAuthenticated) {
      return;
    }

    const editId = Number(editIdParam);
    if (Number.isNaN(editId) || editId <= 0) {
      setErrors({ submit: "Невалиден идентификатор на обявата." });
      setIsEditMode(false);
      setEditingListingId(null);
      setExistingCoverImage(null);
      initialFormSnapshotRef.current = null;
      return;
    }

    setIsEditMode(true);
    setEditingListingId(editId);
    initialFormSnapshotRef.current = null;
    const stateListing = (location.state as { listing?: any } | null)?.listing;
    const fallbackListing =
      stateListing && String(stateListing.id) === String(editId) ? stateListing : null;

    const fetchListing = async () => {
      try {
        setLoadingListing(true);
        const token = localStorage.getItem("authToken");
        if (!token) {
          setErrors({ submit: "Не сте логнати. Моля, влезте отново." });
          navigate("/auth");
          return;
        }

        const response = await fetch(`http://localhost:8000/api/listings/${editId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (fallbackListing) {
            applyListingToForm(fallbackListing);
            return;
          }
          setErrors({ submit: "Неуспешно зареждане на обявата за редакция." });
          return;
        }

        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;
        if (data) {
          applyListingToForm(data);
        } else if (fallbackListing) {
          applyListingToForm(fallbackListing);
        } else {
          setErrors({ submit: "Неуспешно зареждане на обявата за редакция." });
        }
      } catch (error) {
        if (fallbackListing) {
          applyListingToForm(fallbackListing);
          return;
        }
        setErrors({ submit: "Грешка при зареждане на обявата." });
        console.error("Error loading listing:", error);
      } finally {
        setLoadingListing(false);
      }
    };

    fetchListing();
  }, [searchParams, authLoading, isAuthenticated, navigate, location.state]);

  const submitListing = async () => {
    setErrors({});
    if (formData.listingType === "top") {
      const balance = user?.balance;
      if (typeof balance === "number" && balance < TOP_LISTING_PRICE_EUR) {
        setToast({ message: "Недостатъчни средства", type: "error" });
        return;
      }
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      const appendIfValue = (key: string, value: unknown) => {
        if (value === null || value === undefined) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        formDataToSend.append(key, normalized);
      };

      const fallbackBrandModel = getFallbackBrandModel(formData, defaultClassifiedTopmenu);
      const normalizedBrand = requiresBrandAndModel(formData.mainCategory)
        ? formData.brand.trim()
        : fallbackBrandModel.brand;
      const normalizedModel = requiresBrandAndModel(formData.mainCategory)
        ? formData.model.trim()
        : fallbackBrandModel.model;
      const normalizedYearSource =
        formData.mainCategory === "u"
          ? formData.partYearFrom.trim()
          : requiresBrandAndModel(formData.mainCategory)
            ? formData.yearFrom.trim()
            : "";
      const normalizedYear = normalizedYearSource || String(currentYear);
      const normalizedFuel =
        formData.mainCategory === "1"
          ? formData.fuel || "benzin"
          : isHeavyMainCategory(formData.mainCategory)
            ? mapEngineTypeToFuelValue(formData.engineType)
            : "benzin";
      const normalizedGearbox =
        formData.mainCategory === "1"
          ? formData.gearbox || "ruchna"
          : isHeavyMainCategory(formData.mainCategory)
            ? mapTransmissionToGearboxValue(formData.transmission)
            : "ruchna";
      const normalizedMileage =
        formData.mainCategory === "1" || isHeavyMainCategory(formData.mainCategory)
          ? formData.mileage || "0"
          : "0";
      const normalizedPrice = requiresPrice(formData.mainCategory)
        ? formData.price || "0"
        : "0";
      const normalizedCity =
        formData.locationCountry === "Извън страната"
          ? formData.city || "Извън страната"
          : formData.city || "Непосочен";
      const normalizedTitle = buildListingTitle(formData, defaultClassifiedTopmenu);
      const normalizedDescription =
        formData.description?.trim() || `${getMainCategoryLabel(formData.mainCategory)} обява`;
      const normalizedEmail = user?.email || formData.email || "";

      appendIfValue("main_category", formData.mainCategory);
      appendIfValue("category", formData.category);
      appendIfValue("title", normalizedTitle);
      appendIfValue("brand", normalizedBrand);
      appendIfValue("model", normalizedModel);
      appendIfValue("year_from", normalizedYear);
      appendIfValue("month", formData.month);
      if (!["y", "z", "u", "v", "w", "5", "6", "7", "a", "b"].includes(formData.mainCategory)) {
        appendIfValue("vin", formData.vin);
      }
      appendIfValue("price", normalizedPrice);
      appendIfValue("location_country", formData.locationCountry);
      appendIfValue("location_region", formData.locationRegion);
      appendIfValue("city", normalizedCity);
      appendIfValue("fuel", normalizedFuel);
      appendIfValue("gearbox", normalizedGearbox);
      appendIfValue("mileage", normalizedMileage);
      if (formData.mainCategory !== "u") {
        appendIfValue("color", formData.color);
      }
      appendIfValue("condition", formData.condition || "0");
      appendIfValue("power", formData.power);
      appendIfValue("displacement", formData.displacement);
      appendIfValue("euro_standard", normalizeCarEuroStandard(formData.euroStandard));
      appendIfValue("description", normalizedDescription);
      appendIfValue("phone", formData.phone);
      appendIfValue("email", normalizedEmail);
      appendIfValue("listing_type", formData.listingType);

      const normalizedListingFeatures = formData.features
        .map((feature) => feature.trim())
        .filter(Boolean);

      if (formData.mainCategory === "5") {
        buildMotoMetaFeatures({
          motoCategory: formData.motoCategory,
          motoCoolingType: formData.motoCoolingType,
          motoEngineKind: formData.motoEngineKind,
        }).forEach((feature) => normalizedListingFeatures.push(feature));
      }

      const uniqueListingFeatures = Array.from(new Set(normalizedListingFeatures));
      if (uniqueListingFeatures.length > 0) {
        uniqueListingFeatures.forEach((feature) => formDataToSend.append("features", feature));
      } else {
        formDataToSend.append("features", "[]");
      }

      switch (formData.mainCategory) {
        case "w":
          appendIfValue("wheel_for", formData.wheelFor);
          appendIfValue("offer_type", formData.wheelOfferType);
          appendIfValue("wheel_brand", formData.wheelBrand);
          appendIfValue("material", formData.wheelMaterial);
          appendIfValue("bolts", formData.wheelBolts);
          appendIfValue("pcd", formData.wheelPcd);
          appendIfValue("center_bore", formData.wheelCenterBore);
          appendIfValue("offset", formData.wheelOffset);
          appendIfValue("width", formData.wheelWidth);
          appendIfValue("diameter", formData.wheelDiameter);
          appendIfValue("count", formData.wheelCount);
          appendIfValue("wheel_type", formData.wheelType);
          break;
        case "u":
          appendIfValue("part_for", formData.partFor);
          appendIfValue("part_category", formData.partCategory);
          appendIfValue("part_element", formData.partElement);
          appendIfValue("part_year_from", formData.partYearFrom);
          appendIfValue("part_year_to", formData.partYearTo);
          break;
        case "3":
        case "4":
          appendIfValue("axles", formData.heavyAxles);
          appendIfValue("seats", formData.heavySeats);
          appendIfValue("load_kg", formData.heavyLoad);
          appendIfValue("transmission", formData.transmission);
          appendIfValue("engine_type", formData.engineType);
          appendIfValue("heavy_euro_standard", formData.heavyEuroStandard);
          break;
        case "5":
          appendIfValue("displacement_cc", formData.motoDisplacement);
          appendIfValue("engine_type", formData.engineType);
          break;
        case "6":
          appendIfValue("equipment_type", formData.brand || formData.equipmentType);
          if (agriFieldVisibility.showEngineType) {
            appendIfValue("engine_type", formData.engineType);
          }
          if (agriFieldVisibility.showTransmission) {
            appendIfValue("transmission", formData.transmission);
          }
          if (agriFieldVisibility.showHours) {
            appendIfValue("hours", formData.forkliftHours);
          }
          if (agriFieldVisibility.showDriveType) {
            appendIfValue("drive_type", formData.agriDriveType);
          }
          break;
        case "7":
          appendIfValue("equipment_type", formData.equipmentType);
          break;
        case "8":
          appendIfValue("engine_type", formData.engineType);
          appendIfValue("lift_capacity_kg", formData.forkliftLoad);
          appendIfValue("hours", formData.forkliftHours);
          break;
        case "9":
          appendIfValue("beds", formData.caravanBeds);
          appendIfValue("length_m", formData.caravanLength);
          formDataToSend.append("has_toilet", String(formData.caravanHasToilet));
          formDataToSend.append("has_heating", String(formData.caravanHasHeating));
          formDataToSend.append("has_air_conditioning", String(formData.caravanHasAc));
          break;
        case "a":
          appendIfValue("boat_category", formData.brand || formData.boatCategory);
          appendIfValue("engine_type", formData.engineType);
          appendIfValue("engine_count", formData.boatEngineCount);
          appendIfValue("material", formData.boatMaterial);
          appendIfValue("length_m", formData.boatLength);
          appendIfValue("width_m", formData.boatWidth);
          appendIfValue("draft_m", formData.boatDraft);
          appendIfValue("hours", formData.boatHours);
          const normalizedBoatFeatures = Array.from(
            new Set([...formData.boatFeatures, ...formData.features])
          )
            .map((feature) => feature.trim())
            .filter(Boolean);
          if (normalizedBoatFeatures.length > 0) {
            normalizedBoatFeatures.forEach((feature) => formDataToSend.append("boat_features", feature));
          } else if (isEditMode) {
            formDataToSend.append("boat_features", "[]");
          }
          break;
        case "b":
          appendIfValue("trailer_category", formData.brand || formData.trailerCategory);
          appendIfValue("load_kg", formData.trailerLoad);
          appendIfValue("axles", formData.trailerAxles);
          const normalizedTrailerFeatures = Array.from(
            new Set([...formData.trailerFeatures, ...formData.features])
          )
            .map((feature) => feature.trim())
            .filter(Boolean);
          if (normalizedTrailerFeatures.length > 0) {
            normalizedTrailerFeatures.forEach((feature) => formDataToSend.append("trailer_features", feature));
          } else if (isEditMode) {
            formDataToSend.append("trailer_features", "[]");
          }
          break;
        case "v":
          appendIfValue("classified_for", formData.classifiedFor);
          appendIfValue("accessory_category", formData.accessoryCategory);
          break;
        case "y":
        case "z":
          appendIfValue("classified_for", formData.classifiedFor);
          appendIfValue("buy_service_category", formData.buyServiceCategory);
          break;
        default:
          break;
      }

      images.forEach((img) => {
        formDataToSend.append("images_upload", img.file);
      });

      const token = await getValidAccessToken();
      if (!token) {
        setErrors({ submit: "Не сте логнати. Моля, влезте отново." });
        navigate("/auth");
        return;
      }

      const response = await fetch(
        isEditMode && editingListingId
          ? `http://localhost:8000/api/listings/${editingListingId}/`
          : "http://localhost:8000/api/listings/",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formDataToSend,
        }
      );

      const rawResponse = await response.text();
      let parsedResponse: any = null;
      if (rawResponse) {
        try {
          parsedResponse = JSON.parse(rawResponse);
        } catch {
          parsedResponse = null;
        }
      }

      if (!response.ok) {
        const errorData = parsedResponse;
        let errorMessage = "Грешка при изпращане на обявата";
        if (errorData?.detail) {
          errorMessage = String(errorData.detail);
        } else if (errorData && typeof errorData === "object") {
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = String(firstError[0]);
          } else if (typeof firstError === "string") {
            errorMessage = firstError;
          }
        } else if (rawResponse.trim().startsWith("<!DOCTYPE") || rawResponse.trim().startsWith("<html")) {
          errorMessage = "Сървърът върна HTML вместо JSON. Провери backend-а и токена.";
          console.error("Non-JSON error response:", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            bodyPreview: rawResponse.slice(0, 400),
          });
        } else if (rawResponse.trim()) {
          errorMessage = rawResponse.trim().slice(0, 300);
        }
        setErrors({ submit: errorMessage });
        if (errorMessage === "Недостатъчни средства") {
          setToast({ message: "Недостатъчни средства", type: "error" });
        }
        return;
      }

      if (!parsedResponse || typeof parsedResponse !== "object") {
        throw new Error("Неочакван отговор от сървъра (invalid JSON).");
      }

      const savedListing = parsedResponse;

      if (formData.listingType === "top") {
        try {
          const meToken = localStorage.getItem("authToken");
          if (meToken) {
            const meRes = await fetch("http://localhost:8000/api/auth/me/", {
              headers: { Authorization: `Bearer ${meToken}`, Accept: "application/json" },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (typeof meData.balance === "number") {
                updateBalance(meData.balance);
              }
            }
          }
        } catch {
          // ignore balance refresh errors
        }
      }

      if (isEditMode && editingListingId && images.length > 0) {
        const imagesData = new FormData();
        images.forEach((img) => {
          imagesData.append("images", img.file);
        });
        await fetch(`http://localhost:8000/api/listings/${editingListingId}/upload-images/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: imagesData,
        });
      }

      setToast({
        message: isEditMode
          ? "Промените са запазени успешно!"
          : "Обявата е успешно публикувана!",
        type: "success",
      });

      if (!isEditMode) {
        setFormData({
          ...createInitialFormData(),
          email: user?.email || "",
        });
        setImages([]);
      } else {
        setImages([]);
        setExistingCoverImage(savedListing.image_url || existingCoverImage);
        initialFormSnapshotRef.current = normalizeFormSnapshot(formData);
      }

      setTimeout(() => {
        navigate("/my-ads");
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Грешка при изпращане на обявата";
      setErrors({ submit: message });
      console.error("Error submitting listing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep >= totalSteps) return;
    const missing = getMissingFields(currentStep, formData);
    if (missing.length > 0) return;
    setErrors({});
    setCurrentStep(Math.min(totalSteps, currentStep + 1));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleNextStep();
  };

  const handlePublishClick = () => {
    if (loadingListing) return;
    const firstInvalid = getFirstInvalidStep(formData);
    if (firstInvalid) {
      setCurrentStep(firstInvalid.step);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    submitListing();
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setErrors({});
      setCurrentStep(step);
      return;
    }
    const missing = getMissingFields(currentStep, formData);
    if (missing.length > 0) return;
    setErrors({});
    setCurrentStep(step);
  };

  const handleFeatureChange = (feature: string) => {
    setFormData((prev) => {
      const nextFeatures = prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature];

      if (prev.mainCategory === "b") {
        return {
          ...prev,
          features: nextFeatures,
          trailerFeatures: nextFeatures,
        };
      }

      if (prev.mainCategory === "a") {
        return {
          ...prev,
          features: nextFeatures,
          boatFeatures: nextFeatures,
        };
      }

      return {
        ...prev,
        features: nextFeatures,
      };
    });
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      width: "100%",
      overflow: "visible",
      textAlign: "left",
      color: "#333",
    },
    container: { width: "100%" },
    form: {
      width: "100%",
      background: "#ffffff",
      borderRadius: 8,
      padding: 24,
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      overflow: "visible",
      boxSizing: "border-box",
    },
    title: {
      fontSize: 24,
      fontWeight: 800,
      color: "#333",
      margin: 0,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    section: {
      marginBottom: 20,
      padding: 16,
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      background: "#fafafa",
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 700,
      color: "#333",
      margin: 0,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    input: {
      padding: "10px 14px",
      border: "1px solid #e0e0e0",
      borderRadius: 4,
      fontSize: 14,
      fontFamily: "inherit",
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      color: "#333",
    },
    textarea: {
      padding: "10px 14px",
      border: "1px solid #e0e0e0",
      borderRadius: 4,
      fontSize: 14,
      fontFamily: "inherit",
      minHeight: 120,
      resize: "vertical",
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      color: "#333",
    },
    note: { fontSize: 12, color: "#dc2626", marginTop: 8 },
    confirmOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(2, 6, 23, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
      padding: 16,
    },
    confirmModal: {
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #e0e0e0",
      boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
      padding: 22,
      width: "100%",
      maxWidth: 420,
    },
    confirmTitle: {
      margin: "0 0 8px 0",
      fontSize: 18,
      fontWeight: 800,
      color: "#333",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    confirmText: {
      margin: "0 0 18px 0",
      fontSize: 14,
      lineHeight: 1.5,
      color: "#666",
    },
    confirmActions: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
    },
    confirmButtonGhost: {
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border: "1px solid #e0e0e0",
      background: "#fff",
      color: "#333",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
    confirmButtonPrimary: {
      height: 40,
      padding: "0 16px",
      borderRadius: 10,
      border: "1px solid #0f766e",
      background: "#0f766e",
      color: "#fff",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  const css = `
    .publish-page {
      --bg: #f5f5f5;
      --card: #ffffff;
      --border: #e0e0e0;
      --text: #333;
      --muted: #666;
      --primary: #0f766e;
      --primary-2: #0f766e;
      --ring: rgba(15, 118, 110, 0.16);
      font-family: "Manrope", "Segoe UI", -apple-system, system-ui, sans-serif;
      color: var(--text);
      text-align: left;
    }

    .publish-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 20px 60px;
    }

    .publish-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
      gap: 28px;
      align-items: start;
    }

    .publish-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .publish-form {
      padding: 24px;
    }

    .publish-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .publish-save-bar {
      position: sticky;
      top: 88px;
      z-index: 6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(220, 38, 38, 0.35);
      background: rgba(254, 242, 242, 0.95);
      box-shadow: 0 8px 18px rgba(220, 38, 38, 0.18);
      margin-bottom: 16px;
      backdrop-filter: blur(6px);
    }

    .publish-save-text {
      font-size: 13px;
      color: #b91c1c;
      font-weight: 600;
    }

    .publish-save-btn {
      height: 38px;
      padding: 0 18px;
      font-size: 13px;
      border-radius: 10px;
      white-space: nowrap;
      background: #dc2626;
      border-color: #dc2626;
      color: #fff;
      box-shadow: 0 6px 14px rgba(220, 38, 38, 0.3);
    }

    .publish-save-btn:hover:not(.disabled) {
      background: #b91c1c;
      border-color: #b91c1c;
    }

    .publish-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.2px;
      font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
    }

    .publish-subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--muted);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 12px;
      color: var(--text);
    }

    .section-icon {
      color: var(--primary);
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .feature-groups {
      display: grid;
      gap: 16px;
    }

    .feature-group {
      border-radius: 14px;
      border: 1px solid var(--border);
      background: #ffffff;
      padding: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .feature-group-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .feature-group-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
    }

    .feature-group-subtitle {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--muted);
    }

    .feature-group-count {
      align-self: center;
      font-size: 12px;
      font-weight: 700;
      color: #0f766e;
      background: #ecfdf5;
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px;
    }

    .feature-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #fafafa;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease,
        transform 0.2s ease;
    }

    .feature-card:hover {
      border-color: #d0d0d0;
      background: #f5f5f5;
      transform: translateY(-1px);
    }

    .feature-card.is-selected {
      border-color: #0f766e;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
      background: #ecfdf5;
    }

    .feature-checkbox {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .feature-check {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      background: #ffffff;
      display: grid;
      place-items: center;
      color: #ffffff;
      transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
      flex-shrink: 0;
    }

    .feature-check svg {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .feature-card.is-selected .feature-check {
      background: #0f766e;
      border-color: #0f766e;
      box-shadow: 0 6px 12px rgba(15, 118, 110, 0.3);
    }

    .feature-card.is-selected .feature-check svg {
      opacity: 1;
    }

    .feature-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }

    .feature-card:focus-within {
      outline: 3px solid rgba(59, 130, 246, 0.4);
      outline-offset: 2px;
    }

    .listing-type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .listing-type-card {
      position: relative;
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 16px;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .listing-type-card.is-selected {
      border-color: #0f766e;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
    }

    .listing-type-card:hover {
      transform: translateY(-1px);
    }

    .listing-type-card input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .listing-type-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 6px;
    }

    .listing-type-desc {
      font-size: 12px;
      color: var(--muted);
      margin: 0;
    }

    .publish-form input:not([type="checkbox"]):not([type="file"]),
    .publish-form select,
    .publish-form textarea {
      width: 100%;
      padding: 10px 14px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text);
      font-size: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .publish-form input[type="number"]::-webkit-outer-spin-button,
    .publish-form input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .publish-form input[type="number"] {
      -moz-appearance: textfield;
      appearance: textfield;
    }

    .publish-form input:not([type="checkbox"]):not([type="file"]):focus,
    .publish-form select:focus,
    .publish-form textarea:focus {
      outline: none;
      border-color: #0f766e !important;
      box-shadow: 0 0 0 3px var(--ring) !important;
    }

    .price-summary {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px dashed #99f6e4;
      background: #ecfdf5;
      font-size: 12px;
      color: #666;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
    }

    .price-summary span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .price-summary strong {
      color: #0f766e;
      font-weight: 700;
    }

    .publish-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .publish-btn {
      height: 42px;
      padding: 0 20px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    }

    .publish-btn.primary {
      background: #0f766e;
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .publish-btn.secondary {
      background: #fff;
      color: #333;
      border-color: #e0e0e0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .publish-btn.disabled {
      background: #e0e0e0;
      color: #999;
      box-shadow: none;
      cursor: not-allowed;
    }

    .publish-btn:hover:not(.disabled) {
      transform: translateY(-1px);
    }

    .publish-btn:focus-visible {
      outline: 3px solid var(--ring);
      outline-offset: 2px;
    }

    .publish-alert {
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 13px;
      margin-bottom: 16px;
      border: 1px solid transparent;
    }

    .publish-alert.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .publish-alert.success {
      background: #ecfdf3;
      border-color: #bbf7d0;
      color: #15803d;
    }

    .publish-alert.info {
      background: #fff7ed;
      border-color: #fdba74;
      color: #c2410c;
    }

    .publish-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 18px;
      border-radius: 10px;
      background: #0f766e;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
      z-index: 1400;
      animation: toastSlide 0.2s ease-out;
    }

    .publish-toast.error {
      background: #dc2626;
    }

    @keyframes toastSlide {
      from {
        transform: translateY(-6px);
        opacity: 0.6;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .publish-aside {
      position: sticky;
      top: 88px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    @media (max-width: 960px) {
      .publish-layout {
        grid-template-columns: 1fr;
      }

      .publish-aside {
        position: static;
      }

      .publish-save-bar {
        top: 70px;
        flex-direction: column;
        align-items: flex-start;
      }

      .publish-actions {
        flex-direction: column;
      }

      .publish-btn {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 720px) {
      .field-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  return (
    <div style={styles.page} className="publish-page">
      <style>{css}</style>
      {toast && (
        <div className={`publish-toast ${toast.type}`}>{toast.message}</div>
      )}
      <div style={styles.container} className="publish-container">
        <div className="publish-layout">
          <form
            style={styles.form}
            className="publish-form publish-card"
            onSubmit={handleFormSubmit}
            ref={formRef}
          >
            <div className="publish-heading">
              <div>
                <h1 style={styles.title} className="publish-title">
                  {isEditMode ? "Редактиране на обява" : "Публикуване на обява"}
                </h1>
                <p className="publish-subtitle">
                  {isEditMode
                    ? "Променете нужните полета и запазете обявата."
                    : "Попълнете данните стъпка по стъпка за по-добра видимост."}
                </p>
              </div>
            </div>

          {/* Error Message */}
          {(validationMessage || errors.submit) && (
            <div className="publish-alert error">
              {validationMessage || errors.submit}
            </div>
          )}

          {/* Edit Mode */}
          {isEditMode && (
            <div className="publish-alert info">
              Режим редакция: промените се запазват върху текущата обява.
            </div>
          )}

          {isEditMode && isDirty && (
            <div className="publish-save-bar">
              <div className="publish-save-text">
                Засякохме промени! Можете да ги запазите тук.
              </div>
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={loading || loadingListing}
                className={`publish-btn primary publish-save-btn ${
                  loading || loadingListing ? "disabled" : ""
                }`}
              >
                {loading ? "Запазване..." : "Запази"}
              </button>
            </div>
          )}

          {/* Progress Navigation */}
          <ListingFormStepper
            currentStep={currentStep}
            totalSteps={totalSteps}
            steps={publishSteps.map((step, index) => ({
              id: index + 1,
              label: step.label,
              icon: step.icon,
              description: step.description,
            }))}
            onStepClick={handleStepClick}
            completedSteps={Array.from({ length: currentStep - 1 }, (_, i) => i + 1)}
          />

          {/* Picture Upload */}
          {currentStepKey === "images" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiImage size={18} className="section-icon" />
                Снимки към обявата
              </h2>
              <AdvancedImageUpload images={images} onImagesChange={setImages} maxImages={15} />
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStepKey === "basic" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiClipboard size={18} className="section-icon" />
                Основна информация
              </h2>
              <div className="field-grid">
                <FormFieldWithTooltip
                  label="Основна категория"
                  required
                  tooltip="Изберете правилната категория за обявата"
                >
                  <select
                    style={styles.input}
                    name="mainCategory"
                    value={formData.mainCategory}
                    onChange={handleChange}
                    required
                  >
                    {MAIN_CATEGORY_OPTIONS.map((categoryOption) => (
                      <option key={categoryOption.value} value={categoryOption.value}>
                        {categoryOption.label}
                      </option>
                    ))}
                  </select>
                </FormFieldWithTooltip>

                {formData.mainCategory === "1" && (
                  <FormFieldWithTooltip label="Тип автомобил" tooltip="Тип на купето">
                    <select
                      style={styles.input}
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      <option value="">Избери тип</option>
                      {CAR_CATEGORY_OPTIONS.map((carCategoryOption) => (
                        <option key={carCategoryOption.value} value={carCategoryOption.value}>
                          {carCategoryOption.label}
                        </option>
                      ))}
                    </select>
                  </FormFieldWithTooltip>
                )}

                {requiresBrandAndModel(formData.mainCategory) && (
                  <>
                    <FormFieldWithTooltip
                      label={isCategoryBasedBrandModel ? "Категория" : "Марка"}
                      required
                      tooltip={
                        isCategoryBasedBrandModel
                          ? formData.mainCategory === "6"
                            ? "Категория на селскостопанската техника"
                            : formData.mainCategory === "a"
                              ? "Категория на яхтата/лодката"
                              : "Категория на ремаркето"
                          : "Марка на превозното средство/техниката"
                      }
                    >
                      <select
                        style={styles.input}
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        required
                      >
                        <option value="">
                          {isCategoryBasedBrandModel ? "Избери категория" : "Избери марка"}
                        </option>
                        {useUnsortedBrandOptions
                          ? orderedBrandOptions.map((brand) => (
                              <option key={brand} value={brand}>
                                {brand}
                              </option>
                            ))
                          : groupedBrandOptions.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((brand) => (
                                  <option key={brand} value={brand}>
                                    {brand}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip
                      label={isCategoryBasedBrandModel ? "Марка" : "Модел"}
                      required
                      tooltip={
                        isCategoryBasedBrandModel
                          ? formData.mainCategory === "6"
                            ? "Марка на селскостопанската техника"
                            : formData.mainCategory === "a"
                              ? "Марка на яхтата/лодката"
                              : "Марка на ремаркето"
                          : "Модел на превозното средство/техниката"
                      }
                    >
                      <select
                        style={styles.input}
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        required
                        disabled={!formData.brand}
                      >
                        <option value="">
                          {formData.brand
                            ? isCategoryBasedBrandModel
                              ? "Избери марка"
                              : "Избери модел"
                            : isCategoryBasedBrandModel
                              ? "Избери категория първо"
                              : "Избери марка първо"}
                        </option>
                        {groupedModelOptions.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip
                      label="Година на производство"
                      required
                      tooltip="Година на производство"
                    >
                      <select
                        style={styles.input}
                        name="yearFrom"
                        value={formData.yearFrom}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери година</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    {formData.mainCategory === "5" && (
                      <FormFieldWithTooltip label="Категория" required tooltip="Категория на мотоциклета">
                        <select
                          style={styles.input}
                          name="motoCategory"
                          value={formData.motoCategory}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Избери</option>
                          {MOTO_CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormFieldWithTooltip>
                    )}

                  </>
                )}

                {formData.mainCategory === "w" && (
                  <>
                    <FormFieldWithTooltip label="Гуми/джанти за" required>
                      <select
                        style={styles.input}
                        name="wheelFor"
                        value={formData.wheelFor}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {CLASSIFIED_FOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Тип оферта" required>
                      <select
                        style={styles.input}
                        name="wheelOfferType"
                        value={formData.wheelOfferType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери тип</option>
                        {wheelOfferTypeOptions.map((option) => (
                          <option key={option.value || "all"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Марка джанти">
                      <select
                        style={styles.input}
                        name="wheelBrand"
                        value={formData.wheelBrand}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_BRAND_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "u" && (
                  <>
                    <FormFieldWithTooltip label="Части за" required>
                      <select
                        style={styles.input}
                        name="partFor"
                        value={formData.partFor}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {CLASSIFIED_FOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Категория на частта" required>
                      <select
                        style={styles.input}
                        name="partCategory"
                        value={formData.partCategory}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {partCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Част">
                      <select
                        style={styles.input}
                        name="partElement"
                        value={formData.partElement}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {partElementOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Година на производство от">
                      <select
                        style={styles.input}
                        name="partYearFrom"
                        value={formData.partYearFrom}
                        onChange={handleChange}
                      >
                        <option value="">Избери година</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="до">
                      <select
                        style={styles.input}
                        name="partYearTo"
                        value={formData.partYearTo}
                        onChange={handleChange}
                      >
                        <option value="">Избери година</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "v" && (
                  <>
                    <FormFieldWithTooltip label="Аксесоари за" required>
                      <select
                        style={styles.input}
                        name="classifiedFor"
                        value={formData.classifiedFor}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {CLASSIFIED_FOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Категория" required>
                      <select
                        style={styles.input}
                        name="accessoryCategory"
                        value={formData.accessoryCategory}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {accessoryCategoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}
                {(formData.mainCategory === "y" || formData.mainCategory === "z") && (
                  <>
                    <FormFieldWithTooltip
                      label={formData.mainCategory === "y" ? "Купува за" : "Услуга за"}
                      required
                    >
                      <select
                        style={styles.input}
                        name="classifiedFor"
                        value={formData.classifiedFor}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {CLASSIFIED_FOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Категория" required>
                      <select
                        style={styles.input}
                        name="buyServiceCategory"
                        value={formData.buyServiceCategory}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {getBuyServiceCategoryOptions(formData.mainCategory).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}
                <FormFieldWithTooltip
                  label="Кратък текст към заглавието"
                  tooltip="По избор: добавя се към автоматичното заглавие (напр. Facelift, 4x4, Реален пробег)"
                >
                  <input
                    style={styles.input}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={TITLE_SUFFIX_MAX_LENGTH}
                    placeholder="По избор"
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Макс. {TITLE_SUFFIX_MAX_LENGTH} символа за допълнителния текст.
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    Заглавие: {buildListingTitle(formData, defaultClassifiedTopmenu)}
                  </div>
                </FormFieldWithTooltip>
              </div>
            </div>
          )}

          {/* Step 2: Car Details */}
          {currentStepKey === "details" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiSettings size={18} className="section-icon" />
                Детайли за категорията
              </h2>
              <div className="field-grid">
                {formData.mainCategory === "1" && (
                  <>
                    <FormFieldWithTooltip label="Гориво" required tooltip="Тип на горивото">
                      <select
                        style={styles.input}
                        name="fuel"
                        value={formData.fuel}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери гориво</option>
                        {CAR_FUEL_OPTIONS.map((fuelOption) => (
                          <option key={fuelOption.value} value={fuelOption.value}>
                            {fuelOption.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip
                      label="Скоростна кутия"
                      required
                      tooltip="Тип на скоростната кутия"
                    >
                      <select
                        style={styles.input}
                        name="gearbox"
                        value={formData.gearbox}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери кутия</option>
                        {CAR_GEARBOX_OPTIONS.map((gearboxOption) => (
                          <option key={gearboxOption.value} value={gearboxOption.value}>
                            {gearboxOption.label}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Пробег (км)" required>
                      <input
                        style={styles.input}
                        type="number"
                        name="mileage"
                        placeholder="Въведи пробег"
                        min="0"
                        value={formData.mileage}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Мощност (к.с.)">
                      <input
                        style={styles.input}
                        type="number"
                        name="power"
                        placeholder="напр. 150"
                        min="0"
                        value={formData.power}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Кубатура (куб. см.)">
                      <input
                        style={styles.input}
                        type="number"
                        name="displacement"
                        min="0"
                        value={formData.displacement}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Евростандарт">
                      <select
                        style={styles.input}
                        name="euroStandard"
                        value={formData.euroStandard}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {HEAVY_EURO_STANDARD_OPTIONS.map((option, index) => (
                          <option key={option} value={String(index + 1)}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "w" && (
                  <>
                    <FormFieldWithTooltip label="Материал">
                      <select
                        style={styles.input}
                        name="wheelMaterial"
                        value={formData.wheelMaterial}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_MATERIAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Болтове">
                      <select
                        style={styles.input}
                        name="wheelBolts"
                        value={formData.wheelBolts}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_BOLT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Междуболтово разстояние (PCD)">
                      <select style={styles.input} name="wheelPcd" value={formData.wheelPcd} onChange={handleChange}>
                        <option value="">Избери</option>
                        {wheelPcdOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Централен отвор">
                      <select
                        style={styles.input}
                        name="wheelCenterBore"
                        value={formData.wheelCenterBore}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_CENTER_BORE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Офсет /ET/">
                      <select
                        style={styles.input}
                        name="wheelOffset"
                        value={formData.wheelOffset}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_OFFSET_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Ширина (J)">
                      <select style={styles.input} name="wheelWidth" value={formData.wheelWidth} onChange={handleChange}>
                        <option value="">Избери</option>
                        {WHEEL_WIDTH_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Диаметър (инча)">
                      <select
                        style={styles.input}
                        name="wheelDiameter"
                        value={formData.wheelDiameter}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {WHEEL_DIAMETER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Брой джанти">
                      <select style={styles.input} name="wheelCount" value={formData.wheelCount} onChange={handleChange}>
                        <option value="">Избери</option>
                        {WHEEL_COUNT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид">
                      <select style={styles.input} name="wheelType" value={formData.wheelType} onChange={handleChange}>
                        <option value="">Избери</option>
                        {WHEEL_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {(formData.mainCategory === "3" || formData.mainCategory === "4") && (
                  <>
                    <FormFieldWithTooltip label="Пробег (км)" required>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="mileage"
                        value={formData.mileage}
                        onChange={handleChange}
                        required
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Кубатура (куб. см.)">
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="displacement"
                        value={formData.displacement}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Месец на производство">
                      <select style={styles.input} name="month" value={formData.month} onChange={handleChange}>
                        <option value="">Избери</option>
                        {MONTH_OPTIONS.map((monthOption) => (
                          <option key={monthOption} value={monthOption}>
                            {monthOption}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                    <FormFieldWithTooltip label="Брой оси">
                      <select style={styles.input} name="heavyAxles" value={formData.heavyAxles} onChange={handleChange} required>
                        <option value="">Избери</option>
                        {HEAVY_AXLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Брой места">
                      <select style={styles.input} name="heavySeats" value={formData.heavySeats} onChange={handleChange} required>
                        <option value="">Избери</option>
                        {HEAVY_SEAT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Товароносимост (кг)">
                      <select style={styles.input} name="heavyLoad" value={formData.heavyLoad} onChange={handleChange} required>
                        <option value="">Избери</option>
                        {HEAVY_LOAD_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Мощност (к.с.)">
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="power"
                        value={formData.power}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид двигател" required>
                      <select
                        style={styles.input}
                        name="engineType"
                        value={formData.engineType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {ENGINE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Трансмисия">
                      <select
                        style={styles.input}
                        name="transmission"
                        value={formData.transmission}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {TRANSMISSION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Евростандарт">
                      <select
                        style={styles.input}
                        name="heavyEuroStandard"
                        value={formData.heavyEuroStandard}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {HEAVY_EURO_STANDARD_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                  </>
                )}

                {formData.mainCategory === "5" && (
                  <>
                    <FormFieldWithTooltip label="Кубатура (куб. см.)" required>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="motoDisplacement"
                        value={formData.motoDisplacement}
                        onChange={handleChange}
                        required
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Мощност (к.с.)">
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="power"
                        value={formData.power}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид двигател">
                      <select
                        style={styles.input}
                        name="engineType"
                        value={formData.engineType}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {ENGINE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид охлаждане">
                      <select
                        style={styles.input}
                        name="motoCoolingType"
                        value={formData.motoCoolingType}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {MOTO_COOLING_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид двигател (конфигурация)">
                      <select
                        style={styles.input}
                        name="motoEngineKind"
                        value={formData.motoEngineKind}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {MOTO_ENGINE_KIND_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "6" && (
                  <>
                    {agriFieldVisibility.showEngineType && (
                      <FormFieldWithTooltip label="Двигател" required>
                        <select
                          style={styles.input}
                          name="engineType"
                          value={formData.engineType}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Избери</option>
                          {ENGINE_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormFieldWithTooltip>
                    )}

                    {agriFieldVisibility.showPower && (
                      <FormFieldWithTooltip label="Мощност (к.с.)" required>
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          name="power"
                          value={formData.power}
                          onChange={handleChange}
                          required
                        />
                      </FormFieldWithTooltip>
                    )}

                    {agriFieldVisibility.showTransmission && (
                      <FormFieldWithTooltip label="Скоростна кутия" required>
                        <select
                          style={styles.input}
                          name="transmission"
                          value={formData.transmission}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Избери</option>
                          {TRANSMISSION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormFieldWithTooltip>
                    )}

                    {agriFieldVisibility.showDriveType && (
                      <FormFieldWithTooltip label="Задвижване" required>
                        <select
                          style={styles.input}
                          name="agriDriveType"
                          value={formData.agriDriveType}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Избери</option>
                          {AGRI_DRIVE_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormFieldWithTooltip>
                    )}

                    {agriFieldVisibility.showHours && (
                      <FormFieldWithTooltip label="Часове работа" required>
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          name="forkliftHours"
                          value={formData.forkliftHours}
                          onChange={handleChange}
                          required
                        />
                      </FormFieldWithTooltip>
                    )}

                    {agriFieldVisibility.showEuroStandard && (
                      <FormFieldWithTooltip label="Евростандарт" required>
                        <select
                          style={styles.input}
                          name="euroStandard"
                          value={formData.euroStandard}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Избери</option>
                          {HEAVY_EURO_STANDARD_OPTIONS.map((option, index) => (
                            <option key={option} value={String(index + 1)}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormFieldWithTooltip>
                    )}
                  </>
                )}

                {formData.mainCategory === "7" && (
                  <>
                    <FormFieldWithTooltip label="Вид техника" required>
                      <select
                        style={styles.input}
                        name="equipmentType"
                        value={formData.equipmentType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Мощност (к.с.)">
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        name="power"
                        value={formData.power}
                        onChange={handleChange}
                      />
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Вид двигател">
                      <select
                        style={styles.input}
                        name="engineType"
                        value={formData.engineType}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {ENGINE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "8" && (
                  <>
                    <FormFieldWithTooltip label="Вид двигател" required>
                      <select
                        style={styles.input}
                        name="engineType"
                        value={formData.engineType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {ENGINE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Товароподемност (кг)">
                      <select style={styles.input} name="forkliftLoad" value={formData.forkliftLoad} onChange={handleChange}>
                        <option value="">Избери</option>
                        {FORKLIFT_LOAD_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Часове работа">
                      <select style={styles.input} name="forkliftHours" value={formData.forkliftHours} onChange={handleChange}>
                        <option value="">Избери</option>
                        {FORKLIFT_HOUR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "9" && (
                  <>
                    <FormFieldWithTooltip label="Брой спални места" required>
                      <select
                        style={styles.input}
                        name="caravanBeds"
                        value={formData.caravanBeds}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Избери</option>
                        {CARAVAN_BED_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Дължина (м)">
                      <select
                        style={styles.input}
                        name="caravanLength"
                        value={formData.caravanLength}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {CARAVAN_LENGTH_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Оборудване">
                      <div style={{ display: "grid", gap: 8 }}>
                        <label>
                          <input
                            type="checkbox"
                            name="caravanHasToilet"
                            checked={formData.caravanHasToilet}
                            onChange={handleChange}
                          />{" "}
                          Тоалетна
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="caravanHasHeating"
                            checked={formData.caravanHasHeating}
                            onChange={handleChange}
                          />{" "}
                          Отопление
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="caravanHasAc"
                            checked={formData.caravanHasAc}
                            onChange={handleChange}
                          />{" "}
                          Климатик
                        </label>
                      </div>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "a" && (
                  <>
                    <FormFieldWithTooltip label="Вид двигател">
                      <select
                        style={styles.input}
                        name="engineType"
                        value={formData.engineType}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {ENGINE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Брой двигатели">
                      <select
                        style={styles.input}
                        name="boatEngineCount"
                        value={formData.boatEngineCount}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {BOAT_ENGINE_COUNT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Материал">
                      <select
                        style={styles.input}
                        name="boatMaterial"
                        value={formData.boatMaterial}
                        onChange={handleChange}
                      >
                        <option value="">Избери</option>
                        {BOAT_MATERIAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Дължина (м)">
                      <select style={styles.input} name="boatLength" value={formData.boatLength} onChange={handleChange}>
                        <option value="">Избери</option>
                        {BOAT_LENGTH_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Ширина (м)">
                      <select style={styles.input} name="boatWidth" value={formData.boatWidth} onChange={handleChange}>
                        <option value="">Избери</option>
                        {BOAT_WIDTH_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Газене (м)">
                      <select style={styles.input} name="boatDraft" value={formData.boatDraft} onChange={handleChange}>
                        <option value="">Избери</option>
                        {BOAT_DRAFT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Часове работа">
                      <select style={styles.input} name="boatHours" value={formData.boatHours} onChange={handleChange}>
                        <option value="">Избери</option>
                        {BOAT_HOUR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {formData.mainCategory === "b" && (
                  <>
                    <FormFieldWithTooltip label="Товароносимост (кг)">
                      <select style={styles.input} name="trailerLoad" value={formData.trailerLoad} onChange={handleChange}>
                        <option value="">Избери</option>
                        {TRAILER_LOAD_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>

                    <FormFieldWithTooltip label="Брой оси">
                      <select style={styles.input} name="trailerAxles" value={formData.trailerAxles} onChange={handleChange}>
                        <option value="">Избери</option>
                        {TRAILER_AXLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormFieldWithTooltip>
                  </>
                )}

                {!["y", "z", "u"].includes(formData.mainCategory) && (
                  <FormFieldWithTooltip label="Цвят">
                    <select style={styles.input} name="color" value={formData.color} onChange={handleChange}>
                      <option value="">Избери цвят</option>
                      {COLOR_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormFieldWithTooltip>
                )}

                {!["y", "z"].includes(formData.mainCategory) && (
                  <FormFieldWithTooltip label="Състояние">
                    <select style={styles.input} name="condition" value={formData.condition} onChange={handleChange}>
                      {CONDITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormFieldWithTooltip>
                )}
                {!["y", "z", "u", "v", "w", "5", "6", "7", "a", "b"].includes(formData.mainCategory) && (
                  <FormFieldWithTooltip label="VIN номер">
                    <input
                      style={styles.input}
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={handleChange}
                      maxLength={17}
                      placeholder="напр. WDB12345678901234"
                    />
                  </FormFieldWithTooltip>
                )}
                {(formData.mainCategory === "y" || formData.mainCategory === "z") && (
                  <div style={{ gridColumn: "1 / -1", color: "#666", fontSize: 14 }}>
                    За тази категория няма допълнителни технически полета.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Price & Location */}
          {currentStepKey === "pricing" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiTag size={18} className="section-icon" />
                Цена и локация
              </h2>
              <div className="field-grid">
                {requiresPrice(formData.mainCategory) && (
                  <FormFieldWithTooltip label="Цена (EUR)" required tooltip="Цена на обявата">
                    <input style={styles.input} type="number" name="price" placeholder="Въведи цена" min="0" step="0.01" value={formData.price} onChange={handleChange} required />
                    <div className="price-summary">
                      <span>
                        <strong>Цена:</strong> {priceSummary.price}
                      </span>
                      <span>
                        <strong>Регион:</strong> {priceSummary.region}
                      </span>
                      <span>
                        <strong>Град:</strong> {priceSummary.city}
                      </span>
                    </div>
                  </FormFieldWithTooltip>
                )}

                <FormFieldWithTooltip label="Местоположение - Регион" required tooltip="Регион, където се намира обявата">
                  <select style={styles.input} name="locationCountry" value={formData.locationCountry} onChange={handleChange} required>
                    <option value="">Избери местоположение</option>
                    {BULGARIA_REGIONS.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </FormFieldWithTooltip>

                {formData.locationCountry && formData.locationCountry !== "Извън страната" && (
                  <FormFieldWithTooltip label="Град" required tooltip="Град, където се намира обявата">
                    <select style={styles.input} name="city" value={formData.city} onChange={handleChange} required>
                      <option value="">Избери град</option>
                      {BULGARIAN_CITIES_BY_REGION[formData.locationCountry]?.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </FormFieldWithTooltip>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Features/Extras */}
          {currentStepKey === "features" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiStar size={18} className="section-icon" />
                Екстри и опции
              </h2>
              <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
                {formData.mainCategory === "6"
                  ? "Избери комфорт, други и защита за селскостопанската техника"
                  : formData.mainCategory === "7"
                  ? "Избери комфорт, други и защита за индустриалната техника"
                  : formData.mainCategory === "b"
                  ? "Избери всички екстри и опции за ремаркето"
                  : formData.mainCategory === "a"
                  ? "Избери всички екстри и опции за яхтата или лодката"
                  : formData.mainCategory === "5"
                  ? "Избери всички екстри и опции, които има мотоциклетът"
                  : isHeavyMainCategory(formData.mainCategory)
                    ? "Избери всички екстри и опции, които има бусът/камионът"
                    : "Избери всички екстри и опции, които има автомобилът"}
              </p>
              <div className="feature-groups">
                {featureCategories.map((group) => {
                  const selectedCount = group.items.filter((feature) =>
                    formData.features.includes(feature)
                  ).length;

                  return (
                    <div key={group.id} className="feature-group">
                      <div className="feature-group-header">
                        <div>
                          <h3 className="feature-group-title">{group.title}</h3>
                          {group.description && (
                            <p className="feature-group-subtitle">{group.description}</p>
                          )}
                        </div>
                        <span className="feature-group-count">
                          {selectedCount}/{group.items.length}
                        </span>
                      </div>
                      <div className="feature-grid">
                        {group.items.map((feature) => (
                          <label
                            key={feature}
                            className={`feature-card ${
                              formData.features.includes(feature) ? "is-selected" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.features.includes(feature)}
                              onChange={() => handleFeatureChange(feature)}
                              className="feature-checkbox"
                            />
                            <span className="feature-check" aria-hidden="true">
                              <FiCheck size={12} />
                            </span>
                            <span className="feature-label">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 6: Description */}
          {currentStepKey === "description" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiFileText size={18} className="section-icon" />
                Описание на обявата
              </h2>
              <FormFieldWithTooltip
                label="Описание"
                required
                tooltip="Подробно описание на обявата"
                helperText="Напиши поне 50 символа за по-добра видимост"
                hint="Включи състояние, особености, сервизна история и важни детайли"
              >
                <textarea
                  style={styles.textarea}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Опишете състоянието, особеностите и причината за продажба..."
                  rows={8}
                />
              </FormFieldWithTooltip>
            </div>
          )}

          {/* Step 7: Contact */}
          {currentStepKey === "contact" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiPhone size={18} className="section-icon" />
                Контактна информация
              </h2>
              <div className="field-grid">
                <FormFieldWithTooltip
                  label="Телефон"
                  required
                  tooltip="Телефонен номер за връзка"
                >
                  <input
                    style={styles.input}
                    type="tel"
                    name="phone"
                    placeholder="Въведи телефон"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </FormFieldWithTooltip>

                <FormFieldWithTooltip
                  label="Имейл"
                  required
                  tooltip="Имейл от профила (автоматично попълнен)"
                  helperText="Имейлът се взима от акаунта и не може да се променя"
                >
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    placeholder="Няма наличен имейл в профила"
                    value={formData.email}
                    readOnly
                    disabled
                  />
                </FormFieldWithTooltip>
              </div>
            </div>
          )}

          {/* Step 8: Listing Type */}
          {currentStepKey === "listingType" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FiStar size={18} className="section-icon" />
                Тип обява
              </h2>
              <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
                Избери дали обявата да е нормална или топ за по-голяма видимост.
              </p>
              <div className="listing-type-grid">
                <label
                  className={`listing-type-card ${
                    formData.listingType === "normal" ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="listingType"
                    value="normal"
                    checked={formData.listingType === "normal"}
                    onChange={handleListingTypeChange}
                  />
                  <h3 className="listing-type-title">Нормална обява</h3>
                  <p className="listing-type-desc">
                    Стандартно публикуване без допълнително позициониране.
                  </p>
                </label>

                <label
                  className={`listing-type-card ${
                    formData.listingType === "top" ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="listingType"
                    value="top"
                    checked={formData.listingType === "top"}
                    onChange={handleListingTypeChange}
                  />
                  <h3 className="listing-type-title">Топ обява</h3>
                  <p className="listing-type-desc">
                    Приоритетна видимост и изкарване по-напред в резултатите.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="publish-actions">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className={`publish-btn secondary ${
                currentStep === 1 ? "disabled" : ""
              }`}
            >
              <FiArrowLeft size={16} />
              Назад
            </button>

            {currentStep === totalSteps ? (
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={loading || loadingListing}
                className={`publish-btn primary ${loading ? "disabled" : ""}`}
              >
                {loading ? (
                  isEditMode ? "Запазване..." : "Публикуване..."
                ) : (
                  <>
                    <FiCheck size={16} />
                    {isEditMode ? "Запази промените" : "Публикувай обява"}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isNextDisabled}
                className={`publish-btn primary ${isNextDisabled ? "disabled" : ""}`}
              >
                Напред
                <FiArrowRight size={16} />
              </button>
            )}
          </div>

          <p style={styles.note}>* Задължителни полета</p>
        </form>
        <aside className="publish-aside">
          <ListingQualityIndicator
            completionPercentage={completionPercentage}
            filledFields={completionStats.filledFields}
            totalFields={completionStats.totalFields}
            imageCount={previewImageCount}
            hasPrice={hasValidPriceSignal}
            priceRequired={requiresPrice(formData.mainCategory)}
          />
          <ListingPreview
            variant="compact"
            title={previewTitle}
            brand={formData.brand}
            model={formData.model}
            year={previewYear}
            price={previewPrice}
            city={formData.city}
            mileage={previewMileage}
            fuel={previewFuel}
            gearbox={previewGearbox}
            power={formData.power}
            coverImage={coverPreview}
            imageCount={previewImageCount}
            priceRequired={requiresPrice(formData.mainCategory)}
            description={formData.description}
            completionPercentage={completionPercentage}
            listingType={formData.listingType}
          />
        </aside>
      </div>
    </div>
    {showTopConfirm && (
      <div style={styles.confirmOverlay} onClick={cancelTopListing}>
        <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.confirmTitle}>ТОП обява</h3>
          <p style={styles.confirmText}>
            Публикуването на обява като "ТОП" струва 3 EUR.
          </p>
          <div style={styles.confirmActions}>
            <button style={styles.confirmButtonGhost} onClick={cancelTopListing}>
              Отхвърли
            </button>
            <button style={styles.confirmButtonPrimary} onClick={confirmTopListing}>
              Продължи
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default PublishPage;


