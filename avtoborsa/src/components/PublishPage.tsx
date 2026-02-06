import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CAR_FEATURES } from "../constants/carFeatures";
import { BULGARIAN_CITIES_BY_REGION } from "../constants/bulgarianCities";

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



const CATEGORIES = [
  { value: "1", label: "Автомобили и Джипове" },
  { value: "w", label: "Гуми и джанти" },
  { value: "u", label: "Части" },
  { value: "3", label: "Бусове" },
  { value: "4", label: "Камиони" },
  { value: "5", label: "Мотоциклети" },
  { value: "6", label: "Селскостопански" },
  { value: "7", label: "Индустриални" },
  { value: "8", label: "Кари" },
  { value: "9", label: "Каравани" },
  { value: "a", label: "Яхти и Лодки" },
  { value: "b", label: "Ремаркета" },
  { value: "c", label: "Велосипеди" },
  { value: "v", label: "Аксесоари" },
  { value: "y", label: "Купува" },
  { value: "z", label: "Услуги" },
];

const CAR_TYPES = [
  { value: "", label: "" },
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

const EURO_STANDARDS = [
  { value: "", label: "" },
  { value: "1", label: "Евро 1" },
  { value: "2", label: "Евро 2" },
  { value: "3", label: "Евро 3" },
  { value: "4", label: "Евро 4" },
  { value: "5", label: "Евро 5" },
  { value: "6", label: "Евро 6" },
];

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

const INTERNATIONAL_COUNTRIES = [
  { value: "Австрия", label: "Австрия" },
  { value: "Азербайджан", label: "Азербайджан" },
  { value: "Албания", label: "Албания" },
  { value: "Андора", label: "Андора" },
  { value: "Армения", label: "Армения" },
  { value: "Беларус", label: "Беларус" },
  { value: "Белгия", label: "Белгия" },
  { value: "Босна и Херцеговина", label: "Босна и Херцеговина" },
  { value: "Ватикан", label: "Ватикан" },
  { value: "Великобритания", label: "Великобритания" },
  { value: "Германия", label: "Германия" },
  { value: "Грузия", label: "Грузия" },
  { value: "Гърция", label: "Гърция" },
  { value: "Дания", label: "Дания" },
  { value: "Дубай", label: "Дубай" },
  { value: "Естония", label: "Естония" },
  { value: "Ирландия", label: "Ирландия" },
  { value: "Исландия", label: "Исландия" },
  { value: "Испания", label: "Испания" },
  { value: "Италия", label: "Италия" },
  { value: "Казахстан", label: "Казахстан" },
  { value: "Канада", label: "Канада" },
  { value: "Кипър", label: "Кипър" },
  { value: "Латвия", label: "Латвия" },
  { value: "Литва", label: "Литва" },
  { value: "Лихтенщайн", label: "Лихтенщайн" },
  { value: "Люксембург", label: "Люксембург" },
  { value: "Македония", label: "Македония" },
  { value: "Малта", label: "Малта" },
  { value: "Молдова", label: "Молдова" },
  { value: "Монако", label: "Монако" },
  { value: "Нидерландия", label: "Нидерландия" },
  { value: "Норвегия", label: "Норвегия" },
  { value: "Полша", label: "Полша" },
  { value: "Португалия", label: "Португалия" },
  { value: "Румъния", label: "Румъния" },
  { value: "Русия", label: "Русия" },
  { value: "Сан Марино", label: "Сан Марино" },
  { value: "САЩ", label: "САЩ" },
  { value: "Словакия", label: "Словакия" },
  { value: "Словения", label: "Словения" },
  { value: "Сърбия", label: "Сърбия" },
  { value: "Турция", label: "Турция" },
  { value: "Украйна", label: "Украйна" },
  { value: "Унгария", label: "Унгария" },
  { value: "Финландия", label: "Финландия" },
  { value: "Франция", label: "Франция" },
  { value: "Хърватия", label: "Хърватия" },
  { value: "Черна гора", label: "Черна гора" },
  { value: "Чехия", label: "Чехия" },
  { value: "Швейцария", label: "Швейцария" },
  { value: "Швеция", label: "Швеция" },
  { value: "Южна Корея", label: "Южна Корея" },
  { value: "Япония", label: "Япония" },
];

const MONTHS = [
  { value: "1", label: "Януари" },
  { value: "2", label: "Февруари" },
  { value: "3", label: "Март" },
  { value: "4", label: "Април" },
  { value: "5", label: "Май" },
  { value: "6", label: "Юни" },
  { value: "7", label: "Юли" },
  { value: "8", label: "Август" },
  { value: "9", label: "Септември" },
  { value: "10", label: "Октомври" },
  { value: "11", label: "Ноември" },
  { value: "12", label: "Декември" },
];

const PublishPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [userListingsCount, setUserListingsCount] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(true);

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
        } finally {
          setListingsLoading(false);
        }
      };

      fetchListingsCount();
    }
  }, [isAuthenticated, authLoading, navigate]);

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
  });

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addPictures(Array.from(files));
    }
  };

  const addPictures = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));
    const currentCount = formData.pictures.length;
    const availableSlots = 15 - currentCount;
    const filesToAdd = validFiles.slice(0, availableSlots);

    setFormData((prev) => ({
      ...prev,
      pictures: [...prev.pictures, ...filesToAdd],
    }));

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrls((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files) {
      addPictures(Array.from(files));
    }
  };

  const removePicture = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setLoading(true);

    // Check if user has reached the 3 advert limit
    if (userListingsCount >= 3) {
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
      formData.pictures.forEach((file) => {
        formDataToSend.append("images_upload", file);
      });

      // Get token from localStorage
      const token = localStorage.getItem("authToken");
      if (!token) {
        setErrors({ submit: "Не сте логнати. Моля, влезте отново." });
        navigate("/auth");
        return;
      }

      // Submit to backend
      const response = await fetch("http://localhost:8000/api/listings/", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formDataToSend,
      });

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
        return;
      }

      const data = await response.json();
      setSuccessMessage("Обявата е успешно публикувана!");

      // Reset form
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
      });
      setPreviewUrls([]);

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

  const handleFeatureChange = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible" },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    form: { width: "100%", background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "visible", boxSizing: "border-box" },
    title: { fontSize: 24, fontWeight: 700, color: "#333", marginBottom: 24, margin: 0 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e0e0e0", margin: 0 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    formGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 13, fontWeight: 500, color: "#555" },
    input: { padding: "10px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
    textarea: { padding: "10px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, fontFamily: "inherit", minHeight: 120, resize: "vertical", width: "100%", boxSizing: "border-box" },
    fullWidth: { gridColumn: "1 / -1" },
    button: { padding: "12px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", boxSizing: "border-box" },
    note: { fontSize: 12, color: "#666", marginTop: 8, fontStyle: "italic" },
  };

  return (
    <div style={styles.page}>
      <style>{`
        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .publish-container { padding: 16px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 20px !important; }
          .publish-form h1 { font-size: 20px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .publish-container { padding: 12px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 16px !important; }
          .publish-form h1 { font-size: 18px !important; }
          .publish-form h2 { font-size: 14px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .publish-container { padding: 8px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 12px !important; }
          .publish-form h1 { font-size: 18px !important; margin-bottom: 16px !important; }
          .publish-form h2 { font-size: 13px !important; }
          .publish-form label { font-size: 12px !important; }
          .publish-form input, .publish-form select, .publish-form textarea { font-size: 13px !important; padding: 8px 10px !important; }
          .publish-form button { padding: 10px 16px !important; font-size: 13px !important; }
        }
      `}</style>
      <div style={styles.container} className="publish-container">
        <style>{`
          /* Features table responsive styles */
          .features-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px auto;
          }

          .features-table td {
            vertical-align: top;
            padding-right: 20px;
            border-right: 1px solid #e0e0e0;
          }

          /* Desktop (1201px+) - 4 columns */
          @media (min-width: 1201px) {
            .features-table td {
              width: 25%;
              padding-right: 20px;
            }
          }

          /* Tablet Large (1024px - 1200px) - 2 columns */
          @media (min-width: 1024px) and (max-width: 1200px) {
            .features-table td {
              width: 50%;
              padding-right: 15px;
              border-right: 1px solid #e0e0e0;
            }
            .features-table td:nth-child(odd) {
              border-right: 1px solid #e0e0e0;
            }
            .features-table td:nth-child(even) {
              border-right: none;
            }
          }

          /* Tablet (768px - 1023px) - 2 columns */
          @media (min-width: 768px) and (max-width: 1023px) {
            .features-table td {
              width: 50%;
              padding-right: 15px;
            }
            .features-table td:nth-child(odd) {
              border-right: 1px solid #e0e0e0;
            }
            .features-table td:nth-child(even) {
              border-right: none;
            }
          }

          /* Mobile Large (640px - 767px) - 1 column */
          @media (min-width: 640px) and (max-width: 767px) {
            .features-table {
              display: block;
            }
            .features-table tbody {
              display: block;
            }
            .features-table tr {
              display: block;
            }
            .features-table td {
              display: block;
              width: 100% !important;
              padding: 12px 0 !important;
              border-right: none !important;
              border-bottom: 1px solid #e0e0e0;
            }
            .features-table td:last-child {
              border-bottom: none;
            }
          }

          /* Mobile Small (< 640px) - 1 column */
          @media (max-width: 639px) {
            .features-table {
              display: block;
            }
            .features-table tbody {
              display: block;
            }
            .features-table tr {
              display: block;
            }
            .features-table td {
              display: block;
              width: 100% !important;
              padding: 12px 0 !important;
              border-right: none !important;
              border-bottom: 1px solid #e0e0e0;
            }
            .features-table td:last-child {
              border-bottom: none;
            }
          }
        `}</style>
        <form style={styles.form} className="publish-form" onSubmit={handleSubmit}>
          <h1 style={styles.title}>Публикуване на обява</h1>

          {/* Error Message */}
          {errors.submit && (
            <div style={{
              color: "#d32f2f",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 12px",
              background: "#ffebee",
              borderRadius: 4,
              border: "1px solid #ffcdd2"
            }}>
              {errors.submit}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div style={{
              color: "#2e7d32",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 12px",
              background: "#e8f5e9",
              borderRadius: 4,
              border: "1px solid #a5d6a7"
            }}>
              {successMessage}
            </div>
          )}

          {/* Progress Navigation */}
          <div style={{ width: "100%", margin: "10px 0 30px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Step 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 4,
                  background: currentStep === 1 ? "#0066cc" : "#f0f0f0",
                  color: currentStep === 1 ? "#fff" : "#666",
                  fontWeight: currentStep === 1 ? 600 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ fontWeight: "bold" }}>1.</span>
                <span>Въвеждане на описанието и качване на снимки</span>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ fontSize: 18, color: "#ccc" }}>→</div>

            {/* Step 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 4,
                  background: currentStep === 2 ? "#0066cc" : "#f0f0f0",
                  color: currentStep === 2 ? "#fff" : "#666",
                  fontWeight: currentStep === 2 ? 600 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ fontWeight: "bold" }}>2.</span>
                <span>Публикуване - Избор на тип обява и срок</span>
              </div>
            </div>
          </div>

          {/* Picture Upload */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Снимки ({formData.pictures.length}/15)</h2>
            {formData.pictures.length < 15 && (
              <div
                style={{
                  border: dragActive ? "2px solid #0066cc" : "2px dashed #ccc",
                  borderRadius: 8,
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragActive ? "#f0f7ff" : "#fafafa",
                  transition: "all 0.3s ease",
                  marginBottom: 20,
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#333", margin: "0 0 8px 0" }}>
                  Качи снимки на автомобила
                </p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px 0" }}>
                  Влачи и пусни снимките тук или кликни за избор (до 15 снимки)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{
                    display: "none",
                  }}
                  id="picture-input"
                />
                <label
                  htmlFor="picture-input"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    background: "#0066cc",
                    color: "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Избери снимки
                </label>
              </div>
            )}

            {previewUrls.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 12,
                }}
              >
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e0e0e0",
                      background: "#fafafa",
                    }}
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePicture(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0, 0, 0, 0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Car Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Данни за автомобила</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Row 1: Brand */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Марка *</label>
                <select style={styles.input} name="brand" value={formData.brand} onChange={handleChange} required>
                  <option value="">Избери марка</option>
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 1: Model */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Модел *</label>
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
              </div>

              {/* Row 2: Modification */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Модификация</label>
                <input style={styles.input} type="text" name="title" placeholder="Напр. 320d, M Sport" value={formData.title} onChange={handleChange} />
              </div>

              {/* Row 2: Fuel */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Гориво</label>
                <select style={styles.input} name="fuel" value={formData.fuel} onChange={handleChange}>
                  <option value="">Избери гориво</option>
                  <option value="benzin">Бензин</option>
                  <option value="dizel">Дизел</option>
                  <option value="gaz_benzin">Газ/Бензин</option>
                  <option value="hibrid">Хибрид</option>
                  <option value="elektro">Електро</option>
                </select>
              </div>

              {/* Row 3: Condition */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Състояние *</label>
                <select style={styles.input} name="condition" value={formData.condition} onChange={handleChange} required>
                  <option value="1">Нов</option>
                  <option value="0">Употребяван</option>
                  <option value="3">Повреден/ударен</option>
                  <option value="2">За части</option>
                </select>
              </div>

              {/* Row 3: Power */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Мощност (к.с.)</label>
                <input style={styles.input} type="number" name="power" placeholder="150" value={formData.power} onChange={handleChange} />
              </div>

              {/* Row 4: Euro Standard */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Евро стандарт</label>
                <select style={styles.input} name="euroStandard" value={formData.euroStandard} onChange={handleChange}>
                  {EURO_STANDARDS.map((standard) => (
                    <option key={standard.value} value={standard.value}>
                      {standard.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Gearbox */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Скоростна кутия</label>
                <select style={styles.input} name="gearbox" value={formData.gearbox} onChange={handleChange}>
                  <option value="">Избери кутия</option>
                  <option value="ruchna">Ръчна</option>
                  <option value="avtomatik">Автоматик</option>
                </select>
              </div>

              {/* Row 5: Category */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Категория</label>
                <select style={styles.input} name="category" value={formData.category} onChange={handleChange}>
                  {CAR_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Displacement */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Кубатура (куб.см.)</label>
                <input style={styles.input} type="number" name="displacement" placeholder="2000" value={formData.displacement} onChange={handleChange} />
              </div>

              {/* Row 6: Year */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Година *</label>
                <select style={styles.input} name="yearFrom" value={formData.yearFrom} onChange={handleChange} required>
                  <option value="">Избери година</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 6: Month */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Месец</label>
                <select style={styles.input} name="month" value={formData.month} onChange={handleChange}>
                  <option value="">Избери месец</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 7: VIN */}
              <div style={styles.formGroup}>
                <label style={styles.label}>VIN номер</label>
                <input style={styles.input} type="text" name="vin" placeholder="Напр. WVWZZZ3CZ9E123456" value={formData.vin} onChange={handleChange} />
              </div>

              {/* Row 7: Color */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Цвят</label>
                <input style={styles.input} type="text" name="color" placeholder="Напр. Черен, Бял" value={formData.color} onChange={handleChange} />
              </div>

              {/* Row 8: Mileage */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Пробег (км)</label>
                <input style={styles.input} type="number" name="mileage" placeholder="150000" value={formData.mileage} onChange={handleChange} />
              </div>

              {/* Row 8: Price */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Цена (€) *</label>
                <input style={styles.input} type="number" name="price" placeholder="15000" value={formData.price} onChange={handleChange} required />
              </div>

              {/* Row 9: Main Category */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Основна Категория *</label>
                <select style={styles.input} name="mainCategory" value={formData.mainCategory} onChange={handleChange} required>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 9: Location Country/Region */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Местоположение - Държава/Регион *</label>
                <select style={styles.input} name="locationCountry" value={formData.locationCountry} onChange={handleChange} required>
                  <option value="">Избери местоположение</option>
                  {BULGARIA_REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 10: City or International Country */}
              {formData.locationCountry === "Извън страната" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Държава *</label>
                  <select style={styles.input} name="locationRegion" value={formData.locationRegion} onChange={handleChange} required>
                    <option value="">Избери държава</option>
                    {INTERNATIONAL_COUNTRIES.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formData.locationCountry && formData.locationCountry !== "Извън страната" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Град/Населено място *</label>
                  <select style={styles.input} name="city" value={formData.city} onChange={handleChange} required>
                    <option value="">Избери град</option>
                    {BULGARIAN_CITIES_BY_REGION[formData.locationCountry]?.map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Характеристики</h2>
            <table className="features-table">
              <tbody>
                <tr>
                  {Object.entries(CAR_FEATURES).map(([category, features]) => (
                    <td key={category}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 12, display: "block", textTransform: "capitalize", paddingBottom: 8, borderBottom: "2px solid #0066cc" }}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </label>
                      {features.map((feature) => (
                        <div key={feature}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, cursor: "pointer", padding: "3px 0" }}>
                            <input
                              type="checkbox"
                              checked={formData.features.includes(feature)}
                              onChange={() => handleFeatureChange(feature)}
                              style={{ cursor: "pointer", width: 16, height: 16 }}
                            />
                            <span style={{ color: "black",  fontSize: 14 }}>{feature}</span>
                          </label>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Description */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Описание</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Описание на обявата</label>
              <textarea style={styles.textarea} name="description" placeholder="Опишете състоянието, особеностите и причината за продажба..." value={formData.description} onChange={handleChange} />
            </div>
          </div>

          {/* Contact */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Контактни данни</h2>
            <div style={styles.grid} className="publish-grid">
              <div style={styles.formGroup}>
                <label style={styles.label}>Телефон *</label>
                <input style={styles.input} type="tel" name="phone" placeholder="+359 88 123 4567" value={formData.phone} onChange={handleChange} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" name="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </div>

          <button style={{...styles.button, opacity: loading ? 0.6 : 1}} type="submit" disabled={loading}>
            {loading ? "Изпращане..." : "Публикуване на обява"}
          </button>
          <p style={styles.note}>* Задължителни полета</p>
        </form>
      </div>
    </div>
  );
};

export default PublishPage;

