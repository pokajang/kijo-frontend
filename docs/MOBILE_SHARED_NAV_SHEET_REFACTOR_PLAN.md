# Mobile Shared Navigation Sheet Refactoring Plan

> Status: Implemented in September 2026. This document is retained as the design and acceptance record; the current source code remains authoritative for implementation details.

## 1. Objective

Replace the mobile app shell's mixture of a left sidebar, bottom sheet, dropdown menus, and right-side Knowledge drawer with one consistent shared bottom-sheet surface.

The six-item bottom bar remains:

1. Menu
2. Tools
3. Home
4. Tasks
5. Alerts
6. Account

Menu, Tools, Alerts, and Account open content inside the shared sheet. Home and Tasks remain direct one-tap routes. Nested experiences such as module search and Ask Kijo replace the content inside the same sheet rather than mounting another navigation container.

Desktop behavior must remain unchanged:

- Main navigation remains in the left sidebar.
- Search and Help remain in the desktop header.
- Alerts and Account remain desktop dropdowns.
- Knowledge remains a right-side drawer.

## 2. Product decisions

### 2.1 Bottom-bar behavior

| Item | Mobile behavior | Sheet root view | Active-state rule |
| --- | --- | --- | --- |
| Menu | Open or switch the shared sheet | Main application navigation | Active while the Menu section is displayed |
| Tools | Open or switch the shared sheet | Search modules and Ask Kijo | Active while Tools or one of its child views is displayed |
| Home | Navigate to `/dashboard` | None | Active on dashboard routes |
| Tasks | Navigate to `/task-manager` | None | Active on task-manager routes |
| Alerts | Open or switch the shared sheet | Notification list | Active while Alerts is displayed |
| Account | Open or switch the shared sheet | Profile, personal modules, utilities, and sign-out | Active while Account or one of its child views is displayed |

If a sheet is already open, tapping another sheet-based bottom item switches the view inside the existing sheet. It must not close one dialog and open another.

### 2.2 Shared-sheet interaction contract

- Exactly one mobile navigation sheet may be mounted and visible.
- The sheet remains anchored above the fixed bottom navigation.
- Root views show a title and close button.
- Child views show a back button, title, and close button.
- Back returns to the previous sheet view without closing the sheet.
- Close, backdrop click, Escape, and swipe-down return focus to the bottom-bar trigger that opened the current root section.
- Route selection closes the sheet after navigation is committed.
- Opening a child view preserves the sheet backdrop, position, and container.
- The sheet body owns scrolling; the page behind it is scroll-locked.
- The bottom bar remains visible beneath the sheet so users can switch sections.
- Required global prompts may change the available vertical space, but must not cover the sheet or bottom-bar targets.

### 2.3 Navigation depth

Use an internal view stack, not nested dialogs:

```text
Tools
`-- Search modules
`-- Ask Kijo

Menu
`-- Optional navigation group detail

Alerts
`-- Optional notification detail only if a notification does not navigate directly

Account
`-- Appraisal records
`-- Optional account sub-sections
```

Destructive confirmations such as Sign Out may remain confirmation dialogs. They are actions requiring explicit confirmation, not navigation surfaces.

## 3. Current implementation inventory

### 3.1 App shell

- `src/components/AppHeader.js` owns the bottom navigation and currently owns Tools-sheet state, support-ticket state, desktop search/help, and bottom-bar composition.
- `src/components/AppSidebar.js` owns the CoreUI sidebar and filters `_nav.js` by role.
- `src/layout/DefaultLayout.js` coordinates the sidebar with right-side drawers.

`AppHeader.js` is already responsible for too many concerns. The refactor should reduce it to desktop-header composition plus integration points for the extracted mobile navigation.

### 3.2 Main navigation

- `src/_nav.js` is the authoritative navigation definition.
- `src/components/AppSidebar.js` applies role filtering and notification/workflow badges.
- `src/components/AppSidebarNav.js` renders the filtered navigation inside a CoreUI sidebar.

