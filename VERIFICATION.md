# Verification report

Date of this pass: **2026-10-28**. Method: for each guide I fetched the provider's official documentation (and the [Composio managed-auth directory](https://docs.composio.dev/toolkits/managed-auth)), compared it with what the guide claimed, and recorded what was **confirmed**, **corrected**, or **could not be verified**. The same record is shown inside every guide under *What was verified*.

Five guides added later (Linear, Discord, Asana, Figma, Stripe Apps) were written directly from the official docs, so they have no "corrected" items. Live endpoint tests (see below) were also run against all 17 providers' OAuth authorization and token endpoints.

**What this is not:** I did not register OAuth apps with any provider or click through their consoles. Documentation was read through an automated fetch-and-summarise tool, so a page that failed to load or that omits a topic is reported as *unverified*, never assumed correct.

## Summary

| Guide | Status | Confirmed | Corrected | Unverified |
|---|---|---|---|---|
| Airtable | Not re-checked | 1 | 0 | 1 |
| Asana | Checked against docs | 7 | 0 | 1 |
| Discord | Checked against docs | 7 | 0 | 2 |
| Dropbox | Checked against docs | 4 | 0 | 1 |
| Figma | Checked against docs | 6 | 0 | 2 |
| GitHub | Checked against docs | 5 | 3 | 2 |
| Google | Checked against docs | 8 | 2 | 3 |
| HubSpot | Checked against docs | 4 | 1 | 2 |
| Linear | Checked against docs | 7 | 0 | 2 |
| LinkedIn | Checked against docs | 5 | 2 | 3 |
| Microsoft | Not re-checked | 1 | 0 | 1 |
| Notion | Checked against docs | 5 | 3 | 2 |
| Salesforce | Not re-checked | 1 | 0 | 2 |
| Slack | Checked against docs | 5 | 3 | 2 |
| Stripe | Checked against docs | 7 | 0 | 2 |
| Twitter / X | Checked against docs | 4 | 4 | 3 |
| Zoom | Checked against docs | 6 | 2 | 2 |

## Headline corrections

These were wrong in the first version of the library and are fixed:

1. **Twitter / X — Composio managed auth.** The guide said managed auth was available. The directory lists *Twitter* and *X MCP* under *bring your own OAuth app*. Flag corrected to `false`.
2. **LinkedIn — Composio managed auth.** The guide said Composio does **not** have managed auth for LinkedIn. The directory lists LinkedIn as managed. Flag, key fact and blocker corrected.
3. **Twitter / X — pricing and approval.** The guide described Free / Basic ($100) / Pro ($5,000) tiers and a manual developer-portal approval. X's current docs describe sign-up at `console.x.com`, accepting the Developer Agreement, and pay-per-usage credits, with no review step. Steps, URLs, difficulty (hard → medium) and approval were rewritten; remaining uncertainty is listed in the guide.
4. **Slack — distribution.** The guide said any app can be installed in workspaces without approval. Slack's docs say non-distributed apps install only in the owning workspace (`invalid_team_for_non_distributed_app`). Also corrected: redirect URLs need not be an exact match (a subdirectory is allowed).
5. **Notion — review timeline and requirements.** The guide asserted a 1–5 business day review and a mandatory website/privacy policy. Notion's docs say the authorization URL appears after submitting the connection for review but give no timeline or such requirements. Those claims were removed and flagged unverified; added that installation scope is immutable.
6. **Zoom — app types and timeline.** "User-managed / Account-level OAuth" is outdated: Zoom's docs describe *General* and *Server-to-Server* apps. The 3–10 business day review is not stated by the page checked and is now flagged unverified (confidence downgraded to *uncertain*).
7. **Google — facts we could not source.** The $4K–$75K cost, "CASA Tier 2" naming, 4–6 week duration and 100-user testing limit are not stated on the Google pages checked. They were removed from the key facts and flagged. Added requirements the guide missed: homepage must not be only a login page, Search Console domain verification, AI-training consent shown in the demo video, annual re-verification.
8. **Confidence badges.** Nine guides previously carried "verified" without being re-checked. Confidence now reflects this pass: only GitHub is `verified`; the rest are `source_supported` (or `uncertain` for Zoom).
9. **"What the agent did" logs.** Library guides previously showed hand-written agent logs. They now list only what this verification pass actually did.

## Per-guide detail

### Airtable
- **Status:** Not re-checked · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Airtable is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Setup steps, requirements and approval timeline were written from public documentation and have NOT been re-checked against live sources in this verification pass

