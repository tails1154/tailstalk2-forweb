import { JSX, onMount } from "solid-js";

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
              href="http://tails1154.com:9782/docs/aup.html"
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
      <Heading>Privacy Policy</Heading>
      <p>
        <strong>Last updated: November 3, 2026.</strong> This policy explains
        what TailsTalk 2 processes, why we process it, and how you can exercise
        your data-protection rights.
      </p>
      <Section>
        <h2>Who is responsible</h2>
        <p>
          The controller is the TailsTalk 2 operator, Tails1154. For privacy
          questions or rights requests, contact
          <a href="mailto:tails1154@tails1154.com"> tails1154@tails1154.com</a>.
          No data-protection officer has been appointed.
        </p>
      </Section>
      <Section>
        <h2>Information we process</h2>
        <p>
          Depending on how you use the service, we process your email address,
          password hash, user ID, username, profile information, messages,
          reactions, uploaded files, server and channel memberships, reports,
          moderation records, and session/device information. The account
          system also records the IP address used when an account is created
          for account security and abuse prevention. We do not receive or store
          your plaintext password.
        </p>
      </Section>
      <Section>
        <h2>Purposes and legal bases</h2>
        <p>
          We process account and community data as necessary to perform our
          agreement with you: to authenticate accounts, deliver messages,
          operate servers, and provide requested features. We process security,
          moderation, abuse-prevention, and audit data on the legitimate
          interest of keeping the service safe and reliable. We process data
          when required by law where a legal obligation applies. Browser
          notification and microphone/camera access are controlled by your
          browser and device permissions.
        </p>
      </Section>
      <Section>
        <h2>Sharing and international processing</h2>
        <p>
          TailsTalk 2 is self-hosted. Data is accessible to the operator and
          authorized infrastructure administrators who need it to run and
          secure the service. The service may also use configured providers for
          email delivery, CAPTCHA, file/media storage, or other requested
          features. We do not sell personal data and the web client does not
          load advertising or third-party analytics scripts.
        </p>
        <p>
          Infrastructure may be located outside the European Economic Area. If
          your data is transferred internationally, the operator will use an
          applicable legal transfer mechanism and appropriate safeguards.
        </p>
      </Section>
      <Section>
        <h2>Retention</h2>
        <p>
          We keep account and community content while it is needed to provide
          the service or until you request deletion, subject to content kept
          for safety, legal claims, or legal obligations. Sessions are kept
          until they expire or are revoked. Audit logs are configured to expire
          after 30 days. Security records, including account-registration IP
          data, are retained only for as long as needed for abuse prevention and
          account security, then removed or anonymized. Backups may retain
          deleted data until the relevant backup is rotated.
        </p>
      </Section>
      <Section>
        <h2>Your rights</h2>
        <p>
          Subject to legal exceptions, you may request access, correction,
          deletion, restriction, portability, or object to processing. You may
          also withdraw consent where processing relies on consent. To request
          deletion, use the
          <a href="/delete-account"> account-deletion page</a>. For other
          requests, email us from the address associated with your account;
          we may verify your identity before responding. We aim to respond
          without undue delay and generally within one month. You may also
          complain to your local data-protection supervisory authority.
        </p>
      </Section>
      <Section>
        <h2>Security and changes</h2>
        <p>
          We use access controls, password hashing, session revocation, and
          encrypted HTTPS connections. No online service can guarantee absolute
          security; report suspected security or privacy issues promptly.
          Material policy changes will be posted here with a new update date.
        </p>
      </Section>
    </PublicPage>
  );
}