The role-filtering and badge-decoration pipeline is currently coupled to `AppSidebar`. It must be extracted before the mobile sheet renders the same menu.

### 3.3 Tools and search

- `src/components/AppHeader.js` currently renders the Tools bottom sheet.
- `src/components/search/AppModuleSearch.jsx` owns desktop search and exports the reusable `ModuleSearchBox`.
- The current mobile Tools → Search transition already stays inside one sheet and should become the first consumer of the shared sheet API.

### 3.4 Alerts

- `src/components/header/AppNotificationsDropdown.jsx` owns trigger state, list fetching, loading/error/empty states, read consumption, and navigation.
- Notification data is fetched only while the dropdown is open.
- `listable_total` is intentionally used for the bottom-bar unread count.

The notification trigger, data controller, and rendered content must be separated so desktop can keep a dropdown while mobile renders the same data inside the shared sheet.

### 3.5 Account

- `src/components/header/AppHeaderDropdown.js` owns account-menu configuration, dropdown state, navigation, account-related modal content, theme/What's New/ticket utilities, notification badges, and sign-out confirmation.

The menu definitions and action handling must be extracted from the desktop dropdown. Mobile should reuse the same definitions and badges inside the shared sheet.

### 3.6 Ask Kijo / Knowledge

- `src/views/knowledge/KnowledgePanelContext.jsx` owns Knowledge state and opens the `knowledge` right-drawer ID.
- `src/views/knowledge/KnowledgeSidePanel.jsx` combines Knowledge content with the desktop `RightSideDrawer` shell.
- `src/components/right-drawer/RightDrawerContext.jsx` coordinates desktop right drawers.

The Knowledge content must be separated from the desktop right-drawer shell. Mobile can then render that content as a child view of Tools while desktop continues to render it inside `RightSideDrawer`.

Do not make the mobile sheet another `RIGHT_DRAWER_ID`. A bottom sheet and a desktop right drawer have different layout and interaction contracts. Their content may be shared, but their shell state should remain separate.

## 4. Target architecture

### 4.1 Proposed files

```text
src/components/mobile-navigation/
|-- MobileBottomNav.jsx
|-- MobileNavSheet.jsx
|-- MobileNavSheetContext.jsx
|-- mobileNavSheetReducer.js
|-- mobileNavSheetViews.js
|-- views/
|   |-- MobileMainMenuView.jsx
|   |-- MobileToolsView.jsx
|   |-- MobileModuleSearchView.jsx
|   |-- MobileAlertsView.jsx
|   |-- MobileAccountView.jsx
|   `-- MobileKnowledgeView.jsx
`-- __tests__/
    |-- MobileBottomNav.test.jsx
    |-- MobileNavSheet.test.jsx
    `-- mobileNavSheetReducer.test.js

src/components/navigation/
|-- buildAppNavigation.js
`-- NavigationMenuContent.jsx

src/components/header/account/
|-- accountMenuConfig.js
|-- AccountMenuContent.jsx
`-- useAccountMenuActions.js

