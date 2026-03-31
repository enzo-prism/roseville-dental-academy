#!/usr/bin/env python3
from __future__ import annotations

from html import escape
from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://roseville-dental-academy.vercel.app"
FORMSPREE_ENDPOINT = "https://formspree.io/f/xzdkgaeg"
ANNOUNCEMENT = (
    "Now accepting registration for 2026 programs that meet California Dental Board standards, "
    "including our comprehensive dental radiography course and radiation safety certification."
)

CONTACT = {
    "school": "Roseville Dental Academy",
    "address": "1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747",
    "maps_address": "1271 Pleasant Grove Boulevard, Roseville, California 95747, United States",
    "phone": "916-888-9821",
    "email": "rosevilledentalacademy@gmail.com",
    "hours": "08:00 am - 05:00 pm",
    "directions_url": "https://maps.google.com/?q=1271+Pleasant+Grove+Boulevard+Roseville+CA+95747",
}

SOCIAL_LINKS = [
    {
        "icon": "facebook",
        "name": "Facebook",
        "url": "https://www.facebook.com/557019148138561",
    },
    {
        "icon": "instagram",
        "name": "Instagram",
        "url": "https://www.instagram.com/rosevilledentalacademy",
    },
    {
        "icon": "tiktok",
        "name": "TikTok",
        "url": "https://www.tiktok.com/@rosevilledentalacademy",
    },
    {
        "icon": "spark-star",
        "name": "Yelp",
        "url": "https://www.yelp.com/biz/9pHbpXdoX6-Uanr7-1H7HQ",
    },
]

STUDENT_REVIEWS = [
    {
        "name": "Salvador Garcia",
        "meta": "7 reviews · 2 photos · 2 months ago",
        "copy": "Roseville Dental Academy is a great place to go learn and get certifications for being a Dental Assistant. The staff is very caring and will help you make sure you understand everything they teach you and offer extra assistance so you do not get lost along the way. They allow you to intern at a dental office during your course and make sure you end up somewhere where you will learn and thrive. They even help you make resumes and apply to jobs, which is how I got hired at my current office. Overall a 10/10 experience and highly recommend.",
    },
    {
        "name": "grace",
        "meta": "2 reviews · 2 months ago",
        "copy": "If you are looking to start a career in dental assisting, this is an excellent place to begin. During my 9-week course, I gained valuable knowledge in radiation safety, infection control, and BLS, along with hands-on experience in chairside assisting and patient care. I also had the opportunity to build strong relationships within the dental field, which has helped set me up for a successful career. The instructors truly want to see their students succeed and go above and beyond to support us. They even help by sharing our resumes with local dental offices, which is a huge advantage when starting out. I am very grateful for the support, guidance, and training I received through this program.",
    },
    {
        "name": "Breana Donahue",
        "meta": "4 reviews · 2 months ago",
        "copy": "I took the 9 week dental assisting course. Jesica is an amazing teacher who makes sure every student understands everything she goes over. She gives us a lot of hands on learning and makes sure we know everything to jump straight into an office as soon as you graduate. I am confident in my skills after taking this program and am so excited to start my career in the dental field. They help you find an internship and even keep an eye out for job opportunities in your area, as well as help with your resume. If I could give them more than 5 stars I would. Thank you so much Jesica and Sandra for all you have done for all of us.",
    },
    {
        "name": "jackie G",
        "meta": "5 reviews · 3 photos · 5 months ago",
        "copy": "I had a great experience at Roseville Dental Academy. The staff was friendly and professional, and my instructor Jessica made learning so easy. She was down to earth, patient, and made me feel very welcomed. I truly enjoyed my time there and would definitely recommend this academy to anyone interested in dental assisting.",
    },
    {
        "name": "Amanda Lehr",
        "meta": "2 reviews · 5 months ago",
        "copy": "I absolutely loved my experience at Roseville Dental Academy. The 9 week course teaches you everything you need to know to start your career as a dental assistant. The instructors Jessica and Sandra are very hands on and ensure every student is understanding the course material. After completing the program I had multiple job offers and could not have done it without their help.",
    },
    {
        "name": "Selene",
        "meta": "1 review · 2 months ago",
        "copy": "Excellent dental assisting program with hands-on training and great support. Jessica is an outstanding instructor: patient, knowledgeable, and truly invested in her students. Highly recommend.",
    },
    {
        "name": "Kate Richard",
        "meta": "2 reviews · 3 months ago",
        "copy": "It is a great intensive program. Sandra and Jessica are very nice, patient, and teach very well. They help you find an internship. They also help you with your resume and they can help you find a job in the field. I thoroughly enjoyed the class.",
    },
    {
        "name": "wasima yusufi",
        "meta": "4 reviews · 4 months ago",
        "copy": "I had an amazing experience at Roseville Dental Academy. The staff is amazing here, everyone is super friendly, knowledgeable, and so nice. Jessica is awesome. I was in her classes and she made them so much fun while teaching us CPR and Infection Control. I learned so much from her. Keep up the good work. It is hard to find someone like her that teaches well. I would highly recommend Roseville Dental Academy to anyone that wants to continue dental assisting.",
    },
    {
        "name": "alli pless",
        "meta": "3 reviews · 7 months ago",
        "copy": "I would recommend this program to everyone. I completed it feeling very confident in dental assisting. The teachers are amazing and are so kind, patient, and helpful. The whole office itself and everyone in it is great. You learn everything you need to know and learn how to take x rays. You leave with everything you need to start a job as a DA. I had no problems getting interviews and finding a job. Jessica and Sandra are truly amazing and helped me so much. I am now a dental assistant at Aspen Dental, taking x rays and doing all dental assisting tasks. I love my job and could not have done it without these amazing people at Roseville Dental Academy.",
    },
    {
        "name": "Andrea Figueroa",
        "meta": "6 reviews · 10 photos · 2 years ago",
        "copy": "Just graduated from the 9 week dental assistant program. Definitely recommend to all who want to jump into the dental field. Super hands on learning. Amazing instructors. Thank you Cameo and Jessica.",
    },
    {
        "name": "Jordyn Sturgeon",
        "meta": "7 reviews · 11 months ago",
        "copy": "Absolutely amazing classes. As a DA I took a bunch of their classes working towards my RDA. Everyone was incredibly sweet, helping me work toward my goal and allowing me to come by and grab my certificate. Great communication and teaching skills. One hundred percent recommend to everyone looking to get some more certificates under their belt. Jessica and Sandra were the sweetest. Thank you guys.",
    },
    {
        "name": "Chi Nguyen",
        "meta": "Local Guide · 88 reviews · 43 photos · a year ago",
        "copy": "I have been taking DA and x-ray classes here. The teacher Jessica is dedicated and passionate, and the courses were fun and interesting. I love my classmates. I love this school and this dental office because they work really professionally and keep everything super clean. Teachers and instructors are friendly and helpful whenever I have questions. They always make sure that students understand and are catching up with all the courses. The doctor, hygienist, and employees at the office where I had internship were super nice, and they always helped me understand all the procedures as a Dental Assistant. Definitely will recommend to my friends.",
    },
    {
        "name": "Ambar Ruiz",
        "meta": "2 reviews · a year ago",
        "copy": "I graduated from the dental assisting course with my x ray and BLS certifications with Jessica, and it was the best decision I could have ever made. I got a job as a DA within 2 weeks of applying thanks to the program. It was so helpful at jump starting my DA journey and I left with so much knowledge and support. If you want to be a dental assistant and do not know where to start, start here. It is the best investment you can make for yourself and your future.",
    },
    {
        "name": "Konner Sims",
        "meta": "1 review · a year ago",
        "copy": "The best experience ever. Jessica and Daniela are amazing teachers. Jessica also assisted on getting me a job right after graduating. If you are not a classroom student and more of a hands on learner I definitely recommend. Definitely will be back for my RDA. Thank you to the whole office, you all are very welcoming and sweet.",
    },
    {
        "name": "Elsa Skillman",
        "meta": "2 reviews · 2 years ago",
        "copy": "Roseville Dental Academy is amazing. I came in not really knowing much about the dental world, but the instructors Jessica and Cameo changed everything. I took the BLS class, x-ray course, and the dental assisting course as well. The instructors are very helpful and attentive to everyone. They are patient and push you to succeed. Totally recommend taking this course and getting your career started.",
    },
    {
        "name": "Brianna Palmer",
        "meta": "2 reviews · 2 years ago",
        "copy": "I had a fantastic experience at Roseville Dental Academy. The staff was incredibly friendly and professional, making me feel at ease from the moment I walked in. The facility was clean and modern, and the instructor was knowledgeable and patient. I received top-notch dental education and training, and I could not be happier with my choice to attend Roseville Dental Academy. Immediately after graduating I got job placement and could not be happier with the office I work for. I highly recommend it to anyone looking to pursue a career in dentistry.",
    },
    {
        "name": "Callie Reineke",
        "meta": "3 reviews · 3 years ago",
        "copy": "Jessica is the most amazing instructor. She taught me so much and I am so grateful to have found Roseville Dental Academy. I highly recommend it to anyone who wants to join the dental field. She will teach you anything you want to know and will be one hundred percent hands on with you.",
    },
    {
        "name": "Alexis N.",
        "meta": "6 reviews · a year ago",
        "copy": "I recently completed the BLS/CPR course and was thoroughly impressed. The instructor Jessica was knowledgeable, engaging, and made the content easy to understand. The hands-on practice was invaluable, providing real-life scenarios that helped my confidence in performing CPR. I highly recommend this course to anyone looking to learn CPR or renew their certification.",
    },
    {
        "name": "Vicky Galvan",
        "meta": "3 reviews · 2 years ago",
        "copy": "Roseville Dental Academy is the most beneficial schooling you can get for hands on learning, visual learning, and real life learning if you want to become a DA or enter the dental field. The instructor Jessica and TA Sandra are the best. They are both super passionate about teaching their students and providing the best for them. They will teach you all you need, education wise, term wise, internships, and finding a job. Everything you need they can help provide including infection control, radiation safety, and any DA responsibilities. There is no better academy.",
    },
    {
        "name": "Sandra Wolfie",
        "meta": "4 reviews · 4 photos · 2 years ago",
        "copy": "I took the dental assisting course, BLS course, and x-ray course. The instructor Jessica is amazing. You can tell right away that she is passionate and puts a lot of time and effort into the class and students. Internship is also offered from their offices and the whole team is patient and helpful with you. Dr. Mike is an amazing doctor and answered any questions I had during internship too. They helped me feel prepared to go into a dental office and start working. I recommend this class to anyone wanting to work in dentistry and wanting to start somewhere.",
    },
    {
        "name": "Jorge Ruiz",
        "meta": "2 reviews · 2 years ago",
        "copy": "Roseville Dental Academy is amazing. The DA program gives you a strong knowledge base and enough practice to start as a DA. Jessica is one of the best instructors that you are going to find. Her classes are so well done and didactic. Highly recommended.",
    },
    {
        "name": "saina Rahimi",
        "meta": "4 reviews · 1 photo · 2 years ago",
        "copy": "I came to the academy with no experience for x-ray classes. I am walking away today feeling confident in taking x rays. My instructor Jessica is awesome and she made the material make more sense and easy to understand. An experienced teacher makes excellent students. Jessica is sweet and helpful and answered all my questions. I just fell in love with the academy. If I ever need anything I am coming back for all my certifications and definitely recommending everyone out there.",
    },
    {
        "name": "Darryl",
        "meta": "5 reviews · 3 years ago",
        "copy": "I was so skeptical about going into the dental field, but I did it. Roseville Dental Academy is hands down the best place I have ever learned from. The instructor Jessica Danielle is one of the best teachers I have ever had. It is an 8 week program and I graduated with the skills and confidence to go so far in this field. Not only are the instructors great, but the doctor I interned under, Dr. Mike with Waikiki Dental, was one of the best dentists I have ever met. The staff is super nice and helpful. They make you feel so at home and not out of place at all. Ten out of ten recommend if you are thinking about going into the dental field.",
    },
    {
        "name": "Jocelin Avalos",
        "meta": "2 reviews · 2 years ago",
        "copy": "I loved Roseville Dental Academy. In just 9 weeks, I learned an incredible amount under the guidance of Jessica, Sandra, and Bri. I highly recommend this program to anyone looking to start their dental career. I had a great experience.",
    },
    {
        "name": "stella newell",
        "meta": "1 review · 2 years ago",
        "copy": "I came into the course knowing nothing about the dental world but being very excited to start a new career. Jessica is very attentive to her students, helping extra on things you might not understand. She even helps with your resume and job applications after graduation. I greatly recommend this course if you are wanting to move into being a DA. It is very fast paced but that does not mean the information is rushed. An internship is provided and set up for you. And if you are lucky you will get set up to do one at Waikiki. Everyone is so nice and Dr. Mike is so patient and helpful with all the interns.",
    },
    {
        "name": "Lindsay Kim",
        "meta": "2 reviews · 2 years ago",
        "copy": "I love the program here. I have a dental hygienist license in South Korea but I have to go back to school to get a license to work in the USA. I decided to work as a DA until I get my license here in California. Taking the program at Roseville Dental Academy has assisted me a lot for starting my career here in the USA. Even though the commute took 6 hours round trip, it was worth it. Thank you so much for the great training session and experience meeting new friends in the industry.",
    },
    {
        "name": "Ayyan Alnagoma",
        "meta": "1 review · 2 photos · 2 years ago",
        "copy": "I had the best experience with Waikiki Dental Academy. Jessica was one of the best instructors I have yet to have: very helpful and so informative. I learned and got so much done within the program thanks to Jessica, Bre, and Xandra's help. I also loved working with Dr. Mike as an intern. He is a very knowledgeable and hardworking man, and you could see it in his work ethic. I would one hundred percent recommend the program to anyone looking to get their DA certification.",
    },
    {
        "name": "Aisha Khurram",
        "meta": "5 reviews · 2 years ago",
        "copy": "I came to the academy with no experience in dental assisting. I learned so much from here that I feel I can work confidently as a dental assistant. Our instructor Jessica is very experienced and knowledgeable. She is awesome and helpful. She answered all my questions. I will definitely recommend this to everyone out there.",
    },
    {
        "name": "Mark Swink",
        "meta": "2 reviews · 1 photo · 2 years ago",
        "copy": "What an amazing educational experience overall. I have volunteered for several dentists and no one compares to Dr. Mike Narodovich. He was patient, offered helpful tips and tricks on improving, and created a learning environment through his leadership and advocacy for genuine bedside care and concern. Jessica and Sandra both provided top notch instruction and made learning relevant and applicable. The hands on portion was my absolute favorite and Jessica excels at utilizing teaching methods perfect for tactile and kinesthetic learners. Then you have the rest of the staff helping you and preparing you to fly solo. As a fellow educator teaching K-12 and higher ed, I cannot recommend Roseville Dental Academy enough for their professionalism and dedication to teaching.",
    },
]

