import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  Image,
  Phone,
  Settings2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BULGARIAN_CITIES_BY_REGION } from "../constants/bulgarianCities";
import ListingFormStepper from "./ListingFormStepper";
import AdvancedImageUpload from "./AdvancedImageUpload";
import FormFieldWithTooltip from "./FormFieldWithTooltip";
import ListingPreview from "./ListingPreview";
import ListingQualityIndicator from "./ListingQualityIndicator";

const BRANDS = [
  "Audi", "BMW", "Mercedes-Benz", "Volkswagen", "Opel", "Ford", "Toyota", 
  "Honda", "Peugeot", "Renault", "Skoda", "Hyundai", "Kia", "Nissan", 
  "Citroen", "Fiat", "Lexus", "Mazda", "Subaru", "Jaguar", "Land Rover", 
  "Alfa Romeo", "Porsche", "Tesla", "Mini", "Chrysler", "Mitsubishi", 
  "Suzuki", "Volvo", "Dacia", "Chevrolet", "Buick", "Lincoln", "Ram", 
  "Cadillac", "GMC", "Rivian", "Polestar", "Acura", "Infiniti", "Maserati", 
  "Bentley", "Rolls Royce", "Aston Martin", "Ferrari", "Lamborghini", 
  "AC", "AITO", "Abarth", "Aixam", "Alpina", "Aonew", "Aro", "Asia", 
  "Avatr", "Austin", "BAIC", "BAW", "BENTU", "BYD", "Berliner", "Bertone", 
  "Borgward", "Brilliance", "Bugatti", "Berliner", "Bertone", "Borgward", 
  "Brilliance", "Bugatti", "Bugatti", "Buick", "Carbodies", "Changan", 
  "Chery", "Chevrolet", "Chrysler", "Citroen", "Corvette", "Cupra", "DFSK", 
  "DONGFENG", "DR Automobiles", "DS", "Daewoo", "Daihatsu", "Daimler", "Datsun", 
  "Denza", "Dkw", "Dodge", "Dr", "Eagle", "Exceed", "FSO", "FangChengBau", 
  "Fisker", "Foton", "GMC", "Gonow", "Great Wall", "Heinkel", "Hillman", 
  "Haval", "HongQi", "Hummer", "Ineos Grenadier", "Innocenti", "Isuzu", 
  "Iveco", "JAC", "JAS", "Jaguar", "Jeep", "Jinpeng", "Jmev", "Jpx", "KGM", 
  "Kia", "Lada", "Laforza", "Lamborghini", "Lancia", "Land Rover", "Landwind", 
  "Leapmotor", "Li Auto", "Lifan", "Lotus", "Lucid Air", "LynkCo", "Mahindra", 
  "Maple", "Matra", "Maxus", "Maybach", "McLaren", "Mercury", "Mg", "Microcar", 
  "Microlino", "Morgan", "Moskvich", "NIO", "Nissan", "Oldsmobile", "Peugeot", 
  "Pgo", "Plymouth", "Polestar", "Polonez", "Pontiac", "Proton", "Qoros", "Renault", 
  "Renault Samsung", "Rieju", "Rivian", "Rolls-Royce", "Rover", "SECMA", "SH auto", 
  "SIN CARS", "SWM", "Saab", "Samand", "Santana", "Saturn", "Scion", "Seat", "Seres", 
  "Shatenet", "Shuanghuan", "Simca", "Smart", "SsangYong", "Subaru", "Suzuki", 
  "Talbot", "Tata", "Tatra", "Tavria", "Tazzari", "TelStar", "Tempo", "Terberg", 
  "Today Sunshine", "Tofas", "Togg", "Trabant", "Triumph", "Uaz", "VROMOS", "VW", 
  "VinFast", "Vmoto", "Volga", "Voyah", "Warszawa", "Wartburg", "Wey", "Wiesmann", 
  "Xiaomi", "Xinkai", "Xinshun", "Xpeng", "Yogomo", "Zastava", "Zaz", "Zeekr", 
   "Победа", "София", "Чайка", "Други"
];


