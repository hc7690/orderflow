"use server";

/**
 * OrderFlow — Settings Server Actions
 *
 * Server actions untuk pengaturan aplikasi dan profil usaha.
 */

import { queryOne, execute } from "@/lib/db";
import { getOrganizationId } from "@/lib/auth/server";

// ─── Tipe Data ─────────────────────────────────────────────────
export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
}

// ─── Get Organization Settings ─────────────────────────────────
export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  const orgId = await getOrganizationId();

  return queryOne<OrganizationSettings>(
    "SELECT id, name, slug, phone, address FROM organizations WHERE id = ?",
    [orgId]
  );
}

// ─── Update Organization Settings ──────────────────────────────
export async function updateOrganizationSettings(input: {
  name?: string;
  phone?: string;
  address?: string;
}): Promise<void> {
  const orgId = await getOrganizationId();

  await execute(
    `UPDATE organizations 
     SET name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         updated_at = datetime('now')
     WHERE id = ?`,
    [input.name || null, input.phone || null, input.address || null, orgId]
  );
}
