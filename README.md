# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)

A nifty tool that lets you see who doesn't follow you back on Instagram, and unfollow them in bulk.  
<u>Browser-based and requires no downloads or installations!</u>

## 📖 User guide

Full instructions live in the [user guide](https://isaaczhang2021.github.io/InsUnfollowingTool/guide/):
workflow, every sidebar control, auto queue pacing, failure cooldown, and what to do when Instagram
rate limits you. This README only covers getting started.

## 🚀 Getting started

1. Copy the script from [this fork's page](https://isaaczhang2021.github.io/InsUnfollowingTool/)

    Use this page, not the upstream one — upstream has no auto queue, pace debug, bulk whitelist, or
    failure cooldown. A script already pasted in the console never hot-updates, so re-copy after every
    merge and Pages deploy.

2. Go to the Instagram website and log in
3. Open the developer console (Windows `Ctrl + Shift + J`, macOS `⌘ + ⌥ + I`)
4. Paste the script, press enter, then click **Run Scan**

    <img src="./assets/results.png" alt="Results screen" />

Android users can install the [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/),
open Instagram web in it, and follow the same steps.

## 🔁 Reviewing offline first

`Following Seg.py` (Streamlit, in this repo) lets you review and tag your following list offline and
export a keep-list as `whitelist_users.json`. Import it via **Settings → Whitelist → Import**, filter
the **Non-Whitelisted** tab, then press **Unfollow all matching**. The
[user guide](https://isaaczhang2021.github.io/InsUnfollowingTool/guide/) walks through the whole flow.

## ✨ Features

- 🔍 Scan and identify users who don't follow you back
- 🤍 Whitelist system, including bulk whitelisting from the scan list
- 💾 Export/Import whitelist for backup and transfer
- 📄 Configurable page size so you can review 20 or 200 accounts at a time
- 🛑 Per run unfollow cap, so a large selection is processed in safe batches
- 🚀 Auto queue: unfollow all matching non-whitelisted accounts with adaptive pacing
- 🧊 Automatic cooldown and resume after repeated unfollow failures
- 🧪 Pause to edit unfollow intervals; log shows each wait and after-5 break
- 🔒 All data stored locally in your browser — no external servers

## 🛠️ Development

- Node version: 16.14.0 (If using nvm, run `nvm use`)
- After modifying `main.tsx`, run `npm run build` to format, compress, and embed the script
- Automatic re-building can be done using `nodemon build-dev`
- GitHub Actions publishes the whole `public/` directory (Copy page + guide) to Pages

## ⚖️ Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.

⚠️ Use at your own risk!

📜 Licensed under the [MIT License](LICENSE)
