import fs from "node:fs";
import path from "node:path";

export interface DocItem {
  id: string; // unique slug identifier
  title: string;
  category: "Overview" | "Architecture & DB" | "Features" | "Templates & Stubs";
  featureFolder?: string; // e.g. "Authentication", "Daily Diary", "Citizen Passport", "Template"
  filePath: string;
  relativePath: string;
  content: string;
  excerpt: string;
  typeBadge: "PRD" | "TDD" | "Schema" | "API Contract" | "Guide" | "Architecture" | "Overview" | "Code Stub" | "Matrix";
  wordCount: number;
  readingTimeMin: number;
  orderWeight: number;
}

export interface FeatureSubGroup {
  featureName: string;
  docs: DocItem[];
}

export interface DocCategoryGroup {
  name: string;
  icon: string;
  description: string;
  docs: DocItem[];
  featureSubGroups?: FeatureSubGroup[];
}

function determineBadgeType(fileName: string, content: string): DocItem["typeBadge"] {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes("00-page-to-api-matrix") || lowerName.includes("matrix")) return "Matrix";
  if (lowerName.includes("01-prd") || content.includes("# PRD:")) return "PRD";
  if (lowerName.includes("04-tdd") || content.includes("# Technical Design Document")) return "TDD";
  if (lowerName.includes("02-data-model") || lowerName.includes("schema") || lowerName.includes("database")) return "Schema";
  if (lowerName.includes("03-api-contract") || lowerName.includes("api")) return "API Contract";
  if (lowerName.endsWith(".ts") || lowerName.includes("stub")) return "Code Stub";
  if (lowerName.includes("architecture") || lowerName.includes("state-management")) return "Architecture";
  if (lowerName.includes("readme")) return "Overview";
  return "Guide";
}

function extractTitle(content: string, fallback: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.replace(/^#\s+/, "").replace(/—.*$/, "").trim();
    }
  }
  return fallback
    .replace(/\.(md|ts)$/, "")
    .replace(/^0\d-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractExcerpt(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("```") && !trimmed.startsWith("!")) {
      return trimmed.slice(0, 160) + (trimmed.length > 160 ? "..." : "");
    }
  }
  return "Documentation file for The Commons.";
}

function getOrderWeight(fileName: string): number {
  if (fileName.includes("00-overview")) return 0;
  if (fileName.includes("00-page-to-api-matrix")) return 0;
  if (fileName.includes("01-prd")) return 1;
  if (fileName.includes("02-data-model")) return 2;
  if (fileName.includes("03-api-contract")) return 3;
  if (fileName.includes("04-tdd")) return 4;
  if (fileName.includes("stubs")) return 5;
  return 10;
}

export function getAllDocs(): DocItem[] {
  const docsDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    return [];
  }

  const docList: DocItem[] = [];

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".ts"))) {
        const relativePath = path.relative(process.cwd(), fullPath);
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        
        let category: DocItem["category"] = "Overview";
        let featureFolder: string | undefined = undefined;

        if (relativePath.includes("docs/architecture")) {
          category = "Architecture & DB";
        } else if (relativePath.includes("docs/features/_template")) {
          category = "Templates & Stubs";
          featureFolder = "Boilerplate Template";
        } else if (relativePath.includes("docs/features")) {
          category = "Features";
          
          // Detect subfolder feature name: docs/features/[featureName]/...
          const parts = relativePath.split(path.sep);
          const featIdx = parts.indexOf("features");
          if (featIdx !== -1 && parts.length > featIdx + 2) {
            featureFolder = parts[featIdx + 1]
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
          }
        }

        const id = relativePath.replace(/[/\\.]/g, "-").toLowerCase();
        const title = extractTitle(fileContent, entry.name);
        const excerpt = extractExcerpt(fileContent);
        const typeBadge = determineBadgeType(entry.name, fileContent);
        const orderWeight = getOrderWeight(entry.name);
        
        const words = fileContent.trim().split(/\s+/).length;
        const readingTimeMin = Math.max(1, Math.ceil(words / 200));

        docList.push({
          id,
          title,
          category,
          featureFolder,
          filePath: relativePath,
          relativePath,
          content: fileContent,
          excerpt,
          typeBadge,
          wordCount: words,
          readingTimeMin,
          orderWeight,
        });
      }
    }
  }

  scan(docsDir);

  const categoryOrder: Record<DocItem["category"], number> = {
    "Overview": 1,
    "Architecture & DB": 2,
    "Features": 3,
    "Templates & Stubs": 4,
  };

  return docList.sort((a, b) => {
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    if (a.featureFolder && b.featureFolder && a.featureFolder !== b.featureFolder) {
      return a.featureFolder.localeCompare(b.featureFolder);
    }
    if (a.orderWeight !== b.orderWeight) {
      return a.orderWeight - b.orderWeight;
    }
    return a.title.localeCompare(b.title);
  });
}

export function groupDocsByCategory(docs: DocItem[]): DocCategoryGroup[] {
  const groups: Record<DocItem["category"], DocItem[]> = {
    "Overview": [],
    "Architecture & DB": [],
    "Features": [],
    "Templates & Stubs": [],
  };

  for (const doc of docs) {
    if (groups[doc.category]) {
      groups[doc.category].push(doc);
    }
  }

  function makeFeatureSubGroups(categoryDocs: DocItem[]): FeatureSubGroup[] {
    const subGroupsMap = new Map<string, DocItem[]>();
    for (const doc of categoryDocs) {
      const folder = doc.featureFolder || "General";
      if (!subGroupsMap.has(folder)) {
        subGroupsMap.set(folder, []);
      }
      subGroupsMap.get(folder)!.push(doc);
    }

    return Array.from(subGroupsMap.entries()).map(([featureName, featureDocs]) => ({
      featureName,
      docs: featureDocs.sort((a, b) => a.orderWeight - b.orderWeight),
    }));
  }

  return [
    {
      name: "Overview",
      icon: "BookOpen",
      description: "Project index, core vision, and quick reference commands",
      docs: groups["Overview"],
    },
    {
      name: "Architecture & DB",
      icon: "Database",
      description: "State management, Postgres conventions, and UI-first development lifecycle",
      docs: groups["Architecture & DB"],
    },
    {
      name: "Features",
      icon: "Layers",
      description: "Feature specifications and domain documents",
      docs: groups["Features"],
      featureSubGroups: makeFeatureSubGroups(groups["Features"]),
    },
    {
      name: "Templates & Stubs",
      icon: "FileCode",
      description: "Ready-to-use PRD, Data Model, API Contract, TDD, and Stubs templates",
      docs: groups["Templates & Stubs"],
      featureSubGroups: makeFeatureSubGroups(groups["Templates & Stubs"]),
    },
  ].filter((g) => g.docs.length > 0);
}
