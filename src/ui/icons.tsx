/**
 * Inline SVG icons. Kept as components rather than an icon font or a sprite
 * sheet so they inherit `currentColor` and cost no extra request.
 *
 * Names follow the Figma layer names where one exists.
 */

interface IconProps {
  size?: number
  class?: string
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round" as const,
  "stroke-linejoin": "round" as const,
  "aria-hidden": "true",
})

export const ThumbsUp = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
)

export const ThumbsDown = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
)

/** check-decagram-outline, per the Figma sidebar. Progress marker. */
export const Decagram = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="m12 2 2.4 2.1 3.1-.5 1.1 3 2.9 1.3-.9 3 2 2.4-2 2.4.9 3-2.9 1.3-1.1 3-3.1-.5L12 22l-2.4-2.1-3.1.5-1.1-3-2.9-1.3.9-3L1.4 10.7l2-2.4-.9-3 2.9-1.3 1.1-3 3.1.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

/** Filled variant -- every applicable context covered. */
export const DecagramFilled = ({ size = 16, class: cls }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    class={cls}
  >
    <path d="m12 1.6 2.6 2.3 3.4-.6 1.2 3.3 3.2 1.4-1 3.3 2.2 2.6-2.2 2.6 1 3.3-3.2 1.4-1.2 3.3-3.4-.6L12 22.4l-2.6-2.3-3.4.6-1.2-3.3-3.2-1.4 1-3.3L.4 11.3l2.2-2.6-1-3.3 3.2-1.4L6 .7l3.4.6Z" />
    <path
      d="m8.5 12 2.3 2.3 4.7-4.7"
      fill="none"
      stroke="var(--surface)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const Pencil = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const Info = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
)

export const ArrowRight = ({ size = 16, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export const Sun = ({ size = 18, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const Moon = ({ size = 18, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
)

export const Users = ({ size = 22, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export const BookType = ({ size = 22, class: cls }: IconProps) => (
  <svg {...base(size)} class={cls}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    <path d="M10 7h6M13 7v7" />
  </svg>
)

export const Discord = ({ size = 18, class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
    <path d="M20.32 4.57A19.79 19.79 0 0 0 15.43 3c-.24.42-.5.98-.69 1.43a18.3 18.3 0 0 0-5.48 0C9.07 3.98 8.79 3.42 8.56 3a19.74 19.74 0 0 0-4.9 1.57C.56 9.2-.28 13.7.14 18.14a19.9 19.9 0 0 0 6.03 3.07c.49-.67.92-1.38 1.29-2.13-.71-.27-1.38-.6-2.02-.98.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.12 0c.16.14.33.28.5.4-.64.39-1.32.72-2.03.99.37.75.8 1.46 1.29 2.13a19.87 19.87 0 0 0 6.04-3.07c.5-5.14-.85-9.6-3.54-13.57ZM8.02 15.41c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.2 0 2.17 1.1 2.15 2.42 0 1.33-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.2 0 2.17 1.1 2.15 2.42 0 1.33-.94 2.42-2.15 2.42Z" />
  </svg>
)

export const GitHub = ({ size = 18, class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={cls}>
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.26.8-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5Z" />
  </svg>
)

/** The ETHGlossary mark from the Figma logo lockup. */
export const Logo = ({ size = 22, class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" class={cls}>
    <path d="M12 1.5 5.5 12l6.5 3.8L18.5 12 12 1.5Z" fill="var(--violet)" />
    <path d="M12 17.2 5.5 13.4l6.5 9.1 6.5-9.1-6.5 3.8Z" fill="var(--yellow)" />
  </svg>
)
