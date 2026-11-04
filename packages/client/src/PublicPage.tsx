import { JSX, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

const Shell = styled("main", {
  base: {
    minHeight: "100%",
    padding: "clamp(24px, 6vw, 72px) 20px",
    background: "var(--md-sys-color-surface)",
    color: "var(--md-sys-color-on-surface)",
  },
});

const Card = styled("article", {
  base: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "clamp(24px, 5vw, 48px)",
    borderRadius: "var(--borderRadius-xl)",
    background: "var(--md-sys-color-surface-container)",
    boxShadow: "var(--elevation-2)",
  },
});

const Header = styled("header", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--gap-md)",
    marginBottom: "var(--gap-xl)",
    flexWrap: "wrap",
  },
});

const Brand = styled("a", {
  base: {
    color: "var(--md-sys-color-primary)",
    fontSize: "1.1rem",
    fontWeight: 700,
    textDecoration: "none",
  },
});

const Nav = styled("nav", {
  base: {
    display: "flex",
    gap: "var(--gap-md)",
    flexWrap: "wrap",
    "& a": {
      color: "var(--md-sys-color-primary)",
    },
  },
});

const Heading = styled("h1", {
  base: {
    margin: "0 0 var(--gap-md)",
    fontSize: "clamp(2rem, 5vw, 3rem)",
  },
});

const Section = styled("section", {
  base: {
    marginTop: "var(--gap-xl)",
    lineHeight: 1.65,
    "& h2": {
      marginBottom: "var(--gap-sm)",
      fontSize: "1.25rem",
    },
    "& p": {
      margin: "var(--gap-sm) 0",
    },
  },
});

export function PublicPage(props: { title: string; children: JSX.Element }) {
  onMount(() => {
    document.title = `${props.title} · TailsTalk 2`;
  });

  return (
    <Shell>
      <Card>
        <Header>
          <Brand href="/login">TailsTalk 2</Brand>
          <Nav aria-label="Legal pages">
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a
              href="https://tails1154.com:9782/docs/aup.html"
              target="_blank"
              rel="noreferrer"
            >
              Terms of Service
            </a>
          </Nav>
        </Header>
        {props.children}
      </Card>
    </Shell>
  );
}

export function AboutPage() {
  return (
    <PublicPage title="About">
      <Heading>About TailsTalk 2</Heading>
      <p>
        TailsTalk 2 is a self-hosted chat platform for communities, friends, and
        projects.
      </p>
      <Section>
        <h2>What you can do</h2>
        <p>
          Chat in servers and channels, share files, use forums, create bots,
          and customize your profile.
        </p>
      </Section>
      <Section>
        <h2>Open source</h2>
        <p>
          TailsTalk 2 is built from open-source software. View the frontend on{" "}
          <a
            href="https://github.com/tails1154/tailstalk2-forweb"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </Section>
      <Section>
        <h2>Contact</h2>
        <p>For questions about TailsTalk 2, contact tails1154@tails1154.com.</p>
      </Section>
    </PublicPage>
  );
}

