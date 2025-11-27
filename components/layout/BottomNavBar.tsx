import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import HomeIcon from '../../assets/icons/HomeIcon';
import ChartBarIcon from '../../assets/icons/ChartBarIcon';
import DocumentTextIcon from '../../assets/icons/DocumentTextIcon';
import UserCircleIcon from '../../assets/icons/UserCircleIcon';

const icons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserCircleIcon,
};

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface BottomNavBarProps {
  items: NavItem[];
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ items }) => {
  const location = useLocation();
  const activeClass = "text-purple-600";
  const inactiveClass = "text-slate-500 hover:text-purple-500";
  
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-sm mx-auto z-50">
      <div className="flex justify-around items-center bg-white/60 backdrop-blur-lg shadow-xl rounded-full px-6 py-3 space-x-6">
        {items.map(({ path, label, icon }) => {
          const Icon = icons[icon];
          // For nested routes, we need a more specific active check
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path) && path.split('/').length === location.pathname.split('/').length);
          const isHomePageActive = path.endsWith('dashboard') && location.pathname.endsWith('dashboard');
          const finalIsActive = path.split('/').length > 2 ? isActive : location.pathname === path || isHomePageActive;

          return (
            <NavLink
              key={path}
              to={path}
              end={path.split('/').length <= 2} // Use `end` for top-level routes
              className={`flex flex-col items-center space-y-1 transition-colors duration-200 ${
                finalIsActive ? activeClass : inactiveClass
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;