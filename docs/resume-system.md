# Career Application System

This repository is the governed career source for Muhammad Aftab Shaukat. It separates durable facts from role-specific positioning so a new application can be produced without rewriting or duplicating career history.

## What the system produces

| Input | Automated output |
|---|---|
| Canonical career change | Validated canonical and target-specific résumé PDFs |
| New job posting | Tailored résumé PDF, cover-letter PDF/HTML/Markdown, ATS evidence matrix, application brief, and career-profile update notes |
| Career-platform change | Synchronized copy for the portfolio, GitHub profile, LinkedIn, and ORCID |

## Source hierarchy

1. `resumes/resume.json` — verified employment, education, credentials, projects, platforms, and metrics.
2. `resumes/targets/*_resume.json` — reusable role-family positioning from previously approved tailored résumés.
3. `applications/<company-role>/application.json` — one job-specific overlay, cover letter, keyword set, and evidence map.
4. `brand/career-profile-source.json` — canonical positioning and platform-specific copy.

Shared facts must be corrected in `resumes/resume.json`, never copied into multiple application files. Application claims must point back to the canonical source through `alignment[].source`.

## Fastest workflow for a new job

Send the job URL or complete job description to ChatGPT. The tailored application file should then be created from verified evidence and committed through a governed pull request. GitHub Actions renders the complete pack.

To scaffold a draft in Codespaces:

```bash
npm run new:application -- \
  --company "Company" \
  --role "Role" \
  --url "https://company.example/jobs/123" \
  --location "Remote — United States" \
  --work-mode "Remote"
```

The new file is created at `applications/<company-role>/application.json` with `status: draft`. Tailor it, remove every template phrase, confirm the evidence map, and set `status` to `ready`.

Build one application pack:

```bash
npm run build:applications -- applications/<company-role>/application.json
```

Generated files are written to `output/applications/<company-role>/`:

- `<slug>_resume.pdf`
- `<slug>_cover-letter.pdf`
- `<slug>_cover-letter.html`
- `<slug>_cover-letter.md`
- `<slug>_application-brief.md`

The same pack is uploaded as a 30-day artifact by `.github/workflows/build-application-pack.yml`.

## Resume builds

`npm run build` validates and renders the canonical résumé plus every reusable target overlay. When the canonical source changes, all résumé variants inherit the change automatically.

## Career-platform synchronization

Update `brand/career-profile-source.json` when positioning or a verified career fact changes. Review these surfaces together:

1. `https://aftabshaukat.me/` — primary public anchor.
2. GitHub profile `README.md` — technical proof and repository navigation.
3. LinkedIn — recruiter-facing headline, About, experience, skills, and Featured links.
4. ORCID — research identity and published research assets.

Job-specific keywords belong in the application pack. Durable positioning belongs in the platform source. Do not repeatedly rewrite public profiles for one isolated vacancy unless the target role represents a sustained career direction.

## Governance

- No invented achievements, certifications, platform depth, or metrics.
- No PHI, payer credentials, patient data, private client identifiers, or confidential screenshots.
- No placeholder text in any `ready` application.
- No bulk staging or force pushes.
- Use feature branches, semantic commits, pull requests, and squash merges.