REGISTRATION_COURSE_OPTIONS = [
    {
        "key": "dental-assisting",
        "icon": "graduation",
        "label": "Dental Assisting Training Program",
        "price": "$2500.00",
        "note": "Accelerated 9-week program with live-practice chairside training.",
    },
    {
        "key": "radiation-safety",
        "icon": "scan",
        "label": "Radiation Safety / X-ray License",
        "price": "$695.00",
        "note": "California Dental Board-aligned radiography training with patient requirements.",
    },
    {
        "key": "infection-control",
        "icon": "shield",
        "label": "8-Hour Infection Control Certification",
        "price": "$395.00",
        "note": "Current compliance training for California dental professionals and students.",
    },
    {
        "key": "bls-cpr",
        "icon": "heart",
        "label": "BLS / CPR",
        "price": "$85.00",
        "note": "American Heart Association-aligned BLS training with instructor-led skills evaluation.",
    },
]

COURSE_ROUTES = [
    ("bls-cpr-1", "BLS / CPR"),
    ("infection-control", "Infection Control"),
    ("radiation-safety", "Radiation Safety"),
    ("coronal-polish", "Coronal Polish"),
    ("sealants", "Sealants"),
]

MORE_ROUTES = [
    ("dental-assisting-program", "Dental Assisting Program"),
    ("front-office-program", "Front Office Program"),
    ("meet-the-instructors", "Meet the Instructors"),
    ("faqs-1", "FAQs"),
    ("photos", "Photos"),
    ("resume-portal-dr-oms-only", "Resume Portal DR/OMS only"),
]

ALL_ROUTES = [
    "",
    "registration",
    "bls-cpr-1",
    "infection-control",
    "radiation-safety",
    "coronal-polish",
    "sealants",
    "dental-assisting-program",
    "front-office-program",
    "meet-the-instructors",
    "faqs-1",
    "photos",
    "resume-portal-dr-oms-only",
    "m/login",
    "m/reset",
    "m/create",
    "m/create-account",
    "m/bookings",
    "m/account",
]

PUBLIC_SITEMAP_ROUTES = [
    "",
    "registration",
    "bls-cpr-1",
    "infection-control",
    "radiation-safety",
    "coronal-polish",
    "sealants",
    "dental-assisting-program",
    "front-office-program",
    "meet-the-instructors",
    "faqs-1",
    "photos",
]

IMAGE = {
    "logo": "/assets/homepage/logo-seal.jpg",
    "career_infographic": "/assets/homepage/career-outlook-infographic.png",
    "hero": "/assets/placeholders/hero-aurora.svg",
    "about": "/assets/placeholders/landscape-tide.svg",
    "team": "/assets/placeholders/portrait-whisper.svg",
    "admissions": "/assets/placeholders/admissions-cloud.svg",
    "bls": "/assets/placeholders/landscape-ribbon.svg",
    "infection": "/assets/placeholders/admissions-cloud.svg",
    "radiation": "/assets/placeholders/panoramic-horizon.svg",
    "coronal": "/assets/placeholders/landscape-tide.svg",
    "sealants": "/assets/placeholders/landscape-ribbon.svg",
    "gallery1": "/assets/placeholders/portrait-whisper.svg",
    "gallery2": "/assets/placeholders/admissions-cloud.svg",
    "gallery3": "/assets/placeholders/portrait-whisper.svg",
    "gallery4": "/assets/placeholders/portrait-whisper.svg",
    "gallery5": "/assets/placeholders/square-lens.svg",
    "gallery6": "/assets/placeholders/portrait-whisper.svg",
    "gallery7": "/assets/placeholders/landscape-tide.svg",
    "gallery8": "/assets/placeholders/landscape-ribbon.svg",
    "gallery9": "/assets/placeholders/hero-aurora.svg",
    "gallery10": "/assets/placeholders/landscape-tide.svg",
    "gallery11": "/assets/placeholders/admissions-cloud.svg",
    "gallery12": "/assets/placeholders/landscape-ribbon.svg",
}

IMAGE_DIMENSIONS = {
    "/assets/homepage/logo-seal.jpg": (1032, 1000),
    "/assets/homepage/career-outlook-infographic.png": (2752, 1536),
    "/assets/placeholders/hero-aurora.svg": (1156, 1542),
    "/assets/placeholders/landscape-tide.svg": (1240, 620),
    "/assets/placeholders/portrait-whisper.svg": (640, 853),
    "/assets/placeholders/admissions-cloud.svg": (640, 480),
    "/assets/placeholders/landscape-ribbon.svg": (1240, 620),
    "/assets/placeholders/panoramic-horizon.svg": (2560, 1280),
    "/assets/placeholders/square-lens.svg": (616, 640),
    "/assets/placeholders/share-glow.svg": (1200, 630),
}

ICON_SVGS = {
    "graduation": (
        '<path d="M3 8 12 4l9 4-9 4-9-4Z" />'
        '<path d="M7 10.5v4.25c0 .62 2.24 2.25 5 2.25s5-1.63 5-2.25V10.5" />'
        '<path d="M21 9v5" />'
    ),
    "briefcase": (
        '<path d="M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6" />'
        '<rect x="3" y="6" width="18" height="12" rx="2" />'
        '<path d="M3 11h18" />'
        '<path d="M10 11v2h4v-2" />'
    ),
    "heart": '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />',
    "clipboard-check": (
        '<rect x="6" y="4" width="12" height="16" rx="2" />'
        '<path d="M9 4.5h6V7H9z" />'
        '<path d="m9 13 2 2 4-4" />'
    ),
    "shield": (
        '<path d="M12 3 5 6v6c0 4.5 3 7 7 9 4-2 7-4.5 7-9V6l-7-3Z" />'
        '<path d="m9.5 12 1.8 1.8 3.2-3.6" />'
    ),
    "scan": (
        '<circle cx="12" cy="12" r="3.5" />'
        '<path d="M12 2v3" />'
        '<path d="M12 19v3" />'
        '<path d="M2 12h3" />'
        '<path d="M19 12h3" />'
        '<path d="m4.9 4.9 2.1 2.1" />'
        '<path d="m17 17 2.1 2.1" />'
        '<path d="m19.1 4.9-2.1 2.1" />'
        '<path d="M7 17 4.9 19.1" />'
    ),
    "spark-star": (
        '<path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />'
        '<path d="M19 4 19.8 6.2 22 7l-2.2.8L19 10l-.8-2.2L16 7l2.2-.8z" />'
        '<path d="M5 15 5.8 17.2 8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z" />'
    ),
    "star": '<path d="m12 3.8 2.55 5.18 5.72.83-4.14 4.04.98 5.7L12 16.85l-5.11 2.68.98-5.7-4.14-4.04 5.72-.83z" />',
    "badge-check": (
        '<path d="M12 3 9.5 5.2 6 5.5 5.5 9 3 12l2.5 3-.5 3.5 3.5.3L12 21l3.5-2.2 3.5-.3-.5-3.5 2.5-3-2.5-3-.5-3.5-3.5-.3z" />'
        '<path d="m9.4 12.2 1.7 1.7 3.5-3.7" />'
    ),
    "users": (
        '<circle cx="10" cy="9" r="3" />'
        '<path d="M4 21v-1.2A3.8 3.8 0 0 1 7.8 16h4.4a3.8 3.8 0 0 1 3.8 3.8V21" />'
        '<path d="M20 21v-1.2a3.5 3.5 0 0 0-2.7-3.4" />'
        '<path d="M16.5 6.2a3 3 0 1 1 0 5.7" />'
    ),
    "coins": (
        '<path d="M6 7c0-1.66 2.69-3 6-3s6 1.34 6 3-2.69 3-6 3-6-1.34-6-3Z" />'
        '<path d="M6 7v5c0 1.66 2.69 3 6 3s6-1.34 6-3V7" />'
        '<path d="M8 15v2c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5v-2" />'
    ),
    "calendar-check": (
        '<rect x="3" y="5" width="18" height="16" rx="2" />'
        '<path d="M16 3v4" />'
        '<path d="M8 3v4" />'
        '<path d="M3 10h18" />'
        '<path d="m8 15 2 2 5-5" />'
    ),
    "route": (
        '<circle cx="6" cy="6" r="2" />'
        '<circle cx="18" cy="18" r="2" />'
        '<path d="M8 6h4a4 4 0 0 1 4 4v4" />'
        '<path d="M12 14h4" />'
    ),
    "map-pin": (
        '<path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />'
        '<circle cx="12" cy="10" r="2.3" />'
    ),
    "phone": (
        '<path d="M6.6 4.8h2.1l1.2 3.2-1.4 1.1a15.2 15.2 0 0 0 6.4 6.4l1.1-1.4 3.2 1.2v2.1a1.7 1.7 0 0 1-1.9 1.7A16.7 16.7 0 0 1 4.9 6.7 1.7 1.7 0 0 1 6.6 4.8Z" />'
    ),
    "mail": (
        '<rect x="3" y="5" width="18" height="14" rx="2" />'
        '<path d="m4 7 8 6 8-6" />'
    ),
    "clock": (
        '<circle cx="12" cy="12" r="9" />'
        '<path d="M12 7v5l3 2" />'
    ),
    "camera": (
        '<path d="M5 8h2l1.2-2h7.6L17 8h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />'
        '<circle cx="12" cy="13" r="3.4" />'
    ),
    "book-open": (
        '<path d="M12 7v13" />'
        '<path d="M3 18.5C3 16.57 4.57 15 6.5 15H12V5H6.5A3.5 3.5 0 0 0 3 8.5z" />'
        '<path d="M21 18.5C21 16.57 19.43 15 17.5 15H12V5h5.5A3.5 3.5 0 0 1 21 8.5z" />'
    ),
    "user-star": (
        '<circle cx="10" cy="8.5" r="3" />'
        '<path d="M4.5 19.5a5.5 5.5 0 0 1 11 0" />'
        '<path d="m18.5 6 0.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" />'
    ),
    "facebook": '<path fill="currentColor" stroke="none" d="M13.7 21v-7h2.4l.4-3.1h-2.8V8.9c0-.9.3-1.5 1.6-1.5H16V4.6c-.5-.1-1.3-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V10.9H7v3.1h2.8v7z" />',
    "instagram": (
        '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />'
        '<circle cx="12" cy="12" r="3.75" />'
        '<circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />'
    ),
    "tiktok": (
        '<path d="M14 5v8.2a3.8 3.8 0 1 1-3.8-3.8" />'
        '<path d="M14 5c.9 1.9 2.2 3 4 3.4" />'
    ),
}


def route_url(slug: str) -> str:
    return "/" if not slug else f"/{slug}/"


def registration_href(course_key: str | None = None) -> str:
    if not course_key:
        return "/registration/#registration-form"
    return f"/registration/?course={escape(course_key)}#registration-form"


def canonical_url(slug: str) -> str:
    return SITE_URL if not slug else f"{SITE_URL}/{slug}/"


def page_file(slug: str) -> Path:
    if not slug:
        return ROOT / "index.html"
    return ROOT / slug / "index.html"


def wrapper_file(slug: str) -> Path:
    return ROOT / (f"{slug}.html" if slug else "index.html")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def paragraph(text: str, cls: str = "section-copy") -> str:
    return f"<p class=\"{cls}\">{escape(text)}</p>"


def icon(name: str, *, class_name: str = "ui-icon", label: str | None = None, decorative: bool = True) -> str:
    title = f"<title>{escape(label)}</title>" if label and not decorative else ""
    aria = 'aria-hidden="true"' if decorative else 'role="img"'
    return (
        f'<svg class="{escape(class_name)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" {aria}>'
        f"{title}{ICON_SVGS[name]}</svg>"
    )


def icon_badge(name: str, *, class_name: str = "icon-badge") -> str:
    return f'<span class="{escape(class_name)}" aria-hidden="true">{icon(name)}</span>'


def detail_pill_icon(text: str, icon_name: str) -> str:
    return (
        '<span class="detail-pill detail-pill--icon">'
        f"{icon(icon_name)}"
        f"<span>{escape(text)}</span>"
        "</span>"
    )


def img_tag(
    src: str,
    alt: str,
    *,
    class_name: str | None = None,
    loading: str = "lazy",
    fetchpriority: str | None = None,
    decoding: str = "async",
) -> str:
    attrs = [f'src="{escape(src)}"', f'alt="{escape(alt)}"']
    width, height = IMAGE_DIMENSIONS.get(src, (None, None))
    if width and height:
        attrs.append(f'width="{width}"')
        attrs.append(f'height="{height}"')
    if class_name:
        attrs.append(f'class="{escape(class_name)}"')
    if loading:
        attrs.append(f'loading="{escape(loading)}"')
    if decoding:
        attrs.append(f'decoding="{escape(decoding)}"')
    if fetchpriority:
        attrs.append(f'fetchpriority="{escape(fetchpriority)}"')
    return f"<img {' '.join(attrs)} />"


