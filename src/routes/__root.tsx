import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const APP_NAME = "Codec War";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Filament in. Codec. Booth out. Dispersion keeps canals. The war is the mix.",
      },
      { name: "theme-color", content: "#0e0e0c" },
      { property: "og:title", content: APP_NAME },
      { property: "og:image", content: "/og.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
