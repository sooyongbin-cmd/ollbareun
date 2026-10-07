import type { AdminUserRow } from "./admin-users";

export type AdminPushSubscription = { id: string; user_id: string; updated_at: string };
export type AdminSubscriptionRow = { admin: AdminUserRow; subscription: AdminPushSubscription | null };

export function buildAdminSubscriptionRows(admins: AdminUserRow[], subscriptions: AdminPushSubscription[]): AdminSubscriptionRow[] {
  const byUser = new Map<string, AdminPushSubscription[]>();
  for (const subscription of subscriptions) {
    const rows = byUser.get(subscription.user_id) ?? [];
    rows.push(subscription);
    byUser.set(subscription.user_id, rows);
  }
  return admins.flatMap<AdminSubscriptionRow>((admin) => {
    const matches = admin.user_id ? byUser.get(admin.user_id) ?? [] : [];
    return matches.length ? matches.map((subscription) => ({ admin, subscription })) : [{ admin, subscription: null }];
  }).sort((a, b) => a.admin.email.localeCompare(b.admin.email) ||
    (a.subscription ? Date.parse(a.subscription.updated_at) : 0) - (b.subscription ? Date.parse(b.subscription.updated_at) : 0) ||
    (a.subscription?.id ?? a.admin.id).localeCompare(b.subscription?.id ?? b.admin.id));
}