def paragraph_block(items: list[str], cls: str = "section-copy") -> str:
    return "".join(paragraph(item, cls) for item in items if item)


def bullet_list(items: list[str]) -> str:
    if not items:
        return ""
    html = "".join(f"<li>{escape(item)}</li>" for item in items)
    return f"<ul class=\"metric-list\">{html}</ul>"


def detail_pills(items: list[str]) -> str:
    if not items:
        return ""
    html = "".join(f"<span class=\"detail-pill\">{escape(item)}</span>" for item in items)
    return f"<div class=\"detail-list\">{html}</div>"


def buttons(items: list[tuple[str, str, str]]) -> str:
    if not items:
        return ""
    html = "".join(
        f"<a class=\"{escape(cls)}\" href=\"{escape(href)}\">{escape(label)}</a>"
        for label, href, cls in items
    )
    return f"<div class=\"hero-actions\">{html}</div>"


def star_row(count: int = 5) -> str:
    stars = "".join(icon("star", class_name="ui-icon review-star") for _ in range(count))
    return f'<div class="review-rating" aria-label="{count} out of 5 stars">{stars}</div>'


def section_header(
    title: str,
    eyebrow: str | None = None,
    copy: str | None = None,
    *,
    icon_name: str | None = None,
    eyebrow_class: str | None = None,
) -> str:
    badge_html = icon_badge(icon_name, class_name="section-icon-badge") if icon_name else ""
    eyebrow_classes = "eyebrow"
    if eyebrow_class:
        eyebrow_classes += f" {escape(eyebrow_class)}"
    eyebrow_html = f"<p class=\"{eyebrow_classes}\">{escape(eyebrow)}</p>" if eyebrow else ""
    copy_html = paragraph(copy) if copy else ""
    kicker_html = (
        f"<div class=\"section-kicker\">{badge_html}{eyebrow_html}</div>"
        if badge_html or eyebrow_html
        else ""
    )
    return (
        "<div class=\"section-header\">"
        f"{kicker_html}"
        f"<h2 class=\"section-title\">{escape(title)}</h2>"
        f"{copy_html}"
        "</div>"
    )


def hero(
    eyebrow: str,
    title: str,
    intro: str,
    image: str,
    *,
    buttons_html: str = "",
    pills: list[str] | None = None,
    panel_title: str | None = None,
    panel_copy: str | None = None,
    panel_items: list[str] | None = None,
    panel_button: tuple[str, str, str] | None = None,
) -> str:
    pills_html = detail_pills(pills or [])
    panel_cta = (
        f"<a class=\"{escape(panel_button[2])}\" href=\"{escape(panel_button[1])}\">{escape(panel_button[0])}</a>"
        if panel_button
        else ""
    )
    panel_html = ""
    if panel_title or panel_copy or panel_items:
        panel_html = dedent(
            f"""
            <div class="hero-overlay">
              <div class="hero-panel">
                <h2>{escape(panel_title or "")}</h2>
                {paragraph(panel_copy or "", "card-copy") if panel_copy else ""}
                {bullet_list(panel_items or [])}
                {panel_cta}
              </div>
            </div>
            """
        ).strip()
    return dedent(
        f"""
        <section class="hero">
          <div class="site-frame hero-grid">
            <div class="hero-copy">
              <p class="eyebrow">{escape(eyebrow)}</p>
              <h1 class="page-title">{escape(title)}</h1>
              <p class="page-intro">{escape(intro)}</p>
              {buttons_html}
              {pills_html}
            </div>
            <div class="hero-media">
              {img_tag(image, title, loading="eager", fetchpriority="high")}
              {panel_html}
            </div>
          </div>
        </section>
        """
    ).strip()


def split_section(
    title: str,
    eyebrow: str,
    copy: list[str],
    *,
    image: str | None = None,
    image_alt: str = "",
    secondary_title: str | None = None,
    secondary_copy: list[str] | None = None,
    secondary_list: list[str] | None = None,
    secondary_buttons: list[tuple[str, str, str]] | None = None,
    reverse: bool = False,
    section_id: str | None = None,
    icon_name: str | None = None,
    eyebrow_class: str | None = None,
) -> str:
    media = (
        f"""
        <div class="media-frame">
          {img_tag(image, image_alt or title)}
        </div>
        """
        if image
        else ""
    )
    panel_bits = []
    if secondary_title:
        panel_bits.append(f"<h3 class=\"card-title\">{escape(secondary_title)}</h3>")
    if secondary_copy:
        panel_bits.append(paragraph_block(secondary_copy, "card-copy"))
    if secondary_list:
        panel_bits.append(bullet_list(secondary_list))
    if secondary_buttons:
        panel_bits.append(buttons(secondary_buttons))
    panel = (
        "<div class=\"card card-stack\">"
        + "".join(panel_bits)
        + "</div>"
        if panel_bits
        else ""
    )
    side_a = media or panel
    side_b = (
        "<div>"
        + section_header(
            title,
            eyebrow,
            copy[0] if len(copy) == 1 else None,
            icon_name=icon_name,
            eyebrow_class=eyebrow_class,
        )
        + ("" if len(copy) == 1 else paragraph_block(copy))
        + (panel if media else "")
        + "</div>"
    )
    first = side_b if reverse else side_a
    second = side_a if reverse else side_b
    section_attr = f' id="{escape(section_id)}"' if section_id else ""
    return dedent(
        f"""
        <section class="section"{section_attr}>
          <div class="site-frame two-up">
            {first}
            {second}
          </div>
        </section>
        """
    ).strip()


def card_grid(
    title: str,
    eyebrow: str,
    copy: str,
    items: list[dict[str, str]],
    *,
    section_id: str | None = None,
    icon_name: str | None = None,
) -> str:
    cards = []
    for item in items:
        image_html = (
            f'<div class="course-card-media">{img_tag(item["image"], item.get("image_alt", item["title"]))}</div>'  # type: ignore[arg-type]
            if item.get("image")
            else ""
        )
        icon_html = icon_badge(item["icon"], class_name="card-icon-badge") if item.get("icon") else ""
        subtitle = f"<p class=\"eyebrow course-card-eyebrow\">{escape(item['eyebrow'])}</p>" if item.get("eyebrow") else ""
        cta = (
            f"<a class=\"route-helper\" href=\"{escape(item.get('href', '#'))}\">{escape(item.get('cta', 'Learn more'))}</a>"
            if item.get("cta")
            else ""
        )
        cards.append(
            "<article class=\"course-card\">"
            + image_html
            + "<div class=\"course-card-body\">"
            + "<div class=\"course-card-head\">"
            + icon_html
            + "<div class=\"course-card-title-group\">"
            + subtitle
            + f"<h3>{escape(item['title'])}</h3>"
            + "</div>"
            + "</div>"
            + paragraph(item["copy"], "card-copy course-card-copy")
            + cta
            + "</div>"
            + "</article>"
        )
    section_attr = f' id="{escape(section_id)}"' if section_id else ""
    grid_classes = ["course-card-grid", "offerings-grid"]
    if len(items) == 5:
        grid_classes.append("offerings-grid--five")
    return (
        f"<section class=\"section\"{section_attr}>"
        f"<div class=\"site-frame\">{section_header(title, eyebrow, copy, icon_name=icon_name)}"
        f"<div class=\"{' '.join(grid_classes)}\">{''.join(cards)}</div>"
        f"</div></section>"
    )


def feature_grid(
    title: str,
    eyebrow: str,
    copy: str,
    items: list[dict[str, str]],
    *,
    columns: str = "three-up",
    icon_name: str | None = None,
) -> str:
    cards = []
    for item in items:
        body = []
        body.append(f"<article class=\"feature-card\">")
        if item.get("icon"):
            body.append(icon_badge(item["icon"], class_name="card-icon-badge"))
        if item.get("eyebrow"):
            body.append(f"<p class=\"eyebrow\">{escape(item['eyebrow'])}</p>")
        body.append(f"<h3>{escape(item['title'])}</h3>")
        if item.get("number"):
            body.append(f"<p class=\"stat-number\">{escape(item['number'])}</p>")
        body.append(paragraph(item["copy"], "card-copy"))
        if item.get("href"):
            body.append(f"<a class=\"route-helper\" href=\"{escape(item['href'])}\">{escape(item.get('cta', 'Learn more'))}</a>")
        body.append("</article>")
        cards.append("".join(body))
    return (
        f"<section class=\"section\"><div class=\"site-frame\">"
        f"{section_header(title, eyebrow, copy, icon_name=icon_name)}"
        f"<div class=\"{escape(columns)}\">{''.join(cards)}</div>"
        f"</div></section>"
    )


def stat_section(
    title: str,
    eyebrow: str,
    copy: str,
    items: list[dict[str, str]],
    *,
    icon_name: str | None = None,
    image: str | None = None,
    image_alt: str = "",
) -> str:
    cards = []
    for item in items:
        cards.append(
            "<article class=\"stat-card\">"
            + (icon_badge(item["icon"], class_name="card-icon-badge") if item.get("icon") else "")
            + f"<h3>{escape(item['title'])}</h3>"
            + f"<p class=\"stat-number\">{escape(item['number'])}</p>"
            + paragraph(item["copy"], "card-copy")
            + "</article>"
        )
    intro_html = section_header(title, eyebrow, copy, icon_name=icon_name)
    visual_html = (
        f"<div class=\"stat-visual-frame\">{img_tag(image, image_alt or title, class_name='stat-visual-image')}</div>"
        if image
        else ""
    )
    top_html = (
        f"<div class=\"stat-section-shell\">{intro_html}{visual_html}</div>"
        if visual_html
        else intro_html
    )
    return (
        f"<section class=\"section\"><div class=\"site-frame\">"
        f"{top_html}"
        f"<div class=\"stat-band\">{''.join(cards)}</div>"
        f"</div></section>"
    )


def requirements_section(
    title: str,
    eyebrow: str,
    copy: str,
    groups: list[dict[str, list[str] | str]],
    *,
    icon_name: str | None = None,
) -> str:
    cards = []
    for group in groups:
        cards.append(
            "<article class=\"card card-stack\">"
            + (icon_badge(group["icon"], class_name="card-icon-badge") if group.get("icon") else "")
            + f"<h3 class=\"card-title\">{escape(group['title'])}</h3>"
            + (paragraph(group["copy"], "card-copy") if group.get("copy") else "")
            + bullet_list(group.get("items", []))  # type: ignore[arg-type]
            + "</article>"
        )
    return (
        f"<section class=\"section\"><div class=\"site-frame\">"
        f"{section_header(title, eyebrow, copy, icon_name=icon_name)}"
        f"<div class=\"requirements-grid\">{''.join(cards)}</div>"
        f"</div></section>"
    )


def cta_ribbon(title: str, copy: str, buttons_list: list[tuple[str, str, str]]) -> str:
    return dedent(
        f"""
        <section class="section">
          <div class="site-frame">
            <div class="cta-ribbon">
              <div class="card-stack">
                <h2 class="section-title">{escape(title)}</h2>
                {paragraph(copy, "callout-copy")}
              </div>
              {buttons(buttons_list)}
            </div>
          </div>
        </section>
        """
    ).strip()


def faq_section(items: list[tuple[str, str]]) -> str:
    faq_html = []
    for question, answer in items:
        faq_html.append(
            "<details class=\"faq-item\">"
            + f"<summary>{escape(question)}</summary>"
            + f"<div class=\"faq-body\">{paragraph(answer)}</div>"
            + "</details>"
        )
    return (
        "<section class=\"section\"><div class=\"site-frame\">"
        + section_header(
            "Frequently Asked Questions",
            "Answers and guidance",
            "The questions below reflect the exact topics covered on the live academy site, reorganized into a cleaner, easier-to-scan format.",
            icon_name="book-open",
        )
        + f"<div class=\"faq-list\">{''.join(faq_html)}</div>"
        + "</div></section>"
    )


def gallery_section(groups: list[dict[str, object]]) -> str:
    sections = []
    for group in groups:
        cards = []
        for image, caption in group["items"]:  # type: ignore[misc]
            cards.append(
                "<figure class=\"gallery-card\">"
                + img_tag(image, caption)
                + f"<figcaption>{escape(caption)}</figcaption>"
                + "</figure>"
            )
        sections.append(
            "<section class=\"section\"><div class=\"site-frame\">"
            + section_header(group["title"], "Photo Gallery", group["copy"], icon_name="camera")  # type: ignore[index]
            + f"<div class=\"gallery-grid\">{''.join(cards)}</div>"
            + "</div></section>"
        )
    return "".join(sections)


