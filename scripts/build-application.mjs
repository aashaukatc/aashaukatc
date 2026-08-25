import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const applicationsDirectory = join(root, "applications");
const canonicalResumePath = join(root, "resumes", "resume.json");
const outputRoot = join(root, "output", "applications");
const cacheRoot = join(root, ".cache", "applications");
const resumeCli = join(root, "node_modules", ".bin", process.platform === "win32" ? "resume.cmd" : "resume");

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
  }
}

function discover() {
  if (!existsSync(applicationsDirectory)) return [];
  return readdirSync(applicationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => join(applicationsDirectory, entry.name, "application.json"))
    .filter(existsSync);
}

function normalize(inputs) {
  return [...new Set(inputs.length ? inputs : discover().map((file) => relative(root, file)))]
    .map((file) => resolve(root, file));
}

function assertReady(application, file) {
  const name = relative(root, file);
  if (application.status !== "ready") throw new Error(`${name} must have status "ready" before building.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(application.slug ?? "")) throw new Error(`${name} has an invalid slug.`);
  for (const field of [application.job?.company, application.job?.role, application.resume?.basics?.label, application.resume?.basics?.summary]) {
    if (typeof field !== "string" || !field.trim()) throw new Error(`${name} is missing a required job or resume field.`);
  }
  if (!Array.isArray(application.resume?.skills) || application.resume.skills.length === 0) throw new Error(`${name} requires at least one prioritized skill group.`);
  if (!Array.isArray(application.coverLetter?.paragraphs) || application.coverLetter.paragraphs.length < 3) throw new Error(`${name} requires at least three cover-letter paragraphs.`);
  if (!Array.isArray(application.alignment) || application.alignment.length < 3) throw new Error(`${name} requires at least three evidence mappings.`);
  for (const item of application.alignment) {
    if (!item.source?.startsWith("resumes/resume.json#")) throw new Error(`${name} contains evidence without a canonical resume source pointer.`);
  }
  const serialized = JSON.stringify(application);
  if (/\[PLACEHOLDER|example\.com\/job|Role-specific|Job requirement|Verified matching evidence/i.test(serialized)) {
    throw new Error(`${name} still contains template or placeholder content.`);
  }
}

function mergeResume(base, overlay) {
  const merged = structuredClone(base);
  merged.basics = { ...base.basics, ...(overlay.basics ?? {}) };
  if (overlay.skills) {
    const names = new Set(overlay.skills.map((skill) => skill.name));
    merged.skills = [...overlay.skills, ...(base.skills ?? []).filter((skill) => !names.has(skill.name))];
  }
  for (const section of ["work", "education", "certificates", "projects", "languages", "interests"]) {
    if (overlay[section]) merged[section] = overlay[section];
  }
  return merged;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function markdown(application) {
  const letter = application.coverLetter;
  return `# ${application.job.role} — ${application.job.company}\n\n${letter.date}\n\n${letter.recipient}\n\n${letter.salutation}\n\n${letter.paragraphs.join("\n\n")}\n\n${letter.closing}\n\n**Muhammad Aftab Shaukat**  \nRawalpindi, Pakistan  \n[muhammadaftabshaukat@gmail.com](mailto:muhammadaftabshaukat@gmail.com)  \n[LinkedIn](https://www.linkedin.com/in/healthcare-rcm-leader/) · [Portfolio](https://aftabshaukat.me/)\n`;
}

function coverLetterHtml(application) {
  const letter = application.coverLetter;
  const recipient = escapeHtml(letter.recipient).replaceAll("\n", "<br>");
  const paragraphs = letter.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(application.job.role)} — Cover Letter</title><style>@page{size:letter;margin:.7in}*{box-sizing:border-box}body{margin:0;color:#0a1730;font:11pt/1.52 Arial,sans-serif}header{border-bottom:2px solid #0d4bd8;padding-bottom:16px;margin-bottom:24px}h1{font:700 22pt/1.1 Georgia,serif;margin:0}header p{margin:7px 0 0;color:#41506a}main>p{margin:0 0 14px}.date,.recipient{margin-bottom:18px}.closing{margin-top:24px}.name{font-weight:700}.links{font-size:9.5pt;color:#41506a}</style></head><body><header><h1>Muhammad Aftab Shaukat</h1><p>Healthcare RCM · Operations Intelligence · Business Analysis · Solutions Architecture</p></header><main><div class="date">${escapeHtml(letter.date)}</div><div class="recipient">${recipient}</div><p>${escapeHtml(letter.salutation)}</p>${paragraphs}<div class="closing">${escapeHtml(letter.closing)}<br><br><span class="name">Muhammad Aftab Shaukat</span><br><span class="links">muhammadaftabshaukat@gmail.com · aftabshaukat.me · linkedin.com/in/healthcare-rcm-leader</span></div></main></body></html>`;
}

function brief(application) {
  const rows = application.alignment.map((item) => `| ${item.requirement.replaceAll("|", "\\|")} | ${item.evidence.replaceAll("|", "\\|")} | \`${item.source}\` |`).join("\n");
  const keywords = application.job.keywords?.length ? application.job.keywords.join(", ") : "None recorded";
  const questions = application.applicationQuestions?.length ? application.applicationQuestions.map((question) => `- ${question}`).join("\n") : "- None recorded";
  const notes = application.profileUpdates?.platformNotes?.length ? application.profileUpdates.platformNotes.map((note) => `- ${note}`).join("\n") : "- No immediate platform changes required for this application.";
  return `# Application Brief — ${application.job.role} at ${application.job.company}\n\n## Job\n\n- URL: ${application.job.url || "Not provided"}\n- Location: ${application.job.location}\n- Work mode: ${application.job.workMode}\n- Priority keywords: ${keywords}\n\n## Evidence Alignment\n\n| Requirement | Verified evidence used | Canonical source |\n|---|---|---|\n${rows}\n\n## Career-Profile Updates\n\n- LinkedIn headline: ${application.profileUpdates.linkedinHeadline || "No change recommended"}\n- LinkedIn About addendum: ${application.profileUpdates.linkedinAboutAddendum || "No change recommended"}\n${notes}\n\n## Application Questions\n\n${questions}\n`;
}

function browserPath() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function assertPdf(file) {
  if (!existsSync(file) || statSync(file).size < 1024 || readFileSync(file).subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`Invalid PDF output: ${relative(root, file)}`);
  }
}

