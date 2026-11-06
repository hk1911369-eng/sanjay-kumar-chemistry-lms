# Confirmed project configuration

- Brand: Sanjay Kumar Chemistry
- Audience: HSC and university admission only. No SSC offering.
- Courses and one-time fee: HSC 2027 Chemistry — ৳700; HSC 2028 Chemistry — ৳700; Admission Chemistry — ৳700.
- Languages: Bangla default, English secondary. The v9 public homepage has a working locale switch; authenticated dashboard translations are not yet complete.
- Payments: manual review only until official merchant APIs are issued.
- Providers: bKash, Nagad, Rocket. Receiving numbers are deliberately blank and disabled in the database until the owner enters and verifies the correct number for each provider in the Admin dashboard.
- Roles: student, teacher, admin. Teachers manage only assigned course content; only Admin may approve/reject payment submissions and change payment settings.
- Payment flow: student submits a transaction reference and sender mobile -> pending review -> Admin independently verifies in the merchant portal -> approved/rejected. No automatic confirmation from a transaction ID alone.
- Time zone: Asia/Dhaka. Currency: BDT.

Class schedules, teacher bio/qualifications, support contact details and logo/photo assets still require owner-supplied information.
