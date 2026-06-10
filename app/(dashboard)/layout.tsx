"use client";

import * as React from "react";
import { Sidebar, SidebarDrawer } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/layout/command-palette";
import { QuickActionsFab } from "@/components/layout/quick-actions-fab";
import { WelcomeModal } from "@/components/layout/welcome-modal";
import { ModoApresentacaoToggle } from "@/components/layout/modo-apresentacao";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarMobile, setSidebarMobile] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <SidebarDrawer
        aberto={sidebarMobile}
        onFechar={() => setSidebarMobile(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onAbrirSidebar={() => setSidebarMobile(true)} />
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Breadcrumbs />
          {children}
        </main>
      </div>
      <CommandPalette />
      <QuickActionsFab />
      <WelcomeModal />
      <ModoApresentacaoToggle />
      <KeyboardShortcuts />
    </div>
  );
}
