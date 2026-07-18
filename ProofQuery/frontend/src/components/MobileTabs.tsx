import { BarChart3, Database, ScrollText } from 'lucide-react'

import type { MobileSection } from '../state'

interface MobileTabsProps {
  active: MobileSection
  onChange(section: MobileSection): void
}

const tabs = [
  { id: 'dataset' as const, label: '数据集', icon: Database },
  { id: 'analysis' as const, label: '分析', icon: BarChart3 },
  { id: 'evidence' as const, label: '证据', icon: ScrollText },
]

export function MobileTabs({ active, onChange }: MobileTabsProps) {
  return (
    <div className="mobile-tabs" role="tablist" aria-label="工作区视图">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}