def student_reviews_section(reviews: list[dict[str, str]]) -> str:
    review_cards = []
    for review in reviews:
        review_cards.append(
            "<article class=\"review-card\">"
            + "<div class=\"review-card-top\">"
            + "<div class=\"review-card-heading\">"
            + f"<h3>{escape(review['name'])}</h3>"
            + f"<p class=\"review-meta\">{escape(review['meta'])}</p>"
            + "</div>"
            + star_row()
            + "</div>"
            + f"<p class=\"review-copy\">{escape(review['copy'])}</p>"
            + "</article>"
        )

    highlights = "".join(
        [
            detail_pill_icon("Hands-on training", "graduation"),
            detail_pill_icon("Internship support", "users"),
            detail_pill_icon("Resume and job help", "briefcase"),
            detail_pill_icon("Supportive instructors", "heart"),
        ]
    )

    proof_points = bullet_list(
        [
            "Students repeatedly call out Jessica and Sandra for patient, hands-on teaching.",
            "Many graduates mention internship placement, resume help, and direct job leads.",
            "The feedback spans the 9-week dental assisting program plus x-ray, BLS, and infection control courses.",
        ]
    )

    return dedent(
        f"""
        <section class="section" id="student-reviews">
          <div class="site-frame">
            <div class="reviews-hero">
              <div class="reviews-copy">
                {section_header(
                    "Student Reviews",
                    "What graduates and certificate students say",
                    f"{len(reviews)} reviews consistently point to the same story: hands-on learning, caring instructors, internship support, and real help landing that first dental office role.",
                    icon_name="user-star",
                )}
                <div class="detail-list reviews-highlights">{highlights}</div>
              </div>
              <aside class="reviews-proof">
                <div class="reviews-proof-top">
                  {star_row()}
                  <p class="eyebrow">Real graduate feedback</p>
                </div>
                <h3 class="card-title">Why this section deserves to sit near the top</h3>
                {paragraph("The strongest pattern in the review set is not just satisfaction. It is confidence, job readiness, and personal support throughout the program.", "card-copy")}
                {proof_points}
              </aside>
            </div>
            <p class="review-rail-note">Browse every shared review below. On touch devices, swipe horizontally to move through the full set.</p>
            <div class="review-rail" tabindex="0" aria-label="Student reviews">
              {''.join(review_cards)}
            </div>
          </div>
        </section>
        """
    ).strip()


def contact_section() -> str:
    return dedent(
        f"""
        <section class="section" id="contact">
          <div class="site-frame">
            {section_header("Contact Us", "Plan your next step", "We love our students, so feel free to visit during normal business hours or send a note about course availability, prerequisites, and registration.", icon_name="map-pin")}
            <div class="contact-grid">
              <div class="card card-stack">
                <h3 class="card-title">Better yet, come see us in person!</h3>
                {paragraph("Roseville Dental Academy")}
                {paragraph(CONTACT["maps_address"], "card-copy")}
                <div class="detail-list">
                  {detail_pill_icon(f"Phone: {CONTACT['phone']}", "phone")}
                  {detail_pill_icon(f"Email: {CONTACT['email']}", "mail")}
                  {detail_pill_icon(f"Open today: {CONTACT['hours']}", "clock")}
                </div>
                <div class="hero-actions">
                  <a class="button" href="tel:{escape(CONTACT['phone'])}">Call the office</a>
                  <a class="button-secondary" href="{escape(CONTACT['directions_url'])}">Get directions</a>
                </div>
              </div>
              <form class="form-shell auth-form" data-mailto-form data-mailto-subject="Roseville Dental Academy inquiry">
                <h3 class="card-title">Drop us a line!</h3>
                {paragraph("Sign up for our email list for updates, promotions, and more.", "field-note")}
                <div class="form-grid">
                  <div class="field">
                    <label for="contact-name">Name</label>
                    <input id="contact-name" name="Name" type="text" data-label="Name" />
                  </div>
                  <div class="field">
                    <label for="contact-email">Email</label>
                    <input id="contact-email" name="Email" type="email" data-label="Email" />
                  </div>
                  <div class="field field--full">
                    <label for="contact-message">Message</label>
                    <textarea id="contact-message" name="Message" data-label="Message"></textarea>
                  </div>
                </div>
                <p class="field-note">This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.</p>
                <div class="auth-actions">
                  <button class="button" type="submit">Send</button>
                  <button class="button-secondary" type="reset">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </section>
        """
    ).strip()


def footer(current_slug: str) -> str:
    def list_link(slug: str, label: str) -> str:
        active_attr = ' class="is-active"' if current_slug == slug else ""
        return f'<li><a href="{escape(route_url(slug))}"{active_attr}>{escape(label)}</a></li>'

    study_links = "".join(
        list_link(slug, label) for slug, label in MORE_ROUTES[:4]
    )
    course_links = "".join(
        list_link(slug, label) for slug, label in COURSE_ROUTES
    )
    social = "".join(
        f"<a href=\"{escape(link['url'])}\" aria-label=\"{escape(link['name'])}\">{icon(link['icon'], label=link['name'])}</a>"
        for link in SOCIAL_LINKS
    )
    return dedent(
        f"""
        <footer class="footer">
          <div class="site-frame">
            <div class="footer-shell">
              <div class="footer-grid">
                <div class="footer-stack">
                  <div class="brand">
                    <span class="brand-mark">{img_tag(IMAGE['logo'], "Roseville Dental Academy seal", loading="eager")}</span>
                    <span class="brand-copy">
                      <strong>Roseville Dental Academy</strong>
                      <span>Dental training and certification</span>
                    </span>
                  </div>
                  {paragraph("Begin your career in dental assisting now, or return for California Dental Board-aligned stand-alone training with a smaller, more hands-on classroom experience.", "footer-copy")}
                  <p class="footer-meta">{escape(CONTACT["address"])}</p>
                </div>
                <div class="footer-stack">
                  <h2 class="footer-title">Programs</h2>
                  <ul class="footer-list">{study_links}</ul>
                </div>
                <div class="footer-stack">
                  <h2 class="footer-title">Stand-alone courses</h2>
                  <ul class="footer-list">{course_links}</ul>
                </div>
                <div class="footer-stack">
                  <h2 class="footer-title">Contact and connect</h2>
                  <ul class="footer-list footer-list--contact">
                    <li><span class="footer-inline-icon">{icon("phone")}</span><a href="tel:{escape(CONTACT['phone'])}">{escape(CONTACT['phone'])}</a></li>
                    <li><span class="footer-inline-icon">{icon("mail")}</span><a href="mailto:{escape(CONTACT['email'])}">{escape(CONTACT['email'])}</a></li>
                    <li><span class="footer-inline-icon">{icon("clock")}</span>{escape(CONTACT['hours'])}</li>
                    <li><span class="footer-inline-icon">{icon("clipboard-check")}</span><a href="/registration/">Start registration</a></li>
                    <li><span class="footer-inline-icon">{icon("map-pin")}</span><a href="{escape(CONTACT['directions_url'])}">Get directions</a></li>
                  </ul>
                  <div class="social-links">{social}</div>
                </div>
              </div>
              <p class="footer-meta">Copyright © 2020 rosevilledental - All Rights Reserved.</p>
            </div>
          </div>
        </footer>
        """
    ).strip()


def header(current_slug: str) -> str:
    def active(slug: str) -> str:
        return " is-active" if current_slug == slug else ""

    def nav_link(href: str, label: str, *, slug: str | None = None) -> str:
        active_attr = ' class="is-active"' if slug is not None and current_slug == slug else ""
        return f'<a href="{escape(href)}"{active_attr}>{escape(label)}</a>'

    def dropdown_link(slug: str, label: str) -> str:
        return nav_link(route_url(slug), label, slug=slug)

    def mobile_group(title: str, content: str, *, group_id: str, open_by_default: bool = False) -> str:
        expanded = "true" if open_by_default else "false"
        open_class = " is-open" if open_by_default else ""
        hidden_state = "false" if open_by_default else "true"
        inert_attr = "" if open_by_default else " inert"
        return f"""
              <div class="mobile-group{open_class}" data-mobile-group>
                <button class="mobile-group-toggle" type="button" data-mobile-group-toggle aria-expanded="{expanded}" aria-controls="{group_id}">
                  <span class="mobile-group-label">{escape(title)}</span>
                </button>
                <div class="mobile-group-panel" id="{group_id}" aria-hidden="{hidden_state}"{inert_attr}>
                  <div class="mobile-links">{content}</div>
                </div>
              </div>
        """

    course_active = " is-active" if current_slug in {slug for slug, _ in COURSE_ROUTES} else ""
    more_active = " is-active" if current_slug in {slug for slug, _ in MORE_ROUTES} else ""
    course_dropdown = "".join(dropdown_link(slug, label) for slug, label in COURSE_ROUTES)
    more_dropdown = "".join(dropdown_link(slug, label) for slug, label in MORE_ROUTES)

    mobile_primary = "".join(
        [
            nav_link("/", "Home", slug=""),
            nav_link("/dental-assisting-program/", "Dental Assisting", slug="dental-assisting-program"),
            nav_link("/front-office-program/", "Front Office Program", slug="front-office-program"),
            nav_link("/registration/", "Admissions", slug="registration"),
            nav_link("/#contact", "Contact"),
        ]
    )
    mobile_courses = "".join(dropdown_link(slug, label) for slug, label in COURSE_ROUTES)
    mobile_more = "".join(dropdown_link(slug, label) for slug, label in MORE_ROUTES) + nav_link("/m/login/", "Student Portal")

    return dedent(
        f"""
        <div class="announcement">
          <div class="site-frame">{escape(ANNOUNCEMENT)}</div>
        </div>
        <header class="site-header">
          <div class="site-frame">
            <div class="header-shell">
              <a class="brand" href="/">
                <span class="brand-mark">{img_tag(IMAGE['logo'], "Roseville Dental Academy seal", loading="eager")}</span>
                <span class="brand-copy">
                  <strong>Roseville Dental Academy</strong>
                  <span>Dental training and certification</span>
                </span>
              </a>
              <nav class="desktop-nav" aria-label="Primary navigation">
                <ul class="nav-list">
                  <li class="nav-item{active('')}"><a class="nav-link{active('')}" href="/">Home</a></li>
                  <li class="nav-item{active('dental-assisting-program')}"><a class="nav-link{active('dental-assisting-program')}" href="/dental-assisting-program/">Dental Assisting</a></li>
                  <li class="nav-item nav-item--dropdown{course_active}" data-nav-item>
                    <button class="nav-trigger" type="button" data-nav-trigger aria-expanded="false" aria-haspopup="true" aria-controls="nav-courses-menu">Courses</button>
                    <div class="nav-dropdown" id="nav-courses-menu" data-nav-menu aria-hidden="true" inert>{course_dropdown}</div>
                  </li>
                  <li class="nav-item nav-item--dropdown{more_active}" data-nav-item>
                    <button class="nav-trigger" type="button" data-nav-trigger aria-expanded="false" aria-haspopup="true" aria-controls="nav-more-menu">More</button>
                    <div class="nav-dropdown" id="nav-more-menu" data-nav-menu aria-hidden="true" inert>{more_dropdown}</div>
                  </li>
                  <li class="nav-item{active('registration')}"><a class="nav-link{active('registration')}" href="/registration/">Admissions</a></li>
                  <li class="nav-item"><a class="nav-link" href="/#contact">Contact</a></li>
                </ul>
              </nav>
              <a class="portal-button" href="/m/login/">Student Portal</a>
              <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="mobile-nav">Menu</button>
            </div>
            <div class="mobile-nav" id="mobile-nav" data-mobile-nav>
              {mobile_group("Primary", mobile_primary, group_id="mobile-primary-group", open_by_default=True)}
              {mobile_group("Stand-alone courses", mobile_courses, group_id="mobile-courses-group")}
              {mobile_group("More information", mobile_more, group_id="mobile-more-group")}
            </div>
          </div>
        </header>
        """
    ).strip()


def layout(
    *,
    slug: str,
    title: str,
    description: str,
    body: str,
    image: str = "/assets/placeholders/share-glow.svg",
    noindex: bool = False,
) -> str:
    robots = '<meta name="robots" content="noindex, nofollow" />' if noindex else ""
    body_slug = (slug or "home").replace("/", "-")
    convai_widget = """
            <elevenlabs-convai
              agent-id="agent_6301kn20gh9denavkvn1bg9krf54"
              dismissible="true"
            ></elevenlabs-convai>
            <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
    """.strip()
    return dedent(
        f"""
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{escape(title)}</title>
            <meta name="description" content="{escape(description)}" />
            <link rel="canonical" href="{escape(canonical_url(slug))}" />
            <meta property="og:site_name" content="Roseville Dental Academy" />
            <meta property="og:title" content="{escape(title)}" />
            <meta property="og:description" content="{escape(description)}" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="{escape(canonical_url(slug))}" />
            <meta property="og:image" content="{escape(SITE_URL + image)}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{escape(title)}" />
            <meta name="twitter:description" content="{escape(description)}" />
            <meta name="twitter:image" content="{escape(SITE_URL + image)}" />
            <link rel="icon" href="/assets/favicon.png" />
            <link rel="stylesheet" href="/assets/site.css" />
            {robots}
          </head>
          <body class="page-{escape(body_slug)}">
            <a class="skip-link" href="#main-content">Skip to main content</a>
            {header(slug)}
            <main class="site-main" id="main-content" tabindex="-1">
              {body}
            </main>
            {footer(slug)}
            {convai_widget}
            <script src="/assets/site.js" defer></script>
          </body>
        </html>
        """
    ).strip() + "\n"


def redirect_wrapper(slug: str) -> str:
    destination = route_url(slug)
    label = slug or "home"
    return dedent(
        f"""
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="refresh" content="0; url={escape(destination)}" />
            <link rel="canonical" href="{escape(canonical_url(slug))}" />
            <title>Redirecting to {escape(label)}</title>
          </head>
          <body>
            <p>Redirecting to <a href="{escape(destination)}">{escape(destination)}</a>...</p>
          </body>
        </html>
        """
    ).strip() + "\n"


