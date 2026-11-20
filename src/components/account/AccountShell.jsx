import React, { Suspense, useEffect } from "react";
import { Header as JoyNavbar } from "../HomeHero.jsx";
import { useQueryParam, useRoute } from "../../utils/router.js";
import AccountSidebar from "./AccountSidebar.jsx";
import "./accountSidebar.css";

export const ACCOUNT_ROUTES = ["profile", "profile-edit", "settings"];

export function isAccountRoute(route = "") {
  return ACCOUNT_ROUTES.includes(route) || route.startsWith("host-");
}

// Which rail item a page belongs to. Read from the live URL, so the marker
// moves the moment a link is clicked, before the page content swaps.
function useActiveItem() {
  const route = useRoute();
  const tab = useQueryParam("tab");
  if (route === "profile") return ["history", "payments", "likes"].includes(tab) ? tab : "about";
  if (route === "profile-edit") return "about";
  if (route === "settings") return "settings";
  // A place's schedule lives under "My places".
  if (route === "host-calendar" || route === "host-today") return "listings";
  if (route.startsWith("host-")) return route.replace("host-", "");
  return "";
}

// One frame for every account page: the site header and the rail stay put,
// and so does the light container; only the page inside it changes.
export default function AccountShell({ userState, setUserState, children }) {
  const active = useActiveItem();

  // Let the rail stick while the page scrolls (see body.acc-body in the CSS).
  useEffect(() => {
    document.body.classList.add("acc-body");
    return () => document.body.classList.remove("acc-body");
  }, []);

  return (
    <main className="acc-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} />
      <div className="acc-frame">
        <AccountSidebar active={active} userState={userState} />
        <div className="acc-stage">
          {/* The container stays put; only the page inside it changes (and carries the page fade).
              Pages load lazily; waiting for one must not unmount the rail. */}
          <div className="acc-container">
            <div className="acc-page route-screen app-route-shell">
              <Suspense fallback={<div className="acc-loading" />}>{children}</Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