### Asana
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://developers.asana.com/docs/oauth>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Apps are registered in the developer console (My apps); client secret can be reset from the OAuth tab
  - ✅ HTTPS redirect URLs; localhost/native need PKCE (S256)
  - ✅ Scopes use resource:action; forbidden_scopes when unregistered; requests are not additive
  - ✅ Access tokens last 1 hour; refresh tokens supported
  - ✅ Authorize https://app.asana.com/-/oauth_authorize; token https://app.asana.com/-/oauth_token
  - ✅ The OAuth page describes no app review process
  - ✅ Asana is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Distribution / app-directory approval steps and timelines (separate page not checked)

### Discord
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.discord.com/developers/topics/oauth2>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Applications are registered to obtain client_id/client_secret; a bot user is added automatically
  - ✅ Some scopes require Discord approval and are partner-only
  - ✅ Authorize https://discord.com/oauth2/authorize; token https://discord.com/api/oauth2/token
  - ✅ Requests must be application/x-www-form-urlencoded
  - ✅ Discovery documents are published at /.well-known/oauth-authorization-server and /.well-known/openid-configuration
  - ✅ Example token lifetime is 7 days with refresh tokens
  - ✅ Discord is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Bot verification requirements and timeline (page only links to a guide)
  - ❓ App-level review for public distribution of non-bot OAuth apps

### Dropbox
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.dropboxapi.com/dropbox-api/docs/oauth>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Redirect URIs must be registered in the App Console and match the authorization request
  - ✅ Scopes are selected in the Permissions tab; request the minimum needed
  - ✅ Legacy app permission types are deprecated; Dropbox recommends scoped apps
  - ✅ Dropbox is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Development vs production status, user limits and production-approval timeline (1–5 days) — the page checked does not cover them

### Figma
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://developers.figma.com/docs/rest-api/oauth-apps/>, <https://developers.figma.com/docs/rest-api/authentication/>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ App creation under My Apps, associated with a team/org; secret shown once
  - ✅ Redirect URLs and scopes are configured on the app; authorization may request a subset of scopes
  - ✅ Draft apps authorize only you and plan admins; private apps publish without review; public apps need review
  - ✅ Authorize https://www.figma.com/oauth; token https://api.figma.com/v1/oauth/token; refresh https://api.figma.com/v1/oauth/refresh
  - ✅ Codes expire after 30 seconds; access tokens last 90 days
  - ✅ Figma is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Public-app review duration and criteria
  - ❓ Whether a privacy policy or website is mandatory for public apps (the page lists a description, logo and testing instructions)

### GitHub
- **Status:** Checked against docs · **Confidence:** `verified` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Registration path: Settings → Developer settings → OAuth apps → New OAuth App
  - ✅ Required fields: application name, homepage URL, authorization callback URL
  - ✅ The docs describe no review or approval step
  - ✅ A user or organization can own up to 100 OAuth apps
  - ✅ GitHub is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Callback URLs: up to 10 are allowed (guide implied a single exact URL) — updated
  - 🛠 Added: GitHub recommends GitHub Apps first, and OAuth Apps can only act on behalf of a user
  - 🛠 Added: user access tokens expire by default
- **Could not verify:**
  - ❓ "Rate limits are shared across all users of your app" (not on the checked page)
  - ❓ Composio custom-auth configuration steps (not exercised)

### Google
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://support.google.com/cloud/answer/13463073>, <https://support.google.com/cloud/answer/13464321>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Sensitive and restricted scopes must complete OAuth app verification before access is granted
  - ✅ Homepage on a verified domain, not only a login page, linking the privacy policy
  - ✅ Privacy policy on the homepage domain and linked from the consent screen
  - ✅ Domain verification via Google Search Console for all authorized domains
  - ✅ Demo video of the end-to-end flow for sensitive/restricted scopes (consent screen in English, exact scopes)
  - ✅ Scope justification (why narrower scopes will not work)
  - ✅ Restricted-scope apps must pass an annual security assessment by a Google-empanelled assessor
  - ✅ Gmail, Google Drive and Google Calendar are listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Added: annual re-verification, homepage-not-just-login rule, Search Console domain verification, AI-training consent in the demo video
  - 🛠 Reworded the key facts: removed the "CASA Tier 2" name and the cost as stated facts, since the pages checked do not state them
- **Could not verify:**
  - ❓ The 4–6 week timeline (Google states none; community-reported only)
  - ❓ The $4,000–$75,000 assessment cost range and the "CASA Tier 2" naming (not on the pages checked)
  - ❓ The "100-user limit" in Testing mode (not on the pages checked)

