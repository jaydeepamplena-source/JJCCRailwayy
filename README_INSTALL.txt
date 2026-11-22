JJCC RAILWAYS - UPDATED PAYMENT / BOOKING WORKFLOW

FILES
- Keep all HTML pages, script.js, style.css, JCC LOGO.png, and backgroundPic.png in the same website folder.
- New pages: payments.html (admin receipt review) and notifications.html (user notifications).
- New SQL migration: 04_receipt_payment_workflow.sql.

SUPABASE SQL ORDER
1. If the earlier payment/cancellation migration has NOT been run, run 01_payment_migration.sql first.
2. Run 04_receipt_payment_workflow.sql. This creates receipt and notification tables, a private Storage bucket, the 10-minute hold, admin approval/rejection, and train condition status. It also removes the earlier mock-payment RPC.
3. Run 05_cancellation_policy_fix.sql, then 08_combined_booking_modifications.sql. Then enable pg_cron in Supabase Database > Extensions and run 02_schedule_expiry.sql to expire unpaid reservations and unpaid modification requests every minute. The expiry function is restricted to service_role; the browser must not call it. If pg_cron is unavailable, configure a trusted server-side scheduled task using the service_role key (never expose that key in browser JavaScript).

IMPORTANT PAYMENT NOTE
The QR and bank details shown in payment.html are deliberately non-functional placeholders. They are not connected to a bank, wallet, QR payment provider, or real payment processor. Do not accept or transfer real money using them. Receipt upload and administrator approval are application workflow features only; a screenshot upload does not prove that money was received. For real payments, replace the placeholder details and add a verified payment-provider/server-side reconciliation process before using this with customers.

WORKFLOW
- A booking is created as pending_payment and seats are held for 10 minutes.
- The user uploads a receipt within the 10-minute window. The booking stays reserved while the receipt is pending admin review.
- Admins open payments.html, view the private receipt, then approve or reject it. Approval confirms the booking and creates an in-app notification. Rejection creates an in-app notification; the user may upload a corrected receipt if the original 10-minute deadline has not passed.
- If no receipt is uploaded before the deadline, the booking expires and its seats are released by expire_pending_bookings().
- Users open Notifications from the header to read approval/rejection updates.
- Manage Booking and Refund & Delay are opened from the selected booking card in Active Bookings; the booking reference is passed automatically.
- Past confirmed journeys appear under Delivered; cancelled/expired journeys have their own tab; All Bookings shows the complete list.
- A paid booking can be cancelled immediately by the user within 24 hours after payment approval, measured from bookings.paid_at. No administrator approval is required. After 24 hours, cancellation is blocked. No automatic refund is issued; refund handling is separate.

TRAIN STATUS
The migration adds public.trains.train_status with values active, broken, inactive. Admins can update this status in admin.html; the dashboard totals update from this field. Existing trains default to active.

TESTING
Run the website from your normal local server (for example VS Code Live Server). Sign in using real Supabase accounts with profiles.role set to admin or super_admin for the corresponding portals. Do not use sessionStorage role previews as security.


UPDATED CANCELLATION POLICY (05_cancellation_policy_fix.sql)
1. Back up the Supabase database first.
2. Confirm 01_payment_migration.sql and 04_receipt_payment_workflow.sql have already been run successfully.
3. Review 05_cancellation_policy_fix.sql before running it. Run it once in Supabase SQL Editor.
4. The 24-hour cancellation period starts when an administrator approves the receipt and paid_at is set.
5. This workflow records refund_amount as 0 and does NOT transfer money. Refund handling must be decided and implemented separately.

IMPORTANT: The SQL migration assumes the existing booking_cancellation_requests table has the columns used by the current cancel_booking function. Test on a staging/backup database first. The supplied project ZIP does not include a live database dump, so schema-dependent behavior cannot be fully verified offline.


COMBINED ONE-TIME BOOKING MODIFICATIONS (08_combined_booking_modifications.sql)
1. Back up the Supabase database and test on a staging project first.
2. Run 08_combined_booking_modifications.sql AFTER 05_cancellation_policy_fix.sql and after the existing change_booking_travel_date, upgrade_booking_class, and add_passenger_to_booking RPCs are present.
3. The migration adds bookings.modification_used, booking_change_requests, booking_change_payment_submissions, RLS policies, and RPCs for creating a combined request, submitting one receipt, cancelling an unpaid request, and reviewing the request.
4. The browser stages selected changes only. The original booking is not changed until an Admin approves the single combined request.
5. The 10-minute timer starts when the customer proceeds to the combined checkout. If all three change categories (date, class, passenger) are selected, the page proceeds directly to checkout. A user can cancel before submitting a receipt.
6. One combined request may include a date change, one class upgrade, and one additional passenger. Approval permanently sets bookings.modification_used=true. A second modification is blocked by the database. Further changes require cancellation of the whole original booking under the existing cancellation rules.
7. The modification fee is non-refundable. Cancelling the original booking does not refund the approved modification fee.
8. Admins and Super Admins review the combined receipt at booking-change-review.html. Approval applies all changes in one database transaction; rejection applies none. If rejected before the deadline, the user may upload a corrected receipt before the same deadline.
9. The customer can view requests at booking-changes.html. Modification receipts use the existing private payment-receipts Storage bucket.
10. IMPORTANT: the current front-end calculates an estimated additional amount (date fee ₱10, First Class upgrade ₱61, and estimated additional passenger fare based on current average fare per passenger). Admin must verify the exact amount against the fare/receipt before approval. The supplied ZIP does not contain the database function definitions or live schema dump, so the SQL function signatures and fare calculation must be validated in Supabase staging before production.
11. The QR/bank details remain placeholders. Receipt upload is not proof of actual payment and this workflow does not process bank transfers or issue refunds.
