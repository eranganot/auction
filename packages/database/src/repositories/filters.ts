import type { Ownership, Prisma, Transmission, UserFilter } from '@prisma/client';
import { prisma } from '../client';

export interface FilterUpdateInput {
  name?: string;
  minModelYear?: number | null;
  minDateOnRoad?: Date | null;
  maxMileage?: number | null;
  maxHand?: number | null;
  maxPrice?: number | null;
  transmission?: Transmission[];
  ownership?: Ownership[];
  isActive?: boolean;
}

/**
 * Returns the single active filter (single-admin MVP). If none exists yet,
 * one is created with no constraints — callers should normally seed a sensible
 * default first (see prisma/seed.ts).
 */
export async function getActiveFilter(): Promise<UserFilter> {
  const existing = await prisma.userFilter.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.userFilter.create({
    data: { name: 'default', isActive: true, transmission: [], ownership: [] },
  });
}

/** Update the active filter (or create one if none exists). */
export async function updateActiveFilter(input: FilterUpdateInput): Promise<UserFilter> {
  const active = await getActiveFilter();
  const data: Prisma.UserFilterUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.minModelYear !== undefined) data.minModelYear = input.minModelYear;
  if (input.minDateOnRoad !== undefined) data.minDateOnRoad = input.minDateOnRoad;
  if (input.maxMileage !== undefined) data.maxMileage = input.maxMileage;
  if (input.maxHand !== undefined) data.maxHand = input.maxHand;
  if (input.maxPrice !== undefined) data.maxPrice = input.maxPrice;
  if (input.transmission !== undefined) data.transmission = input.transmission;
  if (input.ownership !== undefined) data.ownership = input.ownership;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.userFilter.update({ where: { id: active.id }, data });
}
