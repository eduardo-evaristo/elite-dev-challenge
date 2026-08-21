import type {
  PaginatedUserResult,
  QueryUsersParams,
  CreateUserByAdminRequest,
  UserListItem,
} from '@elite-dev/shared';

import { httpClient } from '@/lib/http-client';

export async function listUsers(
  params: QueryUsersParams,
): Promise<PaginatedUserResult> {
  const { data } = await httpClient.get<PaginatedUserResult>('/users', {
    params: {
      page: params.page ?? 1,
      size: params.size ?? 20,
      query: params.query,
      role: params.role,
    },
  });
  return data;
}

export async function createUserByAdmin(
  payload: CreateUserByAdminRequest,
): Promise<UserListItem> {
  const { data } = await httpClient.post<UserListItem>('/users', payload);
  return data;
}

export async function updateUserRole(
  id: string,
  role: string,
): Promise<UserListItem> {
  const { data } = await httpClient.patch<UserListItem>(`/users/${id}/role`, {
    role,
  });
  return data;
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  const { data } = await httpClient.delete<{ id: string }>(`/users/${id}`);
  return data;
}
