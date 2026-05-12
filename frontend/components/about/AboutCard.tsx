import { ExternalLink, Github, Mail } from "lucide-react";

import { CloudIcon } from "@/components/CloudIcon";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { TechBadge } from "@/components/shared/TechBadge";
import { Button } from "@/components/ui/button";
import { aboutStackBadges } from "@/lib/mock-data";

export function AboutCard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About CMA"
        subtitle="A local AWS misconfiguration auditor for S3 and IAM, EC2/Network, and Secrets Checks."
        action={
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-[#dfd2bc] bg-white text-[#55493b] hover:bg-[#f6efe3]"
          >
            <a
              href="https://github.com/Chris-Bratosin/COMP3000-Final-Project"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={16} />
              View on GitHub
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <SectionCard className="h-full">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-[1.25rem] border border-[#e4d8c4] bg-[#faf5ec]">
                <CloudIcon className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-[1.85rem] font-semibold text-[#352d24]">
                  Cloud Misconfiguration Auditor
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-[#7f715f]">
                  A security-focused tool for running read-only AWS checks, reviewing
                  findings, and preparing dashboard, report, and log evidence from a
                  localhost backend.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {aboutStackBadges.map((badge) => (
                <TechBadge key={badge.id} id={badge.id} label={badge.label} />
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock label="Developer" value="Chris Bratosin" />
              <InfoBlock label="Supervisor" value="Rory Hopcraft" />
            </div>

            <div className="flex items-center gap-2 text-sm text-[#8a7a66]">
              <Mail size={16} className="text-[#a98663]" />
              <span>chris.bratosin@students.plymouth.ac.uk</span>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#9c886f]">
              Version
            </p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-[#352d24]">1.0.2</p>
          </SectionCard>

          <SectionCard className="border-[#d9e4f1] bg-[#edf4fd]">
            <h3 className="font-semibold text-[#6a9bda]">Local prototype scope</h3>
            <p className="mt-2 text-sm leading-6 text-[#5e6f87]">
              CMA is intentionally single-user and localhost-only. AWS credentials are
              supplied per scan and are not saved by the application.
            </p>
          </SectionCard>

          <SectionCard>
            <h3 className="font-semibold text-[#352d24]">Educational use only</h3>
            <p className="mt-2 text-sm leading-6 text-[#7f715f]">
              This tool is for educational and testing purposes. Use it in compliance
              with AWS policies and ethical guidelines.
            </p>
            <a
              href="https://github.com/Chris-Bratosin/COMP3000-Final-Project"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#9f734f]"
            >
              View Project on GitHub
              <ExternalLink size={15} />
            </a>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[#e4d8c4] bg-[#fffdfa] px-4 py-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#9c886f]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[#352d24]">{value}</p>
    </div>
  );
}
