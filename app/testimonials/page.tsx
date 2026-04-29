"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Types
interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  date?: string;
}

// ALL TESTIMONIALS - Complete list from your data
const allTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Dr. Muritala Oluwaseun Grace",
    role: "MDCN Candidate 2024",
    content: "Wow… where do I even begin? First of all, I thank God for using you to bless me. You may not realize it, but God truly worked through you for my sake. I don't know about others, but the impact you had on me is something I can never forget. So today, right in this moment, I want to say a big thank you, Dr. Livinus, for your support and for the discount you gave me lol. Even though I wasn't following the lectures as much as I should, that website of yours was my everyday padi. And remember when I told you I would make you proud by passing this exam by God's grace? God did it. Thank you so much, Doc. If you must know, this last exam was the toughest I've ever written since I started taking this exam. Yes, you may not know how many times I've attempted it, but through it all, it ended in praise. Thank you again for everything. Keep up the good work, and I pray that God will continue to bless you immensely, lift you higher, and guide your steps always. 🙏🏻",
    date: "December 2024"
  },
  {
    id: 2,
    name: "Dr. Ivy",
    role: "MDCN Candidate",
    content: "Three things were involved in this exam: God, preparation, and belief in myself. The God factor was definitely at work here, and the help of Acemedix with the preparation sealed it. I was an online candidate, so I had to work extra hard to stay motivated and get enough practice. The website, the classes, the mocks, the ISS, the encouragement, and the sacrifices are all worthy of recognition and applause. I truly appreciate each and every one of you. If you're reading this and wondering whether Acemedix is the right academy to join — it definitely is. And if you're wondering whether you can succeed as an online student —you can. I'm living proof.",
    date: "November 2024"
  },
  {
    id: 3,
    name: "Fatoke Abel Afolabi",
    role: "MDCN Candidate",
    content: "With profound gratitude to God Almighty, my beloved family, and friends for their unwavering support, I express my sincere appreciation to Acemedix Academy for their instrumental role in my successful preparation for the MDCN exam. Initially, I felt apprehensive about the MDCN's structure, but Acemedix Academy's exceptional tutorial program, characterized by its structured teaching methodology, dedicated and highly qualified tutors, and consistent encouragement, proved invaluable. Their commitment to student success significantly impacted my performance. The academy's comprehensive approach addressed my initial anxieties and equipped me with the knowledge and confidence needed to excel. I wholeheartedly recommend Acemedix Academy to all aspiring MDCN candidates. May God bless you all abundantly.",
    date: "October 2024"
  },
  {
    id: 4,
    name: "Dr. Akinola",
    role: "MDCN Candidate",
    content: "Firstly am deeply grateful to God Almighty also to Acemedix academy for their invaluable support in my preparation for the MDCN exam. Their structured teaching, dedicated tutors, and constant encouragement played a significant role in my success. I highly recommend them to anyone preparing for the MDCN.",
    date: "September 2024"
  },
  {
    id: 5,
    name: "Dr. Ogunmodede Aduramigba Mary",
    role: "MDCN Candidate",
    content: "Super thankful for the just-concluded June 2025 MDCN exam. It ended in praise. Just so you know, OSCE is not the problem in this exam. If you can master it well and stay confident, you're good to go. (That said, don't neglect it. It's a very important part of the exam.) But you see that MCQ? Please, sleep on the Acemedix website. Do as many questions as you can daily and aim to go through some of them at least twice before the exam. Focus on MDCN recalls, quizzes, picture tests, the randomizer, and Q-topics. Also, the clinchers and osce recall. They help a lot. Please, don't cram. Master the questions, understand the reasoning, learn key points, and use Google or ChatGPT to break down anything you don't understand. I'm so glad to have met amazing people on this journey. I remember the first week of class in Abuja, Dr. Ceecee made the class so fun and told us to 'just breathe.' And truly, it all ended in praise. If you can, I strongly recommend attending classes physically. Join study groups, maximize your time, and most importantly, don't forget God. Please pray very well. Studying for the MDCN exam is draining, but give it your all. Also, make sure you rest well…at least 3 to 4 days before the exam. I'm rooting for you all. Congratulations in advance!",
    date: "August 2024"
  },
  {
    id: 6,
    name: "Dr. Umoh Joy",
    role: "MDCN Candidate",
    content: "I knew I wanted to write the MDCN exam November last year but didn't know the areas of concentration and how to go about the studying until a friend recommended Acemedix. With Acemedix, I had access to their website which had past questions, I learnt how to clerk and counsel, I became more confident in my answers and I met new and old friends. Super super grateful for the gift of Acemedix. 🌟🌟🌟🌟🌟",
    date: "July 2024"
  },
  {
    id: 7,
    name: "Dr. Abubakar U.A",
    role: "MDCN Candidate",
    content: "I graduated from medical school exactly a year ago and returned to Nigeria without prior knowledge of the MDCN exam. A friend recommended Acemedix, and I am immensely grateful for joining. Acemedix has significantly aided me in answering my questions and has helped me find some truly wonderful friends whom I will never forget. Thank you, Doctor Livinus, and thank you, Acemedix.",
    date: "June 2024"
  },
  {
    id: 8,
    name: "Zainab Yunus Lawal",
    role: "MDCN Candidate",
    content: "Endless gratitude to Allah, the Most Merciful, for guiding me through every step of this journey. To my beloved parents and sisters — your prayers, unwavering love, and belief in me were the anchor I needed. You were my strength on the hardest days, and I truly owe this success to you. To my incredible friends and the ISS group that became family — you made a difficult journey lighter, and I'm deeply grateful to have shared it with you. And now, a massive shoutout to Acemedix — an absolute game-changer! This platform went far beyond tutorials. It took what once felt overwhelming and broke it down into ease and clarity. Thank you Dr. Dozie, Mrs. Marvis, and all our amazing tutors for your dedication and support. Onwards to greater victories, in shaa Allah.",
    date: "May 2024"
  },
  {
    id: 9,
    name: "Dr. Abiade Odeleye",
    role: "MDCN Candidate",
    content: "Passing the MDCN exam has been one of the most fulfilling milestones of my medical journey and I owe immense gratitude first and foremost to God for the strength, clarity and perseverance in reaching this point. I would also like to extend my appreciation to the entire team at Acemedix academy. Their structured curriculum, highly knowledgeable tutors and deeply supportive learning environment provided us with the clarity and direction we needed throughout our preparation. They thoughtfully broke down complex concepts and reinforced our knowledge in a way that built both competence and confidence. Equally invaluable was the sense of community fostered through their platform particularly that of my study group mates and accountability partner. Their encouragement, shared insights, laughter and concerns made the journey less isolating and helped keep motivation. Thank you for being an essential part of my journey. I wholeheartedly recommend the academy to any aspiring doctor preparing for the exam.",
    date: "April 2024"
  },
  {
    id: 10,
    name: "Dr. ABIOYE Aderinola Halimat",
    role: "MDCN Candidate",
    content: "I want to thank Almighty Allah for all he has done and the many more he will do in my life. I didn't plan on writing this exam initially and wanted to focus on other things, but my family convinced me to take the exam, and I am glad I followed their counsel. I am very grateful to my lovely parents and my amazing siblings, They have been my support and backbone before, throughout the process and beyond. I would also like to express my appreciation to the staff of Alpha Specialist Hospital for the knowledge they imparted to me and the constant checkups and support, Dr. Duke, every tutor and all my friends who were there for me in any way during my preparation for this exam. Your support and love means a lot to me. I have met some fantastic and brilliant doctors who started during ISS and progressed to a study group. We met almost daily for group discussions, and we have become a family! To the candidates who couldn't make the list, I am cheering you on, and I pray and hope you make that list soon. We will all be waiting to celebrate your victory! To those contemplating taking the exam or considering which tutorial to join, take the exam and choose AceMedix! You'll thank me later. AceMedix gave me the foundation I needed to build on. It gave me structure I didn't know I needed to ace this exam and a sense of community with my fellow doctors who shared a common goal with me. It stretched me in ways I didn't know, and even made me love medicine more! I am glad I chose AceMedix. Cheers to many more great things to come in the field of medicine!",
    date: "March 2024"
  },
  {
    id: 11,
    name: "Dr. Oluranti",
    role: "MDCN Candidate",
    content: "Preparing for the MDCN exam felt like climbing a mountain in the dark, overwhelming and uncertain. But Acemedix Tutorial changed everything. Their structured lessons, clear explanations, and high-yield focus transformed my prep. The mock exams mirrored the real test and boosted my confidence. What truly stood out was the supportive community, I never felt alone. With their expert guidance and motivation, I passed on my first try. To any foreign trained doctor feeling unsure, Acemedix isn't just a tutorial, it's your roadmap to success. One of the best choices I have made!",
    date: "February 2024"
  },
  {
    id: 12,
    name: "Dr. Adegbenro Adetola",
    role: "MDCN Candidate",
    content: "Honestly, I didn't want to write the exam after my first class. I was scared it was all too much. But the way the classes were broken down and structured made it easier. Beyond amazing tools like the website, ACEMEDIX carried our matter on their heads. They did everything possible to make sure we were ready, physically, mentally and knowledge-wise. At ACEmedix, your success is their business.",
    date: "January 2024"
  },
  {
    id: 13,
    name: "Dr. Baiyere",
    role: "MDCN Candidate",
    content: "Acemedix made my life easier.i made friends in class and I had group study partners in abuja and online from my ISS group.People i didn't meet till I was in Kano. A big thank you to Dr. Kingsley. He was always there to run through physical examinations and correct with care. The recalls helped as well as the Quiz and randomizers. My advice,make sure you pray and over pray. Make sure you ransack the entire website. Watch Dr. Dozie's videos,go through clinchers,do every question under Quiz and read up on every question you didn't get right,do recall as well. Once you've ransacked the website at least twice,the questions will look very familiar. Easiest way to not make it overwhelming is to start doing questions as soon as possible(50 every morning after prayers,that's 20 mins) and record the amount of questions you do on the acemedix worksheet.it will give you more ginger to answer more. Goodluck guyssss.",
    date: "December 2023"
  },
  {
    id: 14,
    name: "Dr. Omoarebu Uche",
    role: "MDCN Candidate",
    content: "I joined the Acemedix crash course with 5 weeks to the exam, Everyone thought it impossible. The Acemedix website and exposure to other doctors with the same goal played a huge role. All i can say is 'Acemedix community did what it does best 💯.'",
    date: "November 2023"
  },
  {
    id: 15,
    name: "Dr. Jane",
    role: "MDCN Candidate",
    content: "MDCN will humble you that was literally my phrase all through. And yes I was humbled but by the process and not the outcome. The exam process is a lot of things and definitely very much -STRESSFUL and DRAINING. From the endless studying, the exhausting application process , the traveling… everything. After my first exam(CBT) I finally understood why people fail this exam—it's not always you. Sometimes, it's the system of how things are done here. So don't beat yourself up if you don't pass the first time.. You're still a good doctor Bro, my exam was literally public health and community medicine?? After all the intense studying I did? Wow. And to top it all off, I was in center 1. We were moved to another center and didn't even start our exam till like almost 2pm that day.Acemedix honestly pulled through for me. The OSCE felt exactly like one of their mocks. They really prepared us. Anyways, all I can say is thank God. And a big thank you to Dr. Kingsley, Dr. Cece, Dr. Fahad, and Dr. Halima—your guidance, patience, and support meant the world. Dr. Kingsley, thank you for drilling physical exams into my soul 😭🙏🏽 You really went above and beyond for us. Also, thank you so much Dr. Dozie—for always showing up with words of encouragement, calm energy, and steady reassurance. Your presence made a difference, and we always felt supported every step of the way.",
    date: "October 2023"
  },
  {
    id: 16,
    name: "Dr. Anonymous",
    role: "MDCN Candidate",
    content: "A Heartfelt Message to Everyone Preparing for the MDCN Exam I'm writing this from the deepest part of my heart to encourage anyone preparing to take the MDCN exam. I sat for the exam in September 2024 in Ibadan, but unfortunately, I didn't pass. I had used a different academy for my preparation and attended their tutorials online. Meanwhile, all my friends who prepared with Acemedix and attended their physical classes passed the exam. It was a painful experience. I felt completely devastated but in all honesty, I knew I wasn't adequately prepared. I had only one month to study, and the materials I used weren't robust enough to help me succeed. But I didn't give up. I picked myself up, started studying afresh, and this time, I registered with Acemedix, attending the physical tutorials. I was determined to give it my all and pass on my next attempt. I pushed myself hard, I studied until I was completely drained, doing 300 MCQs daily from the Acemedix website. Not a single day went by without solving questions. Even on days I was exhausted, I made sure to attempt at least 50 questions. I had a clear study plan. I calculated the total number of questions on the website and broke them into daily, manageable sessions. Unlike my first attempt where I focused mostly on OSCE, this time I concentrated more on CBT. That Acemedix website? Please, don't take it for granted. It is incredibly resourceful. I can say confidently that while other academies may try to imitate Acemedix, none match the depth and structure of their platform. I came across questions and clinical images I had never seen before, but I kept pushing through. I completed all the questions on the website twice before the exam. About three weeks before the exam, I switched focus back to OSCE and refined my approach. When exam time came, I wasn't afraid. I had been through it before, this time, I just wanted to give it my best shot and finish strong. In Kano, I attended the workshop, sat for the CBT, and even though some questions leaned towards epidemiology, I was confident. Out of the slightly over 200 questions, I knew with certainty that I got at least 180 right. As for OSCE, it wasn't intimidating anymore, I was ready. Here's my advice to you: • Attend physical classes if you can. It gives you the extra push and you'll also meet amazing friends. • On the exam day, especially during OSCE, stay alert, listen carefully, and try to pick up hints from others. • Rest for at least a week before traveling for the exam. It's very important. • Most importantly, PRAY. Don't lean on your own strength or understanding. Pray for grace, favor, and success. God came through for me, and He will come through for you too. I'm rooting for you, and I can't wait to celebrate your success, both in Nigeria and beyond. All the best ❤️",
    date: "September 2023"
  },
  {
    id: 17,
    name: "Dr. OBULOR SYDNEY",
    role: "MDCN Candidate",
    content: "First and Foremost I'd like to appreciate God Almighty for a successful journey. God had everything planned out and I am just marvelled at how everything played out. When I came back to Nigeria, I didn't come to stay. it was just a visit after graduating medical school. After some time my family asked me to get my license here before I leave Nigeria. I didn't know what to do and had zero informations about the whole MDCN exam. Lots of people recommended Acemedix to me. My friends, doctors I met where I was doing my observaship too. Then I gave it a try, even whilst deciding on if I truly wanted to write the exam, Dr Dozie himself advised me and told me about how long I had to do my housemanship before it expires and stuff. Acemedix is a family, I met a lot of amazing people from my center down to the general OSCE (offline ) classes and the workshop lessons too. Their website and osce classes were super informative. I learnt how to clerk in just a few days of the teaching. I had a friendly / welcoming learning environment too, My tutors were very jovial and accommodating. We had fun while learning :) Thank you to Acemedix for preparing me and helping me Ace my licensing exam. To my tutor Dr Victor who was extremely supportive He went out of his way for me to write this exam this batch, I'm super grateful. I also want to thank my friends, God positioned everyone at the right time for me and I can't express how much of a blessing you all were to me on my journey to success. A few names I would further like to mention: my reading partner ( Jeggs ;) you helped me a lot! ) , my mini study group mates whom I'm glad we all passed - Dr Derin and Dr Joy, Dr Femi and co. To all my friends who also supported me and encouraged with with prayers and wishes. Thank you to Dr smith too for registering me for the tutorials and supporting me on this journey. This wouldn't be complete if I also didn't mention your names. Lastly & Most importantly the names of the very people who supported me financially on this journey my family/ parents and brother🥺🥺 I love love you! A lot was poured into it and I'm grateful to God it was a battle won! Thank you!!! This is just a stepping stone to greatness 🙏🏻 Xoxo If you're still wondering on if you truly want to get the license Please do!! And pray And I wish you the very best, I'm cheering you on! ✌🏻",
    date: "August 2023"
  },
  {
    id: 18,
    name: "Fatima Idris",
    role: "MDCN Candidate",
    content: "Alhamdulillah! I give all thanks and praise to Almighty Allah for granting me success in this journey. It wouldn't have been possible without His mercy and guidance every step of the way. To my amazing parent thank you for your endless prayers, support, and encouragement. Your sacrifices and unwavering belief in me kept me going even on my toughest days. To my incredible study group, I'm grateful for every discussion, revision session, and the motivation we gave each other. We truly lifted each other up and grew together through this process. A special thank you to Acemedix Academy for your structured guidance, resources, and mentorship. You made this path clearer and achievable, and I'm grateful for being a part of such a supportive learning environment.",
    date: "July 2023"
  },
  {
    id: 19,
    name: "Majeedat Abdulmajeed",
    role: "MDCN Candidate",
    content: "Those foreign trained doctors, they don't teach them anything These were words that although untrue, kept ringing in my mind before even taking the MDCN exams, the zeal to prove them wrong growing. Only there was one big problem; How do I start? How does one compress coursework from year 3 until final year within a couple of months and ace it MDCN style? What topics were the focus areas? That's when my friends and I got news of Acemedix and blessed be the work this academy does. Everything was there; from high yield topics, synthesized lecture notes, questions to help recall topics and to test on general knowledge, not to mention the ISS which I personally love, it was all beautiful. After God almighty, Acemedix is the next I need to appreciate for passing this exams. All this epistle is my way of saying thank you Acemedix, and yes, if you're in this academy, you're doing the first step towards succeeding right. The next step, in Dr. Dozie's voice being, you people should pray ooo.",
    date: "June 2023"
  },
  {
    id: 20,
    name: "Dr. Dera Ndubueze",
    role: "MDCN Candidate",
    content: "I joined Acemedix barely six weeks to the exam, and looking back now, I can confidently say it was one of the best decisions I made on this journey. The MCQ drills were spot on—they truly mirror the way Nigerian questions are set, so you're not just studying, you're learning how to think like the examiners. But for me, the real game-changer was the OSCE prep. I had pushed writing this exam for the longest time because of fear—specifically, fear of the OSCE. It felt like this looming giant I didn't know how to face. Then I reached out to Dr. Livinus. He told me I'd be ready in two weeks—and honestly, I didn't believe it. But he was right. On the day of the exam, I went through my OSCE stations smoothly and confidently. It felt almost surreal. Nothing caught me off guard. I was prepared for everything, and that's thanks to the solid structure and training Acemedix provides. Beyond the academics, Acemedix felt like a true community. You never feel like you're doing this alone. The tutors, the coordinators—everyone was supportive from start to finish. From exam prep to the registration process, and even calming nerves on the actual exam day, they were there. Present. Helpful. Kind. I wholeheartedly recommend Acemedix. No regrets, just gratitude.",
    date: "May 2023"
  },
  {
    id: 21,
    name: "Onwughara Obinna Prince",
    role: "MDCN Candidate",
    content: "I took the bold step to write MDCN exam, my case was just complicated because I was still abroad even few days to the exam, I contacted Dr. Livinus for the private classes, he gave me Dr. Amaka Tonia as my private tutor. Firstly I will rate Acemedixacademy 10/10, the support was not only about the classes but also about the process, I had the biggest difficulty in registering for the June 2025 exam and Dr. Livinus intervened, I'm sure without his intervention I won't have written this exam. My private teach Dr. Amaka Tonia was awesome 😎, I call her an angel sent to help me pass, we had classes according to my free time, she followed me up exclusively with the preparations, I swear she was the angel, even a night before my exam date she instructed me to record how I will tackle each clerking and counselling for her, I recorded all and she called me back saying she was angry with my antenatal clerking, she started from beginning to teach me this and guess what? Antenatal clerking came for my OSCE, she followed my whole process up even registration in fact she did my registration for me, she continued teaching me even the day of exam she was still following up, I can't forget, I won't have passed this exam without Acemedix, I recommend them well and already telling my friends that are scared of the MDCN exam to follow my steps. Acemedix did it for me. And all my classes were online, I'm sure I was among those that had the fewest offline classes, Thank you Acemedix",
    date: "April 2023"
  },
  {
    id: 22,
    name: "Anna Chimezie",
    role: "MDCN Candidate",
    content: "Joining Acemedix was the best decision I have ever made. Working from home and studying for an exam was quite challenging for me but acemedix made it easier for me by creating platforms where you can find materials to help you speed up your studying process even at your own pace, recorded classes I could listen to when I'm free and amazing staffs who are always there to attend to your worries, clarify you on different topics or concerns and created a conducive environment for the candidates to interact well with each other. Thank you so much Acemedix family❤️.",
    date: "March 2023"
  },
  {
    id: 23,
    name: "Nelly Umeji",
    role: "MDCN Candidate",
    content: "I had an exceptional experience with Acemedix. A classmate of mine took the MDCN examination and recommended their tutorial services to me. With their support, I also successfully completed the exam on my first attempt, by the grace of God. I can confidently assert that they are among the best in the field. The Coordinator demonstrates a remarkable commitment to ensuring that every student succeeds. Acemedix offers an invaluable platform that fosters growth and achievement.",
    date: "February 2023"
  },
  {
    id: 24,
    name: "Favour Ebi",
    role: "MDCN Candidate",
    content: "I found the OSCE handbook very helpful. Even though I didn't take full advantage of the tutorial, just the little I partook in helped me pass the exam.",
    date: "January 2023"
  },
  {
    id: 25,
    name: "Bakare Ifeoluwa",
    role: "MDCN Candidate",
    content: "Firstly I want to specially thank God for his grace Then I thank my family, friends and Acemedix Acemedix made studying interesting and easier with their organized websites. I am grateful to the person that introduced me to Acemedix ❤️❤️❤️ By the way I made amazing friends that had the same vision as I did",
    date: "December 2022"
  },
  {
    id: 26,
    name: "Abbas Shamsuddeen",
    role: "MDCN Candidate",
    content: "Thanks to Acemedix centre, the team was incredibly knowledgeable, I passed my MDCN exam, I'm highly recommend this centre to anyone looking for top-notch guidance and mentorship",
    date: "November 2022"
  },
  {
    id: 27,
    name: "Dr. Hafsah Sidi Abdullahi",
    role: "MDCN Candidate",
    content: "From my very first year in medical school, the MDCN exam felt like a myth of terror. So by the time I graduated and returned to face it, you can imagine the fear I carried. I had heard of — and even knew — incredibly smart friends who failed the exam, not because they weren't good enough, but because they weren't familiar with the MDCN style of questioning. I would've been just as lost… if not for Acemedix. Their lessons didn't just teach me what I needed to know—they gave me mental support, confidence, and clarity. A huge thank you to the Acemedix family and to Dr. Dozie for being there every step of the way, answering every question and clearing every doubt!",
    date: "October 2022"
  },
  {
    id: 28,
    name: "Dr. Mary Thompson",
    role: "MDCN Candidate",
    content: "ACEMEDIX! — Just like the name suggests, you're destined to ACE any medical exam with them! 🌟 Apart from the MDCN recall sessions, I explored the Clinchers, Randomizers, and Quizzes — and honestly, they were a game-changer! So helpful, practical, and exactly what we needed. But beyond the exams, ACEMEDIX gave me the opportunity to connect with amazing young people sorry doctors 🤭 who also kept me accountable to my studies — building study groups with them, pushing ourselves forward, and forming lasting friendships along the way. I'm truly grateful to be part of this incredible family. To all the doctors who taught us — thank you. Your time, patience, and dedication didn't go unnoticed. We appreciate you deeply. Special thanks to Miss Marvis for your unwavering commitment. And to Dr. Livinus — thank you for creating this platform that guide us through those baby steps as we transitioned into the world of Nigerian medical practice. Thank you, ACEMEDIX. You're more than a platform — you're a movement. 🤗🩺",
    date: "September 2022"
  },
  {
    id: 29,
    name: "Dr. Emediong Francis",
    role: "MDCN Candidate",
    content: "First of all, I want to thank God for granting me success because it could have only been God. Secondly: That website 1. Do MDCN recall a month to the exams. 2. Use Q topics to help you read 3. Quiz- Not just the picture test, do everything. I mean every single thing. 4. Do the mocks and qblocks My point do all the mcqs. The MDCN recall is important but when I wrote it, cumulatively it was barely up to 15 but you know what helped me; doing a lot of mcqs. Don't cram any answer, instead understand why that is the answer. See, there's nothing like too much mcqs. Do the randomisers too. And for the OSCE, what you need is confidence and tbh you can only get confidence from practicing a lot. I didn't practice a lot but I memorised the steps. So when I see a perform a respiratory system exams question, I'll just say it as it should be. OSCE is not the problem. See, read o mek MDCN no shock you as they did to us. All in all You need God The website And hardwork.",
    date: "August 2022"
  },
  {
    id: 30,
    name: "Zite Zite",
    role: "MDCN Candidate",
    content: "I attended the Lagos centre, and honestly, it felt like Acemedix tutors had seen the OSCE questions beforehand! They were so intentional with the teaching and took time with us-sometimes we even finished late, but it was absolutely worth it. I'm truly grateful | attended.",
    date: "July 2022"
  },
  {
    id: 31,
    name: "Dr. Hart Elett",
    role: "MDCN Candidate",
    content: "Writing the MDCN exam is no small feat. It tests you on every front, mentally, emotionally, physically and financially. It's not just about having clinical knowledge, it's about endurance, confidence, structure, and deep preparation. I gave myself over five months to prepare, and I can confidently say that one of the best decisions I made was joining Acemedix Academy. From day one, Acemedix didn't just teach us how to pass the MDCN exam, they equipped us with solid, life-saving clinical knowledge that I will carry with me throughout my career. The structure of their program is unlike anything else. The website is gold. The materials? On point. The handbook? A treasure. The recall questions? A game changer. Every instrument, every picture test, they were all at my fingertips, and I used them. You should too. And please, take your interactive study sessions seriously. They made a big difference for me. Engaging in discussions, sharing questions, answering out loud, getting corrections in real time, these sessions pushed me to think faster, explain better, and retain more. I also found friends from Acemedix who were serious and like-minded. We created a study structure, stuck to it, and helped each other stay accountable. That support system made all the difference. This exam can shake you if you're not mentally prepared, but Acemedix gave me the confidence I needed. At first, doing 50 questions a day felt like a lot, but as I built consistency, I found myself doing 600–900 questions daily. It's possible. Just start. To anyone preparing, don't ignore community medicine. For my set, that was where MDCN really pressed us. Attend every class. Look for question banks from Nigerian universities. But while you do that, don't neglect your general clinical knowledge. As you answer recall questions, read up on the topics in the Acemedix handbook. That combination is powerful. Trust me. Before Acemedix, there were things I had never even heard of. Now, you can wake me up at 3 a.m., and I'll confidently recite the NPI schedule. That's the kind of preparation you'll get here. For OSCE? Practice, practice, practice, until clerking becomes second nature, until you find yourself doing it even in your sleep. Repetition is the law of deep and lasting impressions. While practicing time yourself for 4:30 mins then gradually reduce it to 4 mins, then 3:30 mins then 3 mins depending on the station you are practicing for. ANC booking and pediatrics counselling consumes time, find how to handle it. On the exam day, walk in with confidence. Leave fear at the door. You know your stuff, so speak like it. And please, pray. Pray before and after your group studies. Ask people to intercede for you. Hold God tight. That voice of reassurance from Him was what held me up on days I felt completely drained. He didn't leave me hanging, and He won't leave you either. Acemedix is truly the place to be. Dr. Dozie genuinely cares. He is 100% committed to the success of every candidate. And the best part? Anytime I felt anxious, I'd go to the testimonial section of the website to remind myself that success was possible. And now, this is my own testimony. If you're serious about passing the MDCN exam, join Acemedix. Use the website. Follow the structure. Stay focused. The sacrifice will be worth it. Thank you, Acemedix. Thank you, Dr. Dozie. I'm so grateful. You are A+ amazing — Dr. Hart Elett",
    date: "June 2022"
  },
  {
    id: 32,
    name: "Musa Ibrahim",
    role: "MDCN Candidate",
    content: "God bless you guys Longlife acemedix",
    date: "May 2022"
  },
  {
    id: 33,
    name: "Dr. Goodness Adeboye",
    role: "MDCN Candidate",
    content: "I've been scared of the MDCN licensing exams for over 8 years (before even entering medical school). The not-so-good pass rates, constant negative feedback from superiors and all contributed to the fact But Acemedix academy allayed those fears in less than 1 month after joining the tutorials. With the early morning randomizers, Osce practice, physical exams - my confidence grew, the website was so helpful with Dr Livinus even making the recall reset option free just so we can do it as many times as we want. I'm so grateful for the focused preparation Acemedix. This win is for all of you!",
    date: "April 2022"
  },
  {
    id: 34,
    name: "Dr. Ebenezer Chuks",
    role: "MDCN Candidate",
    content: "You want the truth? Then read this —This is the conclusion of the matter! If you really want to pass MDCN, use Acemedix.",
    date: "March 2022"
  },
  {
    id: 35,
    name: "Dr. Adebayo Oluwakemi Shalom",
    role: "MDCN Candidate",
    content: "My experience with Acemedix was very amazing. I loved the tutorials and online sessions, the website as well was superb. I aced my exams in one sitting and I am so grateful to God and the ACEMED team. Thank you so much for your dedication and intentionality.",
    date: "February 2022"
  }
];

