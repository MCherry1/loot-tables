# CherryKeep Operations Runbook

Step-by-step instructions for every operational task — merging PRs, rotating the auth password, running sync, deploying, and the one-time setup steps that are currently pending. Written for someone who isn't a coder: copy commands verbatim, paste into the terminal, hit Enter.

> ⚠️ **If anything below doesn't match what you see on screen, STOP and ask the agent before running the next command.** Don't guess.

---

## Table of contents

1. [One-time local setup](#1-one-time-local-setup)
2. [Merging a pull request on GitHub](#2-merging-a-pull-request-on-github)
3. [Rotating the CherryKeep auth password](#3-rotating-the-cherrykeep-auth-password)
4. [Running `npm run sync` to refresh 5etools data](#4-running-npm-run-sync-to-refresh-5etools-data)
5. [Verifying a deploy after merging](#5-verifying-a-deploy-after-merging)
6. [Common problems](#6-common-problems)

---

## 1. One-time local setup

Do this once, the first time you want to run commands on the repo from your own machine. Skip this section if you've already done it before.

### 1a. Install the tools

You need four things on your machine:

- **Git** — for talking to GitHub.
- **Node.js version 20 or newer** — for running the project's scripts.
- **A terminal** (Terminal.app on Mac, Windows Terminal on Windows, any terminal on Linux).
- **A code editor** (VS Code is free and good enough; any plain-text editor works).

On macOS:

```
# Install Homebrew if you don't have it.
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install git and node.
brew install git node
```

On Windows: download and run the installers from <https://git-scm.com/download/win> and <https://nodejs.org/en/download/>.

After installing, **close and reopen the terminal**, then confirm both are available:

```
git --version
node --version
```

If both print a version number, you're good.

### 1b. Clone the repo

Pick a folder where you keep your projects (e.g. `~/Projects`). Then:

```
cd ~/Projects
git clone https://github.com/MCherry1/loot-tables.git
cd loot-tables
```

You now have a local copy of the repo inside `~/Projects/loot-tables`.

### 1c. Install project dependencies

From inside the `loot-tables` folder:

```
npm install
```

This downloads everything the project needs. It takes a minute or two and will print a lot of lines. You only need to re-run it when the agent tells you the project's dependencies changed (rare).

### 1d. Make sure git knows who you are

```
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Use the same email you use on GitHub.

---

## 2. Merging a pull request on GitHub

The agent doesn't merge PRs — you do. Here's the full process for any PR the agent opens:

1. Open the PR in your browser. The agent always gives you the URL, e.g. `https://github.com/MCherry1/loot-tables/pull/31`.
2. Read the description at the top. If anything in the "Before you ship" or "Needs your verification" sections applies, do it **before** merging (for PR #31 in particular, see section 3 of this runbook).
3. Scroll down to the **"Files changed"** tab to skim the diff if you want. You don't have to understand every line — just look for obvious red flags.
4. Go back to the **"Conversation"** tab. Scroll to the bottom where the green merge button lives.
5. Click **"Merge pull request"** → **"Confirm merge"**.
6. After the merge succeeds, click **"Delete branch"** to keep things tidy.
7. GitHub Pages will automatically rebuild the site and redeploy. That takes 1-2 minutes. The status shows on the repo's **Actions** tab (top nav). Wait until the latest run is green before you test anything.

If the merge button is **gray / disabled**, there are merge conflicts with another PR. Tell the agent and they'll rebase.

---

## 3. Rotating the CherryKeep auth password

This is the **most important** thing to do after merging PR #31. The PR ships with an encrypted blob using the placeholder password `changeme-dev-password`, which means anyone who looks at the public GitHub repo can figure it out. You need to replace it with a real password of your choosing before you rely on it for anything.

**What you'll need before starting:**
- A local clone of the repo (section 1 above, one-time setup).
- A password you've picked. Write it down somewhere safe (password manager, sticky note, whatever works for you). **Losing this password means losing access to every description until you rotate again.**

### Step-by-step

1. Open your terminal and move into the repo folder:

   ```
   cd ~/Projects/loot-tables
   ```

2. Make sure your local copy is up to date with GitHub:

   ```
   git checkout main
   git pull
   ```

   You should see "Already up to date." or a short list of commits pulled. No errors.

3. Run the encrypt script with your real password. Replace `YOUR-REAL-PASSWORD-HERE` with the password you picked, keeping the quotes:

   **On macOS/Linux:**
   ```
   CHERRYKEEP_PASSWORD="YOUR-REAL-PASSWORD-HERE" npm run encrypt
   ```

   **On Windows (PowerShell):**
   ```
   $env:CHERRYKEEP_PASSWORD="YOUR-REAL-PASSWORD-HERE"; npm run encrypt
   ```

   You should see output ending with:

   ```
   wrote public/data/item-public.json
   wrote public/data/item-srd-descriptions.json
   wrote public/data/item-protected.enc
   wrote public/data/item-protected.meta.json

   Done.
   ```

4. Stage the changed files for commit:

   ```
   git add public/data/
   ```

5. Commit the new encrypted blob:

   ```
   git commit -m "Rotate CherryKeep auth password"
   ```

6. Push to GitHub:

   ```
   git push
   ```

7. Wait 1–2 minutes for GitHub Pages to redeploy (check the **Actions** tab on the repo page).

8. Open `https://cherrykeep.com` in a **private / incognito browser window** (this guarantees you're starting from scratch with no cached password).

9. Click the small 🔒 lock icon in the top nav bar. A password modal opens.

10. Type the **new** password you just set. Click **Enter**.
    - If it works: the modal closes, the lock icon turns cherry red (🔓). Go check any table and click an item row — you should see a description. **Done. You're rotated.**
    - If it fails: double-check you typed the password exactly right. If that's not it, see section 6 ("Common problems") below.

### IMPORTANT — what not to do

- **Do NOT commit your password anywhere.** The password only lives in the `CHERRYKEEP_PASSWORD` environment variable for the duration of the command, and in your password manager. It should never appear in a file, a commit message, or a GitHub comment.
- **Do NOT use a weak password like `password123`.** Anyone with a copy of the encrypted blob can run offline password guessing against it. Use something you wouldn't mind as the password on an unimportant account — 12+ characters, not a dictionary word.
- **Do NOT share the password in a public channel.** Share it the same way you'd share a Netflix password with a friend — text message, Signal, a note in a shared password manager.
- **Don't skip the `git pull` in step 2.** If you forget, you might commit to a stale branch and push a broken state.

---

## 4. Running `npm run sync` to refresh 5etools data

The Reference view and encrypted descriptions pipeline pull item data from 5etools mirrors. Running `npm run sync` does three things:

1. Clones (or updates) the 5etools mirror repos into a local folder called `5etools-mirror-3/`.
2. Regenerates `data/item-stats.json` and `data/item-stats-2024.json` with the latest item definitions — including the `srd` flag, which is currently missing from the committed files.
3. Reports what changed so you can review new / modified items.

**When to run it:**
- Right after PR #31 merges — to activate the SRD three-tier split (see `warnings-to-discuss-with-agent.md §10`).
- Any time 5etools adds support for a new book / errata.
- Any time you want the system to know about items you've added or changed in 5etools.

### Step-by-step

1. Make sure your local copy is up to date:

   ```
   cd ~/Projects/loot-tables
   git checkout main
   git pull
   ```

2. Run the sync script:

   ```
   npm run sync
   ```

   This takes a few minutes the first time (it's cloning two git repos the size of a novel). You'll see a lot of output. The script ends with a summary of what changed. Look for lines like:

   ```
   ✓ Sync complete
   ```

3. Check what changed with:

   ```
   git status
   ```

   You should see modifications to `data/item-stats.json` and `data/item-stats-2024.json`, and possibly `data/curation.json` and `data/curation-2024.json` if new items were added.

4. Now re-encrypt so the new `srd` flags actually take effect (this is important — without this step, the SRD descriptions stay in the encrypted tier):

   ```
   CHERRYKEEP_PASSWORD="YOUR-REAL-PASSWORD-HERE" npm run encrypt
   ```

   Use the **same real password you set in section 3**. Not the placeholder.

5. Stage everything and commit:

   ```
   git add data/ public/data/
   git commit -m "Sync 5etools data + regenerate encrypted descriptions"
   git push
   ```

6. Wait for the GitHub Pages deploy and verify.

### What this gets you

After this runs for the first time, items flagged as SRD (about 327 out of ~1800) will show their descriptions publicly without needing a login, with a small green "SRD" badge next to the meta line. Non-SRD items (the other ~1500) still require unlocking with the password.

---

## 5. Verifying a deploy after merging

Every time a PR merges, do a quick smoke test to confirm the live site still works. Here's the checklist:

1. **Wait for the Actions tab to show a green checkmark.** Usually 1-3 minutes. Until that's done, the old version is still live.
2. Open `https://cherrykeep.com` in a **private / incognito window** so you're not hitting stale browser caches.
3. Check the browser console (right-click → Inspect → Console tab). Look for red errors. Yellow warnings are usually fine.
4. Check the top nav bar renders correctly:
   - "CherryKeep" brand on the left (visible at desktop widths).
   - Tabs in the middle, the current tab highlighted in cherry red.
   - Lock icon and ☀ ◐ ☾ theme toggle on the right.
5. Click through each tab at least briefly:
   - **Tables** — pick a letter, roll the dice once. You should see an item result.
   - **Reference** — scroll through the list, click one leaf item, confirm the detail panel expands.
   - **Loot Drops** — change party level / size, click Generate. Confirm loot appears.
   - **Settings** — open each accordion, confirm nothing is broken.
   - **About / How it Works / D&Design** — each should render text.
6. If you rotated the password (section 3), test that the lock icon still unlocks with the new password.

If any step fails, capture the error (screenshot + any red text in the console) and send it to the agent.

---

## 6. Common problems

### "npm install" or "npm run encrypt" complains about `command not found`

You probably don't have Node.js installed. See section 1a.

### Git asks for my GitHub username / password and then says "authentication failed"

GitHub stopped accepting passwords for Git over HTTPS years ago. You need a **Personal Access Token** (PAT). Quickest fix:

1. Go to <https://github.com/settings/tokens/new>.
2. Note: "local git"; Expiration: 90 days (or whatever suits you); scopes: tick **`repo`**.
3. Click Generate. Copy the token immediately — you won't see it again.
4. When git asks for your password, paste the token instead of your actual password. (Your username is your GitHub username.)
5. On macOS, your keychain should remember the token. On Windows, Git Credential Manager handles it. On Linux, you may need to install a credential helper — ask the agent if this trips you up.

### The lock icon on the deployed site doesn't do anything when I click it

Try a hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux). If that doesn't fix it, open the browser console (right-click → Inspect → Console). Copy any red error text and send it to the agent.

### The lock icon opens the modal but no password works

Three possibilities, in order of likelihood:

1. **The site is still serving the old deploy.** Wait another minute, then hard-refresh.
2. **You didn't commit and push the new `public/data/` files.** Go back to section 3 and confirm steps 4–6 actually ran. `git status` on your local should show "nothing to commit, working tree clean".
3. **The encrypt command ran with a typo in the password.** Re-run it carefully. Copy-paste rather than retype if possible.

### I pushed something bad and broke the live site

Don't panic. Every commit is recoverable. Ask the agent to revert the commit — they can do it with one command. You can also open the repo's **Actions** tab, find the last successful deploy, and click "Re-run". The previous version of the site will come back.

### The agent asks me to "merge main into your branch" or "rebase"

Tell the agent: "I don't do git merges myself. Please open a PR with the merged result." The agent can do the merge in a worktree and push a fresh branch for you to merge normally via the GitHub UI.

---

## Appendix — commands cheatsheet

These are the only terminal commands you should ever need to run from this runbook. Nothing else is expected of you.

| What | Command |
|---|---|
| Move into the repo folder | `cd ~/Projects/loot-tables` |
| Get latest changes from GitHub | `git checkout main && git pull` |
| Install dependencies (rare) | `npm install` |
| Rotate the password | `CHERRYKEEP_PASSWORD="NEW-PASSWORD" npm run encrypt` |
| Refresh 5etools data | `npm run sync` |
| Stage + commit + push | `git add <paths>` then `git commit -m "message"` then `git push` |
| Check what changed | `git status` |

Anything harder than that — rebases, merge conflicts, reverting commits, fixing broken deploys — ask the agent.
