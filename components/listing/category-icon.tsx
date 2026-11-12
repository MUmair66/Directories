import {
  Briefcase, Building2, Calculator, Car, GraduationCap, Hammer, HeartPulse, Hotel, Landmark, LayoutGrid, Megaphone, Newspaper,
  Palette, PartyPopper, PawPrint, Scale, ShieldCheck, ShoppingBag, Smile, Snowflake, Sofa, Sparkles, Sun, Trophy, Truck, Users,
  UtensilsCrossed, WashingMachine, Wifi, Wrench, Zap, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Briefcase, Building2, Calculator, Car, GraduationCap, Hammer, HeartPulse, Hotel, Landmark, Megaphone, Newspaper, Palette,
  PartyPopper, PawPrint, Scale, ShieldCheck, ShoppingBag, Smile, Snowflake, Sofa, Sparkles, Sun, Trophy, Truck, Users,
  UtensilsCrossed, WashingMachine, Wifi, Wrench, Zap,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]) || LayoutGrid;
  return <Icon className={className} aria-hidden />;
}
