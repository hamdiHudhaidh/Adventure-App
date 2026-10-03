import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconMemories = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="13" height="11" />
    <path d="M7 19h14V8" strokeDasharray="2 2" />
    <path d="M3 13l4-4 3 3 2-2 4 4" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="7" strokeDasharray="3 2" />
    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
  </Base>
);

export const IconGps = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11l18-8-8 18-2-8-8-2z" />
  </Base>
);

export const IconCamera = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8h4l2-3h6l2 3h4v11H3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Base>
);

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Base>
);

export const IconPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-6-6.2-6-11a6 6 0 1112 0c0 4.8-6 11-6 11z" />
    <circle cx="12" cy="10" r="2" />
  </Base>
);

export const IconCompass = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </Base>
);

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 5l12 7-12 7z" />
  </Base>
);

export const IconReset = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12a8 8 0 108-8H8" />
    <path d="M10 1L7 4l3 3" />
  </Base>
);

export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
