import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './supabaseClient'

export interface TaxConfig {
  country: string
  tax_name: string
  standard_rate: number
  reduced_rate: number
  currency: string
  tax_authority: string
  compliance_mode: string
  tax_id_label: string
  invoice_label: string
}

const DEFAULT_CONFIG: TaxConfig = {
  country: 'Global',
  tax_name: 'Tax',
  standard_rate: 0,
  reduced_rate: 0,
  currency: 'USD',
  tax_authority: 'N/A',
  compliance_mode: 'None',
  tax_id_label: 'Tax ID',
  invoice_label: 'Invoice',
}

const TaxConfigContext = createContext<TaxConfig>(DEFAULT_CONFIG)

export function useTaxConfig() {
  return useContext(TaxConfigContext)
}

export function TaxConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TaxConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const { data: profile } = await supabase.from('company_profile').select('country, vat_rate, base_currency').single()
      if (!profile?.country) return

      const { data: tc } = await supabase.rpc('get_tax_config', { p_country: profile.country }).single()
      if (tc) {
        setConfig({
          country: profile.country,
          tax_name: tc.tax_name || 'Tax',
          standard_rate: Number(tc.standard_rate) || Number(profile.vat_rate) || 0,
          reduced_rate: Number(tc.reduced_rate) || 0,
          currency: tc.currency || profile.base_currency || 'USD',
          tax_authority: tc.tax_authority || 'N/A',
          compliance_mode: tc.compliance_mode || 'None',
          tax_id_label: tc.tax_id_label || 'Tax ID',
          invoice_label: tc.invoice_label || 'Tax Invoice',
        })
      } else {
        // Fallback: use profile directly
        setConfig({
          ...DEFAULT_CONFIG,
          country: profile.country,
          standard_rate: Number(profile.vat_rate) || 0,
          currency: profile.base_currency || 'USD',
        })
      }
    } catch (err) {
      console.warn('Tax config load failed, using defaults')
    }
  }

  return (
    <TaxConfigContext.Provider value={config}>
      {children}
    </TaxConfigContext.Provider>
  )
}

// Helper: get VAT rate from config or fallback
export function getVatRate(config: TaxConfig, fallback?: number): number {
  return config.standard_rate || fallback || 0
}

// Helper: format tax label
export function taxLabel(config: TaxConfig, rate: number): string {
  if (rate === 0) return 'Exempt'
  return `${config.tax_name} (${rate}%)`
}

// Helper: calculate tax amount
export function calcTax(subtotal: number, rate: number): number {
  return subtotal * (rate / 100)
}

// Pre-loaded cache for components outside provider
let _cachedConfig: TaxConfig | null = null
let _cachePromise: Promise<TaxConfig> | null = null

export async function fetchTaxConfig(country?: string): Promise<TaxConfig> {
  if (_cachedConfig && !country) return _cachedConfig
  if (_cachePromise && !country) return _cachePromise

  _cachePromise = (async () => {
    try {
      let c = country
      if (!c) {
        const { data } = await supabase.from('company_profile').select('country').single()
        c = data?.country || 'Global'
      }
      const { data: tc } = await supabase.rpc('get_tax_config', { p_country: c }).single()
      if (tc) {
        _cachedConfig = {
          country: c!,
          tax_name: tc.tax_name || 'Tax',
          standard_rate: Number(tc.standard_rate) || 0,
          reduced_rate: Number(tc.reduced_rate) || 0,
          currency: tc.currency || 'USD',
          tax_authority: tc.tax_authority || 'N/A',
          compliance_mode: tc.compliance_mode || 'None',
          tax_id_label: tc.tax_id_label || 'Tax ID',
          invoice_label: tc.invoice_label || 'Tax Invoice',
        }
        return _cachedConfig
      }
    } catch (_) {}
    return DEFAULT_CONFIG
  })()

  return _cachePromise
}

// Get all countries for dropdown
export async function fetchAllCountries(): Promise<{ country: string; tax_name: string; standard_rate: number; currency: string }[]> {
  const { data } = await supabase.from('tax_config').select('country, tax_name, standard_rate, currency').eq('is_active', true).order('country')
  return data || []
}
