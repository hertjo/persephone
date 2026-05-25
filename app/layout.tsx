import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persephone · Persistent Homology of Image Manifolds",
  description:
    "Real-time topological data analysis for computer vision. Treats an image as a discrete Morse function and visualizes the persistent homology of its sublevel-set filtration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