def homepage() -> str:
    body = []
    body.append(
        hero(
            "ROSEVILLE DENTAL ACADEMY",
            "Begin Your Career in Dental Assisting Now!",
            "Achieve certification in only 9 weeks. Our Dental Assisting program offers a cost-effective and streamlined option compared to pricier alternatives in the state.",
            IMAGE["hero"],
            buttons_html=buttons(
                [
                    ("Explore the program", "/dental-assisting-program/", "button"),
                    ("View stand-alone courses", "#stand-alone-courses", "button-secondary"),
                ]
            ),
            pills=["9-week program", "Waikiki Dental training site", "Small class sizes"],
            panel_title="The next Dental Assistant course is almost here!",
            panel_copy="The date is approaching fast and we're making preparations. Don't miss out on this exciting opportunity to change your career!",
            panel_items=[
                "Friday, April 3rd 2026",
                "Monday, April 20th 2026",
                "Now offering blended learning BLS",
            ],
            panel_button=("Start registration", registration_href("dental-assisting"), "button-secondary"),
        )
    )
    body.append(student_reviews_section(STUDENT_REVIEWS))
    body.append(
        split_section(
            "Dental Assisting Training Course - $2500.00",
            "Signature program",
            [
                "Our dental assisting program is designed to be completed in just 9 weeks. The program prepares students for an entry-level position in a dental office.",
                "All lectures and hands on learning will be done in our office at Waikiki Dental. We keep class sizes small for a better teacher to student focus. Our goal is to set students up for success by teaching you exactly what the staff at the dental office will expect you to know.",
                "Our accelerated program totals 9 weeks (210 hours) of combined class, clinical, and homework. Classes generally meet on either Mondays or Friday with one day of assigned externship. Due to limited space all sales are final and no refunds will be issued.",
            ],
            image=IMAGE["about"],
            image_alt="Dental assisting classroom",
            secondary_title="Next course starts",
            secondary_copy=["Friday, April 3rd 2026 or Monday, April 20th 2026"],
            secondary_buttons=[
                ("Learn more", "/dental-assisting-program/", "button"),
                ("Start registration", registration_href("dental-assisting"), "button-secondary"),
            ],
            icon_name="graduation",
            eyebrow_class="eyebrow--navy",
        )
    )
    body.append(
        split_section(
            "Heartcode BLS $85",
            "Now offering blended learning BLS",
            [
                "Complete online portion at home then come in for a skills test evaluation.",
                "Must purchase and complete online learning prior to scheduling skills eval.",
                "Please call to schedule the skills evaluation after completion of the online course. You will have to bring proof of online course completion to your skills eval.",
            ],
            image=IMAGE["bls"],
            image_alt="BLS course training",
            secondary_title="Heartcode BLS quick start",
            secondary_copy=["Link for online portion available during registration."],
            secondary_buttons=[
                ("Link for online portion", "tel:9168889821", "button"),
                ("BLS / CPR page", "/bls-cpr-1/", "button-secondary"),
            ],
            reverse=True,
            icon_name="heart",
        )
    )
    body.append(
        card_grid(
            "Stand Alone Courses",
            "Offered courses",
            "Click on a course card to learn more, review prerequisites, and confirm current registration details.",
            [
                {
                    "icon": "heart",
                    "title": "BLS Certification Course - Initial or Renewal",
                    "copy": "$85. April 4th, 2026. Due to limited space all sales are final and no refunds will be issued.",
                    "cta": "Learn more",
                    "href": "/bls-cpr-1/",
                    "image": IMAGE["bls"],
                },
                {
                    "icon": "shield",
                    "title": "8-Hour Infection Control Course",
                    "copy": "$395. California Dental Board-aligned training with current CPR and practice act prerequisites.",
                    "cta": "Learn more",
                    "href": "/infection-control/",
                    "image": IMAGE["infection"],
                },
                {
                    "icon": "scan",
                    "title": "Radiation Safety Course",
                    "copy": "$695. Due to limited space all sales are final and no refunds will be issued.",
                    "cta": "Learn more",
                    "href": "/radiation-safety/",
                    "image": IMAGE["radiation"],
                },
                {
                    "icon": "spark-star",
                    "title": "Coronal Polish Course",
                    "copy": "$500. April 11th, 2026. Due to limited space all sales are final and no refunds will be issued.",
                    "cta": "Learn more",
                    "href": "/coronal-polish/",
                    "image": IMAGE["coronal"],
                },
                {
                    "icon": "badge-check",
                    "title": "Pit and Fissure Sealant Course",
                    "copy": "$550. Current RDA renewal support with clinical patient requirements.",
                    "cta": "Learn more",
                    "href": "/sealants/",
                    "image": IMAGE["sealants"],
                },
            ],
            section_id="stand-alone-courses",
            icon_name="clipboard-check",
        )
    )
    body.append(
        feature_grid(
            "Additional Training and Coaching",
            "More ways to work with the academy",
            "The live site highlights several additional appointment-based and custom offerings. They now live together in one clearer section.",
            [
                {
                    "icon": "shield",
                    "title": "N95 Fit Test - $89.99 (By Appointment Only)",
                    "copy": "Qualitative test for N-95 Masks. This will help bring you in compliance with OSHA regulations. We can perform the initial fit test as well as the annual fit test. We will use the TSI Portacount machine to fit test one N95 mask. Each additional mask is $20.",
                    "href": "/#contact",
                    "cta": "Book Appointment Here",
                },
                {
                    "icon": "users",
                    "title": "One-on-one Implant and Bone Grafting Coaching",
                    "copy": "Learn to place dental implant using both CBCT guided as well as free hand techniques. Bone grafting and crestal approach sinus augmentation using various techniques including PRF. This is a custom tailored course, directly with Dr. Michael Narodovich, hands on with your own patients.",
                    "href": "/meet-the-instructors/",
                    "cta": "Learn more",
                },
                {
                    "icon": "briefcase",
                    "title": "Courses for hygienist",
                    "copy": "Ergonomics and Patient Care is a skills-based refresher for dental hygienists covering periodontal review, clinical ergonomics, scaling techniques, dental emergencies, common medications and their implications for periodontal health, patient communication, and referral decision-making.",
                    "href": "/#contact",
                    "cta": "Ask about availability",
                },
            ],
            icon_name="users",
        )
    )
    body.append(
        stat_section(
            "Why Dental Assisting?",
            "Career outlook",
            "The live homepage speaks directly to the flexibility and career mobility dental assisting can offer. Those proof points now get more breathing room and stronger hierarchy.",
            [
                {
                    "icon": "briefcase",
                    "title": "Employment Outlook",
                    "number": "15.3%",
                    "copy": "Dental Assistant jobs are expected to increase by 15.3% between 2018 and 2028.",
                },
                {
                    "icon": "coins",
                    "title": "Median Wage",
                    "number": "$18 - $22",
                    "copy": "Starting pay is between $18 - $22 depending on your state and employer.",
                },
                {
                    "icon": "calendar-check",
                    "title": "Flexible Schedules",
                    "number": "PT / FT",
                    "copy": "Full time, part time, and temping positions allows for a flexible work schedule. Not to mention most offices have evenings, weekends, and holidays off.",
                },
                {
                    "icon": "route",
                    "title": "Multiple Career Paths",
                    "number": "1 field",
                    "copy": "Being a Dental Assistant is the stepping stone into the dental field. You will explore a variety of career options the dental field has to offer.",
                },
            ],
            icon_name="briefcase",
            image=IMAGE["career_infographic"],
            image_alt="Dental assisting career infographic covering job growth, salary, and career pathways",
        )
    )
    body.append(
        gallery_section(
            [
                {
                    "title": "Photo Gallery",
                    "copy": "A few moments from the classroom, operatories, and hands-on sessions already highlighted on the academy site.",
                    "items": [
                        (IMAGE["gallery1"], "Dental Assisting program"),
                        (IMAGE["gallery2"], "Making a good first impression!"),
                        (IMAGE["gallery3"], "Everyday we're suctioning!"),
                    ],
                }
            ]
        )
    )
    body.append(contact_section())
    return layout(
        slug="",
        title="Roseville Dental Academy | Dental assisting, x-ray, CPR, and dental certification training",
        description=(
            "Roseville Dental Academy is passionate about training you to become a thriving dental assistant. "
            "Start or change your career in just 9 weeks with hands-on dental training, x-ray classes, and CPR courses."
        ),
        body="\n".join(body),
        image=IMAGE["hero"],
    )


def program_page() -> str:
    body = []
    body.append(
        hero(
            "Accelerated training",
            "Dental Assisting Program",
            "Launch a dental career in just 9 weeks with hands-on dental assisting training, small class sizes, and live-practice instruction inside Waikiki Dental.",
            IMAGE["about"],
            buttons_html=buttons(
                [
                    ("Start registration", registration_href("dental-assisting"), "button"),
                    ("Contact admissions", "/#contact", "button-secondary"),
                ]
            ),
            pills=["9 weeks", "210 hours", "Live-practice training"],
            panel_title="Program snapshot",
            panel_copy="The academy keeps class sizes small so students can learn what a dental office will expect on day one.",
            panel_items=["Hands-on experience in a live practice with real patients.", "Mondays or Fridays with one assigned externship day", "Resume and job assistance"],
        )
    )
    body.append(
        split_section(
            "Dental Assisting Training Program",
            "What the live site promises",
            [
                "Hands-on experience in a live practice with real patients.",
                "Our program is designed for students who want a shorter, more direct path into the dental field without losing the hands-on reality of chairside training.",
            ],
            image=IMAGE["team"],
            image_alt="Students working in operatory",
            secondary_title="What you can expect",
            secondary_copy=[
                "Convenient and Flexible Schedule",
                "Affordable Tuition",
                "Resume and Job Assistance",
                "Clinical Internships",
            ],
            secondary_buttons=[("Start registration", registration_href("dental-assisting"), "button-secondary")],
            icon_name="graduation",
        )
    )
    body.append(
        requirements_section(
            "What you will learn in the program!",
            "Curriculum focus",
            "The original program page lists the major clinical, laboratory, and technology competencies below.",
            [
                {
                    "icon": "clipboard-check",
                    "title": "Clinical and office foundations",
                    "items": [
                        "Describe the legal and ethical responsibilities of a dental assistant.",
                        "Demonstrate knowledge of the dental operatories, sterilization room, and laboratory.",
                        "Identify the structure of the skull including the oral cavity, dentition and clinical terminology.",
                        "Assist the doctor in charting and notes for patient records.",
                    ],
                },
                {
                    "icon": "badge-check",
                    "title": "Hands-on technical training",
                    "items": [
                        "Identify, describe, maintain and utilize dental instruments and equipment.",
                        "Identify the uses of dental materials and set up tray accordingly.",
                        "Perform chairside assisting with the doctor under the supervision of an assistant.",
                        "Take impressions and pour up stone models.",
                    ],
                },
                {
                    "icon": "scan",
                    "title": "Modern technology exposure",
                    "items": [
                        "Our office is up to date with modern technology.",
                        "Learn how to set up a same day crown procedure with the CEREC machine.",
                        "Learn how to take ACT scan.",
                        "Learn how to operate the Nomad x-ray unit.",
                    ],
                },
                {
                    "icon": "calendar-check",
                    "title": "Internship hosting and hours",
                    "items": [
                        "Internship hours are built into the 210-hour accelerated format.",
                        "Externship placement is assigned as part of the program schedule.",
                        "Students work inside an active office environment rather than a simulation-only space.",
                    ],
                },
            ],
            icon_name="book-open",
        )
    )
    body.append(
        cta_ribbon(
            "Admissions and registration",
            "The next course starts Friday, April 3rd 2026 or Monday, April 20th 2026. Reach out for current availability and registration details.",
            [
                ("Start registration", registration_href("dental-assisting"), "button"),
                ("Call admissions", "tel:9168889821", "button-secondary"),
                ("Email the academy", "mailto:rosevilledentalacademy@gmail.com", "button-secondary"),
            ],
        ).replace("<section class=\"section\">", "<section class=\"section\" id=\"admissions\">", 1)
    )
    body.append(contact_section())
    return layout(
        slug="dental-assisting-program",
        title="Dental Assisting Program | Roseville Dental Academy",
        description="Launch a dental career in just 9 weeks with Roseville Dental Academy's hands-on dental assisting program, flexible schedules, and job-focused training.",
        body="\n".join(body),
        image=IMAGE["about"],
    )


