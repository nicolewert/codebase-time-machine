import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { repositoryId, query, contextCommits, contextFiles } = await req.json();

    if (!repositoryId || !query) {
      return NextResponse.json(
        { error: "Missing required fields: repositoryId, query" },
        { status: 400 }
      );
    }

    // Validate repositoryId format
    if (typeof repositoryId !== "string" || !repositoryId.startsWith("k")) {
      return NextResponse.json(
        { error: "Invalid repositoryId format" },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const result = await convex.action(api.ai.askQuestion, {
      repositoryId: repositoryId as Id<"repositories">,
      query: query.trim(),
      contextCommits: contextCommits || [],
      contextFiles: contextFiles || [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Question processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process question",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}