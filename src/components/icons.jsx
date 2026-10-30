/** Iconos de línea fina (24×24, trazo 1.5). */
const Svg = ({ children, size = 22, className = '', title, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    {...rest}
  >
    {title && <title>{title}</title>}
    {children}
  </svg>
)

/* ------------------------------ sistemas / capas ------------------------------ */

export const BoneIcon = (p) => (
  <Svg {...p}>
    <path d="M8.2 6.4a2.3 2.3 0 1 0-3.4 2.9 2.3 2.3 0 1 0 2.9 3.4l4.6-4.6a2.3 2.3 0 1 0 3.4-2.9" transform="translate(1.2 1.2)" />
    <path d="M15.8 17.6a2.3 2.3 0 1 0 3.4-2.9 2.3 2.3 0 1 0-2.9-3.4l-4.6 4.6a2.3 2.3 0 1 0-3.4 2.9" transform="translate(-1.2 -1.2)" />
  </Svg>
)

export const SkullIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4 2.5 5v2.5c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5V15c1.4-1 2.5-2.6 2.5-5 0-4-3.1-7-7.5-7Z" />
    <circle cx="9" cy="11" r="1.6" />
    <circle cx="15" cy="11" r="1.6" />
    <path d="M12 13.5v1.5M10 19v2M14 19v2" />
  </Svg>
)

export const MuscleIcon = (p) => (
  <Svg {...p}>
    <path d="M4 15c2-1 3-3.5 3.5-6.5C8 6 9.5 4.5 11.5 5s2.2 2.5 1.5 4l-1 2c2-.8 4.6-.5 6.2 1.3 2 2.2 1.4 5.6-1.4 6.6-3.4 1.2-8.3.4-12.8-3.9" />
    <path d="M9 12.5c1.5.3 2.6 1.3 3 2.8M14.5 14.5c.6.6.9 1.5.8 2.4" />
  </Svg>
)

export const HeartIcon = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20Z" />
    <path d="M6 12h3l1.5-2.5 2 5 1.5-2.5h4" />
  </Svg>
)

export const BrainIcon = (p) => (
  <Svg {...p}>
    <path d="M12 5.5V19M12 5.5A2.8 2.8 0 0 0 7 6.2a2.8 2.8 0 0 0-2.3 4 3 3 0 0 0 .7 5.2A2.9 2.9 0 0 0 9.4 19H12M12 5.5a2.8 2.8 0 0 1 5-.7 2.8 2.8 0 0 1 2.3 4.4 3 3 0 0 1-.7 5.2 2.9 2.9 0 0 1-4 3.6H12" />
    <path d="M8.5 10.5c1 0 1.8.7 1.8 1.6M15.5 10.5c-1 0-1.8.7-1.8 1.6M8 15c.8-.4 1.8-.2 2.3.5M16 15c-.8-.4-1.8-.2-2.3.5" />
  </Svg>
)

export const NeuronIcon = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="9" r="2.6" />
    <path d="M10.4 10.2 19 17M5.6 7.6 3.5 5.5M7 6.5 6.5 3.5M5.5 10.5 3 12M8.5 11.6 8 14.5M14 14l.4 2.6M16.5 16l2.6-.3M19 17l1.5 1.5" />
  </Svg>
)

export const LungsIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4v7M12 11l-2.5 2M12 11l2.5 2" />
    <path d="M9.3 7.2C7 7.2 4 11 4 16.4c0 2 1.2 3 3 2.6l2.6-.6c.6-.1 1-.7 1-1.3V9.3c0-1.1-.4-2.1-1.3-2.1ZM14.7 7.2c2.3 0 5.3 3.8 5.3 9.2 0 2-1.2 3-3 2.6l-2.6-.6c-.6-.1-1-.7-1-1.3V9.3c0-1.1.4-2.1 1.3-2.1Z" />
  </Svg>
)

export const StomachIcon = (p) => (
  <Svg {...p}>
    <path d="M9 3v4c0 1.5 1 2.2 2.4 2.5 3 .6 5.6 2 5.6 5.4 0 3.3-2.8 5.6-6.4 5.6-2.6 0-4.4-1.2-5.1-3.1" />
    <path d="M14 3v2.5c0 .9.5 1.5 1.3 1.9C18 8.6 20 10.8 20 14.4M5.5 17.4c-.4-1 .3-2 1.4-2.1 1.8-.2 2.8-1 2.8-2.7" />
  </Svg>
)

export const KidneyIcon = (p) => (
  <Svg {...p}>
    <path d="M7.5 4C4.7 4 3 7 3 11.5 3 16.5 5 20 8 20c2.2 0 3-1.6 3-3.4 0-1.6-1.4-2.2-1.4-4.6S11 8.6 11 7c0-1.8-1.4-3-3.5-3Z" />
    <path d="M16.5 4C19.3 4 21 7 21 11.5c0 5-2 8.5-5 8.5-2.2 0-3-1.6-3-3.4 0-1.6 1.4-2.2 1.4-4.6S13 8.6 13 7c0-1.8 1.4-3 3.5-3Z" />
  </Svg>
)