export function PrivacyPage() {
  return (
    <PublicPage title="Privacy Policy">
      <Heading>
        <Trans>Privacy Policy</Trans>
      </Heading>
      <p>
        <strong>
          <Trans>Last updated: November 3, 2026.</Trans>
        </strong>{" "}
        <Trans>
          This policy explains what TailsTalk 2 processes, why we process it,
          and how you can exercise your data-protection rights.
        </Trans>
      </p>
      <Section>
        <h2>
          <Trans>Who is responsible</Trans>
        </h2>
        <p>
          <Trans>
            The controller is the TailsTalk 2 operator, Tails1154. For privacy
            questions or rights requests, contact{" "}
            <a href="mailto:tails1154@tails1154.com">
              tails1154@tails1154.com
            </a>
            . No data-protection officer has been appointed.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Information we process</Trans>
        </h2>
        <p>
          <Trans>
            Depending on how you use the service, we process your email
            address, password hash, user ID, username, profile information,
            messages, reactions, uploaded files, server and channel
            memberships, reports, moderation records, session/device
            information, and—if payments are enabled—subscription and payment
            status information. The account system also records the IP address
            used when an account is created for account security and abuse
            prevention. We do not receive or store your plaintext password or
            full payment-card number.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Purposes and legal bases</Trans>
        </h2>
        <p>
          <Trans>
            We process account and community data as necessary to perform our
            agreement with you: to authenticate accounts, deliver messages,
            operate servers, and provide requested features. We process
            security, moderation, abuse-prevention, and audit data on the
            legitimate interest of keeping the service safe and reliable. We
            process data when required by law where a legal obligation applies.
            Browser notification and microphone/camera access are controlled by
            your browser and device permissions.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Sharing and international processing</Trans>
        </h2>
        <p>
          <Trans>
            TailsTalk 2 is self-hosted. Data is accessible to the operator and
            authorized infrastructure administrators who need it to run and
            secure the service. Core account, message, server, and file data is
            stored on the operator's MongoDB and MinIO infrastructure. Email
            delivery uses the SMTP provider configured by the operator. If
            payments are enabled, Stripe receives the information needed to
            create and manage a subscription; TailsTalk 2 does not receive or
            store full card numbers. Voice calls use the configured LiveKit
            infrastructure. Optional CAPTCHA, media-proxy, and error-
            diagnostics providers may process the minimum information needed
            for those features.
          </Trans>
        </p>
        <p>
          <Trans>
            If client error reporting is enabled, it may send technical error
            details, browser/device information, the page URL, and a release
            identifier to the configured diagnostic provider; it is not used
            for advertising. We do not sell personal data and the web client
            does not load advertising or third-party analytics scripts.
          </Trans>
        </p>
        <p>
          <Trans>
            Infrastructure may be located outside the European Economic Area.
            If your data is transferred internationally, the operator will use
            an applicable legal transfer mechanism and appropriate safeguards.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Cookies and local storage</Trans>
        </h2>
        <p>
          <Trans>
            The service uses strictly necessary session and security cookies to
            keep you signed in and protect requests. The client may also use
            local browser storage for settings, drafts, update notices, and
            other functionality you request. These mechanisms are not used to
            track you across unrelated websites, and you can clear local
            browser data through your browser settings.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Where information comes from</Trans>
        </h2>
        <p>
          <Trans>
            Most information comes directly from you when you create an
            account, update your profile, send messages, upload files, join or
            create communities, submit reports, or contact support. Additional
            information is generated by using the service, such as session,
            security, moderation, and delivery records. Some information may
            come from other users when they mention you, report content, or
            interact with shared communities.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Children and age</Trans>
        </h2>
        <p>
          <Trans>
            TailsTalk 2 is a general-audience service and is not directed at
            children under 13. We do not knowingly request or intentionally
            collect children's personal information. If a parent or guardian
            believes a child has provided personal information, contact{" "}
            <a href="mailto:tails1154@tails1154.com">
              tails1154@tails1154.com
            </a>{" "}
            with the account identifier so we can verify the request and take
            appropriate action, including deletion where required.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Automated decisions</Trans>
        </h2>
        <p>
          <Trans>
            TailsTalk 2 does not make solely automated decisions that produce
            legal effects or similarly significant effects about you. Automated
            safeguards such as rate limits, spam controls, and security checks
            may restrict activity temporarily to protect the service; you may
            contact the operator if you believe one was applied incorrectly.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Retention</Trans>
        </h2>
        <p>
          <Trans>
            We keep account and community content while it is needed to provide
            the service or until you request deletion, subject to content kept
            for safety, legal claims, or legal obligations. Account deletion is
            confirmed by email and then scheduled with a seven-day grace period
            before the account, owned servers, and authored messages are
            removed. Sessions are kept until they expire or are revoked. Audit
            logs are configured to expire after 30 days. Security records,
            including account-registration IP data, are retained only for as
            long as needed for abuse prevention and account security, then
            removed or anonymized. Backups may retain deleted data until the
            relevant backup is rotated.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Your rights</Trans>
        </h2>
        <p>
          <Trans>
            Subject to legal exceptions, you may request access, correction,
            deletion, restriction, portability, or object to processing. You
            may also withdraw consent where processing relies on consent. To
            request deletion, use the{" "}
            <a href="/delete-account">account-deletion page</a>. To request a
            <a href="mailto:tails1154@tails1154.com?subject=GDPR%20data%20access%20request">
              copy of your data
            </a>{" "}
            or exercise another right, email us from the address associated with
            your account; we may verify your identity before responding. We aim
            to respond without undue delay and generally within one month. You
            may also complain to your local data-protection supervisory
            authority.
          </Trans>
        </p>
      </Section>
      <Section>
        <h2>
          <Trans>Security and changes</Trans>
        </h2>
        <p>
          <Trans>
            We use access controls, password hashing, session revocation, and
            encrypted HTTPS connections. No online service can guarantee
            absolute security; report suspected security or privacy issues
            promptly. Material policy changes will be posted here with a new
            update date.
          </Trans>
        </p>
      </Section>
    </PublicPage>
  );
}
