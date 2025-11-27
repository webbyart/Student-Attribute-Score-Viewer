
import React, { ReactNode } from 'react';
import BottomNavBar from './BottomNavBar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fuchsia-50 via-blue-50 to-yellow-50">
      <main className="pb-28 pt-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <BottomNavBar items={[]} />
    </div>
  );
};

export default MainLayout;