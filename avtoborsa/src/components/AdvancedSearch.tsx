import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search, Bookmark, Lock } from "lucide-react";
import { BrandSelector } from "./BrandSelector";
import { BULGARIAN_CITIES_BY_REGION } from "../constants/bulgarianCities";
import { useRecentSearches } from "../hooks/useRecentSearches";
import type { RecentSearch } from "../hooks/useRecentSearches";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { groupOptionsByInitial, sortUniqueOptions } from "../utils/alphabeticalOptions";
import {
  getBrandOptionsByMainCategory,
  getMainCategoryFromTopmenu,
  getModelOptionsByMainCategory,
  getWheelOfferTypeOptions,
  getWheelPcdOptions,
} from "../constants/mobileBgData";
import {
  MOTO_CATEGORY_OPTIONS,
  MOTO_COOLING_TYPE_OPTIONS,
  MOTO_ENGINE_KIND_OPTIONS,
} from "../constants/motoData";

interface SearchCriteria {
  mainCategory?: string;
  category: string;
  wheelFor: string;
  wheelOfferType: string;
  partFor: string;
  partCategory: string;
  partElement: string;
  classifiedFor: string;
  accessoryCategory: string;
  brand: string;
  model: string;
  maxPrice: string;
  year: string;
  yearFrom: string;
  yearTo: string;
  fuel: string;
  gearbox: string;
  engineType: string;
  transmission: string;
  agriType: string;
  agriBrand: string;
  agriDriveType: string;
  condition: string;
  sortBy: string;
  isNew: boolean;
  isUsed: boolean;
  isPartial: boolean;
  isParts: boolean;
  priceFrom: string;
  priceTo: string;
  mileageFrom: string;
  mileageTo: string;
  engineFrom: string;
  engineTo: string;
  region: string;
  city: string;
  color: string;
  currency: string;
  taxCreditOnly: boolean;
  hasPhoto: boolean;
  hasVideo: boolean;
  sellerType: string;
  heavyAxlesFrom: string;
  heavyAxlesTo: string;
  heavySeatsFrom: string;
  heavySeatsTo: string;
  heavyLoadFrom: string;
  heavyLoadTo: string;
  heavyEuroStandard: string;
  motoCategory: string;
  motoCoolingType: string;
  motoEngineKind: string;
  motoDisplacementFrom: string;
  motoDisplacementTo: string;
  forkliftLoadFrom: string;
  forkliftLoadTo: string;
  forkliftHoursFrom: string;
  forkliftHoursTo: string;
  caravanBedsFrom: string;
  caravanBedsTo: string;
  caravanLengthFrom: string;
  caravanLengthTo: string;
  caravanHasToilet: boolean;
  caravanHasHeating: boolean;
  caravanHasAc: boolean;
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
  wheelTireBrand: string;
  wheelTireWidth: string;
  wheelTireHeight: string;
  wheelTireDiameter: string;
  wheelTireSeason: string;
  wheelTireSpeedIndex: string;
  wheelTireLoadIndex: string;
  wheelTireTread: string;
  boatLengthFrom: string;
  boatLengthTo: string;
  boatWidthFrom: string;
  boatWidthTo: string;
  boatDraftFrom: string;
  boatDraftTo: string;
  boatHoursFrom: string;
  boatHoursTo: string;
  boatEngineCountFrom: string;
  boatEngineCountTo: string;
  boatMaterial: string;
  trailerLoadFrom: string;
  trailerLoadTo: string;
  trailerAxlesFrom: string;
  trailerAxlesTo: string;
  buyServiceCategory: string;
  motoFeatures: string[];
  features: string[];
  boatFeatures: string[];
  trailerFeatures: string[];
}

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria) => void;
  brands: string[];
  models: Record<string, string[]>;
  categories: Array<{ value: string; label: string }>;
  mainCategory: string;
  onMainCategoryChange?: (value: string) => void;
  recentSearches?: RecentSearch[];
  hideMainCategoryField?: boolean;
  topContent?: React.ReactNode;
}

