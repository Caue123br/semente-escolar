import * as React from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  key: K | null;
  direction: SortDirection;
}

export function useSort<T, K extends string>(
  items: T[],
  getValue: (item: T, key: K) => string | number | null | undefined,
  initial?: SortState<K>
) {
  const [sort, setSort] = React.useState<SortState<K>>(
    initial ?? { key: null, direction: "asc" }
  );

  const toggle = React.useCallback((key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: "asc" };
    });
  }, []);

  const sorted = React.useMemo(() => {
    if (!sort.key) return items;
    const k = sort.key;
    const mult = sort.direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = getValue(a, k);
      const vb = getValue(b, k);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * mult;
    });
  }, [items, sort, getValue]);

  return { sort, toggle, sorted };
}
