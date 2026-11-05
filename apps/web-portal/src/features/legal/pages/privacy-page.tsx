import { Link } from 'react-router-dom'
import { LegalPageShell } from '@/features/legal/components/legal-page-shell'

export function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="How University Platform Access Service handles identity and access information."
    >
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">1. Overview</h2>
        <p>
          This Privacy Policy describes how University Platform Access Service (“the Service”) collects,
          uses, and protects information when you authenticate and launch assigned platforms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">2. Information we process</h2>
        <p>Depending on your role and institutional provisioning, we may process:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account identifiers such as name, email, and user ID</li>
          <li>Authentication data such as password hashes, MFA status, and session tokens</li>
          <li>Role and platform assignment metadata used to authorize SSO launches</li>
          <li>Technical logs such as sign-in time, IP address, and security events</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">3. How we use information</h2>
        <p>We use this information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Authenticate users and maintain secure sessions</li>
          <li>Authorize access to platforms assigned to your account</li>
          <li>Support single sign-on between the Service and connected applications</li>
          <li>Investigate security incidents and improve reliability</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">4. Sharing</h2>
        <p>
          Identity claims needed for SSO may be shared with platforms you launch (for example
          Library, HRIS, or UDMS) so those apps can recognize your session. We do not sell personal
          information. Access for administrators is limited to operational and support purposes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">5. Retention & security</h2>
        <p>
          Account and audit data are retained as required for institutional operations and security.
          We use industry-standard controls such as encrypted transport, hashed credentials, and
          access controls. No method of transmission or storage is perfectly secure.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">6. Your choices</h2>
        <p>
          For corrections to your profile, role changes, or access removal, contact your identity
          administrator or use the{' '}
          <Link to="/support" className="font-medium text-[#635bff] hover:text-[#5249f0]">
            Support
          </Link>{' '}
          page.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">7. Updates</h2>
        <p>
          This policy may be updated periodically. The latest version will be posted on this page.
        </p>
      </section>
    </LegalPageShell>
  )
}
