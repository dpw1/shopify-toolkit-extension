import { FileOutput } from 'lucide-react'
import { WaitlistSignup } from '../components/WaitlistSignup'

export default function ExportPage() {
  return (
    <WaitlistSignup
      feature="export"
      icon={<FileOutput size={28} strokeWidth={1.5} />}
      title="Export"
      tagline="Coming soon"
      description="Export scraped store data to CSV (Shopify-ready) or XLSX with typed columns — products, apps, theme details, and more."
    />
  )
}
