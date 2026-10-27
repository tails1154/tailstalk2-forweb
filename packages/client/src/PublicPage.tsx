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

function PublicPage(props: { title: string; children: JSX.Element }) {
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
        This page explains the information TailsTalk 2 processes to provide the
        service.
      </p>
      <Section>
        <h2>Information we process</h2>
        <p>
          Depending on how you use TailsTalk 2, this can include your account
          details, messages, uploaded files, server membership, and device or
          session information.
        </p>
      </Section>
      <Section>
        <h2>How it is used</h2>
        <p>
          This information is used to authenticate you, deliver messages and
          notifications, secure the service, and provide the features you
          request.
        </p>
      </Section>
      <Section>
        <h2>Your choices</h2>
        <p>
          You can manage your account and sessions from settings. To ask a
          privacy question or request help with your data, contact
          tails1154@tails1154.com.
        </p>
      </Section>
      <Section>
        <h2>Updates</h2>
        <p>
          This policy may be updated as TailsTalk 2 changes. Material changes
          will be posted on this page.
        </p>
      </Section>
    </PublicPage>
  );
}
