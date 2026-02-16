====== Author CRM - UI Validation Checklist ======

**Version:** February 2026

----

===== Authentication =====

  * [ ] Login with email/password works
  * [ ] Profile shows in sidebar footer (name + role)
  * [ ] Profile dropdown opens from sidebar
  * [ ] Profile avatar shows in topbar header
  * [ ] Profile dropdown opens from topbar
  * [ ] Sign out redirects to login page

----

===== Dashboard =====

  * [ ] Hero card displays: Revenue Won, Deals Won, Pipeline Value, Conversion Rate
  * [ ] Hero card text is readable (white on blue)
  * [ ] My Pipeline widget shows deal counts
  * [ ] Action Center widget shows quick actions
  * [ ] Recent Activity widget shows activities
  * [ ] Recently Assigned Leads shows 10 leads (name + publisher)
  * [ ] Top Performers shows leaderboard
  * [ ] Notification bell visible in header
  * [ ] Notification panel opens on bell click
  * [ ] Unread badge count displays correctly

----

===== Leads =====

  * [ ] Leads table displays all columns
  * [ ] Create new lead via "Add Lead" button
  * [ ] View lead details by clicking row
  * [ ] Edit lead and save changes
  * [ ] Assign lead to user
  * [ ] Change lead status
  * [ ] Add tag to lead
  * [ ] Remove tag from lead
  * [ ] Search leads by author name
  * [ ] Filter by status
  * [ ] Filter by assigned user
  * [ ] Filter by tags
  * [ ] Select multiple leads (checkboxes)
  * [ ] Bulk assign selected leads
  * [ ] Bulk change status
  * [ ] Bulk add tags
  * [ ] Archive/recycle lead
  * [ ] Archived lead appears in Admin > Archive

----

===== Comments =====

  * [ ] Add comment on lead details page
  * [ ] Comment shows name + timestamp
  * [ ] Reply to existing comment
  * [ ] Reply appears nested
  * [ ] Delete own comment
  * [ ] Add comment on deal details page

----

===== Activities =====

  * [ ] Activity history shows on lead details
  * [ ] Log call/activity from lead page
  * [ ] Activity appears in history

----

===== Pipeline & Deals =====

  * [ ] Pipeline board shows kanban columns
  * [ ] Deal cards display in correct columns
  * [ ] Create deal from lead
  * [ ] Drag deal to different column
  * [ ] Deal status updates on drop
  * [ ] Click deal card opens details
  * [ ] Reassign deal to different user

----

===== Commissions =====

  * [ ] Commissions page loads
  * [ ] Commission templates display
  * [ ] Create commission template (admin)
  * [ ] Commission created when deal closes

----

===== Sold Dashboard =====

  * [ ] Sold dashboard shows closed deals
  * [ ] Filter by date range works
  * [ ] Filter by user works

----

===== Sales Board =====

  * [ ] Leaderboard tab shows rankings
  * [ ] Achievements tab shows badges
  * [ ] Performance tab shows metrics

----

===== Reminders =====

  * [ ] Reminders page loads
  * [ ] Create new reminder
  * [ ] Set title, due date, priority
  * [ ] Link reminder to lead (optional)
  * [ ] Mark reminder complete
  * [ ] Delete reminder

----

===== Notifications =====

  * [ ] Receive notification when lead assigned
  * [ ] Badge count updates
  * [ ] Click notification marks as read
  * [ ] "Mark all as read" clears all

----

===== Import Leads =====

  * [ ] Import wizard loads (5 steps)
  * [ ] Upload CSV/Excel file
  * [ ] Map columns to fields
  * [ ] Duplicate detection shows
  * [ ] Preview shows first 5 rows
  * [ ] Import executes with progress bar

----

===== Admin Panel =====

//(leads_manager role only)//

  * [ ] Admin panel accessible
  * [ ] User Management: list users
  * [ ] User Management: create user
  * [ ] User Management: edit role
  * [ ] User Management: deactivate user
  * [ ] Status Management: add status
  * [ ] Status Management: edit color
  * [ ] Status Management: reorder
  * [ ] Tag Management: create tag
  * [ ] Tag Management: edit tag
  * [ ] Tag Management: delete tag
  * [ ] Archive: view archived leads
  * [ ] Archive: restore lead

----

===== Real-Time =====

  * [ ] Open app in 2 browsers (different users)
  * [ ] User A creates lead → User B sees it
  * [ ] User A changes status → User B sees update

----

===== Mobile =====

  * [ ] Sidebar collapses to hamburger
  * [ ] Navigation works on mobile
  * [ ] Tables scroll horizontally
  * [ ] Forms are usable

----

===== Summary =====

^ Feature ^ Status ^ Notes ^
| Authentication | ⬜ | |
| Dashboard | ⬜ | |
| Leads | ⬜ | |
| Comments | ⬜ | |
| Activities | ⬜ | |
| Pipeline | ⬜ | |
| Commissions | ⬜ | |
| Sold Dashboard | ⬜ | |
| Sales Board | ⬜ | |
| Reminders | ⬜ | |
| Notifications | ⬜ | |
| Import | ⬜ | |
| Admin | ⬜ | |
| Real-Time | ⬜ | |
| Mobile | ⬜ | |

**Legend:** ⬜ Not Tested  |  ✅ Pass  |  ❌ Fail  |  ⚠️ Partial

----

//Last Updated: February 2026//
