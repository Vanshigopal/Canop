interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 48 }: BrandMarkProps) {
  return (
    <div
      className="grid place-items-center text-white select-none"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "linear-gradient(135deg, #FDA4AF 0%, #FB923C 45%, #FDE047 100%)",
        boxShadow: "0 8px 20px rgba(236, 72, 153, 0.28), inset 0 1px 0 rgba(255,255,255,0.5)",
        fontFamily: '"Fraunces", serif',
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: Math.round(size * 0.58),
        letterSpacing: "-0.02em",
      }}
    >
      C
    </div>
  );
}