const FUEL_OPTIONS = ["Бензин", "Дизел", "Газ/Бензин", "Хибрид", "Електро"];
const GEARBOX_OPTIONS = ["Ръчна", "Автоматик"];
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
const WHEEL_FOR_OPTIONS = [
  { value: "1", label: "Автомобили и Джипове" },
  { value: "3", label: "Бусове" },
  { value: "4", label: "Камиони" },
  { value: "5", label: "Мотоциклети" },
  { value: "6", label: "Селскостопански" },
  { value: "7", label: "Индустриални" },
  { value: "8", label: "Кари" },
  { value: "9", label: "Каравани" },
  { value: "10", label: "Яхти и Лодки" },
  { value: "11", label: "Ремаркета" },
];
const WHEEL_OFFER_TYPE_OPTIONS = [
  { value: "", label: "Всички" },
  { value: "1", label: "Гуми" },
  { value: "2", label: "Джанти" },
  { value: "3", label: "Гуми с джанти" },
];
const DEFAULT_SORT_OPTIONS = [
  { value: "Марка/Модел/Цена", label: "Марка/Модел/Цена" },
  { value: "price-asc", label: "Цена" },
  { value: "year-desc", label: "Дата на производство" },
  { value: "mileage-desc", label: "Пробег" },
  { value: "newest", label: "Най-новите обяви" },
  { value: "newest-2days", label: "Най-новите обяви от посл. 2 дни" },
];
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
const PART_ELEMENT_OPTIONS = [""];
const ENGINE_TYPE_OPTIONS = [
  "Бензинов",
  "Дизелов",
  "Електрически",
  "Хибриден",
  "Plug-in хибрид",
  "Газ",
  "Водород",
];
const TRANSMISSION_OPTIONS = ["Ръчна", "Автоматична", "Полуавтоматична"];
const CATEGORY_FOR_OPTIONS = [
  { value: "1", label: "Автомобили и Джипове" },
  { value: "3", label: "Бусове" },
  { value: "4", label: "Камиони" },
  { value: "5", label: "Мотоциклети" },
  { value: "6", label: "Селскостопански" },
  { value: "7", label: "Индустриални" },
  { value: "8", label: "Кари" },
  { value: "9", label: "Каравани" },
  { value: "10", label: "Яхти и Лодки" },
  { value: "11", label: "Ремаркета" },
];
const AGRI_TYPE_OPTIONS = [
  "Балировачка",
  "Брана",
  "Валяк",
  "Друг вид",
  "Комбайн",
  "Култиватор",
  "Мотокултиватор",
  "Мулчер",
  "Плуг",
  "Продълбочител",
  "Пръскачка",
  "Ремарке",
  "Самоходна пръскачка",
  "Сенокосачка",
  "Сенообръщачка",
  "Сеялка",
  "Сламопреса и сеносъбирач",
  "Специализирани машини",
  "Телескопичен товарач",
  "Торачка",
  "Трактор",
  "Фреза",
  "Хедер",
  "Чизел",
];
const INDUSTRIAL_TYPE_OPTIONS = [
  "Автовишка",
  "Автокран",
  "Асфалтополагаща машина",
  "Багер",
  "Бетон миксер",
  "Бетон помпа",
  "Булдозер",
  "Валяк",
  "Грейдери",
  "Допълнително оборудване",
  "Други специализирани машини",
  "Каналокопатели",
  "Компресори",
  "Кулокранове",
  "Машини за асфалт",
  "Машини за насипни материали",
  "Мини челни товарачи",
  "Минна техника",
  "Платформи",
  "Телескопични товарачи",
  "Трамбовки",
  "Челен товарач",
];
const BOAT_TYPE_OPTIONS = [
  "Ветроходна лодка",
  "Джет",
  "Извънбордов двигател",
  "Лодка",
  "Моторна яхта",
  "Надуваема лодка",
];
const TRAILER_TYPE_OPTIONS = ["За автомобил", "За камион", "За трактор", "Полуремарке"];
const EQUIPMENT_TYPE_OPTIONS_BY_MAIN_CATEGORY: Record<string, string[]> = {
  "6": AGRI_TYPE_OPTIONS,
  "7": INDUSTRIAL_TYPE_OPTIONS,
  a: BOAT_TYPE_OPTIONS,
  b: TRAILER_TYPE_OPTIONS,
};
const ACCESSORY_CATEGORY_OPTIONS = [
  "CD, DVD",
  "LED крушки и светлини",
  "Xenon",
  "Авто крушки",
  "Автокасетофони",
  "Автосиликон",
  "Акумулатори",
  "Аларми и централно заключване",
  "Ангелски очи",
  "Вериги за сняг",
  "Водоструйки",
  "Волани и аксесоари за волани",
  "Допълнителни огледала",
  "Друга електроника за автомобила",
  "Други",
  "Екстериорни неметални аксесоари",
  "Зарядни у-ва",
  "Инструменти",
  "Интериорни аксесоари",
  "Кодочетци",
  "Лип спойлери",
  "Навигация",
  "Неон",
  "Осветление",
  "Парктроници",
  "Седалки - обикновени, спортни",
  "Спойлери, брони и аксесоари към тях",
  "Спортни гърнета",
  "Стелки",
  "Стикери, лепенки, емблеми",
  "Суббуфери",
  "Тапицерии",
  "Тасове",
  "Товароукрепващи средства",
  "Тонколони",
  "Усилватели",
  "Фолио",
  "Халогени",
  "Чистачки",
  "Щори",
  "кристални: фарове, стопове, мигачи",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1929 },
  (_, i) => String(CURRENT_YEAR - i)
);
const CURRENCY_OPTIONS = ["EUR", "USD"];
const AXLE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const EURO_STANDARD_OPTIONS = ["Евро 1", "Евро 2", "Евро 3", "Евро 4", "Евро 5", "Евро 6"];
const SELLER_TYPE_OPTIONS = [
  { value: "0", label: "Всички обяви" },
  { value: "2", label: "На регистрирани търговци" },
  { value: "1", label: "Обяви на частни лица" },
];
const WHEEL_MATERIAL_OPTIONS = ["алуминиеви", "магнезиеви", "железни", "други"];
const WHEEL_BOLT_OPTIONS = ["3", "4", "5", "6", "8", "9", "10", "12"];
const WHEEL_PCD_OPTIONS_BY_BOLTS: Record<string, string[]> = {
  "3": ["98", "100", "112"],
  "4": ["98", "100", "108", "110", "114.3"],
  "5": ["98", "100", "105", "108", "110", "112", "114.3", "120", "127", "130"],
  "6": ["130", "135", "139.7", "170", "205"],
  "8": ["165.1", "170", "180", "200", "220", "275"],
  "9": ["225"],
  "10": ["225", "285.75", "335"],
  "12": ["335"],
};
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
  "8.25",
  "8.5",
  "9.0",
  "9.5",
  "10.0",
  "10.5",
  "11.0",
  "11.5",
  "11.75",
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
const WHEEL_TYPE_OPTIONS = ["Неразглобяеми", "Разглобяеми"];
const WHEEL_TIRE_WIDTH_OPTIONS = [
  "135",
  "145",
  "155",
  "165",
  "175",
  "185",
  "195",
  "205",
  "215",
  "225",
  "235",
  "245",
  "255",
  "265",
  "275",
  "285",
  "295",
  "305",
  "315",
  "325",
  "335",
];
const WHEEL_TIRE_HEIGHT_OPTIONS = ["25", "30", "35", "40", "45", "50", "55", "60", "65", "70", "75", "80", "85"];
const WHEEL_TIRE_BRAND_OPTIONS = [
  "Apollo",
  "Barum",
  "BFGoodrich",
  "Bridgestone",
  "Continental",
  "Cooper",
  "Debica",
  "Dunlop",
  "Falken",
  "Firestone",
  "Fulda",
  "General Tire",
  "Goodyear",
  "Hankook",
  "Kleber",
  "Kumho",
  "Linglong",
  "Matador",
  "Michelin",
  "Nexen",
  "Nokian",
  "Pirelli",
  "Sava",
  "Semperit",
  "Toyo",
  "Uniroyal",
  "Vredestein",
  "Yokohama",
  "Други",
];
const WHEEL_TIRE_SEASON_OPTIONS = ["Летни", "Зимни", "Всесезонни"];
const WHEEL_TIRE_SPEED_INDEX_OPTIONS = ["Q", "R", "S", "T", "H", "V", "W", "Y", "ZR"];
const WHEEL_TIRE_TREAD_OPTIONS = ["Симетричен", "Асиметричен", "Посока"];
const BOAT_ENGINE_TYPE_OPTIONS = [
  "Без двигател",
  "Бензинов",
  "Дизелов",
  "Електрически",
  "Хибриден",
  "Plug-in хибрид",
  "Газ",
  "Водород",
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
const BOAT_FEATURE_OPTIONS = [
  "Автопилот",
  "Ехолот",
  "Радар",
  "Радиостанция",
  "Чартплотер",
  "DVD, TV",
  "Климатик",
  "Навигация",
  "Печка",
  "Стерео уредба",
  "Хидрофорна система",
  "Хладилник",
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
  "Каско",
  "Лебедка",
  "Покривало",
  "Противопожарно оборудване",
  "Хидравлични стабилизатори",
  "Баня",
  "Кухня",
  "Тоалетна",
];
const TRAILER_FEATURE_OPTIONS = [
  "Антиблокираща система",
  "Въздушно окачване",
  "Дискови спирачки",
  "Електронна система за завиване",
  "Завиващ мост",
  "Инерционен теглич",
  "Люлеещ теглич",
  "Пневматична спирачна система",
  "Твърд теглич",
  "Бартер",
  "Капариран/Продаден",
  "Лизинг",
  "Нов внос",
  "Подвижен под",
  "Подсилен под",
  "Ресьори",
  "С регистрация",
  "2/3 странно изсипване",
  "Алуминиев кош",
  "Брезент",
  "Капаци",
  "Лети джанти",
  "Повдигащи се оси",
  "Тристранна щора",
  "Тристранно разтоварване",
  "Каско",
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
];
const AGRI_DRIVE_TYPE_OPTIONS = ["2x4", "4x4", "Верижно", "Друго"];

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
  трактор: {
    showEngineType: true,
    showPower: true,
    showTransmission: true,
    showDriveType: true,
    showHours: true,
    showEuroStandard: true,
  },
  комбайн: {
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

void BOAT_FEATURE_OPTIONS;
void TRAILER_FEATURE_OPTIONS;
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
const SERVICES_CATEGORY_OPTIONS = [
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
  "Ремонт на ГНП и дюзи",
  "Ремонт на двигатели",
  "Ремонт на ел. Инсталации",
  "Ремонт на изпускателна с-ма",
  "Ремонт на турбокомпресори",
  "Ремонт на ходова част",
  "Ремонт тахографи",
  "СЕРВИЗ",
  "Сервизни услуги",
  "Техника под наем",
  "Товарни превози",
  "Тунинг",
  "Уредби",
  "Хотел за гуми /Tyre Hotel/",
  "Шофьорски курсове",
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  brands,
  models,
  categories,
  mainCategory,
  onMainCategoryChange,
  recentSearches = [],
  hideMainCategoryField = false,
  topContent,
}) => {
  const navigate = useNavigate();
  const { addSearch } = useRecentSearches();
  const { saveSearch } = useSavedSearches();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    category: "",
    wheelFor: "1",
    wheelOfferType: "",
    partFor: "1",
    partCategory: "",
    partElement: "",
    classifiedFor: "1",
    accessoryCategory: "",
    brand: "",
    model: "",
    maxPrice: "",
    year: "",
    yearFrom: "",
    yearTo: "",
    fuel: "",
    gearbox: "",
    engineType: "",
    transmission: "",
    agriType: "",
    agriBrand: "",
    agriDriveType: "",
    condition: "",
    sortBy: "Марка/Модел/Цена",
    isNew: false,
    isUsed: true,
    isPartial: false,
    isParts: false,
    priceFrom: "",
    priceTo: "",
    mileageFrom: "",
    mileageTo: "",
    engineFrom: "",
    engineTo: "",
    region: "",
    city: "",
    color: "",
    currency: "EUR",
    taxCreditOnly: false,
    hasPhoto: false,
    hasVideo: false,
    sellerType: "0",
    heavyAxlesFrom: "",
    heavyAxlesTo: "",
    heavySeatsFrom: "",
    heavySeatsTo: "",
    heavyLoadFrom: "",
    heavyLoadTo: "",
    heavyEuroStandard: "",
    motoCategory: "",
    motoCoolingType: "",
    motoEngineKind: "",
    motoDisplacementFrom: "",
    motoDisplacementTo: "",
    forkliftLoadFrom: "",
    forkliftLoadTo: "",
    forkliftHoursFrom: "",
    forkliftHoursTo: "",
    caravanBedsFrom: "",
    caravanBedsTo: "",
    caravanLengthFrom: "",
    caravanLengthTo: "",
    caravanHasToilet: false,
    caravanHasHeating: false,
    caravanHasAc: false,
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
    wheelTireBrand: "",
    wheelTireWidth: "",
    wheelTireHeight: "",
    wheelTireDiameter: "",
    wheelTireSeason: "",
    wheelTireSpeedIndex: "",
    wheelTireLoadIndex: "",
    wheelTireTread: "",
    boatLengthFrom: "",
    boatLengthTo: "",
    boatWidthFrom: "",
    boatWidthTo: "",
    boatDraftFrom: "",
    boatDraftTo: "",
    boatHoursFrom: "",
    boatHoursTo: "",
    boatEngineCountFrom: "",
    boatEngineCountTo: "",
    boatMaterial: "",
    trailerLoadFrom: "",
    trailerLoadTo: "",
    trailerAxlesFrom: "",
    trailerAxlesTo: "",
    buyServiceCategory: "",
    motoFeatures: [],
    features: [],
    boatFeatures: [],
    trailerFeatures: [],
  });

  const isWheelsCategory = mainCategory === "w";
  const isPartsCategory = mainCategory === "u";
  const isBusesCategory = mainCategory === "3";
  const isTrucksCategory = mainCategory === "4";
  const isMotoCategory = mainCategory === "5";
  const isAgroCategory = mainCategory === "6";
  const isIndustrialCategory = mainCategory === "7";
  const isForkliftCategory = mainCategory === "8";
  const isCaravanCategory = mainCategory === "9";
  const isBoatsCategory = mainCategory === "a";
  const isTrailersCategory = mainCategory === "b";
  const isAccessoriesCategory = mainCategory === "v";
  const isBuyCategory = mainCategory === "y";
  const isServicesCategory = mainCategory === "z";
  const isBuyOrServicesCategory = isBuyCategory || isServicesCategory;
  const isHeavyCategory = isBusesCategory || isTrucksCategory || isMotoCategory;
  const isCategoryBasedBrandModel = isAgroCategory || isBoatsCategory || isTrailersCategory;
  const isEquipmentCategory =
    isAgroCategory ||
    isIndustrialCategory ||
    isForkliftCategory ||
    isCaravanCategory ||
    isBoatsCategory ||
    isTrailersCategory;
  const usesVehicleForSelect = isWheelsCategory || isPartsCategory || isAccessoriesCategory;
  const usesCompactMainCategoryForm =
    usesVehicleForSelect || isHeavyCategory || isEquipmentCategory || isBuyOrServicesCategory;
  const hasConditionCheckboxes = !isBuyOrServicesCategory;
  const showsWheelTireFilters =
    isWheelsCategory &&
    (searchCriteria.wheelOfferType === "" ||
      searchCriteria.wheelOfferType === "1" ||
      searchCriteria.wheelOfferType === "3");
  const showsWheelRimFilters =
    isWheelsCategory &&
    (searchCriteria.wheelOfferType === "" ||
      searchCriteria.wheelOfferType === "2" ||
      searchCriteria.wheelOfferType === "3");
  const equipmentTypeOptions = useMemo(() => {
    if (isAgroCategory || isBoatsCategory || isTrailersCategory) {
      const dynamicOptions = getBrandOptionsByMainCategory(mainCategory);
      if (dynamicOptions.length > 0) {
        return dynamicOptions;
      }
    }
    return EQUIPMENT_TYPE_OPTIONS_BY_MAIN_CATEGORY[mainCategory] || [];
  }, [isAgroCategory, isBoatsCategory, isTrailersCategory, mainCategory]);
  const agriFieldVisibility = useMemo(
    () =>
      isAgroCategory
        ? getAgriFieldVisibility(searchCriteria.agriType)
        : DEFAULT_AGRI_FIELD_VISIBILITY,
    [isAgroCategory, searchCriteria.agriType]
  );
  const regions = useMemo(() => Object.keys(BULGARIAN_CITIES_BY_REGION), []);
  const cities = useMemo(
    () => (searchCriteria.region ? BULGARIAN_CITIES_BY_REGION[searchCriteria.region] || [] : []),
    [searchCriteria.region]
  );

  const brandMainCategory = useMemo(() => {
    if (isWheelsCategory) {
      return getMainCategoryFromTopmenu(searchCriteria.wheelFor || "1") || "1";
    }
    if (isPartsCategory) {
      return getMainCategoryFromTopmenu(searchCriteria.partFor || "1") || "1";
    }
    if (isAccessoriesCategory || isBuyOrServicesCategory) {
      return getMainCategoryFromTopmenu(searchCriteria.classifiedFor || "1") || "1";
    }
    return mainCategory || "1";
  }, [
    isAccessoriesCategory,
    isBuyOrServicesCategory,
    isPartsCategory,
    isWheelsCategory,
    mainCategory,
    searchCriteria.classifiedFor,
    searchCriteria.partFor,
    searchCriteria.wheelFor,
  ]);

  const availableBrands = useMemo(() => {
    const dynamicOptions = getBrandOptionsByMainCategory(brandMainCategory);
    if (dynamicOptions.length > 0) return dynamicOptions;
    return brands;
  }, [brandMainCategory, brands]);

  const sortedAvailableBrands = useMemo(
    () => sortUniqueOptions(availableBrands),
    [availableBrands]
  );

  const selectedBrand = isCategoryBasedBrandModel
    ? searchCriteria.agriType
    : searchCriteria.brand || searchCriteria.agriBrand;
  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    const dynamicOptions = getModelOptionsByMainCategory(brandMainCategory, selectedBrand);
    if (dynamicOptions.length > 0) return dynamicOptions;
    return models[selectedBrand] || [];
  }, [brandMainCategory, models, selectedBrand]);

  const groupedAvailableModels = useMemo(
    () => groupOptionsByInitial(sortUniqueOptions(availableModels)),
    [availableModels]
  );
  const wheelOfferTypeOptions = useMemo(() => {
    const options = getWheelOfferTypeOptions(searchCriteria.wheelFor || "1");
    if (options.length === 0) return WHEEL_OFFER_TYPE_OPTIONS;
    return [
      { value: "", label: "Всички" },
      ...options.map((option) => ({ value: option.value, label: option.label })),
    ];
  }, [searchCriteria.wheelFor]);
  const wheelPcdOptions = useMemo(
    () => {
      const dynamicOptions = getWheelPcdOptions(searchCriteria.wheelBolts);
      if (dynamicOptions.length > 0) return dynamicOptions;
      return WHEEL_PCD_OPTIONS_BY_BOLTS[searchCriteria.wheelBolts] || [];
    },
    [searchCriteria.wheelBolts]
  );

  const handleInputChange = (field: keyof SearchCriteria, value: string | boolean) => {
    setSearchCriteria((prev) => {
      if (typeof value === "string" && (value === "true" || value === "false")) {
        return { ...prev, [field]: value === "true" };
      }
      return { ...prev, [field]: value };
    });
  };

  const buildSearchQuery = () => {
    const query: Record<string, string> = {};
    if (mainCategory) query.mainCategory = mainCategory;

    const appendExtendedListingFilters = () => {
      if (searchCriteria.currency) query.currency = searchCriteria.currency;
      if (searchCriteria.condition) query.condition = searchCriteria.condition;
      if (searchCriteria.taxCreditOnly) query.taxCredit = "1";
      if (searchCriteria.hasPhoto) query.hasPhoto = "1";
      if (searchCriteria.hasVideo) query.hasVideo = "1";
      if (searchCriteria.sellerType && searchCriteria.sellerType !== "0") {
        query.sellerType = searchCriteria.sellerType;
      }
    };

    if (isWheelsCategory) {
      const includesTires =
        searchCriteria.wheelOfferType === "" ||
        searchCriteria.wheelOfferType === "1" ||
        searchCriteria.wheelOfferType === "3";
      const includesRims =
        searchCriteria.wheelOfferType === "" ||
        searchCriteria.wheelOfferType === "2" ||
        searchCriteria.wheelOfferType === "3";

      if (searchCriteria.wheelFor) query.topmenu = searchCriteria.wheelFor;
      if (searchCriteria.wheelOfferType) query.twrubr = searchCriteria.wheelOfferType;
      if (includesRims && searchCriteria.brand) query.marka = searchCriteria.brand;
      if (includesRims && searchCriteria.model) query.model = searchCriteria.model;
      if (includesRims && searchCriteria.wheelBrand) query.wheelBrand = searchCriteria.wheelBrand;
      if (includesRims && searchCriteria.wheelMaterial) query.wheelMaterial = searchCriteria.wheelMaterial;
      if (includesRims && searchCriteria.wheelBolts) query.wheelBolts = searchCriteria.wheelBolts;
      if (includesRims && searchCriteria.wheelPcd) query.wheelPcd = searchCriteria.wheelPcd;
      if (includesRims && searchCriteria.wheelCenterBore) query.wheelCenterBore = searchCriteria.wheelCenterBore;
      if (includesRims && searchCriteria.wheelOffset) query.wheelOffset = searchCriteria.wheelOffset;
      if (includesRims && searchCriteria.wheelWidth) query.wheelWidth = searchCriteria.wheelWidth;
      if (includesRims && searchCriteria.wheelDiameter) query.wheelDiameter = searchCriteria.wheelDiameter;
      if (includesRims && searchCriteria.wheelCount) query.wheelCount = searchCriteria.wheelCount;
      if (includesRims && searchCriteria.wheelType) query.wheelType = searchCriteria.wheelType;
      if (includesTires && searchCriteria.wheelTireBrand) query.tireBrand = searchCriteria.wheelTireBrand;
      if (includesTires && searchCriteria.wheelTireWidth) query.tireWidth = searchCriteria.wheelTireWidth;
      if (includesTires && searchCriteria.wheelTireHeight) query.tireHeight = searchCriteria.wheelTireHeight;
      if (includesTires && searchCriteria.wheelTireDiameter) query.tireDiameter = searchCriteria.wheelTireDiameter;
      if (includesTires && searchCriteria.wheelTireSeason) query.tireSeason = searchCriteria.wheelTireSeason;
      if (includesTires && searchCriteria.wheelTireSpeedIndex) query.tireSpeedIndex = searchCriteria.wheelTireSpeedIndex;
      if (includesTires && searchCriteria.wheelTireLoadIndex) query.tireLoadIndex = searchCriteria.wheelTireLoadIndex;
      if (includesTires && searchCriteria.wheelTireTread) query.tireTread = searchCriteria.wheelTireTread;
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.maxPrice) query.price1 = searchCriteria.maxPrice;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;
      if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
      if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
      appendExtendedListingFilters();

      const nup = [
        searchCriteria.isNew ? "1" : "",
        searchCriteria.isUsed ? "0" : "",
        searchCriteria.isPartial ? "3" : "",
        searchCriteria.isParts ? "2" : "",
      ].join("");
      if (nup) query.nup = nup;

      return query;
    }

    if (isPartsCategory) {
      if (searchCriteria.partFor) query.topmenu = searchCriteria.partFor;
      if (searchCriteria.partCategory) query.partrub = searchCriteria.partCategory;
      if (searchCriteria.partElement) query.partelem = searchCriteria.partElement;
      if (searchCriteria.brand) query.marka = searchCriteria.brand;
      if (searchCriteria.model) query.model = searchCriteria.model;
      if (searchCriteria.yearFrom) query.yearFrom = searchCriteria.yearFrom;
      if (searchCriteria.yearTo) query.yearTo = searchCriteria.yearTo;
      if (searchCriteria.yearFrom) query.partYearFrom = searchCriteria.yearFrom;
      if (searchCriteria.yearTo) query.partYearTo = searchCriteria.yearTo;
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.maxPrice) query.price1 = searchCriteria.maxPrice;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;
      if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
      if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
      appendExtendedListingFilters();

      const nup = [
        searchCriteria.isNew ? "1" : "",
        searchCriteria.isUsed ? "0" : "",
        searchCriteria.isPartial ? "3" : "",
      ].join("");
      if (nup) query.nup = nup;

      return query;
    }

    if (isHeavyCategory) {
      if (searchCriteria.brand) query.marka = searchCriteria.brand;
      if (searchCriteria.model) query.model = searchCriteria.model;
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.maxPrice) query.price1 = searchCriteria.maxPrice;
      if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
      if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
      if (searchCriteria.year) query.year = searchCriteria.year;
      if (searchCriteria.yearFrom) query.yearFrom = searchCriteria.yearFrom;
      if (searchCriteria.yearTo) query.yearTo = searchCriteria.yearTo;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;
      if (searchCriteria.engineType) query.fuel = searchCriteria.engineType;
      if (searchCriteria.transmission) query.transmission = searchCriteria.transmission;
      if (searchCriteria.color) query.color = searchCriteria.color;
      if (searchCriteria.mileageFrom) query.mileageFrom = searchCriteria.mileageFrom;
      if (searchCriteria.mileageTo) query.mileageTo = searchCriteria.mileageTo;
      if (searchCriteria.engineFrom) query.engineFrom = searchCriteria.engineFrom;
      if (searchCriteria.engineTo) query.engineTo = searchCriteria.engineTo;
      if (isBusesCategory || isTrucksCategory) {
        if (searchCriteria.heavyAxlesFrom) query.axlesFrom = searchCriteria.heavyAxlesFrom;
        if (searchCriteria.heavyAxlesTo) query.axlesTo = searchCriteria.heavyAxlesTo;
        if (searchCriteria.heavySeatsFrom) query.seatsFrom = searchCriteria.heavySeatsFrom;
        if (searchCriteria.heavySeatsTo) query.seatsTo = searchCriteria.heavySeatsTo;
        if (searchCriteria.heavyLoadFrom) query.loadFrom = searchCriteria.heavyLoadFrom;
        if (searchCriteria.heavyLoadTo) query.loadTo = searchCriteria.heavyLoadTo;
        if (searchCriteria.heavyEuroStandard) query.euroStandard = searchCriteria.heavyEuroStandard;
      }
      if (isMotoCategory) {
        if (searchCriteria.motoCategory) query.motoCategory = searchCriteria.motoCategory;
        if (searchCriteria.motoCoolingType) query.motoCoolingType = searchCriteria.motoCoolingType;
        if (searchCriteria.motoEngineKind) query.motoEngineKind = searchCriteria.motoEngineKind;
        if (searchCriteria.motoDisplacementFrom) query.displacementFrom = searchCriteria.motoDisplacementFrom;
        if (searchCriteria.motoDisplacementTo) query.displacementTo = searchCriteria.motoDisplacementTo;
      }
      appendExtendedListingFilters();

      const nup = [
        searchCriteria.isNew ? "1" : "",
        searchCriteria.isUsed ? "0" : "",
        searchCriteria.isPartial ? "3" : "",
        searchCriteria.isParts ? "2" : "",
      ].join("");
      if (nup) query.nup = nup;

      return query;
    }

    if (isEquipmentCategory) {
      const equipmentBrand = searchCriteria.brand || searchCriteria.agriBrand;
      const categoryBasedBrand = searchCriteria.model;
      if (searchCriteria.agriType) {
        if (isAgroCategory || isIndustrialCategory) {
          query.equipmentType = searchCriteria.agriType;
        } else if (isBoatsCategory) {
          query.boatCategory = searchCriteria.agriType;
        } else if (isTrailersCategory) {
          query.trailerCategory = searchCriteria.agriType;
        }
      }
      if (isCategoryBasedBrandModel) {
        if (searchCriteria.agriType) query.marka = searchCriteria.agriType;
        if (categoryBasedBrand) query.model = categoryBasedBrand;
      } else {
        if (equipmentBrand) query.marka = equipmentBrand;
        if (searchCriteria.model) query.model = searchCriteria.model;
      }
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.maxPrice) query.price1 = searchCriteria.maxPrice;
      if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
      if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
      if (searchCriteria.year) query.year = searchCriteria.year;
      if (searchCriteria.yearFrom) query.yearFrom = searchCriteria.yearFrom;
      if (searchCriteria.yearTo) query.yearTo = searchCriteria.yearTo;
      if (searchCriteria.color) query.color = searchCriteria.color;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;
      if (isAgroCategory) {
        if (agriFieldVisibility.showPower) {
          if (searchCriteria.engineFrom) query.engineFrom = searchCriteria.engineFrom;
          if (searchCriteria.engineTo) query.engineTo = searchCriteria.engineTo;
        }
        if (agriFieldVisibility.showEngineType && searchCriteria.engineType) {
          query.engineType = searchCriteria.engineType;
        }
        if (agriFieldVisibility.showTransmission && searchCriteria.transmission) {
          query.transmission = searchCriteria.transmission;
        }
        if (agriFieldVisibility.showDriveType && searchCriteria.agriDriveType) {
          query.driveType = searchCriteria.agriDriveType;
        }
        if (agriFieldVisibility.showHours) {
          if (searchCriteria.forkliftHoursFrom) query.hoursFrom = searchCriteria.forkliftHoursFrom;
          if (searchCriteria.forkliftHoursTo) query.hoursTo = searchCriteria.forkliftHoursTo;
        }
        if (agriFieldVisibility.showEuroStandard && searchCriteria.heavyEuroStandard) {
          query.euroStandard = searchCriteria.heavyEuroStandard;
        }
      } else {
        if (searchCriteria.engineFrom) query.engineFrom = searchCriteria.engineFrom;
        if (searchCriteria.engineTo) query.engineTo = searchCriteria.engineTo;
      }
      if (isBoatsCategory) {
        if (searchCriteria.engineType) query.fuel = searchCriteria.engineType;
        if (searchCriteria.boatEngineCountFrom) query.engineCountFrom = searchCriteria.boatEngineCountFrom;
        if (searchCriteria.boatEngineCountTo) query.engineCountTo = searchCriteria.boatEngineCountTo;
        if (searchCriteria.boatMaterial) query.material = searchCriteria.boatMaterial;
        if (searchCriteria.boatLengthFrom) query.lengthFrom = searchCriteria.boatLengthFrom;
        if (searchCriteria.boatLengthTo) query.lengthTo = searchCriteria.boatLengthTo;
        if (searchCriteria.boatWidthFrom) query.widthFrom = searchCriteria.boatWidthFrom;
        if (searchCriteria.boatWidthTo) query.widthTo = searchCriteria.boatWidthTo;
        if (searchCriteria.boatDraftFrom) query.draftFrom = searchCriteria.boatDraftFrom;
        if (searchCriteria.boatDraftTo) query.draftTo = searchCriteria.boatDraftTo;
        if (searchCriteria.boatHoursFrom) query.hoursFrom = searchCriteria.boatHoursFrom;
        if (searchCriteria.boatHoursTo) query.hoursTo = searchCriteria.boatHoursTo;
      }
      if (isTrailersCategory) {
        if (searchCriteria.trailerLoadFrom) query.loadFrom = searchCriteria.trailerLoadFrom;
        if (searchCriteria.trailerLoadTo) query.loadTo = searchCriteria.trailerLoadTo;
        if (searchCriteria.trailerAxlesFrom) query.axlesFrom = searchCriteria.trailerAxlesFrom;
        if (searchCriteria.trailerAxlesTo) query.axlesTo = searchCriteria.trailerAxlesTo;
      }
      if (isForkliftCategory) {
        if (searchCriteria.engineType) query.fuel = searchCriteria.engineType;
        if (searchCriteria.forkliftLoadFrom) query.liftCapacityFrom = searchCriteria.forkliftLoadFrom;
        if (searchCriteria.forkliftLoadTo) query.liftCapacityTo = searchCriteria.forkliftLoadTo;
        if (searchCriteria.forkliftHoursFrom) query.hoursFrom = searchCriteria.forkliftHoursFrom;
        if (searchCriteria.forkliftHoursTo) query.hoursTo = searchCriteria.forkliftHoursTo;
      }
      if (isCaravanCategory) {
        if (searchCriteria.caravanBedsFrom) query.bedsFrom = searchCriteria.caravanBedsFrom;
        if (searchCriteria.caravanBedsTo) query.bedsTo = searchCriteria.caravanBedsTo;
        if (searchCriteria.caravanLengthFrom) query.lengthFrom = searchCriteria.caravanLengthFrom;
        if (searchCriteria.caravanLengthTo) query.lengthTo = searchCriteria.caravanLengthTo;
        if (searchCriteria.caravanHasToilet) query.hasToilet = "1";
        if (searchCriteria.caravanHasHeating) query.hasHeating = "1";
        if (searchCriteria.caravanHasAc) query.hasAirConditioning = "1";
      }
      appendExtendedListingFilters();

      const nup = [
        searchCriteria.isNew ? "1" : "",
        searchCriteria.isUsed ? "0" : "",
        searchCriteria.isPartial ? "3" : "",
        searchCriteria.isParts ? "2" : "",
      ].join("");
      if (nup) query.nup = nup;

      return query;
    }

    if (isAccessoriesCategory) {
      if (searchCriteria.classifiedFor) query.topmenu = searchCriteria.classifiedFor;
      if (searchCriteria.accessoryCategory) query.marka = searchCriteria.accessoryCategory;
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.maxPrice) query.price1 = searchCriteria.maxPrice;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;
      if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
      if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
      appendExtendedListingFilters();

      const nup = [
        searchCriteria.isNew ? "1" : "",
        searchCriteria.isUsed ? "0" : "",
        searchCriteria.isPartial ? "3" : "",
      ].join("");
      if (nup) query.nup = nup;

      return query;
    }

    if (isBuyOrServicesCategory) {
      if (searchCriteria.classifiedFor) query.topmenu = searchCriteria.classifiedFor;
      if (searchCriteria.region) query.locat = searchCriteria.region;
      if (searchCriteria.city) query.locatc = searchCriteria.city;
      if (searchCriteria.buyServiceCategory) query.category = searchCriteria.buyServiceCategory;
      if (searchCriteria.sortBy) query.sort = searchCriteria.sortBy;

      return query;
    }

    if (searchCriteria.brand) query.brand = searchCriteria.brand;
    if (searchCriteria.model) query.model = searchCriteria.model;
    if (searchCriteria.maxPrice) query.maxPrice = searchCriteria.maxPrice;
    if (searchCriteria.yearFrom) query.yearFrom = searchCriteria.yearFrom;
    if (searchCriteria.yearTo) query.yearTo = searchCriteria.yearTo;
    if (searchCriteria.fuel) query.fuel = searchCriteria.fuel;
    if (searchCriteria.gearbox) query.gearbox = searchCriteria.gearbox;
    if (searchCriteria.condition) query.condition = searchCriteria.condition;
    if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
    if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
    if (searchCriteria.mileageFrom) query.mileageFrom = searchCriteria.mileageFrom;
    if (searchCriteria.mileageTo) query.mileageTo = searchCriteria.mileageTo;
    if (searchCriteria.engineFrom) query.engineFrom = searchCriteria.engineFrom;
    if (searchCriteria.engineTo) query.engineTo = searchCriteria.engineTo;
    if (searchCriteria.motoDisplacementFrom) query.displacementFrom = searchCriteria.motoDisplacementFrom;
    if (searchCriteria.motoDisplacementTo) query.displacementTo = searchCriteria.motoDisplacementTo;
    if (searchCriteria.heavyEuroStandard) query.euroStandard = searchCriteria.heavyEuroStandard;
    if (searchCriteria.color) query.color = searchCriteria.color;
    if (searchCriteria.region) query.region = searchCriteria.region;
    if (searchCriteria.city) query.city = searchCriteria.city;
    if (searchCriteria.category) query.category = searchCriteria.category;
    if (searchCriteria.sortBy) query.sortBy = searchCriteria.sortBy;

    return query;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = buildSearchQuery();

    console.log("Search Query:", query);

    // Save search to recent searches
    addSearch(query);

    // Navigate to search page with query parameters
    const queryString = new URLSearchParams(query).toString();
    navigate(`/search?${queryString}`);

    // Also call onSearch for any landing page updates
    onSearch({ ...searchCriteria, mainCategory });
  };

  const handleClearFilters = () => {
    setSearchCriteria({
      category: "",
      wheelFor: "1",
      wheelOfferType: "",
      partFor: "1",
      partCategory: "",
      partElement: "",
      classifiedFor: "1",
      accessoryCategory: "",
      brand: "",
      model: "",
      maxPrice: "",
      year: "",
      yearFrom: "",
      yearTo: "",
      fuel: "",
      gearbox: "",
      engineType: "",
      transmission: "",
      agriType: "",
      agriBrand: "",
      agriDriveType: "",
      condition: "",
      sortBy: "Марка/Модел/Цена",
      isNew: false,
      isUsed: true,
      isPartial: false,
      isParts: false,
      priceFrom: "",
      priceTo: "",
      mileageFrom: "",
      mileageTo: "",
      engineFrom: "",
      engineTo: "",
      region: "",
      city: "",
      color: "",
      currency: "EUR",
      taxCreditOnly: false,
      hasPhoto: false,
      hasVideo: false,
      sellerType: "0",
      heavyAxlesFrom: "",
      heavyAxlesTo: "",
      heavySeatsFrom: "",
      heavySeatsTo: "",
      heavyLoadFrom: "",
      heavyLoadTo: "",
      heavyEuroStandard: "",
      motoCategory: "",
      motoCoolingType: "",
      motoEngineKind: "",
      motoDisplacementFrom: "",
      motoDisplacementTo: "",
      forkliftLoadFrom: "",
      forkliftLoadTo: "",
      forkliftHoursFrom: "",
      forkliftHoursTo: "",
      caravanBedsFrom: "",
      caravanBedsTo: "",
      caravanLengthFrom: "",
      caravanLengthTo: "",
      caravanHasToilet: false,
      caravanHasHeating: false,
      caravanHasAc: false,
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
      wheelTireBrand: "",
      wheelTireWidth: "",
      wheelTireHeight: "",
      wheelTireDiameter: "",
      wheelTireSeason: "",
      wheelTireSpeedIndex: "",
      wheelTireLoadIndex: "",
      wheelTireTread: "",
      boatLengthFrom: "",
      boatLengthTo: "",
      boatWidthFrom: "",
      boatWidthTo: "",
      boatDraftFrom: "",
      boatDraftTo: "",
      boatHoursFrom: "",
      boatHoursTo: "",
      boatEngineCountFrom: "",
      boatEngineCountTo: "",
      boatMaterial: "",
      trailerLoadFrom: "",
      trailerLoadTo: "",
      trailerAxlesFrom: "",
      trailerAxlesTo: "",
      buyServiceCategory: "",
      motoFeatures: [],
      features: [],
      boatFeatures: [],
      trailerFeatures: [],
    });
    setShowAdvanced(false);
  };

  const handleSaveSearch = () => {
    if (searchName.trim()) {
      const query = buildSearchQuery();

      saveSearch(searchName, query);
      setShowSaveModal(false);
      setSearchName("");
    }
  };

  const renderMainCategoryField = () => {
    if (hideMainCategoryField) return null;
    return (
      <div className="adv-field">
        <label className="adv-label">ТЪРСЕНЕ В КАТЕГОРИЯ</label>
        <select
          value={mainCategory}
          onChange={(e) => onMainCategoryChange?.(e.target.value)}
          className={`adv-select ${!onMainCategoryChange ? "adv-select--disabled" : ""}`}
          disabled={!onMainCategoryChange}
        >
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const advancedSearchCSS = `
    .adv-search-root {
      position: relative;
      background: #ffffff;
      border-radius: 16px;
      padding: 28px 24px 24px;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15,118,110,0.06);
      border: 1px solid #e2e8f0;
      width: 100%;
      max-width: 100%;
      margin: 0;
      font-family: "Manrope", "Segoe UI", sans-serif;
    }
    .adv-search-title {
      font-size: 26px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
      font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
    }
    .adv-top-content {
      margin: 0 0 10px;
      padding: 6px 6px 4px;
      border-bottom: none;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(241,250,248,0.9) 100%);
    }
    .adv-search-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .adv-search-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px 16px;
    }
    .adv-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .adv-label {
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #111111;
      text-transform: uppercase;
      padding-left: 2px;
      line-height: 1.25;
    }
    .adv-select,
    .adv-input {
      width: 100%;
      height: 42px;
      padding: 0 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f5f7fb;
      font-size: 14px;
      color: #1f2937;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      appearance: none;
      -webkit-appearance: none;
      box-sizing: border-box;
    }
    .adv-input::placeholder {
      color: #9aa3b2;
    }
    .adv-select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6' stroke='%236b7280' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }
    .adv-select:focus,
    .adv-input:focus {
      border-color: #115e59;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(15,118,110,0.2);
    }
    .adv-input[type="number"]::-webkit-outer-spin-button,
    .adv-input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .adv-input[type="number"] {
      -moz-appearance: textfield;
      appearance: textfield;
    }
    .adv-select--disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
      border-color: #e5e7eb;
    }
    .adv-lock-icon {
      position: absolute;
      right: 34px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
      pointer-events: none;
      opacity: 0.5;
    }
    .adv-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .adv-feature-groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .adv-feature-group {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      background: #f8fafc;
    }
    .adv-feature-group-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .adv-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      border-radius: 20px;
      border: 1.5px solid #d9e2f1;
      background: #ffffff;
      font-size: 13px;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .adv-chip--active {
      background: #ecfdf5;
      border-color: #0f766e;
      color: #115e59;
      font-weight: 600;
    }
    .adv-action-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 2px;
      justify-content: right;
    }
    .adv-search-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 32px;
      height: 48px;
      border: none;
      border-radius: 14px;
      background: rgb(15, 118, 110);
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(15,118,110,0.3);
      letter-spacing: 0.02em;
      
    }
    .adv-search-btn:active {
      transform: translateY(0);
    }
    .adv-detailed-link {
      display: inline-flex;
      align-items: center;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 13px;
      cursor: pointer;
      padding: 4px 0;
      transition: color 0.2s;
    }
    .adv-detailed-section {
      border-top: 1px solid #ccfbf1;
      padding-top: 18px;
      animation: advSlideDown 0.25s ease;
    }
    @keyframes advSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .adv-detailed-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px 16px;
      margin-bottom: 14px;
    }
    .adv-clear-btn {
      display: inline-flex;
      align-items: center;
      background: rgba(220, 38, 38, 0.12);
      border: 1.5px solid rgba(220, 38, 38, 0.35);
      border-radius: 10px;
      color: #b91c1c;
      font-size: 13px;
      padding: 8px 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .adv-clear-btn:hover {
      background: rgba(185, 28, 28, 0.18);
      border-color: rgba(185, 28, 28, 0.45);
      color: #991b1b;
    }
    .adv-recent-searches {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding-bottom: 2px;
    }
    .adv-recent-searches::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .adv-recent-search-label {
      font-size: 12px;
      font-weight: 600;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      flex: 0 0 auto;
    }
    .adv-recent-search-pill {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      background: #ecfdf5;
      border: 1px solid #99f6e4;
      font-size: 13px;
      color: #0f766e;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
      flex: 0 0 auto;
    }
    .adv-recent-search-pill:hover {
      background: #d1fae5;
      border-color: #5eead4;
    }
    .adv-save-btn {
      display: inline-flex;
      align-items: center;
      background: #d97706;
      border: 1.5px solid #d97706;
      border-radius: 10px;
      color: #fff;
      font-size: 13px;
      padding: 8px 20px;
      cursor: pointer;
      transition: all 0.2s;
      height: 48px;
    }
    .adv-save-btn:hover {
      background: #ea580c;
      border-color: #ea580c;
    }
    .adv-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .adv-modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .adv-modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      margin: 0 0 16px 0;
    }
    .adv-modal-input {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    .adv-modal-input:focus {
      border-color: #0f766e;
    }
    .adv-modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .adv-modal-btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .adv-modal-btn-cancel {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #6b7280;
    }
    .adv-modal-btn-cancel:hover {
      background: #e5e7eb;
    }
    .adv-modal-btn-save {
      background: #d97706;
      border: none;
      color: #fff;
    }
    .adv-modal-btn-save:hover {
      background: #ea580c;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .adv-search-root {
        padding: 20px 16px 18px;
        border-radius: 12px;
      }
      .adv-top-content {
        margin-bottom: 8px;
        padding: 5px 4px 3px;
      }
      .adv-search-grid,
      .adv-detailed-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .adv-action-row {
        flex-direction: column;
        gap: 10px;
      }
      .adv-search-btn {
        width: 100%;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .adv-search-grid,
      .adv-detailed-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  return (
    <div className="adv-search-root">
      <style>{advancedSearchCSS}</style>
      <div className="adv-search-title">Търсене</div>
      {topContent && <div className="adv-top-content">{topContent}</div>}
      <form onSubmit={handleSearch} className="adv-search-form">
        {isWheelsCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            <div className="adv-field">
              <label className="adv-label">ГУМИ И ДЖАНТИ ЗА</label>
              <select
                value={searchCriteria.wheelFor}
                onChange={(e) => {
                  handleInputChange("wheelFor", e.target.value);
                  handleInputChange("wheelOfferType", "");
                  handleInputChange("brand", "");
                  handleInputChange("model", "");
                  handleInputChange("wheelBrand", "");
                  handleInputChange("wheelMaterial", "");
                  handleInputChange("wheelBolts", "");
                  handleInputChange("wheelPcd", "");
                  handleInputChange("wheelCenterBore", "");
                  handleInputChange("wheelOffset", "");
                  handleInputChange("wheelWidth", "");
                  handleInputChange("wheelDiameter", "");
                  handleInputChange("wheelCount", "");
                  handleInputChange("wheelType", "");
                  handleInputChange("wheelTireBrand", "");
                  handleInputChange("wheelTireWidth", "");
                  handleInputChange("wheelTireHeight", "");
                  handleInputChange("wheelTireDiameter", "");
                  handleInputChange("wheelTireSeason", "");
                  handleInputChange("wheelTireSpeedIndex", "");
                  handleInputChange("wheelTireLoadIndex", "");
                  handleInputChange("wheelTireTread", "");
                }}
                className="adv-select"
              >
                {WHEEL_FOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ТЪРСЕНЕТО Е ЗА</label>
              <select
                value={searchCriteria.wheelOfferType}
                onChange={(e) => {
                  const nextOfferType = e.target.value;
                  handleInputChange("wheelOfferType", nextOfferType);
                  if (nextOfferType === "1") {
                    handleInputChange("brand", "");
                    handleInputChange("model", "");
                    handleInputChange("wheelBrand", "");
                    handleInputChange("wheelMaterial", "");
                    handleInputChange("wheelBolts", "");
                    handleInputChange("wheelPcd", "");
                    handleInputChange("wheelCenterBore", "");
                    handleInputChange("wheelOffset", "");
                    handleInputChange("wheelWidth", "");
                    handleInputChange("wheelDiameter", "");
                    handleInputChange("wheelCount", "");
                    handleInputChange("wheelType", "");
                  } else if (nextOfferType === "2") {
                    handleInputChange("wheelTireBrand", "");
                    handleInputChange("wheelTireWidth", "");
                    handleInputChange("wheelTireHeight", "");
                    handleInputChange("wheelTireDiameter", "");
                    handleInputChange("wheelTireSeason", "");
                    handleInputChange("wheelTireSpeedIndex", "");
                    handleInputChange("wheelTireLoadIndex", "");
                    handleInputChange("wheelTireTread", "");
                  }
                }}
                className="adv-select"
              >
                {wheelOfferTypeOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">МАКСИМАЛНА ЦЕНА</label>
              <input
                type="number"
                placeholder="Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : isPartsCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            <div className="adv-field">
              <label className="adv-label">ЧАСТИ ЗА</label>
              <select
                value={searchCriteria.partFor}
                onChange={(e) => handleInputChange("partFor", e.target.value)}
                className="adv-select"
              >
                {WHEEL_FOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">КАТЕГОРИЯ</label>
              <select
                value={searchCriteria.partCategory}
                onChange={(e) => {
                  handleInputChange("partCategory", e.target.value);
                  handleInputChange("partElement", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                {PART_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">МАКСИМАЛНА ЦЕНА</label>
              <input
                type="number"
                placeholder="Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">ЧАСТ</label>
              <select
                value={searchCriteria.partElement}
                onChange={(e) => handleInputChange("partElement", e.target.value)}
                className="adv-select"
              >
                {PART_ELEMENT_OPTIONS.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option || "Всички"}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : isHeavyCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            <div className="adv-field">
              <label className="adv-label">МАРКА</label>
              <BrandSelector
                value={searchCriteria.brand}
                onChange={(brand) => {
                  handleInputChange("brand", brand);
                  handleInputChange("model", "");
                }}
                brands={sortedAvailableBrands}
                placeholder="Всички"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">МОДЕЛ</label>
              <div style={{ position: "relative" }}>
                <select
                  value={searchCriteria.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                  disabled={!searchCriteria.brand}
                >
                  <option value="">{searchCriteria.brand ? "Всички" : "Избери марка първо"}</option>
                  {groupedAvailableModels.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {!searchCriteria.brand && (
                  <span className="adv-lock-icon" title="Избери марка първо"><Lock size={14} /></span>
                )}
              </div>
            </div>

            {isMotoCategory && (
              <div className="adv-field">
                <label className="adv-label">КАТЕГОРИЯ</label>
                <select
                  value={searchCriteria.motoCategory}
                  onChange={(e) => handleInputChange("motoCategory", e.target.value)}
                  className="adv-select"
                >
                  <option value="">Всички категории</option>
                  {MOTO_CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">МАКСИМАЛНА ЦЕНА</label>
              <input
                type="number"
                placeholder="Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">ГОДИНА</label>
              <select
                value={searchCriteria.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={String(year)}>
                    след {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ДВИГАТЕЛ</label>
              <select
                value={searchCriteria.engineType}
                onChange={(e) => handleInputChange("engineType", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {ENGINE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">СКОРОСТНА КУТИЯ</label>
              <select
                value={searchCriteria.transmission}
                onChange={(e) => handleInputChange("transmission", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {TRANSMISSION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : isEquipmentCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            {equipmentTypeOptions.length > 0 && (
              <div className="adv-field">
                <label className="adv-label">
                  {isCategoryBasedBrandModel ? "КАТЕГОРИЯ" : isIndustrialCategory ? "ВИД ТЕХНИКА" : "КАТЕГОРИЯ"}
                </label>
                <select
                  value={searchCriteria.agriType}
                  onChange={(e) => {
                    handleInputChange("agriType", e.target.value);
                    if (isCategoryBasedBrandModel) {
                      handleInputChange("brand", "");
                      handleInputChange("model", "");
                    }
                  }}
                  className="adv-select"
                >
                  <option value="">Всички</option>
                  {equipmentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isCategoryBasedBrandModel ? (
              <div className="adv-field">
                <label className="adv-label">МАРКА</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={searchCriteria.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    className={`adv-select ${!searchCriteria.agriType ? "adv-select--disabled" : ""}`}
                    disabled={!searchCriteria.agriType}
                  >
                    <option value="">
                      {searchCriteria.agriType ? "Всички" : "Избери категория първо"}
                    </option>
                    {groupedAvailableModels.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {!searchCriteria.agriType && (
                    <span className="adv-lock-icon" title="Избери категория първо">
                      <Lock size={14} />
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="adv-field">
                  <label className="adv-label">МАРКА</label>
                  <BrandSelector
                    value={searchCriteria.brand}
                    onChange={(brand) => {
                      handleInputChange("brand", brand);
                      handleInputChange("model", "");
                    }}
                    brands={sortedAvailableBrands}
                    placeholder="Всички"
                  />
                </div>

                <div className="adv-field">
                  <label className="adv-label">МОДЕЛ</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={searchCriteria.model}
                      onChange={(e) => handleInputChange("model", e.target.value)}
                      className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                      disabled={!searchCriteria.brand}
                    >
                      <option value="">{searchCriteria.brand ? "Всички" : "Избери марка първо"}</option>
                      {groupedAvailableModels.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {!searchCriteria.brand && (
                      <span className="adv-lock-icon" title="Избери марка първо">
                        <Lock size={14} />
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">МАКСИМАЛНА ЦЕНА</label>
              <input
                type="number"
                placeholder="Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">ГОДИНА</label>
              <select
                value={searchCriteria.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={String(year)}>
                    след {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : isAccessoriesCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            <div className="adv-field">
              <label className="adv-label">АКСЕСОАРИ ЗА</label>
              <select
                value={searchCriteria.classifiedFor}
                onChange={(e) => handleInputChange("classifiedFor", e.target.value)}
                className="adv-select"
              >
                {CATEGORY_FOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">КАТЕГОРИЯ</label>
              <select
                value={searchCriteria.accessoryCategory}
                onChange={(e) => handleInputChange("accessoryCategory", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {ACCESSORY_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">МАКСИМАЛНА ЦЕНА</label>
              <input
                type="number"
                placeholder="Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : isBuyOrServicesCategory ? (
          <div className="adv-search-grid">
            {renderMainCategoryField()}

            <div className="adv-field">
              <label className="adv-label">{isBuyCategory ? "КУПУВА ЗА" : "УСЛУГИ ЗА"}</label>
              <select
                value={searchCriteria.classifiedFor}
                onChange={(e) => handleInputChange("classifiedFor", e.target.value)}
                className="adv-select"
              >
                {CATEGORY_FOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">НАМИРА СЕ В</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => {
                  handleInputChange("region", e.target.value);
                  handleInputChange("city", "");
                }}
                className="adv-select"
              >
                <option value="">Всички</option>
                <option value="България">България</option>
                <option value="Извън страната">Извън страната</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    обл. {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ГРАД / ОБЩИНА</label>
              <select
                value={searchCriteria.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`adv-select ${cities.length === 0 ? "adv-select--disabled" : ""}`}
                disabled={cities.length === 0}
              >
                <option value="">
                  {cities.length > 0 ? "Всички" : "Избери област първо"}
                </option>
                {cities.map((cityOption) => (
                  <option key={cityOption.value} value={cityOption.value}>
                    {cityOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">КАТЕГОРИЯ</label>
              <select
                value={searchCriteria.buyServiceCategory}
                onChange={(e) => handleInputChange("buyServiceCategory", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {(isBuyCategory ? BUY_CATEGORY_OPTIONS : SERVICES_CATEGORY_OPTIONS).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ РЕЗУЛТАТИТЕ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                {DEFAULT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="adv-search-grid">
            {/* Make */}
            <div className="adv-field">
              <label className="adv-label">МАРКА</label>
              <BrandSelector
                value={searchCriteria.brand}
                onChange={(brand) => {
                  handleInputChange("brand", brand);
                  handleInputChange("model", "");
                }}
                brands={sortedAvailableBrands}
                placeholder="Всички марки"
              />
            </div>

            {/* Model — locked until Make is selected */}
            <div className="adv-field">
              <label className="adv-label">МОДЕЛ</label>
              <div style={{ position: "relative" }}>
                <select
                  value={searchCriteria.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                  disabled={!searchCriteria.brand}
                >
                  <option value="">{searchCriteria.brand ? "Всички модели" : "Избери марка първо"}</option>
                  {groupedAvailableModels.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {!searchCriteria.brand && (
                  <span className="adv-lock-icon" title="Избери марка първо"><Lock size={14} /></span>
                )}
              </div>
            </div>

            {/* Body Type */}
            <div className="adv-field">
              <label className="adv-label">ТИП</label>
              <select
                value={searchCriteria.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички типове</option>
                <option value="Седан">Седан</option>
                <option value="Хечбек">Хечбек</option>
                <option value="Комби">Комби</option>
                <option value="Купе">Купе</option>
                <option value="Кабрио">Кабрио</option>
                <option value="Джип">Джип / SUV</option>
                <option value="Ван">Ван</option>
                <option value="Миниван">Миниван</option>
                <option value="Пикап">Пикап</option>
              </select>
            </div>

            {/* Max Price */}
            <div className="adv-field">
              <label className="adv-label">МАКС. ЦЕНА</label>
              <input
                type="number"
                placeholder="€ Без ограничение"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="adv-input"
              />
            </div>

            {/* Year From */}
            <div className="adv-field">
              <label className="adv-label">ГОДИНА ОТ</label>
              <select
                value={searchCriteria.yearFrom}
                onChange={(e) => handleInputChange("yearFrom", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички години</option>
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div className="adv-field">
              <label className="adv-label">РЕГИОН</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                className="adv-select"
              >
                <option value="">Цяла България</option>
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Fuel */}
            <div className="adv-field">
              <label className="adv-label">ГОРИВО</label>
              <select
                value={searchCriteria.fuel}
                onChange={(e) => handleInputChange("fuel", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {FUEL_OPTIONS.map((fuel) => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
            </div>

            {/* Gearbox */}
            <div className="adv-field">
              <label className="adv-label">СКОРОСТИ</label>
              <select
                value={searchCriteria.gearbox}
                onChange={(e) => handleInputChange("gearbox", e.target.value)}
                className="adv-select"
              >
                <option value="">Всички</option>
                {GEARBOX_OPTIONS.map((gb) => (
                  <option key={gb} value={gb}>{gb}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="adv-field">
              <label className="adv-label">ПОДРЕДИ ПО</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="adv-select"
              >
                <option value="Марка/Модел/Цена">Марка / Модел / Цена</option>
                <option value="price-asc">Цена ↑</option>
                <option value="price-desc">Цена ↓</option>
                <option value="year-desc">Най-нови</option>
                <option value="year-asc">Най-стари</option>
              </select>
            </div>
          </div>
        )}

        {/* CONDITION CHIPS */}
        {hasConditionCheckboxes && (
          <div className="adv-chips-row">
            {(usesVehicleForSelect
              ? [
                  { key: "isNew" as const, label: "Нов" },
                  { key: "isUsed" as const, label: "Употребяван" },
                  { key: "isPartial" as const, label: "Повреден/ударен" },
                ]
              : [
                  { key: "isUsed" as const, label: "Употребяван" },
                  { key: "isNew" as const, label: "Нов" },
                  { key: "isPartial" as const, label: "Повреден / ударен" },
                  { key: "isParts" as const, label: "За части" },
                ]).map(({ key, label }) => (
              <label
                key={key}
                className={`adv-chip ${searchCriteria[key] ? "adv-chip--active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={searchCriteria[key] as boolean}
                  onChange={(e) => handleInputChange(key, e.target.checked ? "true" : "false")}
                  style={{ display: "none" }}
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {/* ACTION ROW — Search button + Detailed Search link */}
        <div className="adv-action-row">
          <button
            type="button"
            className="adv-detailed-link"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <ChevronDown
              size={14}
              style={{
                transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
                marginRight: 4,
              }}
            />
            {usesCompactMainCategoryForm ? "Още критерии за търсене" : "Детайлно търсене"}
          </button>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="adv-save-btn"
              onClick={() => setShowSaveModal(true)}
            >
              <Bookmark size={16} style={{ marginRight: 6 }} />
              Запази търсене
            </button>

            <button type="submit" className="adv-search-btn">
              <Search size={18} style={{ marginRight: 8 }} />
              Търси обяви
            </button>
          </div>

        </div>

        {/* RECENT SEARCHES */}
        {recentSearches.length > 0 && (
          <div className="adv-recent-searches">
            <div className="adv-recent-search-label">Последни търсения:</div>
            {recentSearches.map((search) => (
              <button
                key={search.id}
                type="button"
                className="adv-recent-search-pill"
                onClick={(e) => {
                  e.preventDefault();
                  const queryString = new URLSearchParams(search.criteria).toString();
                  navigate(`/search?${queryString}`);
                }}
                title={search.displayLabel}
              >
                {search.displayLabel}
              </button>
            ))}
          </div>
        )}

        {/* ADVANCED / DETAILED FILTERS */}
        {showAdvanced && (
          <div className="adv-detailed-section">
            <div className="adv-detailed-grid">
              {usesCompactMainCategoryForm && hasConditionCheckboxes ? (
                <>
                  <div className="adv-field">
                    <label className="adv-label">ЦЕНА ОТ</label>
                    <input type="number" placeholder="Мин." value={searchCriteria.priceFrom} onChange={(e) => handleInputChange("priceFrom", e.target.value)} className="adv-input" />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">ЦЕНА ДО</label>
                    <input type="number" placeholder="Макс." value={searchCriteria.priceTo} onChange={(e) => handleInputChange("priceTo", e.target.value)} className="adv-input" />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">ВАЛУТА</label>
                    <select
                      value={searchCriteria.currency}
                      onChange={(e) => handleInputChange("currency", e.target.value)}
                      className="adv-select"
                    >
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">СЪСТОЯНИЕ</label>
                    <select value={searchCriteria.condition} onChange={(e) => handleInputChange("condition", e.target.value)} className="adv-select">
                      <option value="">Всички</option>
                      <option value="Нов">Нов</option>
                      <option value="Употребяван">Употребяван</option>
                      <option value="Повреден/ударен">Повреден/ударен</option>
                      {!usesVehicleForSelect && <option value="За части">За части</option>}
                    </select>
                  </div>
                  {(isPartsCategory || isHeavyCategory || isEquipmentCategory || isAccessoriesCategory) && (
                    <div className="adv-field">
                      <label className="adv-label">ЦЕНА</label>
                      <label style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={searchCriteria.taxCreditOnly}
                          onChange={(e) => handleInputChange("taxCreditOnly", e.target.checked ? "true" : "false")}
                        />
                        Само с възможност за данъчен кредит
                      </label>
                    </div>
                  )}
                  <div className="adv-field">
                    <label className="adv-label">САМО СЪС СНИМКА</label>
                    <label style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={searchCriteria.hasPhoto}
                        onChange={(e) => handleInputChange("hasPhoto", e.target.checked ? "true" : "false")}
                      />
                      Да
                    </label>
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">САМО С ВИДЕО/VR360</label>
                    <label style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={searchCriteria.hasVideo}
                        onChange={(e) => handleInputChange("hasVideo", e.target.checked ? "true" : "false")}
                      />
                      Да
                    </label>
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">ТИП ОБЯВИ</label>
                    <select
                      value={searchCriteria.sellerType}
                      onChange={(e) => handleInputChange("sellerType", e.target.value)}
                      className="adv-select"
                    >
                      {SELLER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isWheelsCategory && (
                    <>
                      {showsWheelTireFilters && (
                        <>
                          <div className="adv-field" style={{ gridColumn: "1 / -1", borderBottom: "1px solid #bbf7d0", paddingBottom: 6 }}>
                            <label className="adv-label" style={{ color: "#16a34a", fontWeight: 800 }}>ИНФОРМАЦИЯ ЗА ГУМИ</label>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МАРКА ГУМИ</label>
                            <select
                              value={searchCriteria.wheelTireBrand}
                              onChange={(e) => handleInputChange("wheelTireBrand", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {searchCriteria.wheelTireBrand &&
                                !WHEEL_TIRE_BRAND_OPTIONS.includes(searchCriteria.wheelTireBrand) && (
                                  <option value={searchCriteria.wheelTireBrand}>{searchCriteria.wheelTireBrand}</option>
                                )}
                              {WHEEL_TIRE_BRAND_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ШИРИНА В ММ</label>
                            <select
                              value={searchCriteria.wheelTireWidth}
                              onChange={(e) => handleInputChange("wheelTireWidth", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TIRE_WIDTH_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ВИСОЧИНА</label>
                            <select
                              value={searchCriteria.wheelTireHeight}
                              onChange={(e) => handleInputChange("wheelTireHeight", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TIRE_HEIGHT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ДИАМЕТЪР В ИНЧА</label>
                            <select
                              value={searchCriteria.wheelTireDiameter}
                              onChange={(e) => handleInputChange("wheelTireDiameter", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_DIAMETER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">СЕЗОННОСТ</label>
                            <select
                              value={searchCriteria.wheelTireSeason}
                              onChange={(e) => handleInputChange("wheelTireSeason", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TIRE_SEASON_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">СКОРОСТЕН ИНДЕКС</label>
                            <select
                              value={searchCriteria.wheelTireSpeedIndex}
                              onChange={(e) => handleInputChange("wheelTireSpeedIndex", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TIRE_SPEED_INDEX_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ТЕГЛОВЕН ИНДЕКС</label>
                            <input
                              type="text"
                              placeholder="Напр. 91"
                              value={searchCriteria.wheelTireLoadIndex}
                              onChange={(e) => handleInputChange("wheelTireLoadIndex", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">РЕЛЕФ</label>
                            <select
                              value={searchCriteria.wheelTireTread}
                              onChange={(e) => handleInputChange("wheelTireTread", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TIRE_TREAD_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {showsWheelRimFilters && (
                        <>
                          <div className="adv-field" style={{ gridColumn: "1 / -1", borderBottom: "1px solid #bbf7d0", paddingBottom: 6 }}>
                            <label className="adv-label" style={{ color: "#16a34a", fontWeight: 800 }}>ИНФОРМАЦИЯ ЗА ДЖАНТИ</label>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МАРКА (АВТОМОБИЛ)</label>
                            <BrandSelector
                              value={searchCriteria.brand}
                              onChange={(brand) => {
                                handleInputChange("brand", brand);
                                handleInputChange("model", "");
                              }}
                              brands={sortedAvailableBrands}
                              placeholder="Всички"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МОДЕЛ (АВТОМОБИЛ)</label>
                            <div style={{ position: "relative" }}>
                              <select
                                value={searchCriteria.model}
                                onChange={(e) => handleInputChange("model", e.target.value)}
                                className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                                disabled={!searchCriteria.brand}
                              >
                                <option value="">{searchCriteria.brand ? "Всички" : "Избери марка първо"}</option>
                                {groupedAvailableModels.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((model) => (
                                      <option key={model} value={model}>
                                        {model}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              {!searchCriteria.brand && (
                                <span className="adv-lock-icon" title="Избери марка първо">
                                  <Lock size={14} />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МАРКА ДЖАНТИ</label>
                            <input
                              type="text"
                              placeholder="Напр. BBS, OZ, AMG"
                              value={searchCriteria.wheelBrand}
                              onChange={(e) => handleInputChange("wheelBrand", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МАТЕРИАЛ</label>
                            <select
                              value={searchCriteria.wheelMaterial}
                              onChange={(e) => handleInputChange("wheelMaterial", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_MATERIAL_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">БОЛТОВЕ</label>
                            <select
                              value={searchCriteria.wheelBolts}
                              onChange={(e) => {
                                handleInputChange("wheelBolts", e.target.value);
                                handleInputChange("wheelPcd", "");
                              }}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_BOLT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МЕЖДУБОЛТОВО РАЗСТОЯНИЕ</label>
                            <select
                              value={searchCriteria.wheelPcd}
                              onChange={(e) => handleInputChange("wheelPcd", e.target.value)}
                              className={`adv-select ${!searchCriteria.wheelBolts ? "adv-select--disabled" : ""}`}
                              disabled={!searchCriteria.wheelBolts}
                            >
                              <option value="">
                                {searchCriteria.wheelBolts ? "Избери" : "Избери болтове първо"}
                              </option>
                              {wheelPcdOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ЦЕНТРАЛЕН ОТВОР</label>
                            <input
                              type="text"
                              placeholder="Напр. 66.6"
                              value={searchCriteria.wheelCenterBore}
                              onChange={(e) => handleInputChange("wheelCenterBore", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ОФСЕТ /ET/</label>
                            <select
                              value={searchCriteria.wheelOffset}
                              onChange={(e) => handleInputChange("wheelOffset", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_OFFSET_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ШИРИНА [Jx]</label>
                            <select
                              value={searchCriteria.wheelWidth}
                              onChange={(e) => handleInputChange("wheelWidth", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_WIDTH_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ДИАМЕТЪР [ИНЧА]</label>
                            <select
                              value={searchCriteria.wheelDiameter}
                              onChange={(e) => handleInputChange("wheelDiameter", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_DIAMETER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">БРОЙ ДЖАНТИ</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              placeholder="Напр. 4"
                              value={searchCriteria.wheelCount}
                              onChange={(e) => handleInputChange("wheelCount", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ВИД</label>
                            <select
                              value={searchCriteria.wheelType}
                              onChange={(e) => handleInputChange("wheelType", e.target.value)}
                              className="adv-select"
                            >
                              <option value="">Всички</option>
                              {WHEEL_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {isPartsCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">МАРКА</label>
                        <BrandSelector
                          value={searchCriteria.brand}
                          onChange={(brand) => {
                            handleInputChange("brand", brand);
                            handleInputChange("model", "");
                          }}
                          brands={sortedAvailableBrands}
                          placeholder="Всички"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОДЕЛ</label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={searchCriteria.model}
                            onChange={(e) => handleInputChange("model", e.target.value)}
                            className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                            disabled={!searchCriteria.brand}
                          >
                            <option value="">{searchCriteria.brand ? "Всички" : "Избери марка първо"}</option>
                            {groupedAvailableModels.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((model) => (
                                  <option key={model} value={model}>
                                    {model}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {!searchCriteria.brand && (
                            <span className="adv-lock-icon" title="Избери марка първо">
                              <Lock size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ГОДИНА ОТ</label>
                        <select
                          value={searchCriteria.yearFrom}
                          onChange={(e) => handleInputChange("yearFrom", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              от {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ГОДИНА ДО</label>
                        <select
                          value={searchCriteria.yearTo}
                          onChange={(e) => handleInputChange("yearTo", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              до {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {(isHeavyCategory || isEquipmentCategory) && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">ГОДИНА ОТ</label>
                        <select
                          value={searchCriteria.yearFrom}
                          onChange={(e) => handleInputChange("yearFrom", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              от {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ГОДИНА ДО</label>
                        <select
                          value={searchCriteria.yearTo}
                          onChange={(e) => handleInputChange("yearTo", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              до {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {(isBusesCategory || isTrucksCategory) && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ОСИ ОТ</label>
                        <select
                          value={searchCriteria.heavyAxlesFrom}
                          onChange={(e) => handleInputChange("heavyAxlesFrom", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {AXLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ОСИ ДО</label>
                        <select
                          value={searchCriteria.heavyAxlesTo}
                          onChange={(e) => handleInputChange("heavyAxlesTo", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {AXLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ МЕСТА ОТ</label>
                        <input
                          type="number"
                          min="1"
                          value={searchCriteria.heavySeatsFrom}
                          onChange={(e) => handleInputChange("heavySeatsFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ МЕСТА ДО</label>
                        <input
                          type="number"
                          min="1"
                          value={searchCriteria.heavySeatsTo}
                          onChange={(e) => handleInputChange("heavySeatsTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОНОСИМОСТ ОТ [КГ]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.heavyLoadFrom}
                          onChange={(e) => handleInputChange("heavyLoadFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОНОСИМОСТ ДО [КГ]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.heavyLoadTo}
                          onChange={(e) => handleInputChange("heavyLoadTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ОТ [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineFrom}
                          onChange={(e) => handleInputChange("engineFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ДО [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineTo}
                          onChange={(e) => handleInputChange("engineTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЕВРОСТАНДАРТ</label>
                        <select
                          value={searchCriteria.heavyEuroStandard}
                          onChange={(e) => handleInputChange("heavyEuroStandard", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {EURO_STANDARD_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ВИД ДВИГАТЕЛ</label>
                        <select
                          value={searchCriteria.engineType}
                          onChange={(e) => handleInputChange("engineType", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {ENGINE_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {isAgroCategory && (
                    <>
                      {agriFieldVisibility.showEngineType && (
                        <div className="adv-field">
                          <label className="adv-label">ВИД ДВИГАТЕЛ</label>
                          <select
                            value={searchCriteria.engineType}
                            onChange={(e) => handleInputChange("engineType", e.target.value)}
                            className="adv-select"
                          >
                            <option value="">Всички</option>
                            {ENGINE_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {agriFieldVisibility.showPower && (
                        <>
                          <div className="adv-field">
                            <label className="adv-label">МОЩНОСТ ОТ [К.С.]</label>
                            <input
                              type="number"
                              min="0"
                              value={searchCriteria.engineFrom}
                              onChange={(e) => handleInputChange("engineFrom", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">МОЩНОСТ ДО [К.С.]</label>
                            <input
                              type="number"
                              min="0"
                              value={searchCriteria.engineTo}
                              onChange={(e) => handleInputChange("engineTo", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                        </>
                      )}
                      {agriFieldVisibility.showTransmission && (
                        <div className="adv-field">
                          <label className="adv-label">СКОРОСТНА КУТИЯ</label>
                          <select
                            value={searchCriteria.transmission}
                            onChange={(e) => handleInputChange("transmission", e.target.value)}
                            className="adv-select"
                          >
                            <option value="">Всички</option>
                            {TRANSMISSION_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {agriFieldVisibility.showDriveType && (
                        <div className="adv-field">
                          <label className="adv-label">ЗАДВИЖВАНЕ</label>
                          <select
                            value={searchCriteria.agriDriveType}
                            onChange={(e) => handleInputChange("agriDriveType", e.target.value)}
                            className="adv-select"
                          >
                            <option value="">Всички</option>
                            {AGRI_DRIVE_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {agriFieldVisibility.showHours && (
                        <>
                          <div className="adv-field">
                            <label className="adv-label">ЧАСОВЕ РАБОТА ОТ</label>
                            <input
                              type="number"
                              min="0"
                              value={searchCriteria.forkliftHoursFrom}
                              onChange={(e) => handleInputChange("forkliftHoursFrom", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                          <div className="adv-field">
                            <label className="adv-label">ЧАСОВЕ РАБОТА ДО</label>
                            <input
                              type="number"
                              min="0"
                              value={searchCriteria.forkliftHoursTo}
                              onChange={(e) => handleInputChange("forkliftHoursTo", e.target.value)}
                              className="adv-input"
                            />
                          </div>
                        </>
                      )}
                      {agriFieldVisibility.showEuroStandard && (
                        <div className="adv-field">
                          <label className="adv-label">ЕВРОСТАНДАРТ</label>
                          <select
                            value={searchCriteria.heavyEuroStandard}
                            onChange={(e) => handleInputChange("heavyEuroStandard", e.target.value)}
                            className="adv-select"
                          >
                            <option value="">Всички</option>
                            {EURO_STANDARD_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {isIndustrialCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ОТ [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineFrom}
                          onChange={(e) => handleInputChange("engineFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ДО [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineTo}
                          onChange={(e) => handleInputChange("engineTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {isMotoCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">КУБАТУРА ОТ [КУБ.СМ.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.motoDisplacementFrom}
                          onChange={(e) => handleInputChange("motoDisplacementFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">КУБАТУРА ДО [КУБ.СМ.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.motoDisplacementTo}
                          onChange={(e) => handleInputChange("motoDisplacementTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ОТ [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineFrom}
                          onChange={(e) => handleInputChange("engineFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МОЩНОСТ ДО [К.С.]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.engineTo}
                          onChange={(e) => handleInputChange("engineTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ВИД ОХЛАЖДАНЕ</label>
                        <select
                          value={searchCriteria.motoCoolingType}
                          onChange={(e) => handleInputChange("motoCoolingType", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {MOTO_COOLING_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ВИД ДВИГАТЕЛ</label>
                        <select
                          value={searchCriteria.motoEngineKind}
                          onChange={(e) => handleInputChange("motoEngineKind", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {MOTO_ENGINE_KIND_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {isForkliftCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">ВИД ДВИГАТЕЛ</label>
                        <select
                          value={searchCriteria.engineType}
                          onChange={(e) => handleInputChange("engineType", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {ENGINE_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОПОДЕМНОСТ ОТ [КГ]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.forkliftLoadFrom}
                          onChange={(e) => handleInputChange("forkliftLoadFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОПОДЕМНОСТ ДО [КГ]</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.forkliftLoadTo}
                          onChange={(e) => handleInputChange("forkliftLoadTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЧАСОВЕ РАБОТА ОТ</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.forkliftHoursFrom}
                          onChange={(e) => handleInputChange("forkliftHoursFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЧАСОВЕ РАБОТА ДО</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.forkliftHoursTo}
                          onChange={(e) => handleInputChange("forkliftHoursTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                    </>
                  )}

                  {isCaravanCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ СПАЛНИ МЕСТА ОТ</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.caravanBedsFrom}
                          onChange={(e) => handleInputChange("caravanBedsFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ СПАЛНИ МЕСТА ДО</label>
                        <input
                          type="number"
                          min="0"
                          value={searchCriteria.caravanBedsTo}
                          onChange={(e) => handleInputChange("caravanBedsTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ДЪЛЖИНА ОТ [M]</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={searchCriteria.caravanLengthFrom}
                          onChange={(e) => handleInputChange("caravanLengthFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ДЪЛЖИНА ДО [M]</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={searchCriteria.caravanLengthTo}
                          onChange={(e) => handleInputChange("caravanLengthTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ОБОРУДВАНЕ</label>
                        <div className="adv-chips-row">
                          <label className={`adv-chip ${searchCriteria.caravanHasToilet ? "adv-chip--active" : ""}`}>
                            <input
                              type="checkbox"
                              checked={searchCriteria.caravanHasToilet}
                              onChange={(e) => handleInputChange("caravanHasToilet", e.target.checked ? "true" : "false")}
                              style={{ display: "none" }}
                            />
                            Тоалетна
                          </label>
                          <label className={`adv-chip ${searchCriteria.caravanHasHeating ? "adv-chip--active" : ""}`}>
                            <input
                              type="checkbox"
                              checked={searchCriteria.caravanHasHeating}
                              onChange={(e) => handleInputChange("caravanHasHeating", e.target.checked ? "true" : "false")}
                              style={{ display: "none" }}
                            />
                            Отопление
                          </label>
                          <label className={`adv-chip ${searchCriteria.caravanHasAc ? "adv-chip--active" : ""}`}>
                            <input
                              type="checkbox"
                              checked={searchCriteria.caravanHasAc}
                              onChange={(e) => handleInputChange("caravanHasAc", e.target.checked ? "true" : "false")}
                              style={{ display: "none" }}
                            />
                            Климатик
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {isBoatsCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ДЪЛЖИНА ОТ [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatLengthFrom}
                          onChange={(e) => handleInputChange("boatLengthFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ДЪЛЖИНА ДО [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatLengthTo}
                          onChange={(e) => handleInputChange("boatLengthTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ШИРИНА ОТ [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatWidthFrom}
                          onChange={(e) => handleInputChange("boatWidthFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ШИРИНА ДО [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatWidthTo}
                          onChange={(e) => handleInputChange("boatWidthTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ГАЗЕНЕ ОТ [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatDraftFrom}
                          onChange={(e) => handleInputChange("boatDraftFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ГАЗЕНЕ ДО [М]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={searchCriteria.boatDraftTo}
                          onChange={(e) => handleInputChange("boatDraftTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЧАСОВЕ РАБОТА ОТ</label>
                        <input
                          type="number"
                          value={searchCriteria.boatHoursFrom}
                          onChange={(e) => handleInputChange("boatHoursFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ЧАСОВЕ РАБОТА ДО</label>
                        <input
                          type="number"
                          value={searchCriteria.boatHoursTo}
                          onChange={(e) => handleInputChange("boatHoursTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ДВИГАТЕЛ</label>
                        <select
                          value={searchCriteria.engineType}
                          onChange={(e) => handleInputChange("engineType", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {BOAT_ENGINE_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ДВИГАТЕЛИ ОТ</label>
                        <select
                          value={searchCriteria.boatEngineCountFrom}
                          onChange={(e) => handleInputChange("boatEngineCountFrom", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {["1", "2", "3", "4"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ДВИГАТЕЛИ ДО</label>
                        <select
                          value={searchCriteria.boatEngineCountTo}
                          onChange={(e) => handleInputChange("boatEngineCountTo", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {["1", "2", "3", "4"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">МАТЕРИАЛ</label>
                        <select
                          value={searchCriteria.boatMaterial}
                          onChange={(e) => handleInputChange("boatMaterial", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {BOAT_MATERIAL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {isTrailersCategory && (
                    <>
                      <div className="adv-field">
                        <label className="adv-label">ЦВЯТ</label>
                        <select
                          value={searchCriteria.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Всички</option>
                          {COLOR_OPTIONS.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОНОСИМОСТ ОТ [КГ]</label>
                        <input
                          type="number"
                          value={searchCriteria.trailerLoadFrom}
                          onChange={(e) => handleInputChange("trailerLoadFrom", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">ТОВАРОНОСИМОСТ ДО [КГ]</label>
                        <input
                          type="number"
                          value={searchCriteria.trailerLoadTo}
                          onChange={(e) => handleInputChange("trailerLoadTo", e.target.value)}
                          className="adv-input"
                        />
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ОСИ ОТ</label>
                        <select
                          value={searchCriteria.trailerAxlesFrom}
                          onChange={(e) => handleInputChange("trailerAxlesFrom", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {["1", "2", "3", "4", "5", "6", "7", "8"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="adv-field">
                        <label className="adv-label">БРОЙ ОСИ ДО</label>
                        <select
                          value={searchCriteria.trailerAxlesTo}
                          onChange={(e) => handleInputChange("trailerAxlesTo", e.target.value)}
                          className="adv-select"
                        >
                          <option value="">Без значение</option>
                          {["1", "2", "3", "4", "5", "6", "7", "8"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </>
              ) : isBuyOrServicesCategory ? (
                <></>
              ) : (
                <>
                  {/* Price Range */}
                  <div className="adv-field">
                    <label className="adv-label">ЦЕНА ОТ (€)</label>
                    <input type="number" placeholder="Мин." value={searchCriteria.priceFrom} onChange={(e) => handleInputChange("priceFrom", e.target.value)} className="adv-input" />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">ЦЕНА ДО (€)</label>
                    <input type="number" placeholder="Макс." value={searchCriteria.priceTo} onChange={(e) => handleInputChange("priceTo", e.target.value)} className="adv-input" />
                  </div>

                  {/* Mileage Range */}
                  <div className="adv-field">
                    <label className="adv-label">ПРОБЕГ ОТ (КМ)</label>
                    <input type="number" placeholder="Мин." value={searchCriteria.mileageFrom} onChange={(e) => handleInputChange("mileageFrom", e.target.value)} className="adv-input" />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">ПРОБЕГ ДО (КМ)</label>
                    <input type="number" placeholder="Макс." value={searchCriteria.mileageTo} onChange={(e) => handleInputChange("mileageTo", e.target.value)} className="adv-input" />
                  </div>

                  {/* Power Range */}
                  <div className="adv-field">
                    <label className="adv-label">МОЩНОСТ ОТ (К.С.)</label>
                    <input type="number" placeholder="Мин." value={searchCriteria.engineFrom} onChange={(e) => handleInputChange("engineFrom", e.target.value)} className="adv-input" />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">МОЩНОСТ ДО (К.С.)</label>
                    <input type="number" placeholder="Макс." value={searchCriteria.engineTo} onChange={(e) => handleInputChange("engineTo", e.target.value)} className="adv-input" />
                  </div>

                  <div className="adv-field">
                    <label className="adv-label">КУБАТУРА ОТ (КУБ.СМ.)</label>
                    <input
                      type="number"
                      placeholder="Мин."
                      value={searchCriteria.motoDisplacementFrom}
                      onChange={(e) => handleInputChange("motoDisplacementFrom", e.target.value)}
                      className="adv-input"
                    />
                  </div>
                  <div className="adv-field">
                    <label className="adv-label">КУБАТУРА ДО (КУБ.СМ.)</label>
                    <input
                      type="number"
                      placeholder="Макс."
                      value={searchCriteria.motoDisplacementTo}
                      onChange={(e) => handleInputChange("motoDisplacementTo", e.target.value)}
                      className="adv-input"
                    />
                  </div>

                  <div className="adv-field">
                    <label className="adv-label">ЕВРОСТАНДАРТ</label>
                    <select
                      value={searchCriteria.heavyEuroStandard}
                      onChange={(e) => handleInputChange("heavyEuroStandard", e.target.value)}
                      className="adv-select"
                    >
                      <option value="">Всички</option>
                      {EURO_STANDARD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year To */}
                  <div className="adv-field">
                    <label className="adv-label">ГОДИНА ДО</label>
                    <select value={searchCriteria.yearTo} onChange={(e) => handleInputChange("yearTo", e.target.value)} className="adv-select">
                      <option value="">Без ограничение</option>
                      {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Color */}
                  <div className="adv-field">
                    <label className="adv-label">ЦВЯТ</label>
                    <select value={searchCriteria.color} onChange={(e) => handleInputChange("color", e.target.value)} className="adv-select">
                      <option value="">Всички</option>
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition */}
                  <div className="adv-field">
                    <label className="adv-label">СЪСТОЯНИЕ</label>
                    <select value={searchCriteria.condition} onChange={(e) => handleInputChange("condition", e.target.value)} className="adv-select">
                      <option value="">Всички</option>
                      <option value="Нов">Нов</option>
                      <option value="Употребяван">Употребяван</option>
                      <option value="Повреден/ударен">Повреден / ударен</option>
                      <option value="За части">За части</option>
                    </select>
                  </div>

                </>
              )}
            </div>

            <button type="button" onClick={handleClearFilters} className="adv-clear-btn">
              Изчисти всички филтри
            </button>
          </div>
        )}
      </form>

      {/* SAVE SEARCH MODAL */}
      {showSaveModal && (
        <div className="adv-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="adv-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="adv-modal-title">Запази търсене</h3>
            <input
              type="text"
              className="adv-modal-input"
              placeholder="Име на търсенето (напр. BMW 320 София)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSearch();
              }}
              autoFocus
            />
            <div className="adv-modal-actions">
              <button
                className="adv-modal-btn adv-modal-btn-cancel"
                onClick={() => {
                  setShowSaveModal(false);
                  setSearchName("");
                }}
              >
                Отказ
              </button>
              <button
                className="adv-modal-btn adv-modal-btn-save"
                onClick={handleSaveSearch}
                disabled={!searchName.trim()}
                style={{ opacity: !searchName.trim() ? 0.5 : 1 }}
              >
                Запази
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
