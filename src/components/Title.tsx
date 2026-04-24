import { Separator, Flex, Text } from "@radix-ui/themes";
import Image from "next/image";

export enum TitleFontSize {
  ExtraSmall = "1rem",
  Small = "1.5rem",
  Medium = "1.875rem",
  Big = "2.25rem",
  Large = "2.5rem",
}

export enum Subtitle {
  reports = "Reports",
  reviews = "Reviews",
}

interface TitleProps {
  fontSize?: TitleFontSize;
  showLogo?: boolean;
  subtitle?: Subtitle;
}

export const Title = ({
  fontSize = TitleFontSize.Medium,
  showLogo = false,
  subtitle,
}: TitleProps) => {
  return (
    <Flex direction="row" align="center" justify="center" gap="10px" mr="5">
      {showLogo && (
        <Image
          src="/logo.png"
          alt="ExploreTMF Logo"
          width="36"
          height="36"
          style={{
            objectFit: "contain",
          }}
        />
      )}
      <h2
        style={{
          color: "#2d3748",
          fontSize,
          fontWeight: 800,
          transition: "font-size 0.2s ease",
          userSelect: "none",
          margin: 0,
        }}
      >
        <span style={{ color: "#2d3748" }}>Explor</span>
        <span
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #4a37da 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          eTMF
        </span>
      </h2>
      {subtitle && (
        <Flex gap="10px" direction="row" align="center">
          <Separator
            orientation="vertical"
            style={{
              width: "1px",
              height: "1.8rem",
              background:
                "linear-gradient(to bottom, transparent, #cbd5e0, transparent)",
              margin: "0 5px",
            }}
          />{" "}
          <Text weight="medium" style={{ color: "#2d3748" }}>
            {" "}
            {subtitle}
          </Text>
        </Flex>
      )}
    </Flex>
  );
};