export default function TestimonialsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTestimonials, setFilteredTestimonials] = useState(allTestimonials);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };

  useEffect(() => {
    // Filter testimonials based on search
    const filtered = allTestimonials.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTestimonials(filtered);
    setVisibleCount(12);
  }, [searchTerm]);

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 12, filteredTestimonials.length));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/10 font-sans">
     
     {/* Enhanced Sticky Header - Responsive for tablet */}
<header className="fixed top-0 z-50 w-full bg-white/98 backdrop-blur-lg border-b border-slate-200/60 shadow-lg">
  <div className="container mx-auto px-4 py-3 md:py-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      {/* Logo with Image */}
      <Link href="/" className="flex items-center space-x-2 md:space-x-3 group flex-shrink-0">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center transition-all group-hover:scale-110 border border-blue-100">
          <Image
            src="/uploads/acelogo.png"
            alt="Acemedix Academy Logo"
            width={56}
            height={56}
            className="object-contain w-full h-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-blue-600');
                const icon = document.createElement('i');
                icon.className = 'fas fa-stethoscope text-white text-xl md:text-2xl';
                parent.appendChild(icon);
              }
            }}
          />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Acemedix Academy
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-medium hidden sm:block">Medical Education Platform</p>
        </div>
        {/* Mobile logo text - shorter version */}
        <div className="sm:hidden">
          <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Acemedix
          </h1>
          <p className="text-[10px] text-slate-600">Medical Platform</p>
        </div>
      </Link>

      {/* Desktop Navigation - Hidden on tablet/mobile, but we'll create a tablet-friendly version below */}
      <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 flex-wrap">
        <Link href="/" className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-home mr-2 text-blue-500 text-xs xl:text-sm"></i>Home
        </Link>
        <Link href="/#about" className="font-medium text-slate-700 hover:text-teal-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-teal-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-info-circle mr-2 text-teal-500 text-xs xl:text-sm"></i>About
        </Link>
        <Link href="/#features" className="font-medium text-slate-700 hover:text-emerald-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-emerald-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-star mr-2 text-emerald-500 text-xs xl:text-sm"></i>Features
        </Link>
        <Link href="/#pricing" className="font-medium text-slate-700 hover:text-amber-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-amber-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-tag mr-2 text-amber-500 text-xs xl:text-sm"></i>Pricing
        </Link>
        <Link href="/testimonials" className="font-medium text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-star mr-2 text-blue-500 text-xs xl:text-sm"></i>Testimonials
        </Link>
        <Link href="/#contact" className="font-medium text-slate-700 hover:text-slate-800 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
          <i className="fas fa-phone mr-2 text-slate-500 text-xs xl:text-sm"></i>Contact
        </Link>
       
        {status === 'authenticated' ? (
          <div className="flex items-center space-x-2 ml-2">
            <div className="flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-xs md:text-sm"></i>
              </div>
              <span className="text-slate-700 font-medium text-xs md:text-sm hidden sm:inline-block">
                {getUserDisplayName()}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-sm flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
            >
              <i className="fas fa-tachometer-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 md:px-5 py-2 md:py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all duration-300 flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
            >
              <i className="fas fa-sign-out-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 ml-2">
            <Link
              href="/login"
              className="px-3 md:px-5 py-2 md:py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all duration-300 flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
            >
              <i className="fas fa-sign-in-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Login</span>
            </Link>
            <button
              onClick={() => {
                const loginSection = document.querySelector('#login-section');
                if (loginSection) {
                  loginSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-sm flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
            >
              <i className="fas fa-rocket mr-1 md:mr-3 text-xs md:text-sm"></i>
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
            </button>
          </div>
        )}
      </nav>

      {/* Tablet Navigation - Visible on md screens, hidden on lg and mobile */}
      <div className="hidden md:flex lg:hidden items-center space-x-2 flex-wrap justify-end">
        <Link href="/" className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-blue-50 text-sm hand-cursor">
          Home
        </Link>
        <Link href="/#features" className="font-medium text-slate-700 hover:text-emerald-600 transition-colors px-2 py-2 rounded-lg hover:bg-emerald-50 text-sm hand-cursor">
          Features
        </Link>
        <Link href="/#pricing" className="font-medium text-slate-700 hover:text-amber-600 transition-colors px-2 py-2 rounded-lg hover:bg-amber-50 text-sm hand-cursor">
          Pricing
        </Link>
        <Link href="/testimonials" className="font-medium text-blue-600 transition-colors px-2 py-2 rounded-lg bg-blue-50 text-sm hand-cursor">
          Testimonials
        </Link>
        {status === 'authenticated' ? (
          <>
            <Link
              href="/dashboard"
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hand-cursor whitespace-nowrap"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 border border-red-300 text-red-600 rounded-lg font-medium text-sm hand-cursor whitespace-nowrap"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hand-cursor whitespace-nowrap"
            >
              Sign In
            </Link>
            <button
              onClick={() => {
                const loginSection = document.querySelector('#login-section');
                if (loginSection) {
                  loginSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hand-cursor whitespace-nowrap"
            >
              Get Started
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Button - Hidden on md and above */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors hand-cursor flex-shrink-0"
      >
        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl text-slate-700`}></i>
      </button>
    </div>
  </div>
</header>

      {/* Mobile Floating Menu - Simplified for brevity, same as before */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-slate-800 via-slate-900 to-gray-900 rounded-t-3xl shadow-2xl border-t border-slate-700/50">
              <div className="flex justify-center pt-4 pb-3"><div className="w-16 h-1.5 bg-slate-600/70 rounded-full"></div></div>
              <div className="px-4 pb-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"><i className="fas fa-bars text-white text-lg"></i></div>
                  <h3 className="text-white text-lg font-bold">Quick Navigation</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <Link href="/" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-home text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">Home</span>
                  </Link>
                  <Link href="/#about" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-info-circle text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">About</span>
                  </Link>
                  <Link href="/#features" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-star text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">Features</span>
                  </Link>
                  <Link href="/#pricing" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-tag text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">Pricing</span>
                  </Link>
                  <Link href="/testimonials" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-star text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">Testimonials</span>
                  </Link>
                  <Link href="/#contact" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20"><i className="fas fa-phone text-white text-lg"></i></div>
                    <span className="text-white text-xs font-medium text-center">Contact</span>
                  </Link>
                </div>
                <div className="space-y-3 mb-6">
                  {status === 'authenticated' ? (
                    <>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center"><i className="fas fa-user text-white"></i></div>
                          <div><p className="text-white text-sm font-semibold">{getUserDisplayName()}</p><p className="text-slate-300 text-xs">{session?.user?.email}</p></div>
                        </div>
                      </div>
                      <Link href="/dashboard" className="flex items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-blue-500/90 to-blue-600/90 hover:from-blue-500 hover:to-blue-600 border border-blue-500/50 transition-all duration-300 shadow-lg group" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="p-2 bg-white/20 rounded-lg mr-3"><i className="fas fa-tachometer-alt text-white text-lg"></i></div>
                        <div className="flex-1 text-left"><p className="text-xs text-slate-200">Go to</p><p className="text-white font-semibold text-sm">Dashboard</p></div>
                        <i className="fas fa-chevron-right text-white/70 text-sm"></i>
                      </Link>
                      <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full bg-gradient-to-r from-red-600/80 to-red-700/80 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-red-600 hover:to-red-700 transition-all duration-300 border border-red-500/50 active:scale-95">
                        <i className="fas fa-sign-out-alt text-sm"></i><span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-green-500/90 to-emerald-600/90 hover:from-green-500 hover:to-emerald-600 border border-green-500/50 transition-all duration-300 active:scale-95 shadow-lg" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="p-2 bg-white/20 rounded-lg mb-2"><i className="fas fa-sign-in-alt text-white text-base"></i></div>
                        <span className="text-white text-xs font-medium font-bold">Sign In</span>
                      </Link>
                      <Link href="/register" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-blue-500/90 to-blue-600/90 hover:from-blue-500 hover:to-blue-600 border border-blue-500/50 transition-all duration-300 active:scale-95 shadow-lg" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="p-2 bg-white/20 rounded-lg mb-2"><i className="fas fa-rocket text-white text-base"></i></div>
                        <span className="text-white text-xs font-medium font-bold">Get Started</span>
                      </Link>
                    </>
                  )}
                  <div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-teal-900/40 to-teal-800/30 border border-teal-800/40">
                    <div className="p-2 bg-teal-900/60 rounded-lg"><i className="fas fa-phone text-teal-300 text-base"></i></div>
                    <div><p className="text-xs text-slate-300">Need Help?</p><a href="tel:+2347087018175" className="text-white font-semibold text-sm">+234 708 701 8175</a></div>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-slate-600 hover:to-slate-700 transition-all duration-300 border border-slate-600/50 active:scale-95">
                  <i className="fas fa-times text-sm"></i><span>Close Menu</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-[60px]">
        {/* Cover Image Section */}
       <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
  <Image
    src="/uploads/testimonials.png"
    alt="Student Testimonials"
    fill
    className="object-cover"
    priority
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      target.style.display = 'none';
      const parent = target.parentElement;
      if (parent) {
        parent.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-indigo-700');
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'absolute inset-0 flex items-center justify-center';
        fallbackDiv.innerHTML = `
          <div class="text-center text-white p-8">
            <i class="fas fa-star text-6xl mb-4"></i>
            <h1 class="text-4xl md:text-5xl font-bold mb-2">Student Testimonials</h1>
            <p class="text-lg">Real stories from successful doctors</p>
          </div>
        `;
        parent.appendChild(fallbackDiv);
      }
    }}
  />
  {/* Darker overlay for better text readability */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40 flex items-center justify-center">
    <div className="text-center text-white px-4">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 font-['Poppins'] drop-shadow-lg">
        Student Testimonials
      </h1>
      <p className="text-lg md:text-xl max-w-3xl mx-auto drop-shadow-md">
        Hear from our successful candidates who passed their MDCN exams with flying colors
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <i key={i} className="fas fa-star text-amber-400 text-sm ml-1 first:ml-0 drop-shadow"></i>
          ))}
        </div>
        <span className="text-white/90 text-sm drop-shadow">4.9/5 from {allTestimonials.length}+ reviews</span>
      </div>
    </div>
  </div>
</section>

        {/* All Testimonials Section - Modern Grid Layout */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                What Our <span className="text-gradient-blue">Students Say</span>
              </h2>
              <p className="text-slate-600 text-lg mb-8">
                Join {allTestimonials.length}+ successful doctors who found their path with Acemedix
              </p>

             {/* Search Bar */}
<div className="max-w-md mx-auto relative">
  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
  <input
    type="text"
    placeholder="Search testimonials by name..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-800 placeholder:text-slate-400"
  />
</div>
            </div>

            {/* Testimonials Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTestimonials.slice(0, visibleCount).map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                  onClick={() => setSelectedTestimonial(testimonial)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        index % 5 === 0 ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                        index % 5 === 1 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                        index % 5 === 2 ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                        index % 5 === 3 ? "bg-gradient-to-br from-purple-500 to-purple-600" : 
                        "bg-gradient-to-br from-rose-500 to-pink-600"
                      }`}>
                        <i className="fas fa-user-md text-white text-xl"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                          {testimonial.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-slate-500 text-xs">{testimonial.role}</span>
                          {testimonial.date && (
                            <>
                              <span className="text-slate-300 text-xs">•</span>
                              <span className="text-slate-400 text-xs">{testimonial.date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex text-amber-400 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star text-sm"></i>
                      ))}
                    </div>
                    
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-4">
                      "{testimonial.content.substring(0, 200)}..."
                    </p>
                    
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <span>Read full story</span>
                      <i className="fas fa-arrow-right ml-2 text-xs group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTestimonials.length === 0 && (
              <div className="text-center py-12">
                <i className="fas fa-search text-5xl text-slate-300 mb-4"></i>
                <p className="text-slate-500 text-lg">No testimonials found matching your search.</p>
              </div>
            )}

            {/* Load More Button */}
            {visibleCount < filteredTestimonials.length && (
              <div className="text-center mt-12">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <i className="fas fa-arrow-down"></i>
                  <span>Load More Testimonials ({filteredTestimonials.length - visibleCount} remaining)</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Testimonial Modal */}
      <AnimatePresence>
        {selectedTestimonial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedTestimonial(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <i className="fas fa-user-md text-white text-lg"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{selectedTestimonial.name}</h3>
                    <p className="text-slate-500 text-sm">{selectedTestimonial.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTestimonial(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times text-slate-500"></i>
                </button>
              </div>
              <div className="p-6">
                <div className="flex text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star text-sm"></i>
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  "{selectedTestimonial.content}"
                </p>
                {selectedTestimonial.date && (
                  <p className="text-slate-400 text-sm mt-4">- {selectedTestimonial.date}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 md:space-x-4 mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center">
                  <Image src="/uploads/acelogo.png" alt="Acemedix Academy Logo" width={56} height={56} className="object-contain" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Acemedix Academy</h2>
                  <p className="text-slate-300 text-sm md:text-base">Medical Education Platform</p>
                </div>
              </div>
              <p className="text-slate-300 text-base md:text-lg">Revolutionizing medical education through AI-powered learning and assessment.</p>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Links</h3>
              <ul className="space-y-2 md:space-y-4">
                <li><Link href="/" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Home</Link></li>
                <li><Link href="/#features" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Features</Link></li>
                <li><Link href="/#pricing" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Pricing</Link></li>
                <li><Link href="/testimonials" className="text-white transition-colors text-base md:text-lg">Testimonials</Link></li>
                <li><Link href="/#contact" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Contact</Link></li>
              </ul>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Connect With Us</h3>
              <div className="flex space-x-3 md:space-x-4 mb-6 md:mb-8">
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"><i className="fab fa-facebook-f text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors shadow-md"><i className="fab fa-twitter text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"><i className="fab fa-linkedin-in text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-green-500 transition-colors shadow-md"><i className="fab fa-whatsapp text-sm md:text-lg"></i></a>
              </div>
            </div>
           
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Newsletter</h3>
              <p className="text-slate-300 text-sm mb-4">Get the latest updates and medical education tips</p>
              <div className="flex">
                <input type="email" placeholder="Your email" className="flex-1 px-4 py-2 rounded-l-lg bg-slate-700 text-white placeholder-slate-400 border-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-lg transition-colors"><i className="fas fa-paper-plane"></i></button>
              </div>
              <div className="mt-6 text-slate-400 text-sm">© {new Date().getFullYear()} Acemedix Academy. All rights reserved.</div>
            </div>
          </div>
         
          <div className="border-t border-slate-700 pt-8 md:pt-12 text-center text-slate-400 text-base md:text-lg">
            <p>MDCN is a registered trademark of the Medical and Dental Council of Nigeria.</p>
            <p className="mt-2 md:mt-4">Acemedix Academy is not affiliated with MDCN but provides preparatory materials.</p>
          </div>
        </div>
      </footer>

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      <style jsx global>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .text-gradient-blue {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
}