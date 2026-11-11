# USiS user journeys (step-by-step)

**PDF (all platforms):** [WMSU-Platform-User-Journeys.pdf](../apps/web-portal/public/docs/WMSU-Platform-User-Journeys.pdf) · **HTML:** [WMSU-Platform-User-Journeys.html](../apps/web-portal/public/docs/WMSU-Platform-User-Journeys.html) · **Portal Support:** `http://127.0.0.1:5173/support`

Regenerate PDF after editing the HTML: `pnpm run docs:playwright-browsers` (once per machine), then `pnpm run docs:user-journey-pdf`.

Local defaults: **USiS web** `http://127.0.0.1:5180` · **Portal** `http://127.0.0.1:5173` · **Base API** `http://127.0.0.1:3500` · **Identity** `http://127.0.0.1:3411`.

**Time:** Campus standard is **Philippine Standard Time (Asia/Manila, UTC+8)**. Set `TZ=Asia/Manila` in `apps/base-api/.env` and restart the API; USiS UI timestamps use `formatDateTime` with that zone.

Demo password: `ChangeMe123!` (or your `DEMO_SEED_PASSWORD` from Identity seed).

---

## How everyone signs in

1. Open **WMSU Portal** (`http://127.0.0.1:5173`) or go directly to **USiS** (`http://127.0.0.1:5180/login`).
2. Sign in with a **University Identity** account (not module-only emails like `admin@uims.local` unless that app uses its own login).
3. Identity **roles** control which USiS menus you see (student vs faculty vs registrar vs offices).
4. If the Enrollment tile is missing, an Identity admin must assign the **enrollment** platform to your user.

| Email (demo) | Typical Identity role | USiS landing |
|--------------|-------------------------|----------------|
| `student@identity.local` | student | Student portal `/student` |
| `employee@identity.local` | employee (+ others if assigned) | Depends on extra roles |
| `admin@identity.local` | identity_admin | Full registrar/faculty/offices |
| `DEMO-2026-001` seed student | linked to `student@identity.local` | Student portal |

For **Core TOR demo data**: student number `DEMO-2026-001`, block `BSIT-1A`, academic year `AY2025-26`, sections `IT101-A`, `IT102-A`, `GE101-A`.

**Local payment shortcut (dev only):** in `apps/base-api/.env` set `USIS_DEV_PAYMENT_BYPASS=true` and restart base-api so **Verify payment** on the registrar registration screen succeeds without UFMS cashier. Production must use UFMS.

---

## Student

**Goal:** Open a term, follow advising, pay, and get registered.

1. Sign in as `student@identity.local` → land on **Dashboard** (`/student`).
2. **Profile** (`/student/profile`) — confirm name, program, student number.
3. **Enrollment** (`/student/enrollment`) — start or continue the open term (must match an active academic year).
4. **Academic advising** (`/student/advising`) — view adviser session status; after endorse, **choose one advised course** if the registrar offered multiple curricula.
5. **Subject selection** (`/student/subjects`) — adjust picks when policy allows (irregular / alternates).
6. **Assessment forms** (`/student/assessments`) — view assessment after the registrar assesses.
7. **Payment status** (`/student/payments`) — pay at UFMS (or dev bypass on registrar side in local dev).
8. **Enrollment status** (`/student/status`) — confirm **registered** and COR readiness.
9. **Certificate of Registration** (`/student/cor`) — open/print COR when registered.
10. **Class schedule** (`/student/schedule`) — see section meetings after registration.

---

## Faculty / adviser

**Goal:** Run advising with explicit **section** choices per subject, then endorse.

1. Sign in with a user that has `advising.write` (demo: `admin@identity.local`).
2. **Dashboard** (`/faculty`).
3. **Academic advising** (`/faculty/advising`) — queue of draft/advising enrollments.
4. Click **Start advising** (draft) or **Open advising** (in-progress session).
5. On the session page (`/faculty/advising/{sessionId}`):
   - Check every **advisable course** the student may take.
   - For each subject, pick a **Section** (e.g. `IT101-A`).
   - If load is below policy minimum, check **Endorse below the minimum unit load**.
   - Click **Endorse advising**.
