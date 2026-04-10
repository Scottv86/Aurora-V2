export interface MenuItem {
  id: string;
  label: string;
  iconName: string;
  to?: string;
  isVisible: boolean;
  isCustom?: boolean;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuConfig {
  sections: MenuSection[];
}