function renderCoverLetterPdf(htmlFile, pdfFile) {
  const executable = browserPath();
  if (!executable) throw new Error("Chrome or Chromium is required to render the cover-letter PDF.");
  execFileSync(executable, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, pathToFileURL(htmlFile).href], { stdio: "inherit" });
  assertPdf(pdfFile);
}

if (!existsSync(resumeCli)) throw new Error("Dependencies are missing. Run npm ci before building.");
const files = normalize(process.argv.slice(2));
if (files.length === 0) {
  console.log("No ready application files found. Create one with npm run new:application.");
  process.exit(0);
}

const canonicalResume = readJson(canonicalResumePath);
for (const file of files) {
  if (!existsSync(file)) throw new Error(`Application source does not exist: ${relative(root, file)}`);
  const application = readJson(file);
  assertReady(application, file);
  const outputDirectory = join(outputRoot, application.slug);
  const cacheDirectory = join(cacheRoot, application.slug);
  mkdirSync(outputDirectory, { recursive: true });
  mkdirSync(cacheDirectory, { recursive: true });

  const tailoredResume = join(cacheDirectory, `${application.slug}_resume.json`);
  const resumePdf = join(outputDirectory, `${application.slug}_resume.pdf`);
  writeFileSync(tailoredResume, `${JSON.stringify(mergeResume(canonicalResume, application.resume), null, 2)}\n`);
  execFileSync(resumeCli, ["validate", "--resume", tailoredResume], { cwd: root, env: process.env, stdio: "inherit" });
  execFileSync(resumeCli, ["export", resumePdf, "--resume", tailoredResume, "--format", "pdf", "--theme", "elegant"], { cwd: root, env: process.env, stdio: "inherit" });
  assertPdf(resumePdf);

  const letterMarkdown = join(outputDirectory, `${application.slug}_cover-letter.md`);
  const letterHtml = join(outputDirectory, `${application.slug}_cover-letter.html`);
  const letterPdf = join(outputDirectory, `${application.slug}_cover-letter.pdf`);
  writeFileSync(letterMarkdown, markdown(application));
  writeFileSync(letterHtml, coverLetterHtml(application));
  writeFileSync(join(outputDirectory, `${application.slug}_application-brief.md`), brief(application));
  renderCoverLetterPdf(letterHtml, letterPdf);
  console.log(`Built application pack: ${relative(root, outputDirectory)}`);
}