src/components/header/notifications/
|-- NotificationListContent.jsx
`-- useNotificationList.js

src/views/knowledge/
|-- KnowledgePanelContent.jsx
|-- KnowledgeSidePanel.jsx
`-- MobileKnowledgeView.jsx
```

Names may be adjusted to match existing conventions, but responsibilities should remain separated.

### 4.2 Sheet state model

Use a reducer-backed provider mounted inside `DefaultLayout`:

```js
{
  isOpen: false,
  rootSection: null,       // 'menu' | 'tools' | 'alerts' | 'account'
  viewStack: [],           // [{ id: 'tools' }, { id: 'module-search' }]
  returnFocusId: null,
}
```

Required actions:

- `OPEN_ROOT(section, returnFocusId)` opens a root or replaces the existing root.
- `PUSH_VIEW(view, params)` opens a child inside the same sheet.
- `REPLACE_VIEW(view, params)` changes the current child without adding history.
- `POP_VIEW` returns to the previous sheet view.
- `CLOSE` closes the sheet and clears its stack.
- `RESET_AFTER_ROUTE` closes the sheet after route navigation.

Provider API:

```js
const {
  isOpen,
  activeRoot,
  currentView,
  canGoBack,
  openRoot,
  pushView,
  replaceView,
  goBack,
  closeSheet,
} = useMobileNavSheet()
```

Avoid separate booleans such as `toolsOpen`, `alertsOpen`, and `accountOpen`. Those states allow multiple surfaces to disagree and recreate the current coordination problem.

### 4.3 Shared sheet shell

`MobileNavSheet.jsx` should own:

- CoreUI modal/offcanvas integration.
- Bottom positioning above `--app-mobile-fixed-bottom-inset`.
- Back, title, close, backdrop, focus trap, Escape, and scroll lock.
- A single scrollable body.
- Rendering the current view through a small registry.
- Focus restoration to the active bottom-bar trigger.
- Reduced-motion behavior.
- Safe-area padding.

Recommended dimensions:

- Width: viewport minus 0.75rem on each side.
- Maximum height: `min(80dvh, available space above bottom nav)`.
- Minimum body height should remain content-driven; do not force a mostly empty sheet.
- Rounded top corners consistent with the current Tools sheet.

### 4.4 Bottom-bar extraction

Move the mobile bottom-bar markup out of `AppHeader.js` into `MobileBottomNav.jsx`.

`MobileBottomNav` should:

- Render the six equal-width items.
- Use `openRoot()` for Menu, Tools, Alerts, and Account.
- Use `NavLink` for Home and Tasks.
- Preserve unread/status badges.
- Derive active styling from both the current route and `activeRoot`.
- Expose stable trigger IDs for focus restoration.
- Remain hidden at `min-width: 768px`.

Desktop header actions should remain in `AppHeader.js` or a separate `DesktopHeaderActions` component.

## 5. Content extraction strategy

### 5.1 Main Menu

Extract the following from `AppSidebar.js` into `buildAppNavigation.js`:

- Role filtering.
- Removal of non-DOM metadata such as `allowedRoles`.
- Notification badge application.
- Workflow setup badge application.

Both desktop and mobile must call the same builder with:

```js
buildAppNavigation({
  navigation,
  roles,
  getRouteGroupCount,
  getWorkflowSetupTotal,
})
```

Create `NavigationMenuContent.jsx` to render the normalized tree without assuming a sidebar shell. It should accept:

- `items`
- `currentPath`
- `onNavigate`
- `variant: 'sidebar' | 'sheet'`

Mobile Menu requirements:

- Preserve section titles, icons, role filtering, active route state, and badges.
- Close the sheet when a route is selected.
- Keep navigation groups collapsed by default unless the active route belongs to the group.
- Use at least 44px row targets.
- Keep the sheet header sticky while menu content scrolls.

After mobile Menu is stable, `AppSidebarNav` may delegate its tree rendering to `NavigationMenuContent` to remove duplicated recursion.

### 5.2 Tools and module search

Move the current Tools markup from `AppHeader.js` into `MobileToolsView.jsx`.

- Search modules calls `pushView({ id: 'module-search' })`.
- Ask Kijo calls `pushView({ id: 'knowledge', params: { mode: 'ask' } })`.
- `MobileModuleSearchView` renders the existing `ModuleSearchBox`.
- Selecting a search result records the selection, navigates, and closes the shared sheet.
- Back returns to Tools without losing the overall sheet/container.

Remove the mobile-search modal and floating-trigger branch from `AppModuleSearch` once no consumer needs it. Keep the desktop search box behavior unchanged.

### 5.3 Alerts

Split `AppNotificationsDropdown.jsx` into three layers:

1. `useNotificationList({ enabled })` for fetch, abort, loading, error, and items.
2. `NotificationListContent` for heading, stale state, list rows, and empty/error/loading states.
3. Desktop `AppNotificationsDropdown` and mobile `MobileAlertsView` shells.

Behavior that must not change:

- Use `summary.listable_total` for the bottom badge.
- Fetch `notifications/list?limit=20` only when Alerts is active.
- Abort the request when Alerts closes or switches away.
- Consume the notification entity before navigating.
- Close the sheet when a notification route is selected.

### 5.4 Account

Extract `menuSections`, `utilitySection`, badge lookup, and action metadata from `AppHeaderDropdown.js`.

Recommended normalized item model:

```js
{
  key,
  label,
  icon,
  to,
  action,
  badgeRoute,
  childView,
  desktopOnly,
  mobileOnly,
}
```

Create `AccountMenuContent` that receives the normalized sections and an `onAction(item)` callback. Use it in both the desktop dropdown and mobile Account view.

Mobile behavior:

- Route items navigate and close the sheet.
- Theme changes in place and leaves Account open unless testing shows this is confusing.
- What's New navigates and closes.
- Submit Ticket may push a sheet child view if its form fits the mobile sheet; otherwise retain the existing modal temporarily.
- Appraisal Records should become a child sheet view only after its content is verified at mobile width.
- Sign Out retains a separate confirmation dialog and loading protection.

### 5.5 Ask Kijo

Extract the content and controller wiring from `KnowledgeSidePanel.jsx` so the shell is replaceable:

- `KnowledgePanelContent` owns search/ask mode, result rendering, article display, AI history, prompts, and source navigation.
- `KnowledgeSidePanel` becomes the desktop wrapper using `RightSideDrawer`.
- `MobileKnowledgeView` becomes the mobile wrapper rendered inside the shared sheet.

The Knowledge context currently equates “open” with the desktop right-drawer ID. Refactor it so content state and shell visibility are separate:

- Keep article/search/assistant data in `KnowledgePanelContext`.
- Let desktop visibility continue to use `RightDrawerContext`.
- Let mobile visibility be controlled by `MobileNavSheetContext`.
- Opening Ask Kijo on mobile must not open the desktop right drawer.
- Navigating from an AI result closes the sheet after route navigation.

## 6. Coordination rules

Add one app-shell coordinator with explicit rules:

1. Opening the mobile sheet closes the legacy mobile sidebar and any desktop/right drawer that should not coexist.
2. Opening a right drawer closes the mobile sheet.
3. Navigating through Home or Tasks closes the mobile sheet.
4. Switching among Menu, Tools, Alerts, and Account replaces the sheet root in place.
5. Opening a confirmation modal leaves the navigation sheet state deterministic; either close the sheet first or mark it inert behind the confirmation.
6. At desktop breakpoints, force-close mobile sheet state and restore normal desktop controls.

Replace `SidebarRightDrawerCoordinator` with an app-shell coordinator only after the mobile sheet foundation is stable. Preserve existing right-drawer mutual exclusion tests.

## 7. Styling plan

Create `src/scss/custom/nav/_mobile-nav-sheet.scss` and keep bottom-bar layout rules in `_mobile-bottom-nav.scss`.

The new stylesheet should define:

- Sheet placement relative to the bottom-nav inset.
- Safe-area handling.
- Root and child header layout.
- 44px minimum back/close/action targets.
- Scroll containment and overscroll behavior.
- Backdrop and z-index contract.
- Active bottom-item styling.
- Sheet transition and reduced-motion override.
- Main-menu row, section, badge, and active styles.
- Alerts and Account content layouts.

Remove floating-action variables and rules only after confirming they have no other consumers:

- `--app-mobile-floating-action-bottom`
- `.app-module-search-fab`
- Mobile fixed positioning for `.app-knowledge-header-help`
- Prompt rules that hide the old floating actions

Do not reuse desktop dropdown positioning rules for the mobile sheet.

## 8. Implementation phases

### Phase 0 — Lock the existing behavior

- Extend `releaseUi.test.jsx` to document all six bottom items and their current actions.
- Add focused coverage for Tools in-place Search behavior.
- Capture baseline screenshots at 390 x 844 with and without the handbook prompt.
- Confirm desktop baselines at 1440 x 900.

Exit criteria: current behavior is reproducible and protected before architecture changes.

### Phase 1 — Shared sheet foundation

- Add reducer, provider, view registry, and sheet shell.
- Mount the provider and one sheet instance in `DefaultLayout`.
- Extract `MobileBottomNav` from `AppHeader`.
- Migrate Tools and module search to the shared sheet first.
- Preserve the current six-item order and appearance.

Exit criteria: Tools → Search uses one persistent dialog, Back works, focus restores correctly, and desktop is unchanged.

### Phase 2 — Mobile main navigation

- Extract navigation normalization from `AppSidebar`.
- Add the sheet navigation renderer using `_nav.js`.
- Change the mobile Menu trigger from Redux `sidebarShow` to `openRoot('menu')`.
- Keep `CSidebar` for desktop/tablet behavior as currently defined.
- Remove the rule that hides the mobile bottom header while the sidebar is open after the mobile sidebar path is retired.

Exit criteria: every role sees the same allowed routes and badges in desktop sidebar and mobile Menu; selection closes the sheet and lands on the correct route.

### Phase 3 — Alerts

- Extract the notification data hook and content.
- Render notification content inside the shared Alerts root.
- Retain the desktop dropdown wrapper.
- Preserve request abort, consume, badge, stale, empty, and error behavior.

Exit criteria: badge count matches visible list semantics, one fetch occurs per open cycle, and notification navigation works.

### Phase 4 — Account

- Extract account sections and action handling.
- Render the Account root inside the shared sheet.
- Retain the desktop dropdown wrapper.
- Keep sign-out confirmation and modal-only account content working.
- Decide case by case whether large embedded content becomes a child sheet or retains a modal.

Exit criteria: route, theme, ticket, badge, appraisal, and sign-out actions retain current behavior.

### Phase 5 — Ask Kijo

- Extract shell-independent Knowledge content.
- Render Ask Kijo as a Tools child view in the mobile sheet.
- Keep the desktop Knowledge right drawer.
- Update visibility coordination so mobile Ask Kijo does not open the desktop drawer.

Exit criteria: Knowledge search, AI mode, articles, history, source links, and related-route navigation work inside the mobile sheet.

### Phase 6 — Cleanup and consolidation

- Remove obsolete mobile dropdown, sidebar, floating-action, and cross-surface state.
- Reduce `AppHeader.js` to desktop header plus mobile-bottom-nav composition.
- Remove unused CSS selectors and variables.
- Consolidate duplicate menu renderers where safe.
- Update beta-test documentation and screenshots.

Exit criteria: no legacy mobile overlay can open from the bottom bar, no duplicate hidden interactive controls exist, and all targeted tests pass.

## 9. Testing strategy

### 9.1 Unit tests

- Reducer: open, root switch, push, replace, pop, close, route reset.
- Navigation builder: role filtering, nested groups, active paths, notification badges, workflow badges.
- Notification hook: enabled fetch, abort, error, empty, stale, and item consumption.
- Account action resolver: routes, theme, ticket, child views, sign out.

### 9.2 Component tests

- One dialog remains mounted while switching Tools → Search → Tools.
- Bottom trigger active state follows the current sheet root.
- Tapping another sheet trigger swaps content without mounting a second dialog.
- Back and close restore focus correctly.
- Menu uses filtered `_nav.js` data and closes on navigation.
- Alerts load only while active.
- Account badges and utilities match desktop behavior.
- Ask Kijo renders mobile content without opening `RightSideDrawer`.
- Home and Tasks close the sheet and navigate directly.

### 9.3 Accessibility tests

- Sheet has one accessible dialog name.
- All bottom items and sheet actions have accessible names.
- Focus enters the sheet, remains trapped, and returns to the initiating trigger.
- Back and close targets are at least 44 x 44 CSS pixels.
- Screen-reader order follows header, body, then persistent bottom bar.
- Background content is inert while the sheet is open.
- Reduced-motion users do not receive sliding animations.

### 9.4 Browser/UAT matrix

Test at minimum:

- Mobile: 390 x 844.
- Nearby narrow width: 360 x 800.
- Tablet boundary: 767 and 768 CSS pixels.
- Desktop: 1440 x 900.
- Handbook prompt present and dismissed.
- No alerts, unread alerts, stale alerts, and notification fetch failure.
- Standard staff role and a broad-access System Admin role.
- Light and dark modes.
- Portrait and one landscape mobile viewport.

Representative journey:

1. Open Menu, expand/scroll navigation, and select a module.
2. Open Tools, enter Search, go Back, enter Ask Kijo, and follow a related route.
3. Open Alerts, consume a notification, and verify navigation plus badge refresh.
4. Open Account, toggle theme, visit a personal record route, reopen Account, and exercise sign-out cancellation.
5. Switch Menu → Tools → Alerts → Account while the sheet remains open and verify only one dialog exists.

## 10. Acceptance criteria

The refactor is complete when:

- Mobile has exactly one navigation sheet container and backdrop.
- Menu, Tools, Alerts, and Account all use that container.
- Home and Tasks remain direct links.
- Main Menu uses the same source, role rules, badges, and active-path logic as the desktop sidebar.
- Tools → Search and Tools → Ask Kijo stay within the shared sheet.
- Switching sheet roots does not flicker, stack dialogs, or move the container.
- Route navigation closes the sheet reliably.
- Focus, Escape, Back, Close, backdrop, scroll lock, and safe areas work.
- The handbook prompt does not cover bottom-bar or sheet controls.
- No duplicate mobile sidebar/dropdown/floating controls remain in the accessibility tree.
- Desktop sidebar, header search/help, Alerts dropdown, Account dropdown, and Knowledge drawer remain behaviorally unchanged.
- Targeted unit/component tests, lint, and mobile/desktop browser checks pass.

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Duplicating `_nav.js` filtering | Users see unauthorized or inconsistent routes | Extract one navigation builder before rendering Menu in the sheet |
| Multiple overlay states remain active | Stacked backdrops, broken focus, hidden content | Use one reducer state and an explicit shell coordinator |
| Knowledge context remains tied to right drawer | Ask Kijo opens the wrong mobile surface | Separate Knowledge data state from desktop shell visibility |
| Account refactor breaks uncommon actions | Personal workflows or sign out regress | Extract configuration first and preserve action tests before changing wrappers |
| Alerts fetch repeatedly during root switching | Unnecessary traffic and race conditions | Enable fetch only for active Alerts and abort on view change |
| Long main menu becomes difficult to scan | Poor mobile discoverability | Sticky header, collapsed groups, active group expansion, contained scrolling |
| Sheet conflicts with global prompts | Controls become covered | Base placement on the shared bottom inset and test both prompt states |
| Desktop behavior changes accidentally | Broad regression | Keep desktop wrappers until mobile migration is complete and run breakpoint tests per phase |

## 12. Change discipline and rollout

- Implement one phase per reviewable commit or pull request.
- Do not combine this refactor with visual redesign of navigation labels, icons, or route structure.
- Preserve API contracts; no backend change should be required.
- Keep extracted components behaviorally equivalent before changing their mobile shell.
- Retain the old mobile implementation until each replacement passes focused tests, then remove it in the same phase to avoid duplicate interactive controls.
- If production rollout needs additional protection, use a short-lived mobile-shell feature flag around `MobileBottomNav` and `MobileNavSheet`; remove the flag after UAT rather than maintaining two permanent shells.

## 13. Not included

- Changing the six bottom-bar destinations or their order.
- Redesigning desktop navigation.
- Changing authorization rules or notification business logic.
- Rewriting Ask Kijo or module-search algorithms.
- Converting every confirmation or complex form modal into a sheet.
- Changing routes or backend endpoints.
