import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components'
import { LEGAL } from '@/lib/legal'

type Doc = 'terms' | 'privacy'

const TITLES: Record<Doc, string> = { terms: 'Terms of Service', privacy: 'Privacy Policy' }

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)', textWrap: 'balance' }}>
      {children}
    </h2>
  )
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
      {children}
    </p>
  )
}

function Mail() {
  return (
    <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: 'var(--primary)' }}>
      {LEGAL.contactEmail}
    </a>
  )
}

function Terms() {
  return (
    <>
      <P>
        These terms apply when you use {LEGAL.tradingName} (“iSpy”, “we”, “us”), a service run from {LEGAL.location}. By
        creating an account or using iSpy you agree to them. If you don’t agree, please don’t use the service.
      </P>

      <H2>What iSpy does</H2>
      <P>
        iSpy helps you judge what an item may be worth before you buy or list it. It can identify items from a photo or
        barcode using AI, show current eBay Australia asking prices, show sold prices iSpy has recorded from eBay
        Australia, and estimate your profit after eBay selling fees.
      </P>
      <P>
        Every figure iSpy shows is a guide, not a valuation or a guarantee. Asking prices are what sellers hope to get.
        Sold prices are past results and markets change. AI identification can be wrong. Check labels, model numbers and
        condition yourself, and verify authenticity and provenance before you buy. iSpy does not authenticate items.
      </P>

      <H2>Your account</H2>
      <P>
        You need an account to scan. Keep your login details private and tell us promptly if you think someone else has
        used your account. You must be at least 18, or have a parent or guardian’s permission, to create an account and
        take out a paid plan. One person per account, please.
      </P>

      <H2>Plans, payments and cancelling</H2>
      <P>
        The Free plan includes a limited number of market scans each day and AI photo IDs each month. Paid plans (Pro and
        Unlimited) are monthly subscriptions billed in Australian dollars through Stripe. Current prices and limits are on
        the Plans page; prices include GST where GST applies. Daily scan allowances reset at midnight Melbourne time.
      </P>
      <P>
        Subscriptions renew each month until you cancel. You can cancel at any time from the Plans page (Manage subscription);
        you keep paid access until the end of the period you have paid for, and you won’t be charged again. If we change a
        plan’s price, we will tell you at least 14 days before it applies to your next renewal, and you can cancel before
        then.
      </P>
      <P>
        We don’t refund part-used months, except where the Australian Consumer Law requires a remedy. Nothing in these
        terms excludes, restricts or modifies any consumer guarantee, right or remedy you have under the Australian
        Consumer Law or other laws that can’t be excluded. If iSpy fails to meet a consumer guarantee, contact us and we
        will fix it, or refund you where the law requires.
      </P>

      <H2>Fair use</H2>
      <P>
        Use iSpy for your own buying and selling. Don’t scrape, resell or bulk-export iSpy data; don’t try to get around
        scan limits, rate limits or security; don’t upload photos you have no right to use or that show other people; and
        don’t use iSpy for anything unlawful. We may suspend or close an account that breaks these rules, and we will tell
        you why unless the law or safety prevents it.
      </P>

      <H2>eBay and other services</H2>
      <P>
        iSpy is independent and is not affiliated with, endorsed by or sponsored by eBay. eBay is a trademark of eBay
        Inc. Listing links take you to eBay, where eBay’s own terms apply. eBay’s fees in the profit calculator come from
        eBay Australia’s published fee pages and can change; check eBay for the fees that apply to you.
      </P>

      <H2>Availability and changes</H2>
      <P>
        We work to keep iSpy running, but it depends on third-party services (including eBay, Google, Stripe, Supabase and
        Vercel) and may sometimes be unavailable or limited, for example when eBay’s daily data limit is reached. If a scan
        fails for reasons on our side or eBay’s, it isn’t counted against your allowance. We may improve or change
        features; if a change materially reduces a paid plan, we will tell you and you may cancel.
      </P>

      <H2>Liability</H2>
      <P>
        To the extent the law allows, we are not liable for buying, selling or pricing decisions you make using iSpy, or
        for indirect or consequential loss. Where our liability can be limited under the Australian Consumer Law, it is
        limited to supplying the service again or paying the cost of having it supplied again.
      </P>

      <H2>Ending your account</H2>
      <P>
        You can stop using iSpy at any time. To close your account and have your data deleted, email <Mail />. Cancel any
        paid plan first so you aren’t charged again.
      </P>

      <H2>Law and contact</H2>
      <P>
        These terms are governed by the laws of Victoria, Australia. We may update them; if a change is significant we will
        let you know in the app or by email before it takes effect. Questions or complaints: <Mail />.
      </P>
    </>
  )
}