def registration_page() -> str:
    course_cards = "".join(
        dedent(
            f"""
            <label class="choice-card" data-choice-card>
              <input class="choice-input" type="checkbox" name="Interested courses[]" value="{escape(option['label'])}" data-course-key="{escape(option['key'])}" />
              {icon_badge(option['icon'], class_name="card-icon-badge")}
              <span class="choice-copy">
                <strong>{escape(option['label'])}</strong>
                <span class="choice-price">{escape(option['price'])}</span>
                <span class="choice-note">{escape(option['note'])}</span>
              </span>
            </label>
            """
        ).strip()
        for option in REGISTRATION_COURSE_OPTIONS
    )

    payment_options = "".join(
        dedent(
            f"""
            <label class="inline-option" data-inline-option>
              <input type="radio" name="Payment preference" value="{escape(value)}" required />
              <span>{escape(label)}</span>
            </label>
            """
        ).strip()
        for value, label in [
            ("Paid in full", "I plan to pay in full"),
            ("Down payment plan", "I need the $1000 down payment plan"),
            ("Request callback", "Please call me to discuss payment options"),
        ]
    )

    form = dedent(
        f"""
        <section class="section" id="registration-form">
          <div class="site-frame">
            <div class="registration-layout">
              <form
                class="form-shell registration-form"
                action="{FORMSPREE_ENDPOINT}"
                method="POST"
                data-formspree-form
              >
                <div class="section-header">
                  <div class="section-kicker">
                    {icon_badge("clipboard-check", class_name="section-icon-badge")}
                    <p class="eyebrow">Digital registration</p>
                  </div>
                  <h2 class="section-title">Start your registration request</h2>
                  <p class="section-copy">This intake keeps the structure of the academy's paper registration form while removing sensitive fields from the public web. Admissions will follow up to confirm availability, payment timing, and any student-record details that should be collected securely.</p>
                </div>

                <input type="hidden" name="_subject" value="Roseville Dental Academy registration request" />
                <input class="sr-only" type="text" name="_gotcha" tabindex="-1" autocomplete="off" />
                <input type="hidden" name="Form type" value="Digital registration request" />
                <input type="hidden" name="Page source" value="/registration/" data-form-context="page" />
                <input type="hidden" name="Referrer" value="" data-form-context="referrer" />

                <div class="form-status" data-form-status hidden tabindex="-1"></div>

                <fieldset class="form-section-block">
                  <legend>Choose the course you want to register for</legend>
                  <div class="choice-grid">
                    {course_cards}
                  </div>
                  <p class="form-error" data-course-error hidden>Please choose at least one course so admissions knows what to prepare for your follow-up.</p>
                </fieldset>

                <fieldset class="form-section-block">
                  <legend>Student information</legend>
                  <div class="form-grid">
                    <div class="field">
                      <label for="reg-name">Full name</label>
                      <input id="reg-name" name="Student name" type="text" autocomplete="name" required />
                    </div>
                    <div class="field">
                      <label for="reg-phone">Phone number</label>
                      <input id="reg-phone" name="Phone" type="tel" autocomplete="tel" required />
                    </div>
                    <div class="field">
                      <label for="reg-email">Email</label>
                      <input id="reg-email" name="Email" type="email" autocomplete="email" required />
                    </div>
                    <div class="field">
                      <label for="reg-contact-method">Preferred contact method</label>
                      <select id="reg-contact-method" name="Preferred contact method" required>
                        <option value="">Select one</option>
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="Text">Text</option>
                      </select>
                    </div>
                    <div class="field field--full">
                      <label for="reg-address">Street address</label>
                      <input id="reg-address" name="Street address" type="text" autocomplete="street-address" />
                    </div>
                    <div class="field">
                      <label for="reg-city">City</label>
                      <input id="reg-city" name="City" type="text" autocomplete="address-level2" />
                    </div>
                    <div class="field">
                      <label for="reg-state">State</label>
                      <input id="reg-state" name="State" type="text" autocomplete="address-level1" />
                    </div>
                    <div class="field">
                      <label for="reg-zip">Zip code</label>
                      <input id="reg-zip" name="Zip code" type="text" inputmode="numeric" autocomplete="postal-code" />
                    </div>
                  </div>
                </fieldset>

                <fieldset class="form-section-block">
                  <legend>Emergency contact and payment intent</legend>
                  <div class="form-grid">
                    <div class="field">
                      <label for="reg-emergency-name">Emergency contact name</label>
                      <input id="reg-emergency-name" name="Emergency contact name" type="text" autocomplete="name" />
                    </div>
                    <div class="field">
                      <label for="reg-emergency-phone">Emergency contact phone</label>
                      <input id="reg-emergency-phone" name="Emergency contact phone" type="tel" autocomplete="tel" />
                    </div>
                    <div class="field field--full">
                      <label>Payment preference</label>
                      <div class="inline-options">
                        {payment_options}
                      </div>
                    </div>
                    <div class="field">
                      <label for="reg-payment-day">Preferred payment day</label>
                      <select id="reg-payment-day" name="Preferred payment day">
                        <option value="">No preference</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                      </select>
                    </div>
                    <div class="field">
                      <label for="reg-best-time">Best time to reach you</label>
                      <input id="reg-best-time" name="Best time to reach you" type="text" placeholder="Morning, lunch, after 4pm..." />
                    </div>
                  </div>
                </fieldset>

                <fieldset class="form-section-block">
                  <legend>Anything else admissions should know?</legend>
                  <div class="form-grid">
                    <div class="field">
                      <label for="reg-hear-about">How did you hear about us?</label>
                      <input id="reg-hear-about" name="How did you hear about us?" type="text" />
                    </div>
                    <div class="field field--full">
                      <label for="reg-notes">Questions or notes</label>
                      <textarea id="reg-notes" name="Questions or notes" placeholder="Tell us which class date you're aiming for, any prerequisite questions, or anything you'd like the office to know."></textarea>
                    </div>
                  </div>
                </fieldset>

                <div class="security-note">
                  <label class="checkbox-row">
                    <input type="checkbox" name="Secure follow-up acknowledgement" value="I understand that sensitive payment and identity details will be collected separately by secure follow-up." required />
                    <span>I understand this online form should not include Social Security numbers, credit card numbers, CVV codes, or bank details. Roseville Dental Academy will collect any sensitive information separately by phone or in person.</span>
                  </label>
                </div>

                <div class="auth-actions">
                  <button class="button" type="submit" data-formspree-submit>Send registration request</button>
                  <a class="button-secondary" href="tel:9168889821">Prefer to call? 916-888-9821</a>
                </div>
              </form>

              <div class="registration-sidebar">
                <div class="card card-stack">
                  {icon_badge("route", class_name="card-icon-badge")}
                  <h3 class="card-title">What happens after you submit</h3>
                  <ul class="metric-list">
                    <li>An admissions team member reviews your request and confirms the right course route.</li>
                    <li>The academy contacts you to confirm schedule, prerequisites, and seat availability.</li>
                    <li>Any deposit or payment details are handled separately by secure follow-up.</li>
                    <li>You receive next-step guidance for class start dates, paperwork, and preparation.</li>
                  </ul>
                </div>
                <div class="card card-stack">
                  {icon_badge("book-open", class_name="card-icon-badge")}
                  <h3 class="card-title">Built from the academy's paper form</h3>
                  <p class="card-copy">The original PDF includes course selection, emergency contact details, payment intent, and referral information. This digital version keeps those useful admissions signals while removing high-risk web fields like SSN, full card number, and CVV.</p>
                </div>
                <div class="callout callout-stack">
                  {icon_badge("phone", class_name="card-icon-badge")}
                  <h3 class="callout-title">Need a faster answer?</h3>
                  <p class="callout-copy">Call the academy directly if you're trying to grab the next available seat or need help understanding prerequisites for radiation safety, infection control, or BLS.</p>
                  <div class="hero-actions">
                    <a class="button" href="tel:9168889821">Call admissions</a>
                    <a class="button-secondary" href="mailto:rosevilledentalacademy@gmail.com">Email admissions</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        """
    ).strip()

    body = []
    body.append(
        hero(
            "Admissions and registration",
            "Reserve your seat online",
            "Complete a digital registration request for Roseville Dental Academy so admissions can confirm the right course, class date, and secure payment follow-up without sending sensitive details through a public form.",
            IMAGE["admissions"],
            buttons_html=buttons(
                [
                    ("Start the form", "#registration-form", "button"),
                    ("Call admissions", "tel:9168889821", "button-secondary"),
                ]
            ),
            pills=["Formspree-powered intake", "Course preselection", "Secure payment follow-up"],
            panel_title="Before you submit",
            panel_copy="Choose your course, share the best way to reach you, and tell admissions whether you plan to pay in full or need the down payment schedule.",
            panel_items=[
                "No credit card numbers, CVV codes, or SSNs in this form",
                "One request can cover multiple course interests",
                "Admissions follows up to confirm prerequisites and seat availability",
            ],
        )
    )
    body.append(
        split_section(
            "A safer, cleaner version of the registration form",
            "Why this version is better",
            [
                "The live academy workflow relies on a downloadable PDF and offline follow-up. This new intake keeps the important admissions questions while making the first step easier on every device.",
                "Students can now register interest, choose a payment path, and share the right context from their phone or laptop without printing, scanning, or emailing paperwork.",
            ],
            image=IMAGE["hero"],
            image_alt="Roseville Dental Academy classroom team",
            secondary_title="Good to know before you submit",
            secondary_list=[
                "A $1000 minimum down payment is still the core payment-plan reference from the paper form.",
                "The office will confirm exact balance timing and class availability before final enrollment.",
                "BLS, radiation safety, and infection control interest can all be captured in the same request.",
            ],
            secondary_buttons=[("Jump to form", "#registration-form", "button-secondary")],
        )
    )
    body.append(form)
    body.append(
        cta_ribbon(
            "Want to register the old-fashioned way?",
            "You can still call the office directly if you'd rather confirm your spot, talk through prerequisites, or review the payment plan with a person before submitting anything online.",
            [
                ("Call 916-888-9821", "tel:9168889821", "button"),
                ("Email admissions", "mailto:rosevilledentalacademy@gmail.com", "button-secondary"),
            ],
        )
    )
    body.append(contact_section())
    return layout(
        slug="registration",
        title="Registration | Roseville Dental Academy",
        description="Start your Roseville Dental Academy registration online with a digital admissions intake for dental assisting, radiation safety, infection control, and BLS courses.",
        body="\n".join(body),
        image=IMAGE["admissions"],
    )


def front_office_page() -> str:
    body = []
    body.append(
        hero(
            "Administrative training",
            "Front Office Program",
            "Enroll in our Front Office Program for hands-on training in a live practice, flexible schedules, and job assistance.",
            IMAGE["admissions"],
            buttons_html=buttons(
                [
                    ("Ask about scheduling", "/#contact", "button"),
                    ("View the student portal", "/m/login/", "button-secondary"),
                ]
            ),
            pills=["40-hour internship", "Live practice", "Resume support"],
            panel_title="Program focus",
            panel_copy="Students sit alongside the front office staff to observe and practice the real systems used in a working dental office.",
            panel_items=["Dental Basics", "Dental Systems and Communication", "Insurance"],
        )
    )
    body.append(
        split_section(
            "Hands-on experience in a live practice!",
            "Front desk immersion",
            [
                "Students sit alongside the front office staff in a 40-hour internship to learn how the schedule, phone systems, and patient communication really work during the day.",
                "The program is meant to be practical and job-oriented, pairing office exposure with resume and job assistance.",
            ],
            image=IMAGE["team"],
            image_alt="Front office training",
            secondary_title="Built around core office systems",
            secondary_copy=["Convenient and Flexible Schedule", "Resume and Job Assistance"],
            icon_name="briefcase",
        )
    )
    body.append(
        feature_grid(
            "What to expect during the course!",
            "Core topics",
            "The live site outlines three broad content areas for the front office track.",
            [
                {
                    "icon": "book-open",
                    "title": "Dental Basics",
                    "copy": "Foundational office and patient-flow knowledge for working inside a dental practice.",
                },
                {
                    "icon": "users",
                    "title": "Dental Systems and Communication",
                    "copy": "Exposure to the systems and communication habits that support check-in, scheduling, and patient follow-up.",
                },
                {
                    "icon": "clipboard-check",
                    "title": "Insurance",
                    "copy": "Practical familiarity with dental insurance discussions and workflow expectations inside the front office.",
                },
            ],
            icon_name="briefcase",
        )
    )
    body.append(contact_section())
    return layout(
        slug="front-office-program",
        title="Front Office Program | Roseville Dental Academy",
        description="Enroll in our Front Office Program at Roseville Dental Academy for hands-on training, flexible schedules, and job assistance.",
        body="\n".join(body),
        image=IMAGE["admissions"],
    )


def course_page(
    *,
    slug: str,
    title: str,
    description: str,
    eyebrow: str,
    hero_title: str,
    hero_intro: str,
    hero_image: str,
    pills: list[str],
    panel_title: str,
    panel_copy: str,
    panel_items: list[str],
    info_title: str,
    info_copy: list[str],
    requirements_title: str,
    requirements_copy: str,
    requirement_groups: list[dict[str, list[str] | str]],
    registration_course: str | None = None,
) -> str:
    body = []
    hero_buttons = [("Call to register", "tel:9168889821", "button")]
    if registration_course:
        hero_buttons.append(("Start registration", registration_href(registration_course), "button-secondary"))
    else:
        hero_buttons.append(("Email the academy", "mailto:rosevilledentalacademy@gmail.com", "button-secondary"))

    secondary_buttons = [("Call now", "tel:9168889821", "button")]
    if registration_course:
        secondary_buttons.append(("Start registration", registration_href(registration_course), "button-secondary"))

    cta_buttons = [("916-888-9821", "tel:9168889821", "button")]
    if registration_course:
        cta_buttons.append(("Start registration", registration_href(registration_course), "button-secondary"))
    else:
        cta_buttons.append(("rosevilledentalacademy@gmail.com", "mailto:rosevilledentalacademy@gmail.com", "button-secondary"))

    body.append(
        hero(
            eyebrow,
            hero_title,
            hero_intro,
            hero_image,
            buttons_html=buttons(hero_buttons),
            pills=pills,
            panel_title=panel_title,
            panel_copy=panel_copy,
            panel_items=panel_items,
        )
    )
    body.append(
        split_section(
            info_title,
            "Additional information",
            info_copy,
            image=hero_image,
            image_alt=hero_title,
            secondary_title="Registration",
            secondary_copy=[
                "Please call 916-888-9821 for registration and scheduling.",
                "Due to limited space all sales are final and no refunds will be issued.",
            ],
            secondary_buttons=secondary_buttons,
            icon_name="clipboard-check",
        )
    )
    body.append(
        requirements_section(
            requirements_title,
            "Requirements and expectations",
            requirements_copy,
            requirement_groups,
            icon_name="shield",
        )
    )
    body.append(
        cta_ribbon(
            "Ready to reserve a seat?",
            "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
            cta_buttons,
        )
    )
    body.append(contact_section())
    return layout(slug=slug, title=title, description=description, body="\n".join(body), image=hero_image)


