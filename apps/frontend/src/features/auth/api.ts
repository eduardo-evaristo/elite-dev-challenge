import { isAxiosError } from 'axios';

import { httpClient } from '@/lib/http-client';
import type { User } from './types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const { data: result } = await httpClient.post<LoginResponse>(
    '/auth/login',
    data,
  );
  return result;
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const { data: result } = await httpClient.post<LoginResponse>(
    '/auth/register',
    data,
  );
  return result;
}

export async function getMe(): Promise<User | null> {
  try {
    const { data } = await httpClient.get<User>('/auth/me');
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}
