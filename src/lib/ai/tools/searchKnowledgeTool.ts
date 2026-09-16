import { searchKnowledge } from "@/lib/services/knowledgeRetrieval";
import { Tool } from "./types";

export const SearchKnowledgeTool: Tool = {
  name: "SearchKnowledgeTool",

  async execute(input) {
    const query = typeof input.query === "string" ? input.query.trim() : "";

    if (query === "") {
      return { results: [] };
    }

    const category = typeof input.category === "string" ? input.category : undefined;
    const documents = await searchKnowledge(query, { category });

    return {
      results: documents.map((doc) => ({
        title: doc.title,
        category: doc.category,
        content: doc.content,
      })),
    };
  },
};
