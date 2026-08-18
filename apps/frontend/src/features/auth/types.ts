export type Role = 'CLIENT' | 'ORGANIZER' | 'GATE' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}
