import { useState } from 'react'
import { AppShell, Button, HttpNotifyBootstrap, useNotification } from '@wmsu/ui'
import {
  Bell,
  Database,
  GraduationCap,
  Library,
  Link2,
  Palette,
  Shield,
  Users,
  Wallet,
} from 'lucide-react'
import { DesignSystemPage } from './pages/design-system-page'
import { IntegrationServicesPage } from './pages/integration-services-page'
import { MasterDataPage } from './pages/master-data-page'

type Section = 'mdm' | 'integration' | 'design'

export function App() {
  const { notify } = useNotification()
  const [section, setSection] = useState<Section>('mdm')

  const titles: Record<Section, { title: string; subtitle: string }> = {
    mdm: {
      title: 'Master Data',
      subtitle: 'Shared organizational reference data for all CIS apps',
    },
    integration: {
      title: 'Integration Services',
      subtitle: 'Events, clearance foundation, idempotency, and audit',
    },
    design: {
      title: 'Design System Showcase',
      subtitle: 'Reusable layout and components for all campus systems',
    },
  }

  return (
    <>
      <HttpNotifyBootstrap />
      <AppShell
      sidebar={{
        brand: (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">WMSU CIS</p>
            <p className="text-sm font-semibold">Admin Portal</p>
          </div>
        ),
        items: [
          {
            id: 'mdm',
            label: 'Master Data',
            icon: <Database className="h-4 w-4" />,
            active: section === 'mdm',
            onClick: () => setSection('mdm'),
          },
          {
            id: 'integration',
            label: 'Integration',
            icon: <Link2 className="h-4 w-4" />,
            active: section === 'integration',
            onClick: () => setSection('integration'),
          },
          {
            id: 'design',
            label: 'Design System',
            icon: <Palette className="h-4 w-4" />,
            active: section === 'design',
            onClick: () => setSection('design'),
          },
          { id: 'usis', label: 'USiS', icon: <GraduationCap className="h-4 w-4" /> },
          { id: 'ulmis', label: 'ULMIS', icon: <Library className="h-4 w-4" /> },
          { id: 'ufms', label: 'UFMS', icon: <Wallet className="h-4 w-4" /> },
          { id: 'users', label: 'Directory', icon: <Users className="h-4 w-4" /> },
          { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
        ],
      }}
      header={{
        title: titles[section].title,
        subtitle: titles[section].subtitle,
        actions: (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              notify({
                tone: 'info',
                title: 'Admin portal',
                description: `${titles[section].title} active`,
              })
            }
          >
            <Bell className="h-4 w-4" />
            Notify
          </Button>
        ),
        user: {
          name: 'Registrar Admin',
          email: 'admin@wmsu.edu.ph',
          role: 'Platform Admin',
          onSignOut: () =>
            notify({ tone: 'warning', title: 'Sign-out stub', description: 'Auth wiring comes later.' }),
        },
      }}
    >
      {section === 'mdm' ? (
        <MasterDataPage />
      ) : section === 'integration' ? (
        <IntegrationServicesPage />
      ) : (
        <DesignSystemPage />
      )}
    </AppShell>
    </>
  )
}
