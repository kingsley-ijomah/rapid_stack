### Bottom Tabs

#### Step 1
using ionic, generate a standalone component in path: tabs

#### Step 2
manual create tabs.routes.ts
here lets create an empty angular routes and let the default root path redirect to home for now

#### Step 3
(home, groups, walks, chat)
generate standalone page called home within tabs/pages

#### Step 4
update app.routes
Add a new path called tabs that loads both component and children from ./tabs/tabs.component and ./tabs/tabs.routes

#### Step 5
update @tabs.component.html Update this so it becomes a footer tab containing the following links. Home, groups, walks, chats. dont use routerLink we will rely on just the tab naming, also update the tabs component to include all necessary imports


### Top Bar

#### Step 1
lets create a standalone shared component and save it in shared/components called top-banner, should have company name to left "Dog Walker" and icon of profile to the right", icon should not be clickable for now.

#### Step 2
I want the top-banner available to all the @tabs pages

#### Step 3
lets create a shared component and save it in shared/components called profile-popover, it should have links to edit profile and logout, for now it should link to no where.

#### Step 4
update the top-banner component to show the profile-popover when the profile icon is clicked.




