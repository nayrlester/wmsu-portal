import { Link } from 'react-router-dom'
import { LegalPageShell } from '@/features/legal/components/legal-page-shell'

export function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      subtitle="Rules for using University Platform Access Service and connected university platforms."
    >
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">1. Acceptance</h2>
        <p>
          By signing in to University Platform Access Service (“the Service”), you agree to these Terms
          of Service. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">2. Authorized use</h2>
        <p>
          The Service provides single sign-on access to platforms assigned to your institutional
          account (such as Library, HRIS, and document systems). You may use only the platforms and
          privileges granted to you by your administrator.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">3. Account responsibility</h2>
        <p>
          You are responsible for keeping your credentials confidential, including passwords and
          multi-factor authentication codes. Do not share accounts. Notify support immediately if you
          suspect unauthorized access.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">4. Acceptable conduct</h2>
        <p>
          You must not attempt to bypass authentication, access another user’s data, disrupt the
          Service, or use connected platforms for unlawful or unauthorized purposes. Misuse may
          result in suspension or revocation of access.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">5. Availability</h2>
        <p>
          We aim to keep the Service available, but access may be interrupted for maintenance,
          outages, or security events. Connected platforms may have their own uptime and usage
          policies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">6. Changes</h2>
        <p>
          These terms may be updated as the Service evolves. Continued use after changes are posted
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-[#12122a]">7. Contact</h2>
        <p>
          Questions about these terms can be directed through the{' '}
          <Link to="/support" className="font-medium text-[#635bff] hover:text-[#5249f0]">
            Support
          </Link>{' '}
          page.
        </p>
      </section>
    </LegalPageShell>
  )
}
