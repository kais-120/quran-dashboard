import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store.jsx';
import Icon from './Icon.jsx';
import { MdGroups2, MdOutlineVolunteerActivism } from "react-icons/md";
import { IoMdBook } from "react-icons/io";
import {
  FaUsers,
  FaHome,
  FaClipboardCheck,
  FaSlidersH,
  FaCalendarCheck,
  FaUserClock,
  FaMoneyBillWave,
  FaDatabase,
  FaGraduationCap,
  FaUserCog,
} from "react-icons/fa";

const NAV = [
  { to: "/", label: "لوحة التحكم", icon: FaHome, end: true, adminOnly: true },
  { to: "/students", label: "التلاميذ", icon: FaUsers },
  { to: "/teachers", label: "المعلمون", icon: IoMdBook },
  { to: "/groups", label: "الأفواج", icon: MdGroups2 },
  { to: "/registrations", label: "التسجيلات", icon: FaClipboardCheck },
  { to: "/users", label: "المستخدمون", icon: FaUserCog },
  { to: "/activities", label: "النشاطات", icon: FaCalendarCheck },
  { to: "/courses", label: "الدورات", icon: FaGraduationCap },
  { to: "/absences", label: "الغيابات", icon: FaUserClock },
  { to: "/expenses", label: "المصاريف", icon: FaMoneyBillWave },
  {
    to: "/donations",
    label: "التبرعات",
    icon: MdOutlineVolunteerActivism,
  },
  { to: "/settings", label: "الإعدادات", icon: FaSlidersH },
  { to: "/backup", label: "النسخ الاحتياطي", icon: FaDatabase },
];

export default function Layout() {
  const { data, logout, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const navItems = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="app">
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">۞</span>
          <div>
            <strong>{data?.association_name}</strong>
            <small>{data?.school_year}</small>
          </div>
        </div>
        <nav>
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span>
                <n.icon size={22} />
              </span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="nav-link logout" onClick={logout}>
          <Icon name="logout" />
          <span>تسجيل الخروج</span>
        </button>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="القائمة">
            <Icon name="menu" size={22} />
          </button>
          <span className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}