export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute animate-drift rounded-full opacity-55"
        style={{
          width: 580,
          height: 580,
          background: "#FECDD3",
          filter: "blur(140px)",
          top: -150,
          left: -120,
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute animate-drift rounded-full opacity-55"
        style={{
          width: 520,
          height: 520,
          background: "#BAE6FD",
          filter: "blur(140px)",
          top: "30%",
          right: -150,
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute animate-drift rounded-full opacity-55"
        style={{
          width: 460,
          height: 460,
          background: "#FED7AA",
          filter: "blur(140px)",
          bottom: -120,
          left: "25%",
          animationDelay: "-15s",
        }}
      />
      <div
        className="absolute animate-drift rounded-full opacity-40"
        style={{
          width: 400,
          height: 400,
          background: "#BBF7D0",
          filter: "blur(140px)",
          top: "55%",
          left: "15%",
          animationDelay: "-4s",
        }}
      />
    </div>
  );
}
