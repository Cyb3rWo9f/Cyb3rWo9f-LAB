
export interface NavItem {
  label: string;
  href: string;
}

export interface PlatformItem {
  name: string;
  description: string;
  status?: string;
}

export interface Writeup {
  id: string;
  title: string;
  excerpt: string;
  previewContent?: string; // Markdown content to show in locked preview (content before <Locked> marker)
  date: string;
  readingTime: string;
  category: string;
  tags: string[];
  content: string; // Now a raw markdown string
  platform?: string;
  locked?: boolean;
  hints?: string[];
}
