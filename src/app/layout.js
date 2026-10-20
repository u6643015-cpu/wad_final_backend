import "./globals.css";

export const metadata = {
  title: "CourseHub API",
  description: "Backend API for the Online Course Service",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
