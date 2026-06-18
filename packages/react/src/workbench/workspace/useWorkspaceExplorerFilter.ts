import { useCallback, useState } from 'react';

export interface WorkspaceExplorerFilterState {
  clearFilter: () => void;
  filterQuery: string;
  setFilterQuery: (query: string) => void;
}

export function useWorkspaceExplorerFilter(
  initialFilterQuery = '',
): WorkspaceExplorerFilterState {
  const [filterQuery, setFilterQuery] = useState(initialFilterQuery);
  const clearFilter = useCallback(() => {
    setFilterQuery('');
  }, []);

  return {
    clearFilter,
    filterQuery,
    setFilterQuery,
  };
}
