import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function baseProps(props: IconProps) {
  const { title, ...rest } = props;
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': title ? undefined : true,
    focusable: false as const,
    role: title ? ('img' as const) : undefined,
    ...rest,
  };
}

export function IconLogoMark(props: IconProps) {
  return (
    <svg {...baseProps({ width: 14, height: 14, ...props })}>
      <path d="M4 16V8m4 10V6m4 8v-4m4 8V9" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTerminal(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 17.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 6.1l1.6-1.6" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 11 7.1-3.5M8.2 13l7.1 3.5" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...baseProps({ width: 12, height: 12, ...props })}>
      <path d="M12 8v5m0 3h.01M10.3 4.2 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg {...baseProps({ width: 24, height: 24, ...props })}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function IconWifi(props: IconProps) {
  return (
    <svg {...baseProps({ width: 24, height: 24, ...props })}>
      <path d="M5 12.5a9 9 0 0 1 14 0M8 15.5a5 5 0 0 1 8 0" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHardDrive(props: IconProps) {
  return (
    <svg {...baseProps({ width: 24, height: 24, ...props })}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 13h16M8 17h.01M12 17h.01" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...baseProps({ width: 24, height: 24, ...props })}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

export function IconServer(props: IconProps) {
  return (
    <svg {...baseProps({ width: 24, height: 24, ...props })}>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...baseProps({ width: 16, height: 16, ...props })}>
      <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.5 4.2-1.1 7-4.3 7-8.5V6l-7-3z" />
      <path d="M12 8v5m0 3h.01" />
    </svg>
  );
}
