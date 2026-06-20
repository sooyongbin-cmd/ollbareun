# Manager Mobile Hamburger Menu Design

## Goal

Replace the manager page's small-screen horizontal menu with a hamburger button in the upper-right corner. Preserve the existing desktop sidebar and the user's current removal of the black top navigation bar.

## Design

- Keep `ManagerLayout` as a server component.
- Render the mobile menu trigger and drawer from the existing client-side `ManagerSidebar`.
- On screens below the existing `lg` breakpoint:
  - hide the sidebar from the document layout;
  - show a hamburger button fixed at the upper-right of the manager header area;
  - open a right-side, scrollable drawer over a dimmed backdrop;
  - show all menu groups and child links vertically;
  - close the drawer from the close button, backdrop, Escape key, or a navigation link.
- At `lg` and above, keep the current sticky vertical sidebar and do not show the mobile trigger or drawer.

## Accessibility

- Give the trigger and close controls Korean accessible names.
- Expose drawer state with `aria-expanded` and `aria-controls`.
- Mark the drawer as a modal dialog with a descriptive label.
- Lock body scrolling while the drawer is open and restore it when closed.

## Testing

- Add interaction tests that verify the drawer starts closed, opens from the hamburger button, and closes from its close button.
- Update existing menu assertions so they account for desktop links being rendered at rest and mobile links being rendered only while the drawer is open.
- Run the focused layout test, lint, and the production build before publishing.
