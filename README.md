# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)

A nifty tool that lets you see who doesn't follow you back on Instagram.  
<u>Browser-based and requires no downloads or installations!</u>

## ⚠️ WARNING

This version utilizes the Instagram API for better performance.  

## 🖥️ Desktop Usage

1. Copy the code from: [InstagramUnfollowers Tool](https://davidarroyo1234.github.io/InstagramUnfollowers/)

2. Press the COPY button to copy the code.

    <img src="./assets/copy_code.png" alt="Copy code button" />

3. Go to Instagram website and log in to your account

4. Open the developer console:
   - Windows: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`

5. Paste the code and you'll see this interface:

    <img src="./assets/initial.png" alt="Initial screen" />

6. Click "RUN" to start scanning

7. After scanning completes, you'll see the results:

    <img src="./assets/results.png" alt="Results screen" />

8. 🤍 Whitelist users by clicking their profile image

9. 💾 Manage your whitelist via Settings:
   - Export: Save your whitelist as a JSON backup file
   - Import: Restore or merge whitelisted users from a file
   - Clear: Remove all users from whitelist
   
   Your whitelist persists between sessions automatically!

    <img src="./assets/settings_whitelist.png" alt="Settings screen" />

10. 📄 Choose how many accounts each page shows with the "Per page" dropdown in the sidebar
    (20 / 30 / 50 / 100 / 120, or any value between 10 and 200 from Settings)

11. ✅ Select users to unfollow using the checkboxes

12. 🛑 Set "Max unfollow this run" to cap how many accounts a single run touches (default 20, up to 100).
    If you select more than the cap, only the first accounts of the selection are unfollowed and the
    rest are left untouched. Whitelisted accounts are never unfollowed.

13. ⚙️ Customize script timings via the "Settings" button:

    <img src="./assets/settings.png" alt="Settings screen" />

## 🔁 Reviewing offline before unfollowing

If you review your following list somewhere else (for example the `Following Seg` Streamlit app in this
repo) and export the accounts you want to keep, you can feed that decision straight into the tool:

1. Export your keep-list as a JSON file of users (`whitelist_users.json`)
2. In the tool, open **Settings → Whitelist → Import** and pick that file
3. Everything you imported moves to the **Whitelisted** tab and disappears from **Non-Whitelisted**
4. Set "Per page" and "Max unfollow this run" to a batch size you are comfortable with
5. On the **Non-Whitelisted** tab, filter, then either tick accounts manually or press
   **Select first N** to take the first N accounts of the current filter
6. Press **Unfollow** and repeat with a fresh run when you want to continue

Page size and the per run cap are remembered in `localStorage`, so they survive pasting the script again
in the same browser.

## 📱 Mobile Usage

For Android users who want to use it on mobile:

1. Download the latest version of [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Open Instagram web through the Eruda browser
3. Follow the same steps as desktop (the console will be automatically available when clicking the eruda icon)

## ⚡ Performance Notes

- Processing time increases with the number of users to check
- Script works on both Chromium and Firefox-based browsers
- The script takes a few more seconds to load on mobile
- Whitelist data is stored locally in your browser (localStorage)

## ✨ Features

- 🔍 Scan and identify users who don't follow you back
- 🤍 Whitelist system to protect specific accounts from unfollowing
- 💾 Export/Import whitelist functionality for backup and transfer
- 📄 Configurable page size so you can review 20 or 200 accounts at a time
- 🛑 Per run unfollow cap, so a large selection is processed in safe batches
- ⚙️ Customizable timing settings to avoid rate limits
- 🎨 Clean, minimalist interface inspired by Apple design
- 📱 Fully responsive - works on desktop and mobile
- 🔒 All data stored locally - no external servers

## 🛠️ Development

- Node version: 16.14.0 (If using nvm, run `nvm use`)
- After modifying `main.tsx`, run the "build" command to format, compress, and convert your code
- Automatic re-building can be done using nodemon build-dev

## ⚖️ Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.

⚠️ Use at your own risk!

📜 Licensed under the [MIT License](LICENSE)
- ✅ Free to use, copy, and modify
- 🤝 Open source and community-friendly
- 📋 See [LICENSE](LICENSE) file for full terms
