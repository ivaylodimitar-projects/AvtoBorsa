export type AlphabetGroup = {
  label: string;
  options: string[];
};

const BG_COLLATOR = new Intl.Collator("bg", {
  sensitivity: "base",
  numeric: true,
});

const normalizeOption = (value: unknown): string => String(value ?? "").trim();

export const sortUniqueOptions = (options: string[]): string[] => {
  const unique = Array.from(
    new Set(options.map((option) => normalizeOption(option)).filter(Boolean))
  );
  unique.sort((a, b) => BG_COLLATOR.compare(a, b));
  return unique;
};

const getInitialLabel = (value: string): string => {
  const normalized = normalizeOption(value);
  if (!normalized) return "#";

  const first = Array.from(normalized)[0]?.toLocaleUpperCase("bg-BG") || "#";
  if (/^[0-9]$/.test(first)) return "0-9";
  if (/^\p{L}$/u.test(first)) return first;
  return "#";
};

const groupOrderValue = (label: string): number => {
  if (label === "0-9") return 0;
  if (label === "#") return 2;
  return 1;
};

export const groupOptionsByInitial = (options: string[]): AlphabetGroup[] => {
  const sortedOptions = sortUniqueOptions(options);
  const groupsMap = new Map<string, string[]>();

  sortedOptions.forEach((option) => {
    const label = getInitialLabel(option);
    const current = groupsMap.get(label) || [];
    current.push(option);
    groupsMap.set(label, current);
  });

  const groups = Array.from(groupsMap.entries()).map(([label, values]) => ({
    label,
    options: values,
  }));

  groups.sort((a, b) => {
    const orderDiff = groupOrderValue(a.label) - groupOrderValue(b.label);
    if (orderDiff !== 0) return orderDiff;
    return BG_COLLATOR.compare(a.label, b.label);
  });

  return groups;
};

