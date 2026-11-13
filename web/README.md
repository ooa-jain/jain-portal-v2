# Jain Sarathi (new build)

Semester Readiness and Semester Closure portal for the Office of Academics,
rebuilt with Next.js 16, TypeScript, Tailwind and shadcn-style components.
It reads and writes the same MongoDB collections as the old Flask app
(`submissions`, `faculty_submissions`, `users`, `settings`), so existing data
carries over with no migration.

## What it includes

- Google sign-in (Firebase), limited to `@jainuniversity.ac.in`; the token is verified on the server
- Semester Readiness: details, 27-item HOD checklist, faculty checklists, review and submit
- Semester Closure: details, 14-section HOD report, faculty checklists, review and submit
- Public faculty checklist link (no sign-in), HOD review of each response
- Evidence file uploads
- Excel exports: one submission, HOD checklist, everything (admin)
- Admin: department status, all submissions, users and access, module and semester settings

Not included (dropped from the old app): IEA module, deadlines and extension
requests, reminder emails, notifications, edit-request approvals,
impersonation, PWA install, password login.

## Run locally

```bash
cp .env.example .env.local
```

Fill in `MONGO_URI` and `SECRET_KEY`, then:

```bash
npm install
```

```bash
npm run dev
```

For testing without Google, add `DEV_LOGIN=1` to `.env.local` and open
`/api/auth/dev?email=you@jainuniversity.ac.in`. This route does not exist in
production builds.

## Deploy on the VPS

Needs Node.js 20 or newer. Build, then run with systemd behind Nginx.

```bash
npm ci && npm run build
```

Example unit (`/etc/systemd/system/jain-sarathi-web.service`):

```
[Unit]
Description=Jain Sarathi (Next.js)
After=network.target
StartLimitIntervalSec=0

[Service]
User=www-data
WorkingDirectory=/var/www/jain-ooa-portal/web
EnvironmentFile=/var/www/jain-ooa-portal/web/.env
Environment=NODE_ENV=production
Environment=PORT=8088
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it with `systemctl enable --now jain-sarathi-web.service` (the `enable`
matters: it is what brings the service back after a reboot). Then change the
Nginx `proxy_pass` from port 8087 to 8088 and reload Nginx. The old Flask
service can stay installed as a fallback until the new one is confirmed.

Before switching over:

- Set `UPLOAD_DIR=/var/www/jain-ooa-portal/static/uploads` so files uploaded in the old app still open.
- In the Firebase console, both domains must be listed under Authentication → Settings → Authorised domains (they already are for the old app).
- Make sure every admin's email is in `ADMIN_EMAILS` or flagged as admin in the database; the old username/password admin login is gone.
