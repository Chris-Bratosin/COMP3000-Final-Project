import { ChevronRight, Mail } from "lucide-react";

import { CloudIcon } from "@/components/CloudIcon";
import { aboutStackBadges } from "@/lib/mock-data";

const toneClasses = {
  blue: "bg-[#4a7bbd]",
  navy: "bg-[#2c4564]",
  green: "bg-[#5fa75f]",
};

export function AboutCard() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1>About</h1>
        <p className="max-w-3xl text-[#4a5d7a]">
          CMA is a frontend-first AWS misconfiguration auditing interface built to grow
          into a deeper scan and reporting platform.
        </p>
      </header>

      <section className="max-w-5xl rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <CloudIcon className="h-16 w-auto scale-110" />
          <div>
            <h2>Cloud Misconfiguration Auditor (CMA)</h2>
            <p className="mt-1 text-[#4a5d7a]">
              A security-focused interface for configuring AWS audits, reviewing findings,
              and preparing reports for future backend integration.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {aboutStackBadges.map((badge) => (
                <span
                  key={badge.id}
                  className={`${toneClasses[badge.tone]} rounded px-3 py-1.5 text-xs font-semibold text-white`}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="rounded-lg bg-[#f5f7fa] p-4 text-[#4a5d7a]">
              <p className="mb-2">
                <span className="font-medium text-[#2c4564]">Version:</span> 2.0.0
              </p>
              <p>
                This migration keeps the current CMA design language while moving the frontend
                onto a Next.js App Router foundation that is easier to extend with AWS and backend
                services later.
              </p>
            </div>

            <div className="text-[#4a5d7a]">
              This tool is for educational and testing purposes only. Use it in compliance
              with AWS policies and ethical guidelines.
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[#4a5d7a]">
              <span className="font-medium text-[#2c4564]">Developer:</span> Chris Bratosin
            </div>
            <div className="text-[#4a5d7a]">
              <span className="font-medium text-[#2c4564]">Supervisor:</span> Rory Hopcraft
            </div>

            <div className="flex items-center gap-2 text-[#4a5d7a]">
              <Mail size={16} />
              <span>chris.bratosin@students.plymouuth.ac.uk</span>
            </div>

            <div className="rounded-lg bg-[#f5f7fa] p-4 text-[#4a5d7a]">
              Authentication provider placeholder retained intentionally so you can choose
              between Clerk or Supabase later without reworking the UI.
            </div>

            <a
              href="https://github.com/Chris-Bratosin/COMP3000-Final-Project"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#4a7bbd] hover:text-[#3d5a7e]"
            >
              View Project on GitHub
              <ChevronRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
