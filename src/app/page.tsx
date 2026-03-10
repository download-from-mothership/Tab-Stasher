"use client";

import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Brain,
  Search,
  Zap,
  FolderOpen,
  Tags,
  Chrome,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
          <Chrome className="w-4 h-4" />
          Chrome Extension Available
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mb-6">
          Save any tab.{" "}
          <span className="text-blue-600 dark:text-blue-400">
            AI organizes it.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mb-10">
          One-click tab saving with AI-powered categorization, smart tagging, and
          visual search. Never lose a tab again.
        </p>
        <div className="flex gap-4">
          <Button
            size="lg"
            className="text-base px-8"
            onClick={() => router.push("/signup")}
          >
            Get Started Free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8"
            onClick={() => router.push("/login")}
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-16 md:py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything you need to manage your tabs
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-12 max-w-xl mx-auto">
          Tab Stasher combines AI intelligence with a beautiful interface to keep
          your browsing organized effortlessly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={Zap}
            title="One-Click Save"
            description="Save any tab instantly from the Chrome extension or web dashboard. No friction, no hassle."
          />
          <FeatureCard
            icon={Brain}
            title="AI Categorization"
            description="Gemini AI automatically classifies your tabs into categories and suggests relevant tags."
          />
          <FeatureCard
            icon={Search}
            title="Visual Search"
            description="Find saved tabs by uploading a screenshot. Our vision AI matches it to your collection."
          />
          <FeatureCard
            icon={FolderOpen}
            title="Smart Collections"
            description="Organize tabs into hierarchical collections with drag-and-drop ordering."
          />
          <FeatureCard
            icon={Tags}
            title="Auto Tagging"
            description="AI-suggested tags plus custom tags so you can find anything in seconds."
          />
          <FeatureCard
            icon={Bookmark}
            title="Category Dashboard"
            description="Browse your saved tabs by category in a Netflix-style visual dashboard."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16 md:py-24 bg-zinc-50 dark:bg-zinc-950 rounded-3xl mx-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          How it works
        </h2>
        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
          {[
            {
              step: "1",
              title: "Install the extension",
              desc: "Add Tab Stasher to Chrome in one click.",
            },
            {
              step: "2",
              title: "Save tabs as you browse",
              desc: "Click the extension icon to stash any tab instantly.",
            },
            {
              step: "3",
              title: "AI does the rest",
              desc: "Your tabs are categorized, tagged, and searchable automatically.",
            },
          ].map((item) => (
            <div key={item.step} className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center text-center px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to organize your tabs?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-lg">
          Join Tab Stasher and stop losing important pages in a sea of browser
          tabs.
        </p>
        <Button
          size="lg"
          className="text-base px-8"
          onClick={() => router.push("/signup")}
        >
          Get Started Free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-8 text-center text-sm text-zinc-400">
        &copy; {new Date().getFullYear()} Tab Stasher. All rights reserved.
      </footer>
    </div>
  );
}