const MODELS = {
  "Audi": [
    "A1", "A3", "A3 Sportback", "A4", "A4 Avant", "A5", "A5 Sportback", "A6", "A6 Avant", 
    "A7", "A7 Sportback", "A8", "Q3", "Q5", "Q5 Sportback", "Q7", "Q8", "RS Q8", "RS3", 
    "RS4", "RS5", "RS7", "RS5 Sportback", "R8", "S3", "S4", "S5", "S6", "S7", "S8", 
    "SQ5", "SQ7", "SQ8", "Q2", "e-tron", "Q4 e-tron", "e-tron GT", "R8 V10"
  ],
  "BMW": [
    "114", "116", "118", "120", "123", "125", "128", "130", "135", "140", "1500", "1600", 
    "1602", "1800", "1M", "2 Active Tourer", "2 Gran Coupe", "2 Gran Tourer", "2000", "2002", 
    "216", "218", "220", "220 d", "225", "228", "230", "235", "240", "2800", "315", "316", 
    "318", "320", "323", "324", "325", "328", "330", "335", "340", "3gt", "418", "420", 
    "425", "428", "430", "435", "440", "5 Gran Turismo", "501", "518", "520", "523", "524", 
    "525", "528", "530", "530E", "535", "540", "545", "550", "6 GT", "620", "628", "630", 
    "633", "635", "640", "645", "650", "700", "721", "723", "725", "728", "730", "732", 
    "733", "735", "740", "745", "750", "760", "840", "850", "Izetta", "M Coupé", "M135", 
    "M140", "M2", "M3", "M4", "M5", "M6", "M8", "X1", "X2", "X3", "X4", "X5", "X5M", "X6", 
    "X7", "XM", "Z1", "Z3", "Z4", "Z8", "i3", "i4", "i5", "i7", "i8", "iX", "iX1", "iX2", 
    "iX3"
  ],
  "Mercedes-Benz": [
    "A-Class", "A-Class Sedan", "B-Class", "C-Class", "C-Class Sedan", "C-Class Coupe", 
    "C-Class Cabriolet", "C220", "C250", "C300", "C350", "C63", "E-Class", "E-Class Sedan", 
    "E-Class Coupe", "E-Class Cabriolet", "E-Class All-Terrain", "E53 AMG", "E63 AMG", 
    "EQS", "S-Class", "S-Class Sedan", "S-Class Coupe", "S-Class Cabriolet", "G-Class", 
    "G-Wagon", "GLA", "GLB", "GLC", "GLC Coupe", "GLE", "GLE Coupe", "GLS", "AMG GT", 
    "V-Class", "CLA", "CLA Coupe", "V-Class", "SLC", "A45 AMG", "C63 AMG", "G63 AMG", 
    "A-Class Hatchback", "C-Class Estate", "C-Class Wagon"
  ],
  "Volkswagen": [
    "Golf", "Golf R", "Golf GTI", "Golf Sportsvan", "Golf Estate", "Golf Variant", "Passat", 
    "Passat Alltrack", "Tiguan", "Tiguan Allspace", "Touareg", "Polo", "Polo GTI", "Arteon", 
    "Arteon R", "ID.3", "ID.4", "ID. Buzz", "ID.7", "Jetta", "Jetta GLI", "Touran", "T-Roc", 
    "Passat GTE"
  ],
  "Opel": [
    "Astra", "Astra GTC", "Astra Sports Tourer", "Corsa", "Corsa-e", "Corsa OPC", "Mokka", 
    "Mokka X", "Mokka-e", "Grandland", "Grandland X", "Insignia", "Insignia Sports Tourer", 
    "Insignia GSi", "Zafira", "Zafira Life", "Vivaro", "Combo", "Astra-e", "Crossland", 
    "Corsa-e"
  ],
  "Ford": [
    "Fiesta", "Focus", "Focus ST", "Focus RS", "Mondeo", "Kuga", "Mustang", "Explorer", 
    "EcoSport", "Puma", "Ranger", "F-150", "F-250", "F-350", "F-450", "Expedition", 
    "Maverick", "Transit", "F-550", "Fusion", "C-MAX", "Mustang Mach-E", "Transit Connect"
  ],
  "Toyota": [
    "Corolla", "Corolla Hatchback", "Camry", "RAV4", "Hilux", "Tacoma", "Yaris", "Auris", 
    "C-HR", "Prius", "Land Cruiser", "Land Cruiser Prado", "Sequoia", "Sienna", "4Runner", 
    "Tundra", "Mirai", "Avalon", "Venza", "Lexus RX", "Lexus NX", "Lexus ES"
  ],
  "Honda": [
    "Civic", "Civic Sedan", "Civic Coupe", "Civic Hatchback", "Civic Type R", "Accord", 
    "CR-V", "Pilot", "HR-V", "Insight", "Odyssey", "Passport", "Ridgeline", "Fit", 
    "Accord Hybrid", "CR-V Hybrid", "Ridgeline Black Edition", "Passport TrailSport"
  ],
  "Peugeot": [
    "208", "2008", "308", "3008", "5008", "508", "Partner", "Rifter", "Expert", "Traveller", 
    "508 GT", "3008 GT", "308 GT", "208 GT", "508 SW", "308 SW"
  ],
  "Renault": [
    "Clio", "Megane", "Captur", "Kadjar", "Talisman", "Koleos", "Zoe", "Twizy", "Scenic", 
    "Kangoo", "Clio RS", "Megane RS", "Kadjar GT Line", "Zoe Electric", "Talisman Estate"
  ],
  "Skoda": [
    "Octavia", "Octavia RS", "Superb", "Superb iV", "Fabia", "Kodiaq", "Karoq", "Kamiq", 
    "Rapid", "Scala", "Citigo", "Kodiaq RS", "Superb Sportline"
  ],
  "Hyundai": [
    "i10", "i20", "i30", "i40", "Kona", "Tucson", "Santa Fe", "Palisade", "Elantra", "Sonata", 
    "Ioniq", "Ioniq 5", "Ioniq 6", "Kona EV", "Santa Fe Hybrid", "Tucson Plug-in Hybrid", 
    "Kona N", "Elantra N"
  ],
  "Kia": [
    "Picanto", "Stonic", "Ceed", "Ceed SW", "Sportage", "Seltos", "Sorento", "Niro", "Niro EV", 
    "Stinger", "XCeed", "Soul", "Tucson", "Niro PHEV", "Sportage PHEV"
  ],
  "Nissan": [
    "Micra", "Juke", "Leaf", "Qashqai", "X-Trail", "Rogue", "Navara", "Murano", "Pathfinder", 
    "Ariya", "370Z", "Maxima", "Versa", "Frontier", "Murano Platinum"
  ],
  "Citroen": [
    "C3", "C4", "C5", "Berlingo", "C3 Aircross", "C4 Cactus", "SpaceTourer", "Grand C4 Spacetourer", 
    "C5 Aircross"
  ],
  "Fiat": [
    "500", "Panda", "Tipo", "500X", "500L", "Punto", "Freemont", "Qubo", "Panda 4x4", "500e"
  ],
  "Lexus": [
    "IS", "GS", "RX", "NX", "ES", "UX", "LX", "LC", "RX 350", "RX 450h", "NX 300h", "UX 250h", "LX 570"
  ],
  "Mazda": [
    "CX-3", "CX-5", "CX-9", "Mazda 2", "Mazda 3", "Mazda 6", "MX-5", "CX-50", "CX-60"
  ],
  "Subaru": [
    "Impreza", "Outback", "Forester", "XV", "BRZ", "Crosstrek", "WRX", "Ascent", "Legacy"
  ],
  "Jaguar": [
    "XE", "XF", "XJ", "F-Type", "I-Pace", "F-Pace", "E-Pace"
  ],
  "Land Rover": [
    "Defender", "Discovery", "Range Rover", "Evoque", "Sport", "Discovery Sport", "Range Rover Sport"
  ],
  "Alfa Romeo": [
    "Giulia", "Stelvio", "MiTo", "4C", "Giulietta"
  ],
  "Porsche": [
    "911", "Cayenne", "Macan", "Panamera", "Taycan", "Cayman", "Boxster", "Taycan Cross Turismo"
  ],
  "Tesla": [
    "Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Roadster"
  ],
  "Mini": [
    "Cooper", "Countryman", "Clubman", "Convertible", "Paceman"
  ],
  "Chrysler": [
    "300C", "Voyager", "Pacifica", "Saratoga"
  ],
  "Mitsubishi": [
    "Outlander", "ASX", "Lancer", "Pajero", "Eclipse Cross"
  ],
  "Suzuki": [
    "Swift", "Vitara", "Ignis", "S-Cross", "Baleno", "Celerio", "Jimny"
  ],
  "Volvo": [
    "S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"
  ],
  "Dacia": [
    "Duster", "Spring", "Lodgy", "Dokker", "Sandero", "Logan"
  ],
  "Chevrolet": [
    "Cruze", "Malibu", "Traverse", "Tahoe", "Silverado", "Camaro", "Equinox", "Impala"
  ],
  "Buick": [
    "Enclave", "Encore", "Regal", "LaCrosse", "Verano"
  ],
  "Lincoln": [
    "Navigator", "Continental", "MKZ", "Aviator", "Corsair"
  ],
  "Ram": [
    "1500", "2500", "3500", "ProMaster", "Ram Rebel", "Laramie"
  ],
  "Cadillac": [
    "Escalade", "XT5", "XT6", "CT4", "CT5", "CTS"
  ],
  "GMC": [
    "Sierra", "Canyon", "Yukon", "Terrain"
  ],
  "Rivian": [
    "R1T", "R1S"
  ],
  "Polestar": [
    "Polestar 1", "Polestar 2"
  ],
  "Acura": [
    "TLX", "MDX", "RDX", "ILX", "NSX"
  ],
  "Infiniti": [
    "Q50", "Q60", "QX50", "QX60", "QX80"
  ],
  "Maserati": [
    "Ghibli", "Levante", "Quattroporte", "GranTurismo"
  ],
  "Bentley": [
    "Continental GT", "Flying Spur", "Bentayga"
  ],
  "Rolls Royce": [
    "Phantom", "Cullinan", "Ghost", "Dawn", "Wraith"
  ],
  "Aston Martin": [
    "Vantage", "DB11", "DBX", "Vanquish"
  ],
  "Ferrari": [
    "488 GTB", "812 Superfast", "Portofino", "Roma", "F8 Tributo"
  ],
  "Lamborghini": [
    "Aventador", "Huracan", "Urus", "Gallardo"
  ]
};



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
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);
  const TOP_LISTING_PRICE_EUR = 3;

  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [userListingsCount, setUserListingsCount] = useState(0);
  const [showTopConfirm, setShowTopConfirm] = useState(false);

  // Check authentication on mount and fetch user's listings count
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    } else if (!authLoading && isAuthenticated) {
      // Fetch user's active listings count
      const fetchListingsCount = async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (!token) return;

          const response = await fetch("http://localhost:8000/api/my-listings/", {
            headers: {
              Authorization: `Token ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUserListingsCount(Array.isArray(data) ? data.length : 0);
          }
        } catch (err) {
          console.error("Error fetching listings count:", err);
        }
      };

      fetchListingsCount();
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [formData, setFormData] = useState({
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
    pictures: [] as File[],
    features: [] as string[],
    listingType: "normal",
  });

  const initialFormSnapshotRef = useRef<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null);

  // Car features/extras grouped by category
  const FEATURE_CATEGORIES = [
    {
      id: "safety",
      title: "Безопасност",
      description: "Въздушни възглавници и системи за предупреждение",
      items: [
        "Всички подушки",
        "Странични подушки",
        "Предни подушки",
        "Задни подушки",
        "Система за предупреждение при сблъсък",
        "Система за следене на пътната лента",
        "Система за разпознаване на пътни знаци",
        "Система за контрол на налягането на гумите",
      ],
    },
    {
      id: "protection",
      title: "Защита",
      description: "Стабилност, сцепление и контрол",
      items: [
        "Система за стабилност",
        "ABS",
        "ESP",
        "Тракшън контрол",
        "Система за контрол на стабилност",
        "Система за контрол на стабилността",
        "Система за помощ при спиране",
        "Система за контрол на тягата",
        "Система за контрол на динамиката",
        "Система за контрол на скоростта",
        "Система за помощ при катерене",
        "Система за помощ при спускане",
      ],
    },
    {
      id: "comfort",
      title: "Комфорт",
      description: "Климат, седалки и удобства",
      items: [
        "Климатик",
        "Автоматичен климатик",
        "Електрически прозорци",
        "Електрически огледала",
        "Круиз контрол",
        "Адаптивен круиз контрол",
        "Отопляемо предно стъкло",
        "Отопляемо задно стъкло",
        "Отопляеми седалки",
        "Масаж на седалки",
        "Вентилирани седалки",
        "Памет на седалки",
        "Електрически седалки",
        "Регулируемо волан",
        "Волан с отопление",
      ],
    },
    {
      id: "interior",
      title: "Интериор",
      description: "Материали и ергономия",
      items: [
        "Кожен салон",
        "Волан с управление",
        "Спортен волан",
        "Кожен волан",
      ],
    },
    {
      id: "exterior",
      title: "Екстериор",
      description: "Дизайн и външни елементи",
      items: [
        "Панорамен покрив",
        "Люк",
        "Тонирани стъкла",
        "Алуминиеви джанти",
        "Спортни джанти",
        "Спортен пакет",
      ],
    },
    {
      id: "parking",
      title: "Паркиране",
      description: "Камери и асистенти",
      items: [
        "Паркинг сензори",
        "Камера за паркиране",
        "Помощ при паркиране",
      ],
    },
    {
      id: "lighting",
      title: "Осветление",
      description: "Фарове и дневни светлини",
      items: [
        "Автоматични светлини",
        "Дневни светлини",
        "LED светлини",
        "Ксенонови светлини",
        "Лазерни светлини",
      ],
    },
    {
      id: "multimedia",
      title: "Мултимедия и свързаност",
      description: "Навигация и връзка",
      items: [
        "Навигация",
        "Bluetooth",
        "USB",
        "AUX",
        "Мултимедия",
      ],
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleListingTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "top" && formData.listingType !== "top") {
      setShowTopConfirm(true);
      return;
    }
    setFormData((prev) => ({ ...prev, listingType: value }));
  };

  const REQUIRED_FIELDS_BY_STEP: Record<
    number,
    Array<{
      key: keyof typeof formData;
      label: string;
      when?: (data: typeof formData) => boolean;
    }>
  > = {
    1: [
      { key: "brand", label: "Марка" },
      { key: "model", label: "Модел" },
      { key: "yearFrom", label: "Година" },
    ],
    2: [
      { key: "fuel", label: "Гориво" },
      { key: "gearbox", label: "Скоростна кутия" },
      { key: "mileage", label: "Пробег" },
    ],
    3: [
      { key: "price", label: "Цена" },
      { key: "locationCountry", label: "Регион" },
      {
        key: "city",
        label: "Град",
        when: (data) => !!data.locationCountry && data.locationCountry !== "Извън страната",
      },
    ],
    6: [{ key: "description", label: "Описание" }],
    7: [
      { key: "phone", label: "Телефон" },
      { key: "email", label: "Имейл" },
    ],
  };

  const getMissingFields = (step: number, data: typeof formData) => {
    const fields = REQUIRED_FIELDS_BY_STEP[step] ?? [];
    return fields
      .filter((field) => (field.when ? field.when(data) : true))
      .filter((field) => {
        const value = data[field.key];
        if (Array.isArray(value)) return value.length === 0;
        return String(value ?? "").trim().length === 0;
      })
      .map((field) => field.label);
  };

  const getFirstInvalidStep = (data: typeof formData) => {
    const steps = Object.keys(REQUIRED_FIELDS_BY_STEP)
      .map((step) => Number(step))
      .sort((a, b) => a - b);
    for (const step of steps) {
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

  const normalizeFeatures = (raw: any): string[] => {
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

  const normalizeFormSnapshot = (data: typeof formData) =>
    JSON.stringify({
      mainCategory: data.mainCategory ?? "",
      category: data.category ?? "",
      title: data.title ?? "",
      brand: data.brand ?? "",
      model: data.model ?? "",
      yearFrom: data.yearFrom ?? "",
      month: data.month ?? "",
      vin: data.vin ?? "",
      locationCountry: data.locationCountry ?? "",
      locationRegion: data.locationRegion ?? "",
      price: data.price ?? "",
      city: data.city ?? "",
      fuel: data.fuel ?? "",
      gearbox: data.gearbox ?? "",
      mileage: data.mileage ?? "",
      color: data.color ?? "",
      condition: data.condition ?? "",
      power: data.power ?? "",
      displacement: data.displacement ?? "",
      euroStandard: data.euroStandard ?? "",
      description: data.description ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      features: [...data.features].sort(),
      listingType: data.listingType ?? "normal",
    });

  const applyListingToForm = (data: any) => {
    const nextFormData = {
      mainCategory: data.main_category ?? data.mainCategory ?? "1",
      category: data.category ?? "",
      title: data.title ?? "",
      brand: data.brand ?? "",
      model: data.model ?? "",
      yearFrom: data.year_from ? String(data.year_from) : data.yearFrom ?? "",
      month: data.month ? String(data.month) : data.month ?? "",
      vin: data.vin ?? "",
      locationCountry: data.location_country ?? data.locationCountry ?? "",
      locationRegion: data.location_region ?? data.locationRegion ?? "",
      price: data.price != null && data.price !== "" ? String(data.price) : "",
      city: data.city ?? "",
      fuel: data.fuel ?? "",
      gearbox: data.gearbox ?? "",
      mileage: data.mileage != null && data.mileage !== "" ? String(data.mileage) : "",
      color: data.color ?? "",
      condition: data.condition ?? "0",
      power: data.power != null && data.power !== "" ? String(data.power) : "",
      displacement: data.displacement != null && data.displacement !== "" ? String(data.displacement) : "",
      euroStandard: data.euro_standard ?? data.euroStandard ?? "",
      description: data.description ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      pictures: [],
      features: normalizeFeatures(data.features),
      listingType: data.listing_type ?? data.listingType ?? "normal",
    };

    setFormData(nextFormData);
    initialFormSnapshotRef.current = normalizeFormSnapshot(nextFormData);

    setImages([]);
    setExistingCoverImage(data.image_url || data.coverImage || null);
    setCurrentStep(1);
    setErrors({});
  };

  const calculateCompletion = (): number => {
    const fields = [
      formData.brand,
      formData.model,
      formData.yearFrom,
      formData.price,
      formData.city,
      formData.fuel,
      formData.gearbox,
      formData.mileage,
      formData.description,
      formData.phone,
      formData.email,
      images.length > 0 ? "yes" : "",
    ];
    const filled = fields.filter((f) => f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();
  const currentFormSnapshot = normalizeFormSnapshot(formData);
  const isDirty =
    isEditMode &&
    !!initialFormSnapshotRef.current &&
    (currentFormSnapshot !== initialFormSnapshotRef.current || images.length > 0);
  const priceSummary = {
    price: formData.price ? `${formData.price} EUR` : "не е въведена",
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
            Authorization: `Token ${token}`,
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

        const data = await response.json();
        applyListingToForm(data);
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

    // Check if user has reached the 3 advert limit
    if (!isEditMode && userListingsCount >= 3) {
      setErrors({
        submit: "Можете да публикувате максимум 3 активни обяви. Моля, изтрийте или архивирайте някоя от вашите обяви, за да добавите нова.",
      });
      setLoading(false);
      return;
    }

    try {
      // Create FormData for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("main_category", formData.mainCategory);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("listing_type", formData.listingType);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("brand", formData.brand);
      formDataToSend.append("model", formData.model);
      formDataToSend.append("year_from", formData.yearFrom);

      // Only append optional numeric fields if they have values
      if (formData.month) formDataToSend.append("month", formData.month);
      if (formData.power) formDataToSend.append("power", formData.power);
      if (formData.displacement) formDataToSend.append("displacement", formData.displacement);

      formDataToSend.append("location_country", formData.locationCountry);
      formDataToSend.append("location_region", formData.locationRegion);
      formDataToSend.append("price", formData.price);
      formDataToSend.append("city", formData.city);
      formDataToSend.append("fuel", formData.fuel);
      formDataToSend.append("gearbox", formData.gearbox);

      formDataToSend.append("mileage", formData.mileage);

      // Only append optional string fields if they have values
      if (formData.vin) formDataToSend.append("vin", formData.vin);
      if (formData.color) formDataToSend.append("color", formData.color);

      formDataToSend.append("condition", formData.condition);

      if (formData.euroStandard) formDataToSend.append("euro_standard", formData.euroStandard);

      formDataToSend.append("description", formData.description);

      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("features", JSON.stringify(formData.features));

      // Add images as images_upload field
      images.forEach((img) => {
        formDataToSend.append("images_upload", img.file);
      });

      // Get token from localStorage
      const token = localStorage.getItem("authToken");
      if (!token) {
        setErrors({ submit: "Не сте логнати. Моля, влезте отново." });
        navigate("/auth");
        return;
      }

      // Submit to backend
      const response = await fetch(
        isEditMode && editingListingId
          ? `http://localhost:8000/api/listings/${editingListingId}/`
          : "http://localhost:8000/api/listings/",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error:", errorData);
        // Handle both detail and field-specific errors
        let errorMessage = "Грешка при изпращане на обявата";
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // Get first field error
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        setErrors({ submit: errorMessage });
        if (errorMessage === "Недостатъчни средства") {
          setToast({ message: "Недостатъчни средства", type: "error" });
        }
        return;
      }

      const savedListing = await response.json();
      if (formData.listingType === "top") {
        try {
          const token = localStorage.getItem("authToken");
          if (token) {
            const meRes = await fetch("http://localhost:8000/api/auth/me/", {
              headers: { Authorization: `Token ${token}` },
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
            Authorization: `Token ${token}`,
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

      // Reset form after create
      if (!isEditMode) {
        setFormData({
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
        });
        setImages([]);
      } else {
        setImages([]);
        setExistingCoverImage(savedListing.image_url || existingCoverImage);
        initialFormSnapshotRef.current = normalizeFormSnapshot(formData);
      }

      // Redirect to my ads after 2 seconds
      setTimeout(() => {
        navigate("/my-ads");
      }, 2000);
    } catch (error) {
      setErrors({ submit: "Грешка при изпращане на обявата" });
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
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
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
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 24px;
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
      gap: 16px;
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
            steps={[
              {
                id: 1,
                label: "Основна информация",
                icon: <ClipboardList size={16} />,
                description: "Марка, модел, година",
              },
              {
                id: 2,
                label: "Детайли",
                icon: <Settings2 size={16} />,
                description: "Гориво, пробег, мощност",
              },
              {
                id: 3,
                label: "Цена & Локация",
                icon: <Wallet size={16} />,
                description: "Цена, град",
              },
              {
                id: 4,
                label: "Снимки",
                icon: <Image size={16} />,
                description: "Качи снимки",
              },
              {
                id: 5,
                label: "Екстри",
                icon: <Sparkles size={16} />,
                description: "Опции и екстри",
              },
              {
                id: 6,
                label: "Описание",
                icon: <FileText size={16} />,
                description: "Описание",
              },
              {
                id: 7,
                label: "Контакт",
                icon: <Phone size={16} />,
                description: "Телефон",
              },
              {
                id: 8,
                label: "Тип обява",
                icon: <Sparkles size={16} />,
                description: "Топ или нормална",
              },
            ]}
            onStepClick={handleStepClick}
            completedSteps={Array.from({ length: currentStep - 1 }, (_, i) => i + 1)}
          />

          {/* Picture Upload */}
          {currentStep === 4 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Image size={18} className="section-icon" />
                Снимки на автомобила
              </h2>
              <AdvancedImageUpload images={images} onImagesChange={setImages} maxImages={15} />
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <ClipboardList size={18} className="section-icon" />
                Основна информация
              </h2>
              <div className="field-grid">
                <FormFieldWithTooltip label="Марка" required tooltip="Производител на автомобила">
                  <select style={styles.input} name="brand" value={formData.brand} onChange={handleChange} required>
                    <option value="">Избери марка</option>
                    {BRANDS.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </FormFieldWithTooltip>

                <FormFieldWithTooltip label="Модел" required tooltip="Модел на автомобила">
                  <select
                    style={styles.input}
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    disabled={!formData.brand}
                  >
                    <option value="">{formData.brand ? "Избери модел" : "Избери марка първо"}</option>
                    {formData.brand && MODELS[formData.brand as keyof typeof MODELS]
                      ? MODELS[formData.brand as keyof typeof MODELS].map((model: string) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))
                      : null}
                  </select>
                </FormFieldWithTooltip>

                <FormFieldWithTooltip label="Година" required tooltip="Година на производство">
                  <select style={styles.input} name="yearFrom" value={formData.yearFrom} onChange={handleChange} required>
                    <option value="">Избери година</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </FormFieldWithTooltip>
              </div>
            </div>
          )}

          {/* Step 2: Car Details */}
          {currentStep === 2 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Settings2 size={18} className="section-icon" />
                Детайли на автомобила
              </h2>
              <div className="field-grid">
                <FormFieldWithTooltip label="Гориво" required tooltip="Тип на горивото">
                  <select style={styles.input} name="fuel" value={formData.fuel} onChange={handleChange}>
                    <option value="">Избери гориво</option>
                    <option value="benzin">Бензин</option>
                    <option value="dizel">Дизел</option>
                    <option value="gaz_benzin">Газ/Бензин</option>
                    <option value="hibrid">Хибрид</option>
                    <option value="elektro">Електро</option>
                  </select>
                </FormFieldWithTooltip>

                <FormFieldWithTooltip label="Скоростна кутия" required tooltip="Тип на скоростната кутия">
                  <select style={styles.input} name="gearbox" value={formData.gearbox} onChange={handleChange}>
                    <option value="">Избери кутия</option>
                    <option value="ruchna">Ръчна</option>
                    <option value="avtomatik">Автоматик</option>
                  </select>
                </FormFieldWithTooltip>

                <FormFieldWithTooltip label="Пробег (км)" required tooltip="Общо изминати километри">
                  <input style={styles.input} type="number" name="mileage" placeholder="Въведи пробег" min="0" value={formData.mileage} onChange={handleChange} />
                </FormFieldWithTooltip>

                <FormFieldWithTooltip label="Мощност (к.с.)" tooltip="Конски сили">
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
              </div>
            </div>
          )}

          {/* Step 3: Price & Location */}
          {currentStep === 3 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Wallet size={18} className="section-icon" />
                Цена и локация
              </h2>
              <div className="field-grid">
                <FormFieldWithTooltip label="Цена (EUR)" required tooltip="Цена на автомобила">
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

                <FormFieldWithTooltip label="Местоположение - Регион" required tooltip="Регион, където се намира автомобилът">
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
                  <FormFieldWithTooltip label="Град" required tooltip="Град, където се намира автомобилът">
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
          {currentStep === 5 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Sparkles size={18} className="section-icon" />
                Екстри и опции
              </h2>
              <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
                Избери всички екстри и опции, които има автомобилът
              </p>
              <div className="feature-groups">
                {FEATURE_CATEGORIES.map((group) => {
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
                              <Check size={12} />
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
          {currentStep === 6 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <FileText size={18} className="section-icon" />
                Описание на обявата
              </h2>
              <FormFieldWithTooltip
                label="Описание"
                required
                tooltip="Подробно описание на автомобила"
                helperText="Напиши поне 50 символа за по-добра видимост"
                hint="Включи информация за състояние, история на обслужване, причина за продажба"
              >
                <textarea
                  style={styles.textarea}
                  name="description"
                  placeholder="Опишете състоянието, особеностите и причината за продажба..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={8}
                />
              </FormFieldWithTooltip>
            </div>
          )}

          {/* Step 7: Contact */}
          {currentStep === 7 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Phone size={18} className="section-icon" />
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
                  tooltip="Имейл адрес за връзка"
                >
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    placeholder="Въведи имейл"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </FormFieldWithTooltip>
              </div>
            </div>
          )}

          {/* Step 8: Listing Type */}
          {currentStep === 8 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle} className="section-title">
                <Sparkles size={18} className="section-icon" />
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
              <ArrowLeft size={16} />
              Назад
            </button>

            {currentStep === 8 ? (
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
                    <Check size={16} />
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
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          <p style={styles.note}>* Задължителни полета</p>
        </form>
        <aside className="publish-aside">
          <ListingQualityIndicator
            completionPercentage={completionPercentage}
            tips={[
              {
                id: "images",
                title: "Добри снимки",
                description: "Качи поне 3 снимки",
                icon: <Image size={16} />,
                completed: images.length >= 3,
              },
              {
                id: "description",
                title: "Подробно описание",
                description: "Напиши поне 50 символа",
                icon: <FileText size={16} />,
                completed: formData.description.length >= 50,
              },
              {
                id: "price",
                title: "Конкурентна цена",
                description: "Задай реалистична цена",
                icon: <Wallet size={16} />,
                completed: !!formData.price,
              },
              {
                id: "contact",
                title: "Контактна информация",
                description: "Добави телефон и имейл",
                icon: <Phone size={16} />,
                completed: !!formData.phone && !!formData.email,
              },
            ]}
          />
          <ListingPreview
            variant="compact"
            title={`${formData.brand} ${formData.model}`}
            brand={formData.brand}
            model={formData.model}
            year={formData.yearFrom}
            price={formData.price}
            city={formData.city}
            mileage={formData.mileage}
            fuel={formData.fuel}
            gearbox={formData.gearbox}
            power={formData.power}
            coverImage={coverPreview}
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