### HubSpot
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://developers.hubspot.com/docs/api/oauth-quickstart-guide>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ A developer account and an app are required; production redirect_uri must use https
  - ✅ Installing user must be a Super Admin with access to all requested scopes
  - ✅ optional_scope is dropped if the portal lacks access to those products
  - ✅ HubSpot is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Added: the quickstart applies to legacy public apps; newer developer-platform apps use a separate guide
- **Could not verify:**
  - ❓ Whether HubSpot reviews a public app before customer installs, and the 2–5 day timeline (page does not cover it)
  - ❓ Step-by-step app creation in the portal (page does not cover it)

### Linear
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://linear.app/developers/oauth-2-0-authentication>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ OAuth applications are created at linear.app/settings/api/applications/new with redirect callback URLs
  - ✅ Scopes: read (default), write, narrower scopes, admin
  - ✅ actor=user vs actor=app
  - ✅ Authorization-code tokens last 24 hours; refresh token flow with 30-minute grace period
  - ✅ Client-credentials tokens last 30 days and must be enabled
  - ✅ Authorize endpoint linear.app/oauth/authorize; token endpoint api.linear.app/oauth/token
  - ✅ Linear is listed as Composio-managed OAuth (the separate "Linear MCP" entry is bring-your-own)
- **Could not verify:**
  - ❓ Whether a website, privacy policy or review is needed to list the app publicly (the page describes none)
  - ❓ Rate limits and plan restrictions

### LinkedIn
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Scopes available to your app depend on the Products you have access to; new Products are applied for under the Products tab
  - ✅ Redirect URLs must be absolute HTTPS; parameters ignored; no #
  - ✅ Authorization code expires after 30 minutes; access tokens last 60 days
  - ✅ Programmatic refresh tokens are available only to a limited set of partners
  - ✅ LinkedIn is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Corrected: the guide said Composio has NO managed auth for LinkedIn — the directory lists LinkedIn (flag and blocker fixed)
  - 🛠 Added: token and code lifetimes, redirect URL rules
- **Could not verify:**
  - ❓ The 1–4 week product-approval timeline (not published)
  - ❓ Company Page requirement for creating an app (not on the page checked)
  - ❓ Marketing Partner restrictions and rate-limit claims

### Microsoft
- **Status:** Not re-checked · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Outlook, Microsoft Teams and OneDrive are listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Setup steps, requirements and approval timeline were written from public documentation and have NOT been re-checked against live sources in this verification pass

### Notion
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://developers.notion.com/docs/authorization>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Internal connections use a static token and have no OAuth flow; public connections use OAuth 2.0
  - ✅ The authorization URL only populates after a public connection is submitted for review
  - ✅ Each user authorizes individually and shares specific pages; authorization URL uses owner=user
  - ✅ Token exchange uses HTTP Basic auth; access and refresh tokens are returned
  - ✅ Notion is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Corrected: "1–5 business days" review timeline removed — Notion publishes none
  - 🛠 Removed: live website / privacy policy as hard requirements — not stated on the page checked
  - 🛠 Added: installation scope is immutable after creation; terminology is now "connections"
- **Could not verify:**
  - ❓ Exact review criteria and whether a privacy policy, terms, or support email are mandatory
  - ❓ Current portal URL (notion.so/my-integrations may have moved)

### Salesforce
- **Status:** Not re-checked · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Salesforce is listed as Composio-managed OAuth
- **Could not verify:**
  - ❓ Setup steps, requirements and approval timeline were written from public documentation and have NOT been re-checked against live sources in this verification pass
  - ❓ Attempted to check Salesforce Help: the page failed to load, so nothing was confirmed

### Slack
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.slack.dev/authentication/installing-with-oauth>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Bot tokens use the scope parameter; user tokens use user_scope; both can be requested in one flow
  - ✅ redirect_uri must be HTTPS and must match or be a subdirectory of a configured Redirect URL
  - ✅ Authorization codes expire after ten minutes
  - ✅ Non-distributed apps can only be installed in the owning workspace
  - ✅ Slack is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Corrected: "any app can be installed without approval" — only in the owning workspace unless distribution is enabled
  - 🛠 Corrected: redirect URLs need not be an exact match (a subdirectory is allowed)
  - 🛠 Added: unapproved_scope errors imply scope review in some cases
- **Could not verify:**
  - ❓ The 1–7 day App Directory review timeline (no timeline on the pages checked)
  - ❓ Socket Mode and paid-plan requirement for admin scopes (not on the pages checked)