function Privacy() {
  return (
    <>
      <P>
        This policy explains how {LEGAL.tradingName} (“iSpy”, “we”) handles your personal information. We follow the
        Australian Privacy Principles in the Privacy Act 1988 (Cth). We collect only what we need to run iSpy, and we
        don’t sell your information.
      </P>

      <H2>What we collect</H2>
      <P>
        <strong>Account details:</strong> your email address and a securely hashed password (we never see the password
        itself), and a display name if you add one.
      </P>
      <P>
        <strong>Scans:</strong> the items you search for or that iSpy identifies, the price results, and when you scanned,
        so your History works. We also count scans per day and per month to apply your plan’s limits. When
        iSpy has too few sales for an item, it keeps the search words (never who searched) so it can collect
        sold prices for that item from eBay.
      </P>
      <P>
        <strong>Photos:</strong> when you use Live Scan, Single Item upload or Lot Upload, your photo is resized on your
        device and sent to Google’s Gemini AI service to identify the item. Google processes it under its API terms
        and returns the result; iSpy does not store your photos.
        Barcodes are read on your device; only the barcode number is sent to us.
      </P>
      <P>
        <strong>Payments:</strong> Stripe processes paid plans. We store your Stripe customer and subscription references
        and your plan status. We never receive or store your card number.
      </P>
      <P>
        <strong>Technical data:</strong> like most websites, our hosting and database providers log IP addresses, browser
        type and request times for security and troubleshooting. We don’t use advertising trackers. Your eBay selling-plan
        choice in the profit calculator is saved only in your browser.
      </P>

      <H2>How we use it</H2>
      <P>
        To provide iSpy: signing you in, identifying and pricing items, keeping your scan history, applying plan limits,
        billing, preventing abuse, fixing problems, and contacting you about your account or important changes. We use
        aggregated, de-identified usage figures to improve the product.
      </P>

      <H2>Who we share it with</H2>
      <P>
        We use trusted providers to run iSpy, and share only what each needs:
      </P>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
        <li>Supabase (database, sign-in and server functions), hosted in India (Mumbai region).</li>
        <li>Vercel (website hosting), with servers in the United States and worldwide.</li>
        <li>Google (Gemini AI) to identify items in your photos, in the United States.</li>
        <li>Stripe (payments), in Australia and the United States.</li>
        <li>eBay receives the search words or barcode for each scan, but no personal information about you.</li>
      </ul>
      <P>
        Because these providers store or process data outside Australia, your information may be held overseas. We choose
        providers with strong security and contractual privacy commitments. We may also disclose information where the law
        requires it.
      </P>

      <H2>Security and retention</H2>
      <P>
        Data is encrypted in transit, access is restricted by per-user security rules in our database, and payment details
        stay with Stripe. We keep your account and scan history while your account is open. When you ask us to delete your
        account, we delete your account, history and usage records, except billing records we must keep for tax law
        (generally five years).
      </P>

      <H2>Your choices and rights</H2>
      <P>
        You can ask to access or correct your personal information, or to delete your account, by emailing <Mail />. We
        will respond within 30 days. You can delete individual scans in History at any time.
      </P>

      <H2>Complaints</H2>
      <P>
        If you have a privacy concern, email <Mail /> and we will respond within 30 days. If you’re not satisfied, you can
        contact the Office of the Australian Information Commissioner at{' '}
        <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
          oaic.gov.au
        </a>
        .
      </P>

      <H2>Changes</H2>
      <P>
        If we change how we handle personal information, we will update this policy and, for significant changes, let you
        know in the app or by email.
      </P>
    </>
  )
}

/** Terms of Service and Privacy Policy, public and readable without signing in. */
export function LegalPage({ doc }: { doc: Doc }) {
  useEffect(() => {
    document.title = `${TITLES[doc]} · ispy.ai`
    window.scrollTo(0, 0)
    return () => {
      document.title = 'ispy.ai — Know what it’s worth before you buy'
    }
  }, [doc])

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 pb-12">
      <header className="flex items-center justify-between py-4" style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)' }}>
        <Link to="/" aria-label="ispy.ai home" className="no-underline">
          <BrandLockup size={30} />
        </Link>
        <nav className="flex gap-4 text-sm" aria-label="Legal">
          <Link to="/terms" style={{ color: doc === 'terms' ? 'var(--on-surface)' : 'var(--primary)', fontWeight: doc === 'terms' ? 600 : 500 }}>
            Terms
          </Link>
          <Link to="/privacy" style={{ color: doc === 'privacy' ? 'var(--on-surface)' : 'var(--primary)', fontWeight: doc === 'privacy' ? 600 : 500 }}>
            Privacy
          </Link>
        </nav>
      </header>

      <main>
        <h1 className="mt-4 text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
          {TITLES[doc]}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-muted)' }}>
          Last updated {LEGAL.lastUpdated}
        </p>
        <div style={{ maxWidth: '68ch' }}>{doc === 'terms' ? <Terms /> : <Privacy />}</div>
      </main>

      <footer className="mt-12 border-t pt-4 text-xs" style={{ borderColor: 'var(--border-divider)', color: 'var(--on-surface-muted)' }}>
        {LEGAL.tradingName} · {LEGAL.location}
        {LEGAL.abn ? ` · ABN ${LEGAL.abn}` : ''} · <Mail />
      </footer>
    </div>
  )
}
