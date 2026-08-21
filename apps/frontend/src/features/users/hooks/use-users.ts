import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@elite-dev/shared';

import { usersListOptions } from '../queries';
import { createUserByAdmin, updateUserRole, deleteUser } from '../api';

export function useUsersList(params: {
  page?: number;
  size?: number;
  query?: string;
  role?: Role;
}) {
  return useQuery(usersListOptions(params));
}

export function useCreateUserByAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserByAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
