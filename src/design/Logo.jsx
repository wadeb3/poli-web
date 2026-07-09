// Poli logo components — SVG embedded directly from designer files.
// Do not modify coordinates or colours.

export function Logo({ height = 32, dark = false }) {
  if (dark) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 120" height={height} width={height * (184/120)} aria-label="Poli" role="img">
      <text x="6" y="86.4" fontFamily="Manrope, Helvetica, Arial, sans-serif" fontSize="96" fontWeight="800" letterSpacing="-1" fill="#FFFFFF">Polı</text>
      <circle cx="165.18" cy="36.40" r="11.50" fill="#A855F7"/>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 120" height={height} width={height * (184/120)} aria-label="Poli" role="img">
      <text x="6" y="86.4" fontFamily="Manrope, Helvetica, Arial, sans-serif" fontSize="96" fontWeight="800" letterSpacing="-1" fill="#17171A">Polı</text>
      <circle cx="165.18" cy="36.40" r="11.50" fill="#7C3AED"/>
    </svg>
  );
}

export function LogoMark({ size = 32, dark = false }) {
  if (dark) return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width={size} height={size} aria-label="Poli" role="img">
      <rect width="1024" height="1024" rx="232" fill="#17171A"/>
      <text x="322.9" y="596.8" fontFamily="Manrope, Helvetica, Arial, sans-serif" fontSize="245.8" fontWeight="800" letterSpacing="-18.43" fill="#FFFFFF">Polı</text>
      <circle cx="674.9" cy="468.8" r="29.4" fill="#A855F7"/>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width={size} height={size} aria-label="Poli" role="img">
      <rect width="1024" height="1024" rx="232" fill="#FFFFFF"/>
      <text x="322.9" y="596.8" fontFamily="Manrope, Helvetica, Arial, sans-serif" fontSize="245.8" fontWeight="800" letterSpacing="-18.43" fill="#17171A">Polı</text>
      <circle cx="674.9" cy="468.8" r="29.4" fill="#7C3AED"/>
    </svg>
  );
}
