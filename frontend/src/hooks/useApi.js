import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useApiQuery(key, fn, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const { data } = await fn();
      return data;
    },
    ...options,
  });
}

export function useApiMutation(fn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, variables, context) => {
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      }
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