6. **Advising history** (`/faculty/advising/history`) — audit past sessions.
7. **Assigned classes / grade encoding** (`/faculty/classes`, `/faculty/grades/encode`) — after registration, manage class records.

---

## Registrar

**Goal:** Admit → schedule → advise gate → assess → verify payment → approve → register → reports.

### Applicants & students

1. Sign in as `admin@identity.local` (or registrar role).
2. **Applicants** (`/registrar/applicants`) — search applicant, review, **Admit** (creates student + optional Identity login).
3. **Student records** (`/registrar/students`) — search students; **Portal login** column → **Create login** if Identity link missing.

### Academic structure & scheduling desk

4. **Academic structure** (`/registrar/academic`) — programs, sections, meetings, **Scheduling desk**:
   - Filter **Academic year** (e.g. `AY2025-26`).
   - Bulk open/close sections.
   - **Student seating**: block encode `BSIT-1A` by student search, or irregular class codes.
   - **Class utilization** preview/export.
   - **Alternate sections** search (subject code).
   - **Class roster export** — pick section → **Download CSV**.

5. **Curriculum** (`/registrar/curriculum`) — curricula, subjects, prerequisites.

### Enrollment operations

6. **Enrollment management** (`/registrar/enrollments`) — list/filter enrollments by student or status.
7. **Registration approval** (`/registrar/registration`) — pick student → **Assess** → **Verify payment** → **Registrar approve** → **Register** (sends confirmation email when mail is configured).

### Other registrar tools

8. **Student requirements** (`/registrar/requirements`).
9. **Reports** (`/registrar/reports` or `/reports`).
10. **Settings** (`/registrar/settings`) — policies, approval steps (adviser → assessment → registrar).

---

## Admissions office

1. Sign in with `applicants.read` / `applicants.write`.
2. **Admissions Office** (`/offices/admissions`) — forms, events, applicant pipeline (overlaps registrar applicants depending on permissions).

---

## Guidance, OSA, Health, Scholarship offices

| Office | Path | Typical tasks |
|--------|------|----------------|
| Student Affairs | `/offices/osa` | Organizations, discipline, student life |
| Guidance & Counseling | `/offices/guidance` | Counseling requests, shifting exams (student search pickers) |
| Health Services | `/offices/health` | Medical assessments, clearances |
| Scholarship Office | `/offices/scholarship` | Scholarships, aid tags |

Each office uses the same Identity login; menus appear only when your role includes that office’s permissions.

---

## Cashier / finance (UFMS)

USiS **Verify payment** calls UFMS when bypass is off.

1. Open **UFMS** (`http://127.0.0.1:5182`) with finance staff credentials.
2. Record cashier payment against the student’s **assessment number** from USiS.
3. Return to USiS **Registration approval** → **Verify payment** again.

---

## End-to-end Core TOR checklist (demo)

Use this order to walk the full enrollment-to-seating path:

| Step | Role | Where | Action |
|------|------|-------|--------|
| 1 | Registrar | `/registrar/applicants` | Admit (or use seed `DEMO-2026-001`) |
| 2 | Registrar | `/registrar/academic` | Confirm sections/meetings for `AY2025-26` |
| 3 | Faculty | `/faculty/advising` | Start/open session, pick sections, endorse |
| 4 | Student | `/student/advising` | Choose advised course (if multi-course offer) |
| 5 | Registrar | `/registrar/registration` | Assess → verify payment → approve → register |
| 6 | Registrar | `/registrar/academic` (desk) | Roster CSV, utilization, alternates as needed |
| 7 | Student | `/student/cor` | COR / schedule |

Automated coverage: `WMSU/e2e/tests/enrollment-core-tor-journey.spec.ts` (Playwright).

---

## Related docs

- [USIS Complete Guide (HTML)](../apps/web-portal/public/docs/USIS-Complete-Guide.html)
- [Identity Complete Guide](https://github.com) — see `wmsu-api/docs/Identity-Complete-Guide.md` in your Identity repo
- Platform README: local ports and `pnpm run dev`
