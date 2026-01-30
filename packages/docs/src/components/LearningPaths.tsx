import Link from "next/link";
import { Rocket, Lightning, Fire } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const paths = [
  {
    level: "beginner",
    icon: Rocket,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    lessons: [
      { title: "Hello Cube", href: "/docs/learn/beginner/hello-cube" },
      { title: "Basic Transforms", href: "/docs/learn/beginner/transforms" },
      { title: "Your First Hole", href: "/docs/learn/beginner/first-hole" },
      { title: "Export to STL", href: "/docs/learn/beginner/export" },
    ],
  },
  {
    level: "intermediate",
    icon: Lightning,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    lessons: [
      { title: "Bolt Patterns", href: "/docs/learn/intermediate/patterns" },
      { title: "Multi-Part Assembly", href: "/docs/learn/intermediate/assembly" },
      { title: "Materials & GLB", href: "/docs/learn/intermediate/materials" },
      { title: "Scene Composition", href: "/docs/learn/intermediate/scenes" },
    ],
  },
  {
    level: "advanced",
    icon: Fire,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    lessons: [
      { title: "Parametric Design", href: "/docs/learn/advanced/parametric" },
      { title: "STEP Import/Export", href: "/docs/learn/advanced/step" },
      { title: "Kernel Internals", href: "/docs/learn/advanced/kernel" },
      { title: "Contributing", href: "/docs/learn/advanced/contributing" },
    ],
  },
];

export function LearningPaths() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {paths.map((path) => (
        <div
          key={path.level}
          className={cn(
            "rounded-lg border p-5",
            path.borderColor,
            path.bgColor
          )}
        >
          <div className={cn("flex items-center gap-2 mb-4", path.color)}>
            <path.icon size={20} weight="fill" />
            <h3 className="font-bold">{path.level}</h3>
          </div>
          <ul className="space-y-2">
            {path.lessons.map((lesson) => (
              <li key={lesson.href}>
                <Link
                  href={lesson.href}
                  className="block text-sm text-text-muted hover:text-text transition-colors"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
