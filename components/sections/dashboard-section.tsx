"use client";

import { SectionId } from "@/lib/constants";
import { DashboardView } from "./dashboard-view";
import { PoultryView } from "./poultry-view";
import { VegetablesView } from "./vegetables-view";
import { RabbitryView } from "./rabbitry-view";
import { CanineView } from "./canine-view";
import { FinanceView } from "./finance-view";

export function DashboardSection({ active }: { active: SectionId }) {
  switch (active) {
    case "dashboard":
      return <DashboardView />;
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
    default:
      return <DashboardView />;
  }
}
