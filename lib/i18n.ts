export type Locale = 'bn' | 'en';
export const translations = {
  en: {
    brand: 'SANJAY KUMAR CHEMISTRY', tagline: 'Chemistry learning for HSC and Admission', home: 'Home', courses: 'Courses', about: 'About', contact: 'Contact', login: 'Log in', register: 'Register',
    heroTitle: 'Understand Chemistry. Build Your Future.', heroText: 'Focused Chemistry learning for HSC 2027, HSC 2028 and university admission candidates.', explore: 'Explore courses', price: 'One-time course fee', how: 'How enrollment works', step1: 'Choose one of the three courses.', step2: 'Pay ৳700 using an enabled bKash, Nagad or Rocket number.', step3: 'Submit your transaction ID for manual Admin verification.', step4: 'Course access is activated only after approval.',
    hsc27: 'HSC 2027 Chemistry', hsc28: 'HSC 2028 Chemistry', admission: 'Admission Chemistry', unavailable: 'Payment is temporarily unavailable until the Admin configures a verified receiving number.',
    footer: '© Sanjay Kumar Chemistry. All rights reserved.'
  },
  bn: {
    brand: 'সঞ্জয় কুমার কেমিস্ট্রি', tagline: 'এইচএসসি ও ভর্তি পরীক্ষার রসায়ন শিক্ষা', home: 'হোম', courses: 'কোর্সসমূহ', about: 'পরিচিতি', contact: 'যোগাযোগ', login: 'লগইন', register: 'নিবন্ধন',
    heroTitle: 'রসায়ন বুঝুন। ভবিষ্যৎ গড়ুন।', heroText: 'এইচএসসি ২০২৭, এইচএসসি ২০২৮ এবং বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থীদের জন্য পরিকল্পিত রসায়ন শিক্ষা।', explore: 'কোর্স দেখুন', price: 'এককালীন কোর্স ফি', how: 'ভর্তির পদ্ধতি', step1: 'তিনটি কোর্সের মধ্যে আপনার কোর্সটি বেছে নিন।', step2: 'সক্রিয় bKash, Nagad অথবা Rocket নম্বরে ৭০০ টাকা পাঠান।', step3: 'ম্যানুয়াল যাচাইয়ের জন্য ট্রানজেকশন আইডি জমা দিন।', step4: 'অ্যাডমিন অনুমোদনের পরেই কোর্স চালু হবে।',
    hsc27: 'এইচএসসি ২০২৭ কেমিস্ট্রি', hsc28: 'এইচএসসি ২০২৮ কেমিস্ট্রি', admission: 'অ্যাডমিশন কেমিস্ট্রি', unavailable: 'অ্যাডমিন যাচাইকৃত পেমেন্ট নম্বর কনফিগার না করা পর্যন্ত পেমেন্ট সাময়িকভাবে বন্ধ থাকবে।',
    footer: '© সঞ্জয় কুমার কেমিস্ট্রি। সর্বস্বত্ব সংরক্ষিত।'
  }
} as const;
