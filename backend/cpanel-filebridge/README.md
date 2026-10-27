# cPanel file bridge (optional - big books)

PDFs over 200 MB are kept on your cPanel disk instead of Cloudinary. Only the API (which also runs on cPanel) can read
them: it sends a shared secret. Students always read through the secure reader. Skip this entirely if you do not
upload books that large.

## Install (5 minutes)
1. cPanel -> Domains -> create a subdomain such as `files.your-domain.com` (document root e.g. `public_html/files`).
   Do NOT use the API's own domain: that one is handled by the Node.js application.
2. Upload `index.php` into that folder (File Manager). Copy `config.php.example` to `config.php` and set `secret`
   to a long random string.
3. Open `https://files.your-domain.com/index.php?a=ping` - you should see `{"ok":false,"error":"Unauthorized"}`
   (that is correct without the secret).
4. In cPanel -> Setup Node.js App -> your API app -> Environment variables add, then restart the app:
   - `FILE_BRIDGE_SECRET` = the same secret
   - `FILE_BRIDGE_URL` = `https://files.your-domain.com/index.php`
   - optional: `BOOK_MAX_MB` (default 700), `BOOK_FROM_DISK_MB` (default 150), `BOOK_DISK_CACHE_DIR` (a folder that survives restarts)
5. Admin -> Books -> Choose PDF. PDFs over 200 MB upload automatically in 8 MB pieces. Smaller PDFs still use Cloudinary.

Files live in `~/msp-files/books/` (above `public_html`), so they are never reachable from the web.
If the cPanel account runs out of disk space the upload stops with a clear message. Deleting a book permanently also
deletes its file here.
