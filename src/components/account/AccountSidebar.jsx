import React, { useContext, useLayoutEffect, useRef, useState } from "react";
import { logoutSession } from "../../api/client.js";
import { LanguageContext, useText } from "../../context/LanguageContext.jsx";
import { ADD_PLACE_PATH, useAccountRole } from "../../utils/partnerAccess.js";
import { navigate } from "../../utils/router.js";
import { UserAvatar } from "../home/HeaderNav.jsx";

const ICONS = {
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  history: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 8v4l3 2"],
  payment: ["M3 6h18v12H3z", "M3 10h18", "M7 15h3"],
  heart: ["M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"],
  today: ["M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01"],
  listing: ["M3 21V9l9-6 9 6v12", "M9 21v-6h6v6"],
  chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  crown: ["M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  plus: ["M12 5v14M5 12h14"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(ICONS[name] || ICONS.user).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

// The rail of the account pages. It sits on the dark page background next to
// the light container; the active item is a light tab that slides between
// items and runs into the container, so the two read as one piece.
export default function AccountSidebar({ active, userState }) {
  const { t } = useText();
  const { content, lang } = useContext(LanguageContext);
  const cms = content?.[lang] || {};
  const { canListPlaces } = useAccountRole();
  const railRef = useRef(null);
  const [tab, setTab] = useState(null);

  const groups = [
    {
      id: "profile",
      title: t("acc_group_profile"),
      items: [
        { id: "about", href: "/profile", label: t("prof_tab_about"), icon: "user" },
        { id: "history", href: "/profile?tab=history", label: t("prof_tab_history"), icon: "history" },
        { id: "payments", href: "/profile?tab=payments", label: t("prof_tab_payments"), icon: "payment" },
        { id: "likes", href: "/profile?tab=likes", label: t("prof_tab_saved"), icon: "heart" },
      ],
    },
    canListPlaces ? {
      id: "cabinet",
      title: t("acc_group_cabinet"),
      items: [
        { id: "listings", href: "/host-listings", label: t("dash_nav_listings"), icon: "listing" },
        { id: "messages", href: "/host-messages", label: t("dash_nav_messages"), icon: "chat" },
        { id: "tariffs", href: "/host-tariffs", label: t("dash_nav_tariffs"), icon: "crown" },
      ],
    } : null,
  ].filter(Boolean);

  // Place the sliding tab over the active item (and keep it there on resize).
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const measure = () => {
      const link = rail.querySelector(`[data-acc="${active}"]`);
      if (!link) return setTab(null);
      const box = link.getBoundingClientRect();
      const base = rail.getBoundingClientRect();
      // Whole pixels: a fractional edge leaves a hairline between the tab and its corners.
      setTab({ top: Math.round(box.top - base.top), height: Math.round(box.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [active, canListPlaces, lang]);

  const name = userState?.name || t("dash_user");
  const roleKey = ["admin", "moderator", "partner", "client"].includes(userState?.role) ? `prof_role_${userState.role}` : "prof_role_default";

  const logout = async () => {
    navigate("login");
    try {
      await logoutSession();
    } catch (error) {
      console.warn("Backend session revocation failed during logout.", error);
    }
  };

  let index = 0;

  return (
    <aside className="acc-rail" ref={railRef} aria-label={t("acc_rail_label")}>
      {tab ? (
        <span
          className="acc-tab"
          aria-hidden="true"
          style={{ transform: `translateY(${tab.top}px)`, height: tab.height }}
        />
      ) : null}

      <div className="acc-user">
        <span className="acc-user-avatar"><UserAvatar src={userState?.avatar} /></span>
        <span className="acc-user-text">
          <strong>{name}</strong>
          <small>{t(roleKey)}</small>
        </span>
        <a className="acc-user-edit" href="/profile-edit" aria-label={t("prof_edit_form")}><Icon name="edit" /></a>
      </div>

      <nav className="acc-groups">
        {groups.map((group) => (
          <div key={group.id} className={`acc-group is-${group.id}`}>
            <span className="acc-group-title">{group.title}</span>
            <ul>
              {group.items.map((item) => {
                index += 1;
                return (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      data-acc={item.id}
                      className={item.id === active ? "is-active" : undefined}
                      aria-current={item.id === active ? "page" : undefined}
                    >
                      <span className="acc-icon"><Icon name={item.icon} /></span>
                      <span className="acc-label">{item.label}</span>
                      <span className="acc-num">{String(index).padStart(2, "0")}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="acc-foot">
        {canListPlaces ? (
          <a className="acc-add" href={ADD_PLACE_PATH}>
            <Icon name="plus" />
            <span>{t("acc_add")}</span>
          </a>
        ) : null}
        <div className="acc-foot-row">
          <a href="/settings" className={active === "settings" ? "is-active" : undefined}>
            <Icon name="settings" />
            <span>{t("dash_menu_settings_label")}</span>
          </a>
          <button type="button" onClick={logout}>
            <Icon name="logout" />
            <span>{cms.menu_logout || t("acc_logout")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
