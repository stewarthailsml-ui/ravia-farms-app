"use client";

import { SectionId } from "@/lib/constants";
import { DashboardView } from "./dashboard-view";
import { PoultryView } from "./poultry-view";
import { VegetablesView } from "./vegetables-view";
import { RabbitryView } from "./rabbitry-view";
import { CanineView } from "./canine-view";
import { FinanceView } from "./finance-view";
import { StaffView } from "./staff-view";

interface DashboardSectionProps {
  active: SectionId;
  onNavigate?: (id: SectionId) => void;
}

export function DashboardSection({ active, onNavigate }: DashboardSectionProps) {
  switch (active) {
    case "dashboard":
      return <DashboardView onNavigate={onNavigate} />;
    case "poultry":
      return <PoultryView />;
    case "vegetables":
      return <VegetablesView />;
    case "rabbits":
      return <RabbitryView />;
    case "dogs":
      return <CanineView />;
    case "finance":
      return <FinanceView />;
    case "staff":
      return <StaffView />;
    default:
      return <DashboardView />;
  }
}
