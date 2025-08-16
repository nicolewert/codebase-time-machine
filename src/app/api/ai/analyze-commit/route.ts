import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { commitId, diff, commitMessage, filesChanged } = await req.json();

    if (!commitId || !diff || !commitMessage) {
      return NextResponse.json(
        { error: "Missing required fields: commitId, diff, commitMessage" },
        { status: 400 }
      );
    }

    // Validate commitId format
    if (typeof commitId !== "string" || !commitId.startsWith("k")) {
      return NextResponse.json(
        { error: "Invalid commitId format" },
        { status: 400 }
      );
    }

    const result = await convex.action(api.ai.analyzeCommitWithAI, {
      commitId: commitId as Id<"commits">,
      diff,
      commitMessage,
      filesChanged: filesChanged || [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Commit analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze commit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}