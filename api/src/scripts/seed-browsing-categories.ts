import { connectDB } from "../config/db";
import { BrowsingCategory } from "../models/browsing-category.model";

const CATEGORIES = [
  {
    slug: "productivity",
    name: "Productivity",
    icon: "Briefcase",
    color: "#0EA5E9",
    productivityType: "productive",
    description: "Task and workflow tools",
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "development",
    name: "Development",
    icon: "Code",
    color: "#7C3AED",
    productivityType: "productive",
    description: "Coding, version control, deployment",
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "communication",
    name: "Communication",
    icon: "MessageSquare",
    color: "#2563EB",
    productivityType: "productive",
    description: "Email, chat, calls",
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "education",
    name: "Education & Learning",
    icon: "BookOpen",
    color: "#059669",
    productivityType: "productive",
    description: "Courses, docs, learning",
    isActive: true,
    sortOrder: 4,
  },
  {
    slug: "design",
    name: "Design & Creative",
    icon: "Palette",
    color: "#DB2777",
    productivityType: "productive",
    description: "Design, media creation",
    isActive: true,
    sortOrder: 5,
  },
  {
    slug: "ai-tools",
    name: "AI & Tools",
    icon: "Bot",
    color: "#6366F1",
    productivityType: "productive",
    description: "AI assistants and tooling",
    isActive: true,
    sortOrder: 6,
  },
  {
    slug: "finance",
    name: "Finance",
    icon: "DollarSign",
    color: "#16A34A",
    productivityType: "productive",
    description: "Banking, trading, accounting",
    isActive: true,
    sortOrder: 7,
  },
  {
    slug: "reference",
    name: "Reference & Research",
    icon: "Search",
    color: "#64748B",
    productivityType: "neutral",
    description: "Lookups and references",
    isActive: true,
    sortOrder: 8,
  },
  {
    slug: "news",
    name: "News & Media",
    icon: "Newspaper",
    color: "#64748B",
    productivityType: "neutral",
    description: "News and articles",
    isActive: true,
    sortOrder: 9,
  },
  {
    slug: "health",
    name: "Health & Fitness",
    icon: "Heart",
    color: "#64748B",
    productivityType: "neutral",
    description: "Health, wellness",
    isActive: true,
    sortOrder: 10,
  },
  {
    slug: "travel",
    name: "Travel",
    icon: "Map",
    color: "#64748B",
    productivityType: "neutral",
    description: "Travel planning",
    isActive: true,
    sortOrder: 11,
  },
  {
    slug: "food",
    name: "Food & Recipes",
    icon: "UtensilsCrossed",
    color: "#64748B",
    productivityType: "neutral",
    description: "Recipes and food",
    isActive: true,
    sortOrder: 12,
  },
  {
    slug: "government",
    name: "Government & Legal",
    icon: "Landmark",
    color: "#64748B",
    productivityType: "neutral",
    description: "Gov and legal sites",
    isActive: true,
    sortOrder: 13,
  },
  {
    slug: "religion",
    name: "Religion & Spirituality",
    icon: "Sun",
    color: "#64748B",
    productivityType: "neutral",
    description: "Faith and spirituality",
    isActive: true,
    sortOrder: 14,
  },
  {
    slug: "other",
    name: "Other",
    icon: "Globe",
    color: "#94A3B8",
    productivityType: "neutral",
    description: "Unclassified",
    isActive: true,
    sortOrder: 15,
  },

  {
    slug: "social-media",
    name: "Social Media",
    icon: "Users",
    color: "#EF4444",
    productivityType: "distracting",
    description: "Social networks",
    isActive: true,
    sortOrder: 16,
  },
  {
    slug: "video",
    name: "Video",
    icon: "Play",
    color: "#EF4444",
    productivityType: "distracting",
    description: "Video streaming",
    isActive: true,
    sortOrder: 17,
  },
  {
    slug: "music",
    name: "Music & Audio",
    icon: "Music",
    color: "#EF4444",
    productivityType: "distracting",
    description: "Music and audio",
    isActive: true,
    sortOrder: 18,
  },
  {
    slug: "gaming",
    name: "Gaming",
    icon: "Gamepad2",
    color: "#EF4444",
    productivityType: "distracting",
    description: "Games",
    isActive: true,
    sortOrder: 19,
  },
  {
    slug: "shopping",
    name: "Shopping",
    icon: "ShoppingCart",
    color: "#EF4444",
    productivityType: "distracting",
    description: "E-commerce",
    isActive: true,
    sortOrder: 20,
  },
] as const;

async function main(): Promise<void> {
  await connectDB();

  const existing = await BrowsingCategory.countDocuments().exec();
  if (existing > 0) {
    console.log("BrowsingCategory already seeded. Skipping.");
    return;
  }

  await BrowsingCategory.insertMany(
    CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      color: c.color,
      productivityType: c.productivityType,
      description: c.description,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    })),
    { ordered: false },
  );

  console.log(`Seeded ${CATEGORIES.length} browsing categories.`);
}

main().catch((err: unknown) => {
  console.error("seed-browsing-categories failed:", err);
  process.exit(1);
});
