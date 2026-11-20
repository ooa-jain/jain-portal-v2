# Jain OOA Portal

Semester Readiness and Semester Closure portal for the Office of Academics,
rebuilt with Next.js 16, TypeScript, Tailwind and shadcn-style components.
It reads and writes the same MongoDB collections as the old Flask app
(`submissions`, `faculty_submissions`, `users`, `settings`), so existing data
carries over with no migration.

## What it includes

- Sign-in with email and password, or Google (Firebase, limited to `@jainuniversity.ac.in`, token verified on the server)
- Admins register users with a generated or typed password and can reset it; users can change their own. Five wrong attempts lock an account for 15 minutes. Passwords saved by the old Flask app keep working (same Werkzeug hash format)
- ERP-style layout: sidebar navigation, notification bell, data tables, admin section
- Semester Readiness and Semester Closure: details, HOD checklist / report, faculty checklist link, HOD review, submit
- Innovation & Emerging Areas (IEA): per-person submissions by school / department / level, five academic years, sections A–F, evidence, versions, feedback, analysis
- Deadlines per module (India time), late-access requests and approvals
- Edit limit: a submitted form can be edited 2 times, then needs admin approval
- Announcements, manual reminder emails, and scheduled deadline reminders
- Admin: overview, all submissions, IEA, users and access, "view as" a user, requests, notifications, settings
- Excel exports for every module; installable as an app (PWA)

Not carried over from the old app: self-registration, the emailed
password-reset code, the separate admin username/password + OTP login, the
guided tour, and the idle-timeout / screen-lock preference.

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

## Email

Set either the old Flask names (`EMAIL_USER`, `EMAIL_PASS`, `MAIL_SERVER`,
`MAIL_PORT`, `MAIL_USE_SSL`) or `SMTP_EMAIL`, `SMTP_PASSWORD`, `SMTP_SERVER`,
`SMTP_PORT` in `.env`. Port 465 uses SSL automatically. Email is used for the
faculty registration code, reminders and notices; without it those are skipped.

## Updating the live site

After the first time (when `deploy/deploy.sh` arrives with `git pull`), one command does the whole update:

```
bash /var/www/jain-sarathi-new/web/deploy/deploy.sh
```

It fetches the branch, installs packages only if `package-lock.json` changed,
builds into `.next-new` while the site keeps running, swaps the new build in,
restarts `jain-sarathi-web` and checks that the site answers. If the build fails,
or the site does not answer after the restart, it puts the previous code and
build back and restarts on them. `FORCE=1` rebuilds even when nothing changed;
`BRANCH`, `SERVICE`, `PORT` and `APP_DIR` can be overridden.

## Reading scanned documents (OCR)

Scanned PDFs (first 4 pages) and photos are read with Tesseract when the server has it:

```
apt-get install -y tesseract-ocr poppler-utils
```

Without it, scans are flagged for the HOD to check by eye. Text read by OCR is
marked as such and never fails a document on its own.

## Faculty checklist reminders

The same scheduled call as the deadline reminders (below) also emails
registered faculty who have not filled an HOD's checklist, 3 days and 1 day
before that HOD's "submit by" date, and sends the HOD the list of who is pending.

### Scheduled deadline reminders

Set `CRON_SECRET` in `.env`, then call the endpoint every 10 minutes from
root's crontab (`crontab -e`). It emails people who have not submitted, 2 days
and 1 hour before each module deadline, and never sends the same reminder twice.

```
*/10 * * * * . /var/www/jain-sarathi-new/web/.env; curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:8091/api/cron/deadline-reminders >/dev/null
```

### Uploads

Library files are saved under `UPLOAD_DIR/library/` and are only served to
signed-in members of the department and admins. Nginx allows 1 MB uploads by
default; documents can be up to 20 MB, so add this inside the site's
`server { }` block and reload Nginx:

```
client_max_body_size 25m;
```

Before switching over:

- Set `UPLOAD_DIR=/var/www/jain-ooa-portal/static/uploads` so files uploaded in the old app still open.
- In the Firebase console, both domains must be listed under Authentication → Settings → Authorised domains (they already are for the old app).
- Make sure every admin's email is in `ADMIN_EMAILS` or flagged as admin in the database; the old username/password admin login is gone.

## Large numbers of users

The portal is tested with 500,000 accounts, 20,000 submissions, 200,000 faculty
responses and 150,000 documents. What keeps it fast:

- **Database indexes** are created automatically when the app starts (`src/lib/indexes.ts`).
  The first start on a big database can take a minute while they build.
- **Long lists are paged in the database**: Users & Access and Submissions show 100 at a
  time with search; the Document Library loads one semester and draws 100 courses at a
  time ("Show more"); Analysis shows the latest 200 submissions.
- **Reminder emails are spread out**: each run of the reminder job sends at most
  `REMINDER_EMAILS_PER_RUN` emails (default 400) and the next hourly run continues,
  so the mailbox provider's sending limit is not hit. Nobody gets the same reminder twice.

Optional settings in `.env`:

| Setting | Default | What it does |
|---|---|---|
| `MONGO_POOL_SIZE` | 50 | Database connections per app process |
| `REMINDER_EMAILS_PER_RUN` | 400 | Most reminder emails one run sends |

One app process serves about 40 pages a second. For heavy days (results, deadlines),
run one copy per CPU core behind nginx (an `upstream` with ports 8091, 8092, …);
the reminder job and sign-ins work the same with several copies.

## Demo login for testers

Set `DEMO_LOGIN=1` in `.env` and restart to show **Demo HOD** and **Demo Faculty**
buttons on the sign-in page. They sign in to two test accounts
(`demo.hod@` and `demo.faculty@` the university domain) in a separate
"Demo Department (Testing)", so testers never see or change a real
department's data. Demo accounts are never admins, cannot set a password,
and their sign-in lasts only for the browser session. Remove the line (or set
it to `0`) and restart to turn the buttons off.
