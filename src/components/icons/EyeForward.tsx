import type { SVGProps } from "react";

const EyeForward = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Eye shape */}
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
    {/* Forward arrow instead of pupil */}
    <path d="M10 9l4 3-4 3" strokeWidth="2.2" />
  </svg>
);

export default EyeForward;
