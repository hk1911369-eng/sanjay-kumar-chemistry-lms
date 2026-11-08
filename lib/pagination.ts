export type PaginatedResult<T> = { data: T[] | null; error: unknown | null };

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PaginatedResult<T>>,
  pageSize = 1000,
): Promise<PaginatedResult<T>> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return { data: null, error: new Error('pageSize must be a positive integer') };
  }

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return { data: rows, error: null };
}
