# Sidebar Components Guide

This guide covers the enhanced sidebar components for the Tab Stasher application, providing a comprehensive navigation and management interface.

## Overview

The sidebar system consists of three main components:

1. **EnhancedSidebar** - The core sidebar component with navigation and user management
2. **CollapsibleSidebar** - A wrapper that provides collapsible functionality and mobile responsiveness
3. **SidebarDemo** - A demo component showcasing different sidebar sections

## Components

### EnhancedSidebar

The main sidebar component with comprehensive navigation features.

#### Features:
- **Collapsible Groups**: Organized navigation sections that can be expanded/collapsed
- **Active State Management**: Visual indication of current section
- **Badge Support**: Display counts and status indicators
- **User Management**: Integrated user profile and authentication
- **Search Integration**: Built-in search functionality
- **Responsive Design**: Adapts to different screen sizes

#### Props:
```typescript
interface EnhancedSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}
```

#### Navigation Sections:

1. **Quick Actions**
   - Add New Tab
   - Search Tabs
   - Filter & Sort

2. **Dashboard**
   - Overview
   - Analytics (with "New" badge)
   - Recent Activity

3. **Tab Management**
   - All Tabs (1.2k)
   - Favorites (24)
   - Recently Added
   - Untagged (156)

4. **Categories & Groups**
   - Categories
   - Tab Groups
   - Archived (12)

5. **Tools**
   - Import Tabs
   - Export Data
   - Share Collections
   - Sync Status

6. **Help & Support**
   - Documentation
   - Video Tutorials
   - Help Center
   - About

### CollapsibleSidebar

A wrapper component that provides collapsible functionality and mobile responsiveness.

#### Features:
- **Desktop**: Collapsible sidebar with smooth transitions
- **Mobile**: Overlay sidebar using SilkSidebar
- **Responsive**: Automatically switches between desktop and mobile modes
- **State Management**: Tracks collapsed state and provides callbacks

#### Props:
```typescript
interface CollapsibleSidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}
```

### SidebarDemo

A demonstration component that showcases different sidebar sections with sample content.

#### Features:
- **Section Switching**: Demonstrates different content areas
- **Sample Data**: Realistic mock data for testing
- **Interactive Elements**: Buttons, badges, and cards
- **Responsive Layout**: Adapts to different screen sizes

## Usage Examples

### Basic Implementation

```tsx
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar"

function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <CollapsibleSidebar />
      <main className="flex-1">
        {/* Your content */}
      </main>
    </div>
  )
}
```

### With State Management

```tsx
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar"

function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      <CollapsibleSidebar 
        defaultCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Your content */}
      </main>
    </div>
  )
}
```

### Custom EnhancedSidebar

```tsx
import { EnhancedSidebar } from "@/components/ui/enhanced-sidebar"

function CustomSidebar() {
  return (
    <EnhancedSidebar 
      isCollapsed={false}
      onCollapsedChange={(collapsed) => console.log('Sidebar collapsed:', collapsed)}
    />
  )
}
```

## Styling

The sidebar components use Tailwind CSS classes and follow the design system:

### Color Scheme
- **Background**: `bg-background`
- **Border**: `border-r` (right border)
- **Text**: `text-foreground`, `text-muted-foreground`
- **Accent**: `bg-accent`, `text-accent-foreground`

### Transitions
- **Smooth animations**: `transition-all duration-300 ease-in-out`
- **Hover effects**: `hover:bg-accent hover:text-accent-foreground`

### Responsive Design
- **Mobile**: Overlay sidebar with backdrop
- **Desktop**: Fixed sidebar with collapsible functionality
- **Breakpoint**: 768px (md) for mobile/desktop switch

## Integration with Existing Components

The sidebar integrates with existing Tab Stasher components:

- **SearchBar**: Built-in search functionality
- **CategoryDashboard**: Category management section
- **TabGroups**: Tab group organization
- **AuthButton**: User authentication
- **Avatar**: User profile display

## Accessibility Features

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Logical tab order and focus indicators
- **High Contrast**: Compatible with high contrast themes

## Performance Considerations

- **Lazy Loading**: Components load only when needed
- **Memoization**: React.memo for performance optimization
- **Efficient Re-renders**: Minimal state updates
- **Bundle Size**: Tree-shakable imports

## Future Enhancements

Potential improvements for the sidebar system:

1. **Customizable Sections**: Allow users to reorder or hide sections
2. **Theme Support**: Dark/light mode toggle
3. **Keyboard Shortcuts**: Quick navigation with keyboard
4. **Drag & Drop**: Reorder tabs and categories
5. **Search History**: Recent searches and suggestions
6. **Notifications**: Real-time updates and alerts
7. **Export/Import**: Sidebar configuration backup

## Troubleshooting

### Common Issues

1. **Sidebar not collapsing**: Check if `onCollapsedChange` is properly connected
2. **Mobile not working**: Ensure SilkSidebar dependencies are installed
3. **Styling conflicts**: Verify Tailwind CSS is properly configured
4. **Performance issues**: Check for unnecessary re-renders

### Debug Tips

- Use React DevTools to inspect component state
- Check browser console for errors
- Verify responsive breakpoints
- Test keyboard navigation

## Contributing

When contributing to the sidebar components:

1. Follow the existing code style and patterns
2. Add proper TypeScript types
3. Include accessibility features
4. Test on both mobile and desktop
5. Update documentation for new features 