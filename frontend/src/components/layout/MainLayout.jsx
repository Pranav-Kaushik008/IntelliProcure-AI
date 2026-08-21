import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return <div className="page-wrapper">
      {
    /* Permanent Sidebar */
  }
      <Sidebar
    collapsed={sidebarCollapsed}
    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
  />

      {
    /* Main Content Area */
  }
      <div className={`main-content ${sidebarCollapsed ? "collapsed" : ""}`}>
        {
    /* Sticky Top Navigation */
  }
        <TopNav collapsed={sidebarCollapsed} />

        {
    /* Page Content */
  }
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>;
}