export const DropletIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />
    <path d="M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8" />
  </Svg>
)

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6l-7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)

export const SkinIcon = (p) => (
  <Svg {...p}>
    <path d="M3 8c3-2 6 2 9 0s6-2 9 0M3 12.5c3-2 6 2 9 0s6-2 9 0" />
    <path d="M3 17h18M8 17v3M16 17v3M12 17v2" />
  </Svg>
)

export const BodyIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="4.6" r="2" />
    <path d="M8 21l1-7-2.5-4.5L5 11M16 21l-1-7 2.5-4.5L19 11M9 14h6M8.5 8h7l1 1.5M8.5 8 7.5 9.5" />
  </Svg>
)

export const OrgansIcon = (p) => (
  <Svg {...p}>
    <path d="M9 4c-2.5 0-4.5 3-4.5 7 0 2 1 2.8 2.4 2.5l2-.5c.6-.2 1.1-.7 1.1-1.4V5.5C10 4.6 9.7 4 9 4ZM15 4c2.5 0 4.5 3 4.5 7 0 2-1 2.8-2.4 2.5l-2-.5c-.6-.2-1.1-.7-1.1-1.4V5.5c0-.9.3-1.5 1-1.5Z" />
    <path d="M8 16.5c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2Z" />
  </Svg>
)

export const SYSTEM_ICONS = {
  oseo: BoneIcon,
  muscular: MuscleIcon,
  circulatorio: HeartIcon,
  nervioso: BrainIcon,
  respiratorio: LungsIcon,
  digestivo: StomachIcon,
  urinario: KidneyIcon,
  endocrino: DropletIcon,
  linfatico: ShieldIcon,
  tegumentario: SkinIcon,
}

export const LAYER_ICONS = {
  piel: BodyIcon,
  musculos: MuscleIcon,
  circulatorio: HeartIcon,
  nervioso: NeuronIcon,
  organos: OrgansIcon,
  esqueleto: SkullIcon,
}

/* ------------------------------------ UI ------------------------------------ */

export const HalfBodyIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="4.6" r="2" />
    <path d="M12 7.8h-3.5L7.5 9.5 6.5 11M12 7.8h3.5l1 1.7 1 1.5M9.2 14 8 21M14.8 14 16 21M9.2 14h5.6M12 7.8V21" />
    <path d="M12 6.6c-1.1 0-2 .9-2 2v5.4h2" fill="currentColor" stroke="none" opacity="0.35" />
  </Svg>
)

export const SearchIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
)
export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const ResetIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
    <path d="M4.5 4.5V9H9" />
  </Svg>
)
export const ExpandIcon = (p) => (
  <Svg {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Svg>
)
export const ShrinkIcon = (p) => (
  <Svg {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Svg>
)
export const TagIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 12.2V4.5c0-.6.4-1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0l-8.3-8.3Z" />
    <circle cx="8" cy="8" r="1.4" />
  </Svg>
)
export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
)
export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path d="M3 3l18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.5 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1" />
    <path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" />
  </Svg>
)
export const LayersIcon = (p) => (
  <Svg {...p}>
    <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" />
    <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" />
  </Svg>
)
export const ChevronLeft = (p) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)
export const ChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)
export const ChevronDown = (p) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
)
export const ArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5" />
  </Svg>
)
export const FocusIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </Svg>
)
export const RotateIcon = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="12" rx="9" ry="3.5" />
    <path d="M12 3v18M17.5 9.2l1.5-1.2-1.8-.8" />
  </Svg>
)
export const CheckIcon = (p) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
export const ShuffleIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 7H7c4.5 0 5.5 10 10 10h3.5M3.5 17H7c1.6 0 2.7-1.3 3.6-3M13.4 10c.9-1.7 2-3 3.6-3h3.5M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5" />
  </Svg>
)
export const PlayIcon = (p) => (
  <Svg {...p}>
    <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8Z" />
  </Svg>
)
export const CardsIcon = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="12" height="14" rx="2" />
    <path d="M8 3.5h10.5a2 2 0 0 1 2 2V17" />
  </Svg>
)
export const TargetIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </Svg>
)
export const BookIcon = (p) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
  </Svg>
)
export const MenuIcon = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
)
export const SparkIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2L12 3.5Z" />
  </Svg>
)
export const LogoMark = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8EC9FF" />
        <stop offset="0.55" stopColor="#B9A6FF" />
        <stop offset="1" stopColor="#FF8FA3" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="12" fill="#fff" stroke="url(#lg-a)" strokeWidth="1.5" />
    <circle cx="20" cy="11" r="3.4" fill="none" stroke="url(#lg-a)" strokeWidth="1.8" />
    <path d="M13.5 30.5 15 21l-3.2-4.6M26.5 30.5 25 21l3.2-4.6M15 21h10M14.2 15.5h11.6" fill="none" stroke="url(#lg-a)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M20 15.5v9" stroke="url(#lg-a)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.5 2.2" />
  </svg>
)
