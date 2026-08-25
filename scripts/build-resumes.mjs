import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const resumesDirectory = join(repositoryRoot, "resumes");
const canonicalResume = join(resumesDirectory, "resume.json");
const targetsDirectory = join(resumesDirectory, "targets");
const cacheDirectory = join(repositoryRoot, ".cache", "resume-build");
const outputDirectory = join(repositoryRoot, "output");
const resumeCli = join(repositoryRoot, "node_modules", ".bin", process.platform === "win32" ? "resume.cmd" : "resume");

function discoverResumeFiles() {
  const targets = existsSync(targetsDirectory)
    ? readdirSync(targetsDirectory).filter((name) => name.endsWith("_resume.json")).map((name) => join("resumes", "targets", name))
    : [];
  return [join("resumes", "resume.json"), ...targets];
}

function normalizeInputs(inputs) {
  const selected = inputs.length > 0 ? inputs : discoverResumeFiles();
  return [...new Set(selected)].map((file) => resolve(repositoryRoot, file)).filter((file) => {
    const name = basename(file);
    return name === "resume.json" || name.endsWith("_resume.json");
  });
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${relative(repositoryRoot, file)}: ${error.message}`);
  }
}

function mergeTarget(base, overlay) {
  const merged = structuredClone(base);
  merged.basics = { ...base.basics, ...(overlay.basics ?? {}) };
  if (overlay.skills) {
    const targetNames = new Set(overlay.skills.map((skill) => skill.name));
    merged.skills = [...overlay.skills, ...(base.skills ?? []).filter((skill) => !targetNames.has(skill.name))];
  }
  for (const section of ["work", "education", "certificates", "projects", "languages", "interests"]) {
    if (overlay[section]) merged[section] = overlay[section];
  }
  return merged;
}

function materializeSource(sourceFile, baseResume) {
  if (sourceFile === canonicalResume) return sourceFile;
  const generatedFile = join(cacheDirectory, basename(sourceFile));
  writeFileSync(generatedFile, `${JSON.stringify(mergeTarget(baseResume, readJson(sourceFile)), null, 2)}\n`);
  return generatedFile;
}

function assertPdf(file) {
  if (!existsSync(file) || statSync(file).size < 1024) throw new Error(`PDF output was not created correctly: ${relative(repositoryRoot, file)}`);
  if (readFileSync(file).subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error(`Output is not a valid PDF: ${relative(repositoryRoot, file)}`);
}

function runResumeCli(arguments_) {
  execFileSync(resumeCli, arguments_, { cwd: repositoryRoot, env: process.env, stdio: "inherit" });
}

if (!existsSync(resumeCli)) throw new Error("Dependencies are missing. Run npm ci before building.");
const resumeFiles = normalizeInputs(process.argv.slice(2));
if (resumeFiles.length === 0) throw new Error("No canonical or targeted resume sources were found.");
for (const file of resumeFiles) if (!existsSync(file)) throw new Error(`Resume source does not exist: ${relative(repositoryRoot, file)}`);

mkdirSync(cacheDirectory, { recursive: true });
mkdirSync(outputDirectory, { recursive: true });
const baseResume = readJson(canonicalResume);

for (const sourceFile of resumeFiles) {
  readJson(sourceFile);
  const buildSource = materializeSource(sourceFile, baseResume);
  runResumeCli(["validate", "--resume", buildSource]);
  const sourceName = basename(sourceFile, ".json");
  const outputFile = join(outputDirectory, sourceName === "resume" ? "resume.pdf" : `${sourceName}.pdf`);
  runResumeCli(["export", outputFile, "--resume", buildSource, "--format", "pdf", "--theme", "elegant"]);
  assertPdf(outputFile);
  console.log(`Built ${relative(repositoryRoot, outputFile)}`);
}
