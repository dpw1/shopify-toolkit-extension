import { GitCompareArrows } from 'lucide-react'
import { WaitlistSignup } from '../components/WaitlistSignup'

export interface ComparePageProps {
  themeName: string
  themeStoreCount: number
  totalDatasetCount: number
}

export default function ComparePage({
  themeName,
  themeStoreCount,
  totalDatasetCount,
}: ComparePageProps) {
  const contextLine =
    themeStoreCount > 0 && totalDatasetCount > 0
      ? `See how this store stacks up against ${themeStoreCount.toLocaleString()} others running ${themeName}, out of ${totalDatasetCount.toLocaleString()} stores in the SpyKit dataset.`
      : `See how this store compares to others running ${themeName}.`

  return (
    <WaitlistSignup
      feature="compare"
      icon={<GitCompareArrows size={28} strokeWidth={2} />}
      title="Compare"
      tagline="Coming soon"
      description="Benchmark app stacks, theme choices, and store performance side by side — across thousands of real Shopify stores."
      contextLine={contextLine}
    />
  )
}
