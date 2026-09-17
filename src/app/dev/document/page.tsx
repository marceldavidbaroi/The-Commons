import React from "react";
import type { Metadata } from "next";
import { getAllDocs, groupDocsByCategory } from "@/lib/docs-loader";
import DocumentReaderClient from "./DocumentReaderClient";

export const metadata: Metadata = {
  title: "Documentation Codex | The Commons",
  description: "Interactive documentation reader, specifications, and architecture codex for The Commons.",
};

export default function DevDocumentPage() {
  const docs = getAllDocs();
  const categoryGroups = groupDocsByCategory(docs);

  return <DocumentReaderClient initialDocs={docs} categoryGroups={categoryGroups} />;
}
