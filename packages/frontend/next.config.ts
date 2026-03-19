import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

// Only wrap with Sentry if org and project are configured
const hasSentryConfig = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT;

export default hasSentryConfig
  ? withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
  })
  : nextConfig;
