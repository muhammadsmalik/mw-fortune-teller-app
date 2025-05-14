import SingleWaveUnit from './SingleWaveUnit';

export default function BrandFooter() {
  const waveColor = "#AFDFF6"; // As per footer_design.md
  const numUnits = 40; // Reduced for larger units, will overflow and be hidden
  const unitSize = "60px"; // Increased size of each W unit
  const footerHeight = "h-20"; // Tailwind class for 5rem or 80px, should accommodate 60px units well

  return (
    <footer
      className={`w-full ${footerHeight} bg-gradient-to-r from-[#2554A2] to-[#1B1E2B] flex flex-col justify-end relative z-10`}
    >
      <div className="flex flex-row overflow-hidden">
        {Array.from({ length: numUnits }).map((_, index) => (
          <SingleWaveUnit
            key={index}
            isFilled={index % 2 === 0} // Alternate: filled, outlined, filled...
            color={waveColor}
            // For outlined (odd index), use strokeWidth="2". For filled (even index), use a hairline stroke.
            strokeWidth={index % 2 !== 0 ? "1.5" : "0.5"} 
            size={unitSize}
          />
        ))}
      </div>
      {/* Moving Walls Logo - can be positioned here later */}
      {/* For example:
      <div className="absolute bottom-4 left-4 flex items-center text-sm text-mw-white/70">
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-5 w-auto mr-2" />
        <span className="font-semibold text-xs">Moving Walls</span>
      </div>
      */}
    </footer>
  );
} 