export interface MenuItem {
  id: string;
  label: string;
  iconName: string;
  to?: string;
  isVisible?: boolean;
  isSubtitle?: boolean;
  isCustom?: boolean;
  children?: MenuItem[];
  moduleId?: string;
  moduleIds?: string[];
  isUnifiedQueue?: boolean;
  queueConfig?: {
    conditions: any;
    columns: string[];
  };
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuConfig {
  sections: MenuSection[];
}
