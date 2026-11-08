export type PaginatedResult<T> = { data: T[] | null; error: unknown | null };
export function fetchAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<PaginatedResult<T>>, pageSize?: number): Promise<PaginatedResult<T>>;
