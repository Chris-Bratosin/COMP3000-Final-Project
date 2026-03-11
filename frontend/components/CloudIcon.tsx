import * as React from "react";

export function CloudIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 85 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M67.5 45C74.4036 45 80 39.4036 80 32.5C80 25.5964 74.4036 20 67.5 20C66.7044 20 65.9275 20.0713 65.1746 20.2085C63.7837 12.0535 56.7164 6 48.5 6C39.387 6 32 13.387 32 22.5C32 23.5948 32.0997 24.6668 32.2893 25.7069C29.9095 23.4647 26.7674 22 23.5 22C16.5964 22 11 27.5964 11 34.5C11 41.4036 16.5964 47 23.5 47H67.5"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="55" cy="30" r="14" fill="#4a7bbd" stroke="white" strokeWidth="3" />
      <path
        d="M55 36V30L50 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
