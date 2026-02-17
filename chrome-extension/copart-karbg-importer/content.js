const BUTTON_ID = "karbg-copart-import-btn";
const TOAST_ID = "karbg-copart-import-toast";

function getPageText() {
  return document.body?.innerText || "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parsePrice(rawValue) {
  const normalized = String(rawValue || "").replace(/,/g, "").replace(/\s/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(rawValue) {
  const digits = String(rawValue || "").replace(/[^0-9]/g, "");
  if (!digits) {
    return null;
  }
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function findFirstText(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!node) {
      continue;
    }
    const value = cleanText(node.textContent || "");
    if (value) {
      return value;
    }
  }
  return "";
}

function findRegexValue(regex) {
  const text = getPageText();
  const match = text.match(regex);
  if (!match || !match[1]) {
    return "";
  }
  return cleanText(match[1]);
}

function findByUnameContains(tokens) {
  const nodes = Array.from(document.querySelectorAll("[data-uname]"));
  for (const node of nodes) {
    const uname = String(node.getAttribute("data-uname") || "").toLowerCase();
    if (!uname.includes("value")) {
      continue;
    }
    if (!tokens.every((token) => uname.includes(token))) {
      continue;
    }
    const value = cleanText(node.textContent || "");
    if (value) {
      return value;
    }
  }
  return "";
}

function escapeRegexLiteral(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRegexByLabels(labels, maxLength = 100) {
  const safeLabels = (labels || [])
    .map((label) => escapeRegexLiteral(label))
    .filter(Boolean);

  if (!safeLabels.length) {
    return "";
  }

  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:${safeLabels.join("|")})\\s*[:\\-]?\\s*([^\\n\\r]{1,${maxLength}})`,
    "i"
  );
  return findRegexValue(regex);
}

function findByUnameAny(tokenGroups) {
  for (const group of tokenGroups || []) {
    const tokens = (group || [])
      .map((token) => String(token || "").toLowerCase())
      .filter(Boolean);
    if (!tokens.length) {
      continue;
    }
    const value = findByUnameContains(tokens);
    if (value) {
      return value;
    }
  }
  return "";
}

function parseHorsePower(rawValue) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const hpMatch = value.match(/(\d{2,4})\s*(?:hp|bhp|ps|к\.?\s*с\.?)/i);
  if (hpMatch?.[1]) {
    return parseInteger(hpMatch[1]);
  }

  return null;
}

function parseDisplacementCc(rawValue) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const literMatch = value.match(/(\d(?:\.\d)?)\s*(?:l|литра?|liter|litre)\b/i);
  if (literMatch?.[1]) {
    const liters = Number(literMatch[1]);
    if (Number.isFinite(liters) && liters > 0) {
      return Math.round(liters * 1000);
    }
  }

  const ccMatch = value.match(/(\d{3,5})\s*(?:cc|cm3|куб\.?\s*см)/i);
  if (ccMatch?.[1]) {
    return parseInteger(ccMatch[1]);
  }

  return null;
}

function getListingTitle() {
  return findFirstText([
    "[data-uname='lotdetailLotdescriptionvalue']",
    "[data-uname='lotDetailsLotdescriptionvalue']",
    ".lot-title",
    "h1",
  ]);
}

function getMakeValue() {
  return (
    findFirstText([
      "[data-uname='lotdetailMakevalue']",
      "[data-uname='lotdetailLotmakevalue']",
      "[data-uname='lotdetailsMakevalue']",
    ]) ||
    findByUnameContains(["make"]) ||
    findRegexValue(/(?:^|\n)\s*Make\s*[:\-]?\s*([^\n\r]{2,60})/i)
  );
}

function getModelValue() {
  return (
    findFirstText([
      "[data-uname='lotdetailModelvalue']",
      "[data-uname='lotdetailLotmodelvalue']",
      "[data-uname='lotdetailsModelvalue']",
    ]) ||
    findByUnameContains(["model"]) ||
    findRegexValue(/(?:^|\n)\s*Model\s*[:\-]?\s*([^\n\r]{2,80})/i)
  );
}

function getYearValue() {
  const candidate =
    findFirstText([
      "[data-uname='lotdetailLotyearvalue']",
      "[data-uname='lotdetailYearvalue']",
      "[data-uname='lotdetailsYearvalue']",
    ]) ||
    findByUnameContains(["year"]) ||
    findRegexValue(/(?:^|\n)\s*(?:Year|Model Year)\s*[:\-]?\s*(\d{4})/i);

  return parseInteger(candidate);
}

function splitTitle(title) {
  const parts = cleanText(title).split(" ").filter(Boolean);
  let year = null;
  let brand = "";
  let model = "";

  if (parts.length > 0 && /^\d{4}$/.test(parts[0])) {
    year = Number(parts[0]);
    parts.shift();
  }

  if (parts.length > 0) {
    brand = parts.shift() || "";
  }

  if (parts.length > 0) {
    model = parts.shift() || "";
  }

  return { year, brand, model };
}

function buildCleanTitle(year, brand, model) {
  const parts = [];
  if (year && Number.isFinite(year)) {
    parts.push(String(year));
  }
  if (brand) {
    parts.push(cleanText(brand));
  }
  if (model) {
    parts.push(cleanText(model));
  }
  return cleanText(parts.join(" "));
}

function findCurrentBid() {
  const candidate = findRegexValue(/Current\s*Bid[\s\S]{0,80}?([\$\d,\.]+)/i);
  if (candidate) {
    return parsePrice(candidate);
  }

  const candidateAlt = findRegexValue(/Bid\s*Status[\s\S]{0,80}?([\$\d,\.]+)/i);
  if (candidateAlt) {
    return parsePrice(candidateAlt);
  }

  return null;
}

function toAbsoluteUrl(rawValue) {
  const value = cleanText(rawValue);
  if (!value || value.startsWith("data:")) {
    return "";
  }
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return "";
  }
}

function isCopartImageUrl(url) {
  if (!url) {
    return false;
  }

  const lower = url.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return false;
  }

  const copartHost = lower.includes("copart");
  if (!copartHost) {
    return false;
  }

  if (EXCLUDED_IMAGE_URL_PATTERNS.some((pattern) => pattern.test(lower))) {
    return false;
  }

  if (VIDEO_FILE_EXTENSION_REGEX.test(lower)) {
    return false;
  }

  const hasImageLikePath =
    IMAGE_FILE_EXTENSION_REGEX.test(lower) ||
    lower.includes("/image") ||
    lower.includes("/images/") ||
    lower.includes("copartimages");

  return hasImageLikePath;
}

function parseSrcSet(rawValue) {
  const value = cleanText(rawValue);
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => cleanText(entry.split(" ")[0]))
    .filter(Boolean);
}

const IMAGE_FILE_EXTENSION_REGEX = /\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i;
const VIDEO_FILE_EXTENSION_REGEX = /\.(mp4|webm|mov|m3u8)(\?|$)/i;
const EXCLUDED_IMAGE_URL_PATTERNS = [
  /doubleclick|googlesyndication|googleadservices/i,
  /(?:^|[\/_.-])ads?(?:[\/_.-]|$)/i,
  /(?:^|[\/_.-])banner(?:[\/_.-]|$)/i,
  /(?:^|[\/_.-])logo(?:[\/_.-]|$)/i,
  /(?:^|[\/_.-])sprite(?:[\/_.-]|$)/i,
  /(?:^|[\/_.-])icon(?:[\/_.-]|$)/i,
  /favicon/i,
  /youtube|vimeo/i,
  /\/video\//i,
  VIDEO_FILE_EXTENSION_REGEX,
];
const EXCLUDED_NODE_HINT_PATTERNS = [
  /\b(ad|ads|advert|banner|promo|sponsor|logo|icon|avatar|social)\b/i,
  /\b(video|youtube|vimeo|player|stream)\b/i,
];
const LISTING_GALLERY_ROOT_SELECTORS = [
  "[data-uname*='lotimage']",
  "[data-uname*='lotImage']",
  "[data-uname*='gallery']",
  "[data-uname*='slider']",
  "[class*='lot-image']",
  "[class*='lotImage']",
  "[class*='gallery']",
  "[id*='gallery']",
  "[class*='slider']",
  "[id*='slider']",
  "[class*='carousel']",
  "[id*='carousel']",
];
const LISTING_IMAGE_SELECTORS = [
  "[data-uname*='lot'] img",
  "[data-uname*='image'] img",
  "[data-uname*='gallery'] img",
  "main [class*='lot'] img",
  "main [class*='gallery'] img",
  "main [class*='slider'] img",
  "main [class*='carousel'] img",
];

function isLikelyListingImageNode(node) {
  const tagName = String(node.tagName || "").toLowerCase();
  if (tagName && tagName !== "img") {
    return false;
  }

  if (
    node.closest?.("video, source, iframe, [class*='video'], [id*='video'], [data-uname*='video']")
  ) {
    return false;
  }
  if (node.closest?.("aside, nav, header, footer")) {
    return false;
  }

  const parentHint = [
    node.getAttribute?.("class"),
    node.getAttribute?.("id"),
    node.getAttribute?.("data-uname"),
    node.getAttribute?.("alt"),
    node.getAttribute?.("title"),
    node.getAttribute?.("aria-label"),
    node.closest?.("[class]")?.getAttribute?.("class"),
    node.closest?.("[id]")?.getAttribute?.("id"),
    node.closest?.("[data-uname]")?.getAttribute?.("data-uname"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (EXCLUDED_NODE_HINT_PATTERNS.some((pattern) => pattern.test(parentHint))) {
    return false;
  }

  const combined =
    `${node.getAttribute?.("class") || ""} ${node.getAttribute?.("id") || ""}`.toLowerCase();
  if (
    combined.includes("logo") ||
    combined.includes("icon") ||
    combined.includes("avatar") ||
    combined.includes("flag")
  ) {
    return false;
  }

  const width = Number(node.getAttribute?.("width") || 0) || Number(node.naturalWidth || 0);
  const height = Number(node.getAttribute?.("height") || 0) || Number(node.naturalHeight || 0);

  if (width > 0 && height > 0 && (width < 120 || height < 90)) {
    return false;
  }
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio > 4 || ratio < 0.25) {
      return false;
    }
  }

  return true;
}

function extractUrlsFromNode(node) {
  const values = [
    node.getAttribute?.("src"),
    node.getAttribute?.("data-src"),
    node.getAttribute?.("data-lazy"),
    node.getAttribute?.("data-image"),
    node.getAttribute?.("data-zoom-image"),
    node.getAttribute?.("data-original"),
    node.getAttribute?.("data-full"),
    node.getAttribute?.("data-fullres"),
    node.getAttribute?.("data-large"),
    ...parseSrcSet(node.getAttribute?.("srcset")),
    ...parseSrcSet(node.getAttribute?.("data-srcset")),
  ];

  const urls = [];
  for (const value of values) {
    const absolute = toAbsoluteUrl(value || "");
    if (!absolute || !isCopartImageUrl(absolute)) {
      continue;
    }
    urls.push(absolute);
  }
  return urls;
}

function collectGalleryRoots() {
  const roots = [];
  const seen = new Set();
  for (const selector of LISTING_GALLERY_ROOT_SELECTORS) {
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const node of nodes) {
      if (!node || seen.has(node)) continue;
      seen.add(node);
      roots.push(node);
    }
  }
  return roots;
}

function normalizeLotLookupValue(rawValue) {
  return String(rawValue || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function urlContainsLotNumber(url, rawLotNumber) {
  const normalizedLot = normalizeLotLookupValue(rawLotNumber);
  if (!normalizedLot || normalizedLot.length < 4) return false;
  const normalizedUrl = normalizeLotLookupValue(url);
  return normalizedUrl.includes(normalizedLot);
}

function collectImageUrls(lotNumber) {
  const candidates = [];
  const galleryRoots = collectGalleryRoots();
  for (const root of galleryRoots) {
    const nodes = Array.from(root.querySelectorAll("img"));
    for (const node of nodes) {
      if (!isLikelyListingImageNode(node)) continue;
      candidates.push(...extractUrlsFromNode(node));
    }
  }

  if (candidates.length < 4) {
    const mediaNodes = [];
    for (const selector of LISTING_IMAGE_SELECTORS) {
      mediaNodes.push(...Array.from(document.querySelectorAll(selector)));
    }
    for (const node of mediaNodes) {
      if (!isLikelyListingImageNode(node)) {
        continue;
      }
      candidates.push(...extractUrlsFromNode(node));
    }
  }

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    unique.push(candidate);
    if (unique.length >= 16) {
      break;
    }
  }

  const lotMatched = unique.filter((candidate) => urlContainsLotNumber(candidate, lotNumber));
  if (lotMatched.length >= 2) {
    return lotMatched.slice(0, 16);
  }

  return unique;
}

function collectPayload() {
  const sourceTitle = getListingTitle();
  const titleParts = splitTitle(sourceTitle);

  const makeValue = getMakeValue() || titleParts.brand;
  const modelValue = getModelValue() || titleParts.model;
  const yearValue = getYearValue() || titleParts.year;

  const cleanTitle = buildCleanTitle(yearValue, makeValue, modelValue);

  const lotNumber =
    findFirstText([
      "[data-uname='lotdetailLotnumbervalue']",
      "[data-uname='lotdetailLotnumvalue']",
      "[data-uname='lotdetailsLotnumbervalue']",
    ]) ||
    findRegexValue(/Lot\s*#\s*([A-Z0-9-]+)/i) ||
    findRegexValue(/Lot\s*Number[\s\S]{0,60}?([A-Z0-9-]+)/i);

  const vin =
    findFirstText([
      "[data-uname='lotdetailVinvalue']",
      "[data-uname='lotdetailsVinvalue']",
    ]) || findRegexValue(/VIN[\s\S]{0,40}?([A-HJ-NPR-Z0-9]{8,17})/i);

  const fuel =
    findFirstText([
      "[data-uname='lotdetailFueltypevalue']",
      "[data-uname='lotdetailsFueltypevalue']",
    ]) ||
    findByUnameAny([["fuel", "type"], ["fuel"]]) ||
    findRegexByLabels(["Fuel Type", "Fuel"], 50);

  const transmission =
    findFirstText([
      "[data-uname='lotdetailTransmissionvalue']",
      "[data-uname='lotdetailsTransmissionvalue']",
    ]) ||
    findByUnameAny([["transmission"], ["gearbox"]]) ||
    findRegexByLabels(["Transmission", "Gearbox"], 50);

  const bodyStyle =
    findFirstText([
      "[data-uname='lotdetailBodystylevalue']",
      "[data-uname='lotdetailsBodystylevalue']",
    ]) ||
    findByUnameAny([["body", "style"], ["bodytype"], ["vehicle", "type"]]) ||
    findRegexByLabels(["Body Style", "Vehicle Type"], 50);

  const color =
    findFirstText([
      "[data-uname='lotdetailColorvalue']",
      "[data-uname='lotdetailsColorvalue']",
    ]) ||
    findByUnameAny([["color"], ["exterior", "color"]]) ||
    findRegexByLabels(["Color", "Exterior Color"], 50);

  const odometerText =
    findFirstText([
      "[data-uname='lotdetailOdometerreadingvalue']",
      "[data-uname='lotdetailsOdometerreadingvalue']",
    ]) ||
    findByUnameAny([["odometer", "reading"], ["odometer"]]) ||
    findRegexByLabels(["Odometer"], 50);

  const odometerStatus =
    findFirstText([
      "[data-uname='lotdetailOdometerstatusvalue']",
      "[data-uname='lotdetailsOdometerstatusvalue']",
    ]) ||
    findByUnameAny([["odometer", "status"]]) ||
    findRegexByLabels(["Odometer Status"], 50);

  const city =
    findFirstText([
      "[data-uname='lotdetailCityvalue']",
      "[data-uname='lotdetailsCityvalue']",
    ]) || findRegexValue(/City[\s\S]{0,40}?([A-Za-z .\-']{2,40})/i);

  const region =
    findFirstText([
      "[data-uname='lotdetailStatevalue']",
      "[data-uname='lotdetailProvincevalue']",
      "[data-uname='lotdetailsStatevalue']",
    ]) ||
    findRegexValue(/Province[\s\S]{0,40}?([A-Za-z .\-']{2,40})/i) ||
    findRegexValue(/State[\s\S]{0,40}?([A-Za-z .\-']{2,40})/i);

  const drive =
    findFirstText([
      "[data-uname='lotdetailDrivelinevalue']",
      "[data-uname='lotdetailsDrivelinevalue']",
      "[data-uname='lotdetailDrivetypevalue']",
    ]) ||
    findByUnameAny([["drive", "line"], ["driveline"], ["drive", "type"]]) ||
    findRegexByLabels(["Drive Line", "Driveline", "Drive Type"], 50);

  const engine =
    findFirstText([
      "[data-uname='lotdetailEnginevalue']",
      "[data-uname='lotdetailsEnginevalue']",
      "[data-uname='lotdetailEnginespecvalue']",
    ]) ||
    findByUnameAny([["engine", "spec"], ["engine"]]) ||
    findRegexByLabels(["Engine", "Engine Type", "Engine Spec"], 80);

  const cylinders =
    findFirstText([
      "[data-uname='lotdetailCylindersvalue']",
      "[data-uname='lotdetailsCylindersvalue']",
    ]) ||
    findByUnameAny([["cylinders"], ["cylinder"]]) ||
    findRegexByLabels(["Cylinders", "Cylinder"], 40);

  const primaryDamage =
    findFirstText([
      "[data-uname='lotdetailPrimarydamagevalue']",
      "[data-uname='lotdetailsPrimarydamagevalue']",
    ]) ||
    findByUnameAny([["primary", "damage"], ["damage", "primary"]]) ||
    findRegexByLabels(["Primary Damage"], 80);

  const secondaryDamage =
    findFirstText([
      "[data-uname='lotdetailSecondarydamagevalue']",
      "[data-uname='lotdetailsSecondarydamagevalue']",
    ]) ||
    findByUnameAny([["secondary", "damage"], ["damage", "secondary"]]) ||
    findRegexByLabels(["Secondary Damage"], 80);

  const keys =
    findFirstText([
      "[data-uname='lotdetailKeysvalue']",
      "[data-uname='lotdetailsKeysvalue']",
    ]) ||
    findByUnameAny([["keys"]]) ||
    findRegexByLabels(["Keys"], 30);

  const runAndDrives =
    findFirstText([
      "[data-uname='lotdetailRunanddrivesvalue']",
      "[data-uname='lotdetailsRunanddrivesvalue']",
    ]) ||
    findByUnameAny([["run", "drive"], ["runanddrive"], ["run", "drives"]]) ||
    findRegexByLabels(["Run and Drives", "Run & Drive", "Run and Drive"], 40);

  const titleType =
    findFirstText([
      "[data-uname='lotdetailTitletypevalue']",
      "[data-uname='lotdetailsTitletypevalue']",
    ]) ||
    findByUnameAny([["title", "type"]]) ||
    findRegexByLabels(["Title Type"], 80);

  const vehicleType =
    findFirstText([
      "[data-uname='lotdetailVehicletypevalue']",
      "[data-uname='lotdetailsVehicletypevalue']",
    ]) ||
    findByUnameAny([["vehicle", "type"]]) ||
    findRegexByLabels(["Vehicle Type"], 80);

  const seller =
    findFirstText([
      "[data-uname='lotdetailSellervalue']",
      "[data-uname='lotdetailsSellervalue']",
      "[data-uname='lotdetailSellernamevalue']",
    ]) ||
    findByUnameAny([["seller", "name"], ["seller"]]) ||
    findRegexByLabels(["Seller", "Seller Name"], 100);

  const saleDate =
    findFirstText([
      "[data-uname='lotdetailSaledatevalue']",
      "[data-uname='lotdetailsSaledatevalue']",
      "[data-uname='lotdetailAuctiondatevalue']",
    ]) ||
    findByUnameAny([["sale", "date"], ["auction", "date"]]) ||
    findRegexByLabels(["Sale Date", "Auction Date"], 80);

  const saleName =
    findFirstText([
      "[data-uname='lotdetailSalenamevalue']",
      "[data-uname='lotdetailsSalenamevalue']",
      "[data-uname='lotdetailAuctionnamevalue']",
    ]) ||
    findByUnameAny([["sale", "name"], ["auction", "name"]]) ||
    findRegexByLabels(["Sale Name", "Auction Name"], 100);

  const lotStatus =
    findFirstText([
      "[data-uname='lotdetailLotstatusvalue']",
      "[data-uname='lotdetailsLotstatusvalue']",
      "[data-uname='lotdetailSalestatusvalue']",
    ]) ||
    findByUnameAny([["lot", "status"], ["sale", "status"]]) ||
    findRegexByLabels(["Lot Status", "Sale Status"], 80);

  const highlights =
    findFirstText([
      "[data-uname='lotdetailHighlightsvalue']",
      "[data-uname='lotdetailsHighlightsvalue']",
    ]) ||
    findByUnameAny([["highlights"], ["highlight"]]) ||
    findRegexByLabels(["Highlights"], 120);

  const estRetailRaw =
    findFirstText([
      "[data-uname='lotdetailEstretailvaluevalue']",
      "[data-uname='lotdetailsEstretailvaluevalue']",
      "[data-uname='lotdetailEstimatedretailvaluevalue']",
    ]) ||
    findByUnameAny([["est", "retail"], ["estimated", "retail"], ["retail", "value"]]) ||
    findRegexByLabels(["Est. Retail Value", "Estimated Retail Value", "Retail Value"], 60);

  const repairCostRaw =
    findFirstText([
      "[data-uname='lotdetailRepaircostvalue']",
      "[data-uname='lotdetailsRepaircostvalue']",
      "[data-uname='lotdetailEstimatedrepaircostvalue']",
    ]) ||
    findByUnameAny([["repair", "cost"], ["estimated", "repair"]]) ||
    findRegexByLabels(["Repair Cost", "Estimated Repair Cost"], 60);

  const displacement =
    parseDisplacementCc(engine) ||
    parseDisplacementCc(findRegexByLabels(["Displacement", "Engine Size"], 40));

  const power =
    parseHorsePower(engine) ||
    parseHorsePower(findRegexByLabels(["Horsepower", "HP"], 40));

  return {
    source_url: window.location.href,
    source_title: sourceTitle,
    clean_title: cleanTitle,
    title: cleanTitle || sourceTitle,
    lot_number: lotNumber,
    vin,
    brand: makeValue,
    model: modelValue,
    year: yearValue,
    price: findCurrentBid(),
    odometer: parseInteger(odometerText),
    fuel,
    transmission,
    body_style: bodyStyle,
    color,
    engine,
    cylinders,
    drive,
    primary_damage: primaryDamage,
    secondary_damage: secondaryDamage,
    keys,
    run_and_drives: runAndDrives,
    title_type: titleType,
    vehicle_type: vehicleType,
    odometer_status: odometerStatus,
    seller,
    sale_date: saleDate,
    sale_name: saleName,
    lot_status: lotStatus,
    highlights,
    est_retail_value: parsePrice(estRetailRaw),
    repair_cost: parsePrice(repairCostRaw),
    displacement,
    power,
    city,
    region,
    country: "Canada",
    odometer_text: odometerText,
    image_urls: collectImageUrls(lotNumber),
  };
}

function showToast(message, isError) {
  const oldToast = document.getElementById(TOAST_ID);
  if (oldToast) {
    oldToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.right = "16px";
  toast.style.bottom = "16px";
  toast.style.zIndex = "999999";
  toast.style.padding = "10px 12px";
  toast.style.borderRadius = "10px";
  toast.style.maxWidth = "360px";
  toast.style.fontSize = "13px";
  toast.style.fontWeight = "600";
  toast.style.color = isError ? "#7f1d1d" : "#0f766e";
  toast.style.background = isError ? "#fff1f2" : "#ecfeff";
  toast.style.border = isError ? "1px solid #fecaca" : "1px solid #99f6e4";
  toast.style.boxShadow = "0 12px 20px rgba(15, 23, 42, 0.15)";
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 5200);
}

function findInsertHost() {
  return (
    document.querySelector("[data-uname='lotdetailLotdescriptionvalue']") ||
    document.querySelector("h1") ||
    document.querySelector("main") ||
    document.querySelector("body")
  );
}

function isListingPage() {
  if (/\/lot\//i.test(window.location.pathname)) {
    return true;
  }
  return /Lot\s*#/i.test(getPageText());
}

function onImportClick(button) {
  const payload = collectPayload();

  button.disabled = true;
  button.textContent = "Изпращане към Kar.bg...";

  chrome.runtime.sendMessage(
    {
      type: "KARBG_IMPORT_COPART",
      payload,
    },
    (result) => {
      if (chrome.runtime.lastError) {
        button.disabled = false;
        button.textContent = "Добави в Kar.bg";
        showToast(`Грешка: ${chrome.runtime.lastError.message}`, true);
        return;
      }

      if (!result?.ok) {
        button.disabled = false;
        button.textContent = "Добави в Kar.bg";
        showToast(result?.error || "Неуспешен импорт.", true);
        return;
      }

      const uploaded = Number(result?.data?.images_uploaded || 0);
      button.textContent = "Добавено в Kar.bg";
      button.style.background = "#0f766e";
      button.style.borderColor = "#0f766e";
      showToast(`Обявата е изпратена като чернова (${uploaded} снимки).`, false);
    }
  );
}

function injectButton() {
  if (!isListingPage()) {
    return;
  }

  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const host = findInsertHost();
  if (!host) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.style.margin = "10px 0 16px";

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Добави в Kar.bg";
  button.style.padding = "10px 14px";
  button.style.borderRadius = "10px";
  button.style.border = "1px solid #0f766e";
  button.style.background = "#14b8a6";
  button.style.color = "#ffffff";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
  button.style.fontSize = "13px";
  button.style.boxShadow = "0 10px 18px rgba(15, 118, 110, 0.2)";

  button.addEventListener("click", () => onImportClick(button));
  wrapper.appendChild(button);

  if (host.tagName.toLowerCase() === "h1" && host.parentElement) {
    host.parentElement.insertBefore(wrapper, host.nextSibling);
  } else {
    host.insertBefore(wrapper, host.firstChild);
  }
}

let lastUrl = window.location.href;

const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
      existing.parentElement?.remove();
    }
    window.setTimeout(injectButton, 900);
    return;
  }

  injectButton();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(injectButton, 700);
