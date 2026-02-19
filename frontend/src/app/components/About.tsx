import { Mail, ChevronRight } from 'lucide-react';
import { CloudIcon } from './CloudIcon';

export function About() {
  return (
    <div className="p-8">
      <h1 className="text-[#2c4564] text-2xl font-semibold mb-6">About</h1>

      <div className="bg-white rounded-lg p-8 max-w-[900px]">
        {/* Header with Icon and Title */}
        <div className="flex items-center gap-4 mb-6">
          <div className="scale-125">
            <CloudIcon />
          </div>
          <h2 className="text-[#2c4564] text-xl font-semibold">
            Cloud Misconfiguration Auditor (CMA)
          </h2>
        </div>

        {/* Description */}
        <p className="text-[#4a5d7a] text-sm leading-relaxed mb-8">
          The Cloud Misconfiguration Auditor (CMA) is a security tool designed to scan AWS
          environments for common misconfigurations, identify potential security risks, and provide
          remediation advice.
        </p>

        {/* Version and Developer Info */}
        <div className="grid grid-cols-2 gap-x-12 mb-8">
          <div>
            <div className="text-[#4a5d7a] text-sm mb-4">
              <span className="font-medium">Version:</span> 1.0.0
            </div>

            {/* Technology Stack */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#4a7bbd] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                      fill="currentColor"
                    />
                  </svg>
                  boto3
                </div>
                <div className="bg-[#4a7bbd] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 8c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z"
                      fill="currentColor"
                    />
                  </svg>
                  AWS SDK
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#2c4564] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 2l6 3v6l-6 3-6-3V5l6-3z"
                      fill="currentColor"
                    />
                  </svg>
                  FastAPI
                </div>
                <div className="bg-[#5fa75f] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" fill="currentColor" />
                  </svg>
                  React
                </div>
              </div>

            </div>
          </div>

          <div>
            <div className="text-[#4a5d7a] text-sm mb-3">
              <span className="font-medium">Developer:</span> Chris Bratosin <span className="font-medium">Supervisor:</span> Rory Hopcraft
            </div>

            <div className="flex items-center gap-2 text-[#4a5d7a] text-sm mb-6">
              <Mail size={16} />
              <span>chris.bratosin@students.plymouuth.ac.uk</span>
            </div>

            <div className="bg-[#f5f7fa] p-4 rounded-lg text-[#4a5d7a] text-xs leading-relaxed">
              This tool is for educational and testing purposes only. Please use this tool in
              compliance with AWS policies and ethical guidelines. Unauthorized use of the tool on
              unauthorized AWS environments is prohibited.
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="text-[#4a5d7a] text-sm leading-relaxed mb-6 pb-6 border-b">
          This tool is for educational and testing purposes only. Please use this tool in
          compliance with AWS policies and ethical guidelines. Unauthorized use of the tool on
          unauthorized AWS environments is prohibited.
        </div>

        {/* GitHub Link */}
        <a
          href="https://github.com/Chris-Bratosin/COMP3000-Final-Project"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[#4a7bbd] hover:text-[#3d5a7e] text-sm font-medium"
        >
          View Project on GitHub
          <ChevronRight size={18} />
        </a>
      </div>
    </div>
  );
}
