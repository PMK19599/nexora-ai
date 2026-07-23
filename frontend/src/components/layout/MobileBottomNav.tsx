import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { navigationItems, adminNavigationItem } from '@/config/navigation';

const primaryTabs = navigationItems.slice(0, 4).map(i => ({ ...i, label: i.shortLabel }));
const moreTabs = navigationItems.slice(4);

export default function MobileBottomNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  const allMoreTabs = user?.role === 'admin'
    ? [...moreTabs, adminNavigationItem]
    : moreTabs;

  const isMoreActive = allMoreTabs.some(t => location.pathname === t.path);

  return (
    <>
      {/* More menu overlay + panel */}
      {showMore && (
        <>
          <div
            className="mobile-more-overlay"
            onClick={() => setShowMore(false)}
          />
          <div className="mobile-more-menu">
            {allMoreTabs.map(tab => (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `mobile-more-item${isActive ? ' active' : ''}`
                }
              >
                <span className="mobile-more-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile navigation">
        <div className="mobile-bottom-nav-inner">
          {primaryTabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `mobile-nav-item${isActive ? ' active' : ''}`
              }
            >
              <span className="mobile-nav-icon">{tab.icon}</span>
              <span className="mobile-nav-label">{tab.label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`mobile-nav-item${isMoreActive ? ' active' : ''}`}
            aria-label="More options"
          >
            <span className="mobile-nav-icon">
              {showMore ? '✕' : '•••'}
            </span>
            <span className="mobile-nav-label">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
