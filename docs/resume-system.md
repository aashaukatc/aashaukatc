# Cloud Resume System

`resumes/resume.json` is the canonical career-data source. Nine lightweight files under `resumes/targets/` contain only role-specific positioning and skills derived from the approved tailored resumes. GitHub Codespaces provides the development environment, and GitHub Actions merges, validates, and renders downloadable PDF artifacts.

## Repository layout

```text
.
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── .github/workflows/build-resume.yml
├── docs/resume-system.md
├── output/.gitkeep
├── resumes/resume.json
├── resumes/targets/*_resume.json
├── scripts/build-resumes.mjs
├── package-lock.json
└── package.json
```

## Codespaces

Open the repository in GitHub Codespaces. Container creation installs Node.js LTS, PowerShell, Chromium, fonts, `resume-cli`, `jsonresume-theme-elegant`, and locked project dependencies.

```bash
npm run validate
npm run build
```

Generated PDFs are written to `output/` and intentionally excluded from Git.

## Canonical and targeted resumes

The canonical file owns shared employment, education, credentials, projects, platforms, metrics, and contact information. Target overlays own only the role-specific headline, professional summary, and priority skill group.

The build includes:

- `resumes/resume.json`
- Any file matching `resumes/targets/*_resume.json`

Each overlay is merged with the canonical source before validation and rendering. For example, `resumes/targets/psychplus_product_manager_resume.json` creates `output/psychplus_product_manager_resume.pdf`.

## CI/CD

Changes to any JSON file on `main` trigger `.github/workflows/build-resume.yml`. The workflow:

1. Installs dependencies from `package-lock.json`.
2. Installs Chrome-compatible Linux libraries and international fonts.
3. Merges target overlays with the canonical source and validates every resulting resume against the JSON Resume schema.
4. Generates and verifies PDF outputs.
5. Uploads the PDFs as a 30-day GitHub Actions artifact.

When the canonical source changes, all ten PDFs are rebuilt. When one target overlay changes, only that targeted PDF is rebuilt.

The workflow can also be run manually from the GitHub Actions tab.

## Git governance

Use explicit staging and atomic semantic commits.

```bash
git add resumes/resume.json
git commit -m "feat(resume): update professional source data"
git push origin main
```

Do not use bulk staging or force pushes.
