import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const templatePath = join(root, "applications", "_template", "application.json");

function options(arguments_) {
  const parsed = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const key = arguments_[index];
    if (!key.startsWith("--")) continue;
    parsed[key.slice(2)] = arguments_[index + 1] ?? "";
    index += 1;
  }
  return parsed;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const input = options(process.argv.slice(2));
if (!input.company || !input.role) {
  throw new Error('Usage: npm run new:application -- --company "Company" --role "Role" --url "https://..."');
}

const slug = slugify(input.slug || `${input.company}-${input.role}`);
if (!slug) throw new Error("Could not derive a valid application slug.");
const destinationDirectory = join(root, "applications", slug);
const destinationFile = join(destinationDirectory, "application.json");
if (existsSync(destinationFile)) throw new Error(`Application already exists: applications/${slug}/application.json`);

const application = JSON.parse(readFileSync(templatePath, "utf8"));
application.slug = slug;
application.job.company = input.company;
application.job.role = input.role;
application.job.url = input.url || "";
application.job.location = input.location || "Remote";
application.job.workMode = input["work-mode"] || "Remote";
application.coverLetter.recipient = `Hiring Manager\n${input.company}`;

mkdirSync(destinationDirectory, { recursive: true });
writeFileSync(destinationFile, `${JSON.stringify(application, null, 2)}\n`);
console.log(`Created applications/${slug}/application.json`);
console.log("Tailor the draft from verified evidence, set status to ready, then run npm run build:applications.");
