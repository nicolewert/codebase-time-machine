import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFileTree = query({
  args: {},
  handler: async (ctx) => {
    // This is a mock implementation. In a real scenario, you'd fetch actual file complexity data
    const mockFiles = [
      { 
        path: 'src/components/ComplexityHeatmap.tsx', 
        complexity: 7, 
        size: 250, 
        changeFrequency: 5, 
        hotspotScore: 0.6 
      },
      { 
        path: 'src/app/page.tsx', 
        complexity: 4, 
        size: 100, 
        changeFrequency: 3, 
        hotspotScore: 0.3 
      },
      { 
        path: 'convex/files.ts', 
        complexity: 9, 
        size: 180, 
        changeFrequency: 7, 
        hotspotScore: 0.8 
      },
      { 
        path: 'src/lib/utils.ts', 
        complexity: 2, 
        size: 50, 
        changeFrequency: 1, 
        hotspotScore: 0.1 
      },
      // Add more mock files to simulate complexity distribution
      { 
        path: 'src/components/ui/button.tsx', 
        complexity: 5, 
        size: 120, 
        changeFrequency: 4, 
        hotspotScore: 0.4 
      },
      { 
        path: 'src/providers/ConvexClientProvider.tsx', 
        complexity: 11, 
        size: 220, 
        changeFrequency: 6, 
        hotspotScore: 0.7 
      }
    ];

    return mockFiles;
  }
});