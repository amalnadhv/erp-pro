import { supabase } from './supabaseClient'

// ── Credit cost per module (AED per transaction) ──
export const MODULE_COSTS: Record<string, number> = {
  'invoices': 2.00,
  'purchase_invoices': 2.00,
  'sales_quotations': 1.00,
  'sales_orders': 1.00,
  'purchase_orders': 1.00,
  'delivery_notes': 1.00,
  'goods_receipts': 1.00,
  'journal_entries': 0.50,
  'incoming_payments': 1.50,
  'outgoing_payments': 1.50,
  'customers': 0.25,
  'suppliers': 0.25,
  'products': 0.25,
}

// ── Deduct credit for a transaction ──
export async function deductCredit(
  tenantId: string,
  module: string,
  refId?: string,
  description?: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  const cost = MODULE_COSTS[module] || 0.50
  if (cost <= 0) return { success: true, balance: 0 }

  // Check current balance
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('credit_balance, plan_name')
    .eq('id', tenantId)
    .single()

  if (tErr || !tenant) return { success: false, error: 'Tenant not found' }

  const balance = Number(tenant.credit_balance || 0)
  if (balance < cost) {
    return { success: false, error: `Insufficient credit. Required: AED ${cost.toFixed(2)}, Available: AED ${balance.toFixed(2)}` }
  }

  const newBalance = balance - cost

  // Update balance
  const { error: uErr } = await supabase
    .from('tenants')
    .update({
      credit_balance: newBalance,
      credit_used: Number(tenant.credit_used || 0) + cost,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)

  if (uErr) return { success: false, error: uErr.message }

  // Log transaction
  await supabase.from('tenant_credits').insert({
    tenant_id: tenantId,
    amount: -cost,
    balance_after: newBalance,
    tx_type: 'Debit',
    description: description || `Usage: ${module}`,
    module,
    ref_id: refId || null
  })

  return { success: true, balance: newBalance }
}

// ── Check plan limits ──
export async function checkPlanLimits(tenantId: string): Promise<{
  allowed: boolean
  reason?: string
  usage?: Record<string, number>
  limits?: Record<string, number>
}> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan_name, status')
    .eq('id', tenantId)
    .single()

  if (!tenant || tenant.status !== 'Active') {
    return { allowed: false, reason: 'Account suspended or inactive' }
  }

  const { data: plan } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('name', tenant.plan_name)
    .single()

  if (!plan) return { allowed: true }

  const month = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabase
    .from('usage_metering')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('period_month', month)
    .single()

  const u = usage || { user_count: 0, transaction_count: 0, storage_mb: 0 }
  const limits = {
    max_users: Number(plan.max_users || 999),
    max_transactions: Number(plan.max_transactions || 999999),
    max_storage_mb: Number(plan.max_storage_mb || 999999),
  }

  if (u.user_count >= limits.max_users) {
    return { allowed: false, reason: `User limit reached (${limits.max_users}). Upgrade your plan.`, usage: u, limits }
  }
  if (u.transaction_count >= limits.max_transactions) {
    return { allowed: false, reason: `Transaction limit reached (${limits.max_transactions}). Upgrade your plan.`, usage: u, limits }
  }

  return { allowed: true, usage: u, limits }
}

// ── Increment usage counter ──
export async function incrementUsage(tenantId: string, field: 'transaction_count' | 'user_count' | 'storage_mb', amount: number = 1) {
  const month = new Date().toISOString().slice(0, 7)

  const { data: existing } = await supabase
    .from('usage_metering')
    .select('id, ' + field)
    .eq('tenant_id', tenantId)
    .eq('period_month', month)
    .single()

  if (existing) {
    await supabase
      .from('usage_metering')
      .update({ [field]: Number(existing[field] || 0) + amount, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('usage_metering')
      .insert({ tenant_id: tenantId, period_month: month, [field]: amount })
  }
}

// ── Get Stripe checkout URL (placeholder for real Stripe integration) ──
export function getStripeCheckoutUrl(planName: string, tenantId: string, email: string): string {
  // In production, this would call a Supabase Edge Function to create a Stripe Checkout Session
  // For now, return a placeholder that simulates payment
  return `/#/billing/checkout?plan=${encodeURIComponent(planName)}&tenant=${tenantId}&email=${encodeURIComponent(email)}`
}

// ── Check if tenant has enough credit for an action ──
export async function hasEnoughCredit(tenantId: string, module: string): Promise<{ ok: boolean; balance: number; cost: number }> {
  const cost = MODULE_COSTS[module] || 0.50
  const { data: tenant } = await supabase
    .from('tenants')
    .select('credit_balance')
    .eq('id', tenantId)
    .single()

  const balance = Number(tenant?.credit_balance || 0)
  return { ok: balance >= cost, balance, cost }
}
