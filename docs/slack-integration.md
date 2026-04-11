# Slack Integration

Infralane integrates with Slack for three capabilities:

1. **Sign in with Slack** — OAuth-based login that automatically links Slack identity
2. **DM Notifications** — Every in-app notification is also sent as a Slack DM
3. **Channel Notifications** — Automation rules can send messages to Slack channels
4. **Interactive Approvals** — Approve/reject requests directly from Slack

## Setup Guide

### Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Name it "Infralane" (or your preferred name)
4. Select your Slack workspace
5. Click **Create App**

### Step 2: Configure OAuth & Permissions

1. In the Slack app settings, go to **OAuth & Permissions**
2. Under **Redirect URLs**, add:
   ```
   http://localhost:3000/api/auth/slack/callback
   ```
   For production, add your production URL:
   ```
   https://your-domain.com/api/auth/slack/callback
   ```
3. Under **Bot Token Scopes**, add:
   - `chat:write` — Send DM notifications and channel messages
   - `users:read` — Read user profiles
   - `users:read.email` — Read user email for account linking
4. Under **User Token Scopes**, you don't need any.

### Step 3: Enable Sign in with Slack

1. Go to **OpenID Connect** in the sidebar (under Features)
2. Toggle it **On**
3. Add the same redirect URL as above

### Step 4: Configure Interactivity (for approval buttons)

1. Go to **Interactivity & Shortcuts**
2. Toggle **Interactivity** to **On**
3. Set the **Request URL** to:
   ```
   http://localhost:3000/api/integrations/slack/interactions
   ```
   For production:
   ```
   https://your-domain.com/api/integrations/slack/interactions
   ```

### Step 5: Install the App to Your Workspace

1. Go to **Install App** in the sidebar
2. Click **Install to Workspace**
3. Authorize the app
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 6: Get App Credentials

1. Go to **Basic Information**
2. Note the following:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

### Step 7: Configure Infralane Environment

Add to your `.env` or `compose.yaml`:

```env
# OAuth login
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Base URL for redirect URIs and notification links
INFRALANE_BASE_URL=http://localhost:3000
```

### Step 8: Configure Integration in Infralane UI

1. Log in as an **ADMIN**
2. Go to **Settings > Integrations**
3. Fill in:
   - **Incoming Webhook URL**: (Optional) Create one at Slack > Your App > Incoming Webhooks. Used for channel-level SLACK_NOTIFY actions.
   - **Bot Token**: Paste the `xoxb-...` token from Step 5. Required for DM notifications and interactive approvals.
   - **Signing Secret**: Paste from Step 6. Used to verify Slack interactive payloads.
   - **Default Channel**: e.g., `#ops-alerts`. Used when SLACK_NOTIFY action doesn't specify a channel.
4. Toggle **Enable Slack integration** on
5. Click **Save**

## How Each Feature Works

### Sign in with Slack

```
User clicks "Sign in with Slack" on login page
  → Redirects to Slack OAuth consent screen
  → User authorizes
  → Slack redirects to /api/auth/slack/callback with authorization code
  → Infralane exchanges code for token + user info (email, name, Slack user ID)
  → If email matches existing user: links slackUserId, creates session
  → If no match: creates new REQUESTER account with slackUserId
  → Redirects to /tickets
```

CSRF protection: A random `state` parameter is stored in a short-lived cookie and validated on callback.

New users created via Slack login get the REQUESTER role. An admin must promote them to OPERATOR or ADMIN in Settings > Team.

### DM Notifications

Every call to `createNotification()` triggers a Slack DM if:

1. The target user has a `slackUserId` (set automatically via Slack login, or manually by admin in Settings > Team)
2. The Slack integration is enabled with a bot token

The DM includes:
- Notification title (bold)
- Message text
- Link back to the relevant ticket in Infralane

This is fire-and-forget — if the Slack API call fails, the in-app notification is still created.

### Channel Notifications (SLACK_NOTIFY Action)

Create an automation rule with action `SLACK_NOTIFY`:
- **Action Value**: Channel name (e.g., `#incidents`) or leave empty for default channel
- The message includes the rule name, ticket reference, and a link

Requires the Incoming Webhook URL or Bot Token to be configured.

### Interactive Approvals

When an approval-required automation fires, you can optionally send an interactive Slack message with Approve/Reject buttons.

The flow:
1. Rule fires → job created as PENDING_APPROVAL → ApprovalRequest created
2. (Your custom rule or code calls `postInteractiveApproval()`)
3. Slack message appears with Approve/Reject buttons
4. User clicks a button → Slack sends payload to `/api/integrations/slack/interactions`
5. Endpoint maps Slack user → Infralane user via `slackUserId`
6. Verifies user has `approvals:decide` permission (OPERATOR or ADMIN)
7. Calls `approveRequest()` or `rejectRequest()`
8. Slack message updates to show "Approved by X" or "Rejected by X"

**Security**: If the Slack user is not linked to an Infralane OPERATOR/ADMIN account, the action is rejected with an ephemeral "Not authorized" message.

## Team Page: Slack Status

In **Settings > Team**, each user shows a Slack column:
- **Linked** (green): User has a `slackUserId` — will receive Slack DMs
- **—**: Not linked — only gets in-app notifications

Users who log in via Slack are automatically linked. For users who use password login, an admin can manually set the Slack User ID via the team API.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Sign in with Slack" returns error | Check `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set correctly |
| OAuth callback fails with `invalid_state` | Cookie may have expired (5min). Try again. |
| DMs not being sent | Verify bot token is set in Settings > Integrations and integration is enabled |
| User not receiving DMs | Check if user has `slackUserId` (Settings > Team > Slack column). They may need to log in via Slack once. |
| Interactive buttons not working | Check Interactivity Request URL in Slack app settings points to your `/api/integrations/slack/interactions` |
| "Not authorized" on Slack button click | The Slack user's account is not linked to an Infralane OPERATOR/ADMIN. Log in via Slack first, then have an admin promote the role. |
