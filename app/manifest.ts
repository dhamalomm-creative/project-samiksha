import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Samiksha",
    short_name: "Samiksha",
    description: "Wishlists for meaningful gifting.",
    start_url: "/home",
    display: "standalone",
    background_color: "#faf6ee",
    theme_color: "#faf6ee",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