def faq_page() -> str:
    faq_items = [
        ("What is included in the dental assisting training program?", "The program is built around hands-on dental assisting training, live-practice exposure, class work, clinical time, and homework inside an accelerated format."),
        ("Is your x-ray course board approved?", "Yes. The academy presents the Radiation Safety course as California Dental Board aligned and uses provider number X1036 on the live site."),
        ("Is your infection control course board approved?", "Yes. The academy lists the 8-hour Infection Control course with provider number IC189 and positions it as a California Dental Board requirement effective January 1, 2025."),
        ("Do you accept financial aid?", "The live FAQ page explains that the academy does not offer traditional financial aid, but it does emphasize offering a more affordable and accelerated alternative to longer college programs."),
        ("How much does a Dental Assistant make?", "The site states that starting pay is between $18 - $22 depending on your state and employer."),
        ("What distinguishes your program from the conventional college program?", "The academy focuses on a shorter, accelerated path with hands-on training in a live office rather than a longer, more expensive traditional college path."),
        ("What is an accelerated program?", "The academy frames accelerated training as a more direct route into the field, concentrating practical skills and job-ready instruction into a shorter timeline."),
        ("How can a short program be as effective as a longer program?", "The site emphasizes smaller class sizes, focused hands-on instruction, and teaching students exactly what the office staff expects them to know."),
        ("What should I do if I lose my certificate?", "Reach out to the academy directly so they can help you with replacement certificate guidance."),
    ]
    body = []
    body.append(
        hero(
            "Program questions",
            "Frequently Asked Questions",
            "The live academy site shares a tight set of recurring questions about the dental assisting track, board approvals, pay expectations, and what makes the program different.",
            IMAGE["team"],
            buttons_html=buttons(
                [
                    ("Call the academy", "tel:9168889821", "button"),
                    ("Contact us", "/#contact", "button-secondary"),
                ]
            ),
            pills=["Accelerated format", "Hands-on training", "Career support"],
            panel_title="From the live FAQ page",
            panel_copy="Roseville Dental Academy offers an accelerated program for those seeking comprehensive dental assisting training.",
            panel_items=[
                "Hands-on training",
                "Quick employment opportunities",
                "Various options to help students pursue their education without financial barriers",
            ],
        )
    )
    body.append(faq_section(faq_items))
    body.append(contact_section())
    return layout(
        slug="faqs-1",
        title="Dental Assisting Program FAQs | Roseville Dental Academy",
        description="Enroll in our dental assisting program for hands-on training and quick employment opportunities.",
        body="\n".join(body),
        image=IMAGE["team"],
    )


def instructors_page() -> str:
    body = []
    body.append(
        hero(
            "Meet the Instructors",
            "Welcome",
            "There's much to see here. So, take your time, look around, and learn all there is to know about us. We hope you enjoy our site and take a moment to drop us a line.",
            IMAGE["team"],
            buttons_html=buttons([("Find out more", "/#contact", "button")]),
            pills=["Hands-on training", "Small class sizes", "Real office setting"],
            panel_title="Teaching environment",
            panel_copy="The academy's instruction is grounded in a working practice, with an emphasis on practical readiness and close instructor support.",
            panel_items=["Dental assisting", "Clinical certifications", "Career transitions"],
        )
    )
    body.append(
        feature_grid(
            "What shapes the instruction here",
            "A better way to scan the page",
            "The original page is intentionally sparse. This refreshed version keeps the same simple welcome message while giving visitors more structure around what the academy values.",
            [
                {
                    "icon": "badge-check",
                    "title": "Hands-on first",
                    "copy": "Training is delivered in a working office environment so students build habits that match real patient care and day-to-day operations.",
                },
                {
                    "icon": "users",
                    "title": "Smaller classroom feel",
                    "copy": "The academy keeps groups smaller to improve teacher-to-student focus and make skills coaching more direct.",
                },
                {
                    "icon": "briefcase",
                    "title": "Practical outcomes",
                    "copy": "Every page of the live site reinforces the same mission: set students up for success by teaching the skills dental offices expect.",
                },
            ],
            icon_name="user-star",
        )
    )
    body.append(contact_section())
    return layout(
        slug="meet-the-instructors",
        title="Meet the Instructors | Roseville Dental Academy",
        description="Meet the experienced instructors behind Roseville Dental Academy's hands-on dental assisting and certification programs.",
        body="\n".join(body),
        image=IMAGE["team"],
    )


def photos_page() -> str:
    body = []
    body.append(
        hero(
            "Student moments",
            "Photo Gallery",
            "Browse classroom, lab, and student photos from Roseville Dental Academy's hands-on dental assisting and certification training programs.",
            IMAGE["gallery1"],
            buttons_html=buttons(
                [
                    ("Call for class details", "tel:9168889821", "button"),
                    ("View programs", "/dental-assisting-program/", "button-secondary"),
                ]
            ),
            pills=["Dental Assisting program", "Xrays", "BLS"],
            panel_title="Gallery themes from the live site",
            panel_copy="The current site groups its images around program training, x-rays, suctioning, first impressions, and BLS instruction.",
            panel_items=["Dental Assisting program", "Xrays", "Making a good first impression!", "Everyday we're suctioning!", "BLS"],
        )
    )
    body.append(
        gallery_section(
            [
                {
                    "title": "Dental Assisting program",
                    "copy": "Hands-on chairside practice, instrument setup, and office-based learning moments.",
                    "items": [
                        (IMAGE["gallery1"], "Dental Assisting program"),
                        (IMAGE["gallery2"], "Dental Assisting program"),
                        (IMAGE["gallery3"], "Dental Assisting program"),
                    ],
                },
                {
                    "title": "Xrays",
                    "copy": "Images that reflect radiography practice and the patient positioning part of training.",
                    "items": [
                        (IMAGE["gallery4"], "Xrays"),
                        (IMAGE["gallery5"], "Xrays"),
                        (IMAGE["gallery6"], "Xrays"),
                    ],
                },
                {
                    "title": "Making a good first impression!",
                    "copy": "A few moments that spotlight professionalism, patient interaction, and the basics of working in a dental setting.",
                    "items": [
                        (IMAGE["gallery7"], "Making a good first impression!"),
                        (IMAGE["gallery8"], "Making a good first impression!"),
                        (IMAGE["gallery9"], "Making a good first impression!"),
                    ],
                },
                {
                    "title": "Everyday we're suctioning!",
                    "copy": "Routine assisting motions and real training moments inside the operatory.",
                    "items": [
                        (IMAGE["gallery10"], "Everyday we're suctioning!"),
                        (IMAGE["gallery11"], "Everyday we're suctioning!"),
                        (IMAGE["gallery12"], "Everyday we're suctioning!"),
                    ],
                },
            ]
        )
    )
    body.append(contact_section())
    return layout(
        slug="photos",
        title="Classroom and Student Photos | Roseville Dental Academy",
        description="Browse classroom, lab, and student photos from Roseville Dental Academy's hands-on dental assisting and certification training programs.",
        body="\n".join(body),
        image=IMAGE["gallery1"],
    )


def auth_page(
    *,
    slug: str,
    title: str,
    description: str,
    hero_title: str,
    hero_intro: str,
    card_title: str,
    card_copy: str,
    fields: list[tuple[str, str, str]],
    note: str,
    actions: list[tuple[str, str, str]],
    support_title: str,
    support_copy: list[str],
    pills: list[str],
    noindex: bool = True,
) -> str:
    field_html = "".join(
        f"""
        <div class="field{' field--full' if field_type == 'textarea' else ''}">
          <label for="{escape(field_id)}">{escape(label)}</label>
          {'<textarea' if field_type == 'textarea' else '<input'}
            id="{escape(field_id)}"
            name="{escape(label)}"
            {'type="' + escape(field_type) + '"' if field_type != 'textarea' else ''}
            data-label="{escape(label)}"
          {'></textarea>' if field_type == 'textarea' else ' />'}
        </div>
        """
        for field_id, label, field_type in fields
    )
    buttons_html = "".join(
        f"<a class=\"{escape(cls)}\" href=\"{escape(href)}\">{escape(label)}</a>"
        for label, href, cls in actions
    )
    body = dedent(
        f"""
        {hero(
            "Student portal",
            hero_title,
            hero_intro,
            IMAGE["hero"],
            buttons_html=buttons(actions),
            pills=pills,
            panel_title="Portal access",
            panel_copy="These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
            panel_items=["Account sign in", "Create account", "Reset password"],
        )}
        <section class="section">
          <div class="site-frame auth-shell">
            <div class="auth-card">
              <h2 class="auth-title">{escape(support_title)}</h2>
              {paragraph_block(support_copy, "auth-copy")}
              <div class="detail-list">
                <span class="detail-pill">Phone: {escape(CONTACT['phone'])}</span>
                <span class="detail-pill">Email: {escape(CONTACT['email'])}</span>
              </div>
            </div>
            <form class="auth-card auth-form" data-static-form>
              <h2 class="auth-title">{escape(card_title)}</h2>
              {paragraph(card_copy, "auth-copy")}
              <div class="form-grid">{field_html}</div>
              <p class="field-note">{escape(note)}</p>
              <div class="auth-actions">{buttons_html}</div>
            </form>
          </div>
        </section>
        {contact_section()}
        """
    ).strip()
    return layout(slug=slug, title=title, description=description, body=body, image=IMAGE["hero"], noindex=noindex)


def resume_portal_page() -> str:
    body = []
    body.append(
        hero(
            "DR / OMS only",
            "Resume Portal",
            "Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
            IMAGE["hero"],
            buttons_html=buttons(
                [
                    ("Sign in", "/m/login/", "button"),
                    ("Create account", "/m/create-account/", "button-secondary"),
                ]
            ),
            pills=["Private access", "Account history", "Profile updates"],
            panel_title="Portal routes on the live site",
            panel_copy="The current public route leads visitors into the academy's membership experience.",
            panel_items=["Account sign in", "Reset password", "Create account"],
        )
    )
    body.append(
        feature_grid(
            "Access overview",
            "What lives behind the sign-in",
            "This route behaves like a portal entry point on the live site. The refreshed version keeps the route and copy intact while making it easier to understand where each account action belongs.",
            [
                {
                    "title": "Account sign in",
                    "copy": "Sign in to access your profile, history, and any private pages you've been granted access to.",
                    "href": "/m/login/",
                    "cta": "Open sign in",
                },
                {
                    "title": "Create account",
                    "copy": "Create an academy account if you're new to the portal and need private access.",
                    "href": "/m/create-account/",
                    "cta": "Create account",
                },
                {
                    "title": "Reset password",
                    "copy": "Use the reset route whenever you need to set or recover your account password.",
                    "href": "/m/reset/",
                    "cta": "Reset password",
                },
            ],
        )
    )
    body.append(contact_section())
    return layout(
        slug="resume-portal-dr-oms-only",
        title="Resume Portal DR/OMS only | Roseville Dental Academy",
        description="Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
        body="\n".join(body),
        image=IMAGE["hero"],
        noindex=True,
    )


def sitemap_xml() -> str:
    nodes = "".join(
        f"<url><loc>{escape(canonical_url(slug))}</loc></url>"
        for slug in PUBLIC_SITEMAP_ROUTES
    )
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
        f"{nodes}</urlset>\n"
    )


def robots_txt() -> str:
    return dedent(
        f"""
        User-agent: *
        Allow: /

        Sitemap: {SITE_URL}/sitemap.xml
        """
    ).lstrip()


