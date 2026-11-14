# Jain OOA Portal

Semester Readiness and Semester Closure portal for the Office of Academics,
rebuilt with Next.js 16, TypeScript, Tailwind and shadcn-style components.
It reads and writes the same MongoDB collections as the old Flask app
(`submissions`, `faculty_submissions`, `users`, `settings`), so existing data
carries over with no migration.

## What it includes

- Google sign-in (Firebase), limited to `@jainuniversity.ac.in`; the token is verified on the server
- ERP-style layout: sidebar navigation, notification bell, data tables, admin section
- Semester Readiness and Semester Closure: details, HOD checklist / report, faculty checklist link, HOD review, submit
- Innovation & Emerging Areas (IEA): per-person submissions by school / department / level, five academic years, sections A–F, evidence, versions, feedback, analysis
- Deadlines per module (India time), late-access requests and approvals
- Edit limit: a submitted form can be edited 2 times, then needs admin approval
- Announcements, manual reminder emails, and scheduled deadline reminders
- Admin: overview, all submissions, IEA, users and access, "view as" a user, requests, notifications, settings
- Excel exports for every module; installable as an app (PWA)

Not carried over from the old app: email/password login and the separate
admin username/password + OTP login (sign-in is Google only), the guided
tour, and the idle-timeout / screen-lock preference.

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
Description=Jain OOA Portal (Next.js)
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

### Scheduled deadline reminders

Set `CRON_SECRET` in `.env`, then call the endpoint every 10 minutes from
root's crontab (`crontab -e`). It emails people who have not submitted, 2 days
and 1 hour before each module deadline, and never sends the same reminder twice.

```
*/10 * * * * . /var/www/jain-ooa-portal/web/.env; curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:8088/api/cron/deadline-reminders >/dev/null
```

Before switching over:

- Set `UPLOAD_DIR=/var/www/jain-ooa-portal/static/uploads` so files uploaded in the old app still open.
- In the Firebase console, both domains must be listed under Authentication → Settings → Authorised domains (they already are for the old app).
- Make sure every admin's email is in `ADMIN_EMAILS` or flagged as admin in the database; the old username/password admin login is gone.