### Stripe
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `True`
- **Checked against:** <https://docs.stripe.com/stripe-apps/api-authentication/oauth>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Manifest fields: stripe_api_access_type=oauth, distribution_type=public, allowed_redirect_uris
  - ✅ External test links for testing before publishing
  - ✅ Install link https://marketplace.stripe.com/oauth/v2/authorize with client_id, redirect_uri, state
  - ✅ Code valid 5 minutes, one-time use; exchange at https://api.stripe.com/v1/oauth/token with the secret key
  - ✅ Access token 1 hour; refresh token 1 year, rolled on every exchange
  - ✅ Submitting for review is required to publish on the Marketplace
  - ✅ Stripe is listed as Composio-managed OAuth (the separate "Stripe MCP" entry is bring-your-own)
- **Could not verify:**
  - ❓ Marketplace review duration and acceptance criteria
  - ❓ Differences from Stripe Connect OAuth (not covered by the page checked)

### Twitter / X
- **Status:** Checked against docs · **Confidence:** `source_supported` · **Managed auth flag:** `False`
- **Checked against:** <https://docs.x.com/resources/fundamentals/developer-portal>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ Sign up at console.x.com and accept the Developer Agreement
  - ✅ Create an app with "New App"; credentials are shown only once and regenerating invalidates the old ones
  - ✅ Pay-per-usage billing from prepaid credits, no monthly fee
  - ✅ Twitter / X is NOT in the Composio managed OAuth list (bring your own OAuth app)
- **Corrected:**
  - 🛠 Corrected: the guide said Composio managed auth was available — it is not
  - 🛠 Corrected: portal moved from developer.twitter.com to console.x.com
  - 🛠 Corrected: fixed Free/Basic($100)/Pro($5,000) tiers replaced by documented pay-per-usage credits
  - 🛠 Corrected: removed the claimed manual "developer portal approval" step — none is documented; difficulty lowered from hard to medium
- **Could not verify:**
  - ❓ Whether any manual approval still applies to some accounts or use cases
  - ❓ Free-credit amounts and per-endpoint prices
  - ❓ OAuth 2.0 (PKCE) configuration details — the page does not explain them

### Zoom
- **Status:** Checked against docs · **Confidence:** `uncertain` · **Managed auth flag:** `True`
- **Checked against:** <https://developers.zoom.us/docs/integrations/oauth/>, <https://docs.composio.dev/toolkits/managed-auth>
- **Confirmed:**
  - ✅ App types are General (authorization code, device, chatbot, PKCE) and Server-to-Server (account_credentials grant, 1-hour tokens)
  - ✅ Authorization-code refresh tokens last 90 days
  - ✅ Apps can be installed in your own account via Local Test
  - ✅ Zoom has an application review team that tests some production integrations (public clients/PKCE)
  - ✅ Production apps must delete user data after a deauthorization webhook
  - ✅ Zoom is listed as Composio-managed OAuth
- **Corrected:**
  - 🛠 Corrected: app types are now General vs Server-to-Server, not "User-managed / Account-level OAuth"
  - 🛠 Corrected: the review timeline is no longer asserted as fact (3–10 business days unverified)
- **Could not verify:**
  - ❓ The Marketplace publishing review process and its duration
  - ❓ Whether a privacy policy and terms of service URLs are mandatory (not on the page checked)

## Not covered

- **Salesforce:** the Salesforce Help page failed to load during this pass; nothing about its setup was confirmed.
- **Microsoft, Airtable, Salesforce:** only the managed-auth flag was checked; steps and timelines were not re-checked.
- **Review timelines everywhere:** providers rarely publish them; any number shown is labelled community-reported or unverified.
- **Live provider consoles:** no real registration was attempted, so UI-level steps (button names, field order) are as documented, not as observed.

## Live endpoint tests

For every library guide the agent can send deliberately invalid OAuth requests (an unregistered `client_id`, a bogus authorization code) to the provider's real authorization and token endpoints (`POST /api/probe`, shown as *Live endpoint check* on each guide). On 2026-10-28 all 17 providers' endpoints responded; 16 of 17 token endpoints rejected the invalid credentials with an OAuth error (GitHub answered HTTP 415 to the form post), and GitHub's authorization endpoint returned HTTP 403 to the automated request. This confirms the endpoints are live and registration is enforced; it does not test any account-specific flow.

## Machine checks on generated guides

Live-generated guides also run automated probes (`backend/agent/probe.py`): every URL the guide cites is fetched to see if it is reachable, and the provider's `/.well-known/openid-configuration` is probed for OAuth endpoints. These results appear in the guide's *Agent log* and *What was verified* sections; everything else in a generated guide is model-written from search results and is labelled accordingly.