PAGES = {
    "": homepage,
    "registration": registration_page,
    "dental-assisting-program": program_page,
    "front-office-program": front_office_page,
    "faqs-1": faq_page,
    "meet-the-instructors": instructors_page,
    "photos": photos_page,
    "resume-portal-dr-oms-only": resume_portal_page,
    "bls-cpr-1": lambda: course_page(
        slug="bls-cpr-1",
        title="BLS CPR Training for Healthcare Providers | Roseville Dental Academy",
        description="Enroll in our BLS CPR training for healthcare providers and earn your American Heart Association BLS certification today!",
        eyebrow="Stand-alone course",
        hero_title="BLS CPR Training for Healthcare Providers",
        hero_intro="American Heart Association BLS training for healthcare professionals and other personnel who need to perform CPR and basic cardiovascular life support skills.",
        hero_image=IMAGE["bls"],
        pills=["$85", "AHA-aligned", "Healthcare providers"],
        panel_title="Course requirements",
        panel_copy="This course blends home study with an instructor-led evaluation and requires a passing written exam.",
        panel_items=["High-quality CPR for adults, children, and infants", "Early AED use", "Barrier-device ventilations"],
        info_title="Instructor-led Training",
        info_copy=[
            "The AHA BLS course is designed for healthcare professionals and other personnel who need to know how to perform CPR and other basic cardiovascular life support skills in a wide variety of in-facility and prehospital settings.",
            "The course teaches both single-rescuer and team basic life support skills for application in prehospital and in-facility environments, with special attention to adult, child, and infant care.",
            "Dental Board Requirements: BLS certification must be accepted by the California Dental Board. Skills must be completed in person and students must pass the written exam with a score above 84%.",
            "Payment options: Credit Card through a Quickbooks email link, Venmo, Apple Pay. There is no online payment option, please call the office.",
        ],
        requirements_title="What you need to complete",
        requirements_copy="The live course page breaks the BLS route into performance competencies, state-board expectations, and practical payment guidance.",
        requirement_groups=[
            {
                "title": "Skills and competencies",
                "items": [
                    "High-quality CPR for adults, children, and infants",
                    "The AHA Chain of Survival, specifically the BLS components",
                    "Important early use of an AED",
                    "Effective ventilations using a barrier device",
                    "Importance of teams in multirescuer resuscitation and performance as an effective team member during multirescuer CPR",
                    "Relief of foreign-body airway obstruction (choking) for adults and infants",
                ],
            },
            {
                "title": "Testing and board guidance",
                "items": [
                    "Pass a written exam with a score above 84%",
                    "Bring proof of online course completion to your skills evaluation",
                    "Use a provider accepted by the California Dental Board",
                ],
            },
        ],
        registration_course="bls-cpr",
    ),
    "infection-control": lambda: course_page(
        slug="infection-control",
        title="Infection Control Certification | Roseville Dental Academy",
        description="Complete your Infection Control certification with practical training that helps California dental professionals meet state requirements.",
        eyebrow="Stand-alone course",
        hero_title="8-Hour Infection Control Course",
        hero_intro="Complete your Infection Control certification with a course built to support California dental professionals and students who need current compliance training.",
        hero_image=IMAGE["infection"],
        pills=["$395", "Provider number IC189", "8 hours"],
        panel_title="Prerequisite",
        panel_copy="BLS Certification AHA or ARC required. Ask us about BLS requirements.",
        panel_items=["Current CPR BLS certification", "2-hour Dental Practice Act certification", "Scrubs and closed-toe footwear"],
        info_title="Additional Information",
        info_copy=[
            "The California Dental Board requires an 8-hour infection control course for those seeking qualifying certifications, effective January 1, 2025. The academy lists provider number IC189 on the live course page.",
            "Students should arrive prepared for both didactic and practical work and should review prerequisite documents before contacting the office to register.",
        ],
        requirements_title="Student and course requirements",
        requirements_copy="The live page organizes this course around the prerequisite certifications students need to bring and the work they must complete to pass.",
        requirement_groups=[
            {
                "title": "Student requirements",
                "items": [
                    "Current CPR BLS certification (AHA or ARC)",
                    "2-hour Dental Practice Act certification",
                    "Scrubs",
                    "No open-toed footwear",
                ],
            },
            {
                "title": "Course requirements",
                "items": [
                    "Complete all precourse work prior to the start of the course",
                    "Complete all competencies of the course with passing scores",
                    "Pass a written exam (above 70%)",
                ],
            },
        ],
        registration_course="infection-control",
    ),
    "radiation-safety": lambda: course_page(
        slug="radiation-safety",
        title="Radiation Safety Course for Dental Professionals | Roseville Dental Academy",
        description="Enroll in our Radiation Safety Course to meet California Dental Board standards and achieve radiation safety certification.",
        eyebrow="Stand-alone course",
        hero_title="Radiation Safety Course",
        hero_intro="Meet California Dental Board standards with a radiation safety course that covers x-ray safety, digital imaging, and required clinical evaluation.",
        hero_image=IMAGE["radiation"],
        pills=["$695", "Provider number X1036", "32 hours"],
        panel_title="Prerequisites",
        panel_copy="Students need current BLS, current 8-Hour Infection Control, and current Dental Practice Act certification before registration.",
        panel_items=["Must not be pregnant", "Knowledge of dentition", "Scrubs and closed-toe footwear"],
        info_title="Additional Information",
        info_copy=[
            "The live course page lists provider number X1036 and describes a 32-hour course focused on radiation safety, digital imaging, and evaluation.",
            "Students should be ready for both didactic work and clinical patient requirements. The academy notes that it does not provide patients for this course.",
        ],
        requirements_title="Radiation safety requirements",
        requirements_copy="This route includes both student preparation and patient criteria that must be satisfied before final completion.",
        requirement_groups=[
            {
                "title": "Student requirements",
                "items": [
                    "Must not be pregnant",
                    "Current CPR BLS certification",
                    "Current 8-Hour Infection Control Certification",
                    "Current Dental Practice Act Certification",
                    "Knowledge of dentition",
                    "Scrubs and no open-toed footwear",
                ],
            },
            {
                "title": "Course requirements",
                "items": [
                    "Complete all precourse work prior to the start of the course",
                    "Take two full mouth x-rays on a manikin",
                    "Pass a written exam above 75%",
                    "Take four sets of full mouth x-rays on human patients",
                    "Submit all necessary forms and documentation",
                ],
            },
            {
                "title": "Patient requirements",
                "copy": "The academy does not provide patients.",
                "items": [
                    "At least 18 years old",
                    "Capable of informed consent",
                    "Not pregnant",
                    "Minimum 26 teeth present / no more than 6 missing teeth",
                ],
            },
        ],
        registration_course="radiation-safety",
    ),
    "coronal-polish": lambda: course_page(
        slug="coronal-polish",
        title="Coronal Polish | Roseville Dental Academy",
        description="Train in coronal polishing with practical instruction designed for California dental professionals and dental assistants.",
        eyebrow="Stand-alone course",
        hero_title="Coronal Polish Course",
        hero_intro="Complete coronal polishing training with a short-format course built around California dental certification requirements and clinical competencies.",
        hero_image=IMAGE["coronal"],
        pills=["$500", "Provider number CP148", "12 hours"],
        panel_title="Prerequisites",
        panel_copy="Current BLS, current 8-Hour Infection Control, and current Dental Practice Act certification are required before registration.",
        panel_items=["3 manikin coronal polishes", "Written exam above 75%", "3 human patients"],
        info_title="Additional Information",
        info_copy=[
            "The academy lists provider number CP148 and describes a 12-hour course combining didactic, lab, and clinical instruction.",
            "The academy does not provide patients for the course, so students should prepare their own eligible patients in advance.",
        ],
        requirements_title="Coronal polish requirements",
        requirements_copy="The live page separates student prerequisites, course completion criteria, and patient eligibility into clearly defined groups.",
        requirement_groups=[
            {
                "title": "Student requirements",
                "items": [
                    "Current CPR BLS certification",
                    "Current 8-Hour Infection Control Certification",
                    "Current Dental Practice Act Certification",
                    "Scrubs and no open-toed footwear",
                ],
            },
            {
                "title": "Course requirements",
                "items": [
                    "Complete all precourse work prior to the start of the course",
                    "Complete three coronal polishes on a manikin",
                    "Pass a written exam above 75%",
                    "Complete coronal polish on three human patients",
                ],
            },
            {
                "title": "Patient requirements",
                "copy": "The academy does not provide patients.",
                "items": [
                    "At least 18 years old",
                    "No more than 6 missing teeth / minimum 26 teeth present",
                    "Calculus free",
                    "Not in orthodontic appliances unless removable",
                ],
            },
        ],
    ),
    "sealants": lambda: course_page(
        slug="sealants",
        title="Pit and Fissure Sealants Certification | Roseville Dental Academy",
        description="Train in pit and fissure sealants with practical instruction built for California dental professionals and dental assistants.",
        eyebrow="Stand-alone course",
        hero_title="Pit and Fissure Sealants",
        hero_intro="Train in pit and fissure sealants with a California-focused course for dental professionals, RDA renewal, and clinical skill development.",
        hero_image=IMAGE["sealants"],
        pills=["$550", "Provider number PF186", "16 hours"],
        panel_title="Prerequisites",
        panel_copy="Students need current BLS, Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish certifications, unless they already hold a current RDA license with BLS proof.",
        panel_items=["4 quadrants on a manikin", "Written exam above 75%", "4 clinical patients"],
        info_title="Additional Information",
        info_copy=[
            "The academy lists provider number PF186 and describes a 16-hour course with didactic, lab, and clinical components.",
            "This course supports students pursuing pit and fissure sealant certification and those meeting current RDA renewal-related expectations.",
            "The academy does not provide patients for this course.",
        ],
        requirements_title="Sealants requirements",
        requirements_copy="The live page makes the prerequisite chain especially clear on this route, then outlines the manikin work and patient standards needed for completion.",
        requirement_groups=[
            {
                "title": "Student requirements",
                "items": [
                    "Current BLS certification",
                    "Current 8-Hour Infection Control certification",
                    "Current Dental Practice Act certification",
                    "Current Radiation Safety certification",
                    "Current Coronal Polish certification",
                    "OR current RDA license with proof of BLS",
                ],
            },
            {
                "title": "Course requirements",
                "items": [
                    "Complete all precourse work prior to the start of the course",
                    "Apply sealants in all 4 quadrants on a manikin",
                    "Pass a written exam above 75%",
                    "Complete sealants on four clinical patients",
                    "Each patient must present at least four teeth, one in each quadrant",
                    "Submit all required documentation",
                ],
            },
            {
                "title": "Patient requirements",
                "copy": "The academy does not provide patients.",
                "items": [
                    "At least 18 years old",
                    "Capable of informed consent",
                    "No restorations on the tooth selected",
                    "No cavities or demineralization",
                ],
            },
        ],
    ),
    "m/login": lambda: auth_page(
        slug="m/login",
        title="Student Login | Roseville Dental Academy",
        description="Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
        hero_title="Account sign in",
        hero_intro="Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
        card_title="Sign in",
        card_copy="Use the same academy account routes as the live site.",
        fields=[("login-email", "Email", "email"), ("login-password", "Password", "password")],
        note="Reset password if you need to recover access. Not a member? Create account.",
        actions=[("Sign in", "#", "button"), ("Reset password", "/m/reset/", "button-secondary"), ("Create account", "/m/create-account/", "button-secondary")],
        support_title="Student portal access",
        support_copy=[
            "This route mirrors the live portal entry point for private pages, bookings, and account history.",
            "If you do not have access yet, create an account first or contact the academy.",
        ],
        pills=["Profile access", "Bookings", "Private pages"],
    ),
    "m/create-account": lambda: auth_page(
        slug="m/create-account",
        title="Create Account | Roseville Dental Academy",
        description="Create a Roseville Dental Academy student account to manage classes, bookings, and portal access.",
        hero_title="Create account",
        hero_intro="Create a Roseville Dental Academy account to manage classes, bookings, and portal access.",
        card_title="Create your account",
        card_copy="By creating an account, you may receive newsletters or promotions.",
        fields=[("create-name", "Full name", "text"), ("create-email", "Email", "email"), ("create-password", "Password", "password")],
        note="Already have an account? Sign in. This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.",
        actions=[("Create account", "#", "button"), ("Already have an account? Sign in", "/m/login/", "button-secondary")],
        support_title="Why create an account?",
        support_copy=[
            "Use an account to move between the public site and the academy's private membership routes.",
            "The live site also uses this route to support portal access and future promotions.",
        ],
        pills=["Create account", "Portal access", "Promotions"],
    ),
    "m/create": lambda: auth_page(
        slug="m/create",
        title="Set your password | Roseville Dental Academy",
        description="Set your password for your Roseville Dental Academy account.",
        hero_title="Set your password",
        hero_intro="You're signing in for the first time, so you need to set a password.",
        card_title="Set password",
        card_copy="Create a password for your Roseville Dental Academy account before signing in.",
        fields=[("set-password", "New password", "password"), ("set-password-confirm", "Confirm password", "password")],
        note="After setting your password, return to the sign-in route to access your account.",
        actions=[("Set password", "#", "button"), ("Back to sign in", "/m/login/", "button-secondary")],
        support_title="First-time portal access",
        support_copy=[
            "The live site uses this route when a student or portal user is signing in for the first time.",
            "If you reached this page by mistake, head back to the login route or contact the academy for help.",
        ],
        pills=["First-time login", "Password setup", "Portal access"],
    ),
    "m/reset": lambda: auth_page(
        slug="m/reset",
        title="Reset your password | Roseville Dental Academy",
        description="Reset your password for your Roseville Dental Academy account.",
        hero_title="Reset your password",
        hero_intro="Reset your password for your Roseville Dental Academy account.",
        card_title="Reset password",
        card_copy="Enter the account email you use with the academy portal.",
        fields=[("reset-email", "Email", "email")],
        note="Set password after you receive reset guidance.",
        actions=[("Reset password", "#", "button"), ("Set password", "/m/create/", "button-secondary"), ("Back to sign in", "/m/login/", "button-secondary")],
        support_title="Need help recovering access?",
        support_copy=[
            "The live site keeps this route simple: reset your password, then return to sign in.",
            "If you still have trouble, contact the academy directly for account support.",
        ],
        pills=["Password recovery", "Email reset", "Portal access"],
    ),
    "m/bookings": lambda: auth_page(
        slug="m/bookings",
        title="Bookings | Roseville Dental Academy",
        description="Access your Roseville Dental Academy bookings and account information.",
        hero_title="Bookings",
        hero_intro="Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
        card_title="Bookings access",
        card_copy="This route requires an academy account before bookings become visible.",
        fields=[("bookings-email", "Email", "email"), ("bookings-password", "Password", "password")],
        note="Sign in first to view or manage your bookings.",
        actions=[("Sign in", "/m/login/", "button"), ("Create account", "/m/create-account/", "button-secondary")],
        support_title="Private route",
        support_copy=[
            "The public live site points unauthenticated visitors back into the same account sign-in experience on this route.",
            "Use the portal first, then return here once access has been granted.",
        ],
        pills=["Bookings", "Private pages", "Sign in required"],
    ),
    "m/account": lambda: auth_page(
        slug="m/account",
        title="My Account | Roseville Dental Academy",
        description="Access your Roseville Dental Academy account information and private pages.",
        hero_title="My Account",
        hero_intro="Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
        card_title="Account access",
        card_copy="Use your academy credentials to open profile and history details.",
        fields=[("account-email", "Email", "email"), ("account-password", "Password", "password")],
        note="Not a member? Create account.",
        actions=[("Sign in", "/m/login/", "button"), ("Create account", "/m/create-account/", "button-secondary")],
        support_title="Account overview",
        support_copy=[
            "The live account route behaves like a protected page and sends visitors through the same sign-in flow.",
            "Once access is granted, this route is where profile and history details live.",
        ],
        pills=["Profile", "History", "Private pages"],
    ),
}


def build() -> None:
    for slug, builder in PAGES.items():
        target = page_file(slug)
        ensure_parent(target)
        target.write_text(builder(), encoding="utf-8")

    for slug in ALL_ROUTES:
        if not slug:
            continue
        wrapper = wrapper_file(slug)
        ensure_parent(wrapper)
        wrapper.write_text(redirect_wrapper(slug), encoding="utf-8")

    (ROOT / "sitemap.xml").write_text(sitemap_xml(), encoding="utf-8")
    (ROOT / "robots.txt").write_text(robots_txt(), encoding="utf-8")


if __name__ == "__main__":
    build()
