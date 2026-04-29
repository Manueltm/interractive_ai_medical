// app/api/analyze/[chatId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { getChatById, getMessagesByChat, getSessionById, updateChat } from "@/lib/db/queries";
import { TokenService } from "@/lib/services/tokenService";
import { aiClient } from "@/lib/services/aiClientService";

export const dynamic = 'force-dynamic';

async function callAIWithFallback(prompt: string, maxRetries: number = 2) {
  const response = await aiClient.complete(prompt, {
    temperature: 0.3,
    maxTokens: 4000,
  });
  
  return {
    choices: [{ message: { content: response.content } }]
  };
}

// ============ DEPARTMENT-SPECIFIC CLINICAL CHECKLISTS ============

interface DepartmentChecklist {
  categories: string[];
  keyQuestions: string[];
  redFlags: string[];
  mustAsk: string[];
  terminology: string[];
  conditionSpecificGuidance?: Record<string, string>;
  detailedPoints: {
    category: string;
    requiredElements: string[];
    commonMistakes: string[];
    scoringGuide: string;
    improvementExamples: string[];
  }[];
}

const departmentChecklists: Record<string, DepartmentChecklist> = {
  'General Medicine': {
    categories: [
      'Consent & Introduction',
      'Chief Complaint',
      'History of Presenting Complaint (SOCRATES)',
      'Past Medical History',
      'Drug & Allergy History',
      'Family History',
      'Social History (Smoking, Alcohol, Occupation)',
      'Review of Systems',
      'Summary & Closure'
    ],
    keyQuestions: [
      'What brings you in today?',
      'When did this start?',
      'How would you describe the pain?',
      'What makes it better or worse?',
      'Any past medical conditions?',
      'What medications do you take?',
      'Any allergies?',
      'Do you smoke or drink alcohol?',
      'What do you do for work?',
      'Any family history of similar problems?'
    ],
    redFlags: [
      'Unexplained weight loss',
      'Night sweats',
      'Bleeding without cause',
      'Severe progressive pain',
      'Neurological deficits'
    ],
    mustAsk: [
      'Onset, duration, frequency of symptoms',
      'Severity on pain scale (0-10)',
      'Aggravating and relieving factors',
      'Associated symptoms',
      'Impact on daily activities'
    ],
    terminology: ['presenting complaint', 'differential diagnosis', 'systemic review', 'past medical history', 'drug history'],
    conditionSpecificGuidance: {
      default: "Focus on systematic history-taking using SOCRATES framework",
    },
    detailedPoints: [
      {
        category: "Consent & Introduction",
        requiredElements: ["Greeting", "Self-introduction", "Role statement", "Permission request"],
        commonMistakes: ["No greeting", "No introduction", "No consent", "Rushing into questions"],
        scoringGuide: "Credit any attempt at introduction or consent, even if brief",
        improvementExamples: [
          '"Hello, my name is Dr. Smith. Do I have your permission to ask you some questions about your health?"',
          '"Good morning, I\'m Dr. Jones, the physician on duty. May I ask you a few questions?"',
          '"Hi, I\'m Dr. Brown. Would it be okay if we discuss your health concerns today?"'
        ]
      },
      {
        category: "Chief Complaint",
        requiredElements: ["Open-ended question", "Patient's own words", "Main reason for visit"],
        commonMistakes: ["Asking leading questions", "Not documenting exact complaint", "Moving on too quickly"],
        scoringGuide: "Use 'What brings you in today?' or similar open-ended question",
        improvementExamples: [
          '"What brings you in to see me today?"',
          '"What health concerns would you like to discuss?"',
          '"Can you tell me what\'s been bothering you lately?"'
        ]
      },
      {
        category: "History of Presenting Complaint (SOCRATES)",
        requiredElements: ["Site", "Onset", "Character", "Radiation", "Associated symptoms", "Timing", "Exacerbating factors", "Severity"],
        commonMistakes: ["Missing radiation", "No severity scale", "Skipping associated symptoms"],
        scoringGuide: "Cover at least 6 of 8 SOCRATES elements for full credit",
        improvementExamples: [
          '"Where exactly is the pain located?"',
          '"When did it start? Was it sudden or gradual?"',
          '"How would you describe the pain - sharp, dull, burning?"',
          '"Does it spread anywhere else?"',
          '"What makes it better or worse?"',
          '"On a scale of 0 to 10, how severe is it?"'
        ]
      },
      {
        category: "Past Medical History",
        requiredElements: ["Previous diagnoses", "Hospitalizations", "Surgeries"],
        commonMistakes: ["Not asking systematically", "Missing chronic conditions"],
        scoringGuide: "Ask about hypertension, diabetes, heart disease, etc.",
        improvementExamples: [
          '"Have you been diagnosed with any medical conditions?"',
          '"Have you ever been hospitalized or had surgery?"',
          '"Do you see any specialists regularly?"'
        ]
      },
      {
        category: "Drug & Allergy History",
        requiredElements: ["Current medications", "Dosages", "Allergies", "Reactions"],
        commonMistakes: ["Not asking about OTC meds", "Missing allergy specifics"],
        scoringGuide: "Ask about prescription, OTC, and supplements",
        improvementExamples: [
          '"What medications do you currently take, including over-the-counter ones?"',
          '"Do you have any allergies to medications, foods, or latex?"',
          '"What happens when you take something you\'re allergic to?"'
        ]
      },
      {
        category: "Family History",
        requiredElements: ["Parents", "Siblings", "Children", "Age of onset"],
        commonMistakes: ["Vague questions", "Not documenting specific conditions"],
        scoringGuide: "Ask about similar conditions in first-degree relatives",
        improvementExamples: [
          '"Does anyone in your family have similar health problems?"',
          '"At what age were family members diagnosed?"',
          '"Is there a family history of heart disease, diabetes, or cancer?"'
        ]
      },
      {
        category: "Social History",
        requiredElements: ["Smoking", "Alcohol", "Occupation", "Living situation"],
        commonMistakes: ["Not quantifying smoking/alcohol", "Missing occupational hazards"],
        scoringGuide: "Ask about smoking (pack-years), alcohol (units/week), and work",
        improvementExamples: [
          '"Do you smoke? How many packs per day and for how many years?"',
          '"How much alcohol do you drink in a typical week?"',
          '"What do you do for work? Any exposure to chemicals or dust?"',
          '"Who lives with you at home?"'
        ]
      },
      {
        category: "Review of Systems",
        requiredElements: ["General", "Cardiovascular", "Respiratory", "GI", "Neurological"],
        commonMistakes: ["Only asking one system", "Rushing through"],
        scoringGuide: "Ask at least 5 systems systematically",
        improvementExamples: [
          '"Have you had any fever, chills, or unexplained weight changes?"',
          '"Any chest pain, palpitations, or shortness of breath?"',
          '"Any cough, wheezing, or coughing up blood?"',
          '"Any nausea, vomiting, diarrhea, or constipation?"',
          '"Any headaches, dizziness, numbness, or weakness?"'
        ]
      },
      {
        category: "Summary & Closure",
        requiredElements: ["Summarize findings", "Check understanding", "Next steps", "Questions"],
        commonMistakes: ["No summary", "Rushing to end", "Not asking for questions"],
        scoringGuide: "Demonstrate closure and patient-centered approach",
        improvementExamples: [
          '"Let me make sure I understand - you came in because of [chief complaint]. Is that correct?"',
          '"Do you have any questions about what we discussed?"',
          '"Based on what you\'ve told me, here are the recommended next steps."'
        ]
      }
    ]
  },
  'Cardiology': {
    categories: [
      'Consent & Introduction',
      'Chief Complaint',
      'SOCRATES for Chest Pain/Dyspnea',
      'Cardiac Risk Factors',
      'Past Cardiac History',
      'Medication History',
      'Functional Capacity (NYHA)',
      'Orthopnea & PND',
      'Peripheral Edema',
      'Family History'
    ],
    keyQuestions: [
      'What brings you in today?',
      'Where is the chest discomfort located?',
      'Does it spread to your arm, jaw, or back?',
      'What does it feel like - pressure, tightness, burning?',
      'Does it come on with activity or stress?',
      'What helps relieve it - rest or medication?',
      'Do you get short of breath lying flat?',
      'How many pillows do you sleep with?',
      'Do you wake up gasping for air?',
      'Any swelling in your feet or ankles?'
    ],
    redFlags: [
      'Chest pain at rest lasting >20 minutes',
      'Pain radiating to jaw or left arm',
      'Associated with nausea, sweating, shortness of breath',
      'Syncope during exertion'
    ],
    mustAsk: [
      'Character of chest pain/discomfort',
      'Relation to exertion or stress',
      'Relieving factors (rest, nitroglycerin)',
      'Orthopnea (pillow count)',
      'Paroxysmal nocturnal dyspnea'
    ],
    terminology: ['angina', 'myocardial infarction', 'dyspnea on exertion', 'orthopnea', 'PND', 'palpitations', 'syncope', 'NYHA class'],
    conditionSpecificGuidance: {
      default: "Focus on cardiac symptom characterization using SOCRATES framework",
    },
    detailedPoints: [
      {
        category: "Consent & Introduction",
        requiredElements: ["Self-introduction", "Role statement", "Permission request", "Patient identification"],
        commonMistakes: ["No introduction", "No consent", "Rushing into questions"],
        scoringGuide: "Essential for establishing trust in cardiac assessment",
        improvementExamples: [
          '"Hello, I\'m Dr. Smith from Cardiology. Do I have your permission to ask about your heart symptoms?"',
          '"Good morning, I\'m Dr. Jones. May I ask you some questions about your chest discomfort?"'
        ]
      },
      {
        category: "Chief Complaint",
        requiredElements: ["Open-ended question", "Cardiac symptom focus", "Primary complaint identification"],
        commonMistakes: ["Not asking about chest pain", "Missing atypical presentations"],
        scoringGuide: "Identify if chest pain, dyspnea, palpitations, or syncope",
        improvementExamples: [
          '"What brings you to the cardiology clinic today?"',
          '"Can you describe the chest discomfort you\'ve been experiencing?"'
        ]
      },
      {
        category: "SOCRATES for Chest Pain/Dyspnea",
        requiredElements: ["Site", "Onset", "Character", "Radiation", "Associated symptoms", "Timing", "Exacerbating factors", "Severity"],
        commonMistakes: ["Missing radiation question", "Not asking about severity", "Skipping associated symptoms"],
        scoringGuide: "Cover all 8 SOCRATES elements for chest pain",
        improvementExamples: [
          '"Where exactly do you feel the discomfort?"',
          '"Does it spread anywhere - arm, jaw, back?"',
          '"How would you describe the sensation?"',
          '"What brings it on? Does activity trigger it?"',
          '"On a scale of 0 to 10, how severe is it?"'
        ]
      },
      {
        category: "Cardiac Risk Factors",
        requiredElements: ["Hypertension", "Diabetes", "Hyperlipidemia", "Smoking", "Family history"],
        commonMistakes: ["Only asking about one risk factor", "Missing smoking history"],
        scoringGuide: "Assess at minimum: HTN, DM, HLD, smoking, family history",
        improvementExamples: [
          '"Have you been told you have high blood pressure?"',
          '"Do you have diabetes or high blood sugar?"',
          '"Have you had your cholesterol checked?"',
          '"Do you smoke? How many packs per day?"'
        ]
      },
      {
        category: "Past Cardiac History",
        requiredElements: ["Previous heart attacks", "Previous stents/PCI", "Previous bypass surgery", "Heart failure"],
        commonMistakes: ["Not asking about prior events", "Missing revascularization history"],
        scoringGuide: "Document all prior cardiac events and interventions",
        improvementExamples: [
          '"Have you ever had a heart attack?"',
          '"Have you ever had a stent placed or bypass surgery?"',
          '"Have you been diagnosed with heart failure?"'
        ]
      },
      {
        category: "Medication History",
        requiredElements: ["Antiplatelets", "Anticoagulants", "Beta-blockers", "ACE inhibitors", "Statins"],
        commonMistakes: ["Only asking about 'medications' without specifics", "Not checking adherence"],
        scoringGuide: "Ask about specific cardiac medication classes",
        improvementExamples: [
          '"Are you taking aspirin or any blood thinners?"',
          '"Do you take medication for blood pressure?"',
          '"Are you on any cholesterol medication like statins?"'
        ]
      },
      {
        category: "Functional Capacity (NYHA)",
        requiredElements: ["Stairs climbing", "Walking distance", "Daily activity limitations"],
        commonMistakes: ["Not quantifying functional limitation", "Asking vague questions"],
        scoringGuide: "Determine NYHA I-IV based on activity limitation",
        improvementExamples: [
          '"How many flights of stairs can you climb before getting short of breath?"',
          '"How far can you walk on flat ground before symptoms appear?"'
        ]
      },
      {
        category: "Orthopnea & PND",
        requiredElements: ["Number of pillows", "Difficulty lying flat", "Waking up breathless"],
        commonMistakes: ["Not asking about pillows", "Missing PND question"],
        scoringGuide: "Ask specifically about orthopnea and PND",
        improvementExamples: [
          '"Do you need to prop yourself up with pillows to sleep?"',
          '"How many pillows do you use at night?"',
          '"Do you ever wake up feeling short of breath?"'
        ]
      },
      {
        category: "Peripheral Edema",
        requiredElements: ["Ankle/leg swelling", "Time of day worse", "Unilateral vs bilateral"],
        commonMistakes: ["Not asking about edema", "Missing laterality"],
        scoringGuide: "Document presence, location, timing, and severity of edema",
        improvementExamples: [
          '"Have you noticed any swelling in your feet or ankles?"',
          '"Does the swelling get worse as the day goes on?"',
          '"Is the swelling in both legs or just one?"'
        ]
      },
      {
        category: "Family History",
        requiredElements: ["Parents cardiac history", "Siblings cardiac history", "Age of onset"],
        commonMistakes: ["Only asking 'any family history?'", "Not documenting specific conditions"],
        scoringGuide: "Ask about premature CAD in first-degree relatives",
        improvementExamples: [
          '"Did your parents or siblings have any heart problems?"',
          '"At what age did your father have his first heart attack?"'
        ]
      }
    ]
  },
  'Neurology': {
    categories: [
      'Consent & Introduction',
      'Chief Complaint',
      'Symptom Characterization',
      'Onset & Progression',
      'Associated Symptoms',
      'Risk Factors',
      'Past Medical History',
      'Medication History',
      'Family History',
      'Social History'
    ],
    keyQuestions: [
      'What brings you in today?',
      'When did this start?',
      'Was it sudden or gradual?',
      'What does it feel like?',
      'What makes it better or worse?',
      'Any associated symptoms like nausea, vision changes?',
      'Have you had this before?',
      'Any family history of similar problems?'
    ],
    redFlags: [
      'Sudden severe headache',
      'New neurological deficit',
      'Seizure with first-time onset >25 years',
      'Progressive weakness'
    ],
    mustAsk: [
      'Onset and progression of symptoms',
      'Exact location and quality',
      'Triggers and relieving factors',
      'Associated symptoms'
    ],
    terminology: ['aura', 'paresthesia', 'hemiparesis', 'ataxia', 'dysarthria', 'diplopia', 'nystagmus'],
    conditionSpecificGuidance: {
      default: "Focus on neurological symptom localization and characterization",
    },
    detailedPoints: [
      {
        category: "Consent & Introduction",
        requiredElements: ["Self-introduction", "Role statement", "Permission request"],
        commonMistakes: ["No introduction", "No consent"],
        scoringGuide: "Establish rapport before asking about neurological symptoms",
        improvementExamples: [
          '"Hello, I\'m Dr. Smith. Do I have your permission to ask about your symptoms?"',
          '"Good morning, I\'m Dr. Jones. May I ask you some questions about what you\'ve been experiencing?"'
        ]
      },
      {
        category: "Chief Complaint",
        requiredElements: ["Open-ended question", "Primary symptom identification"],
        commonMistakes: ["Leading questions", "Missing symptom details"],
        scoringGuide: "Let patient describe in their own words",
        improvementExamples: [
          '"What brings you to the neurology clinic today?"',
          '"Can you tell me what symptoms you\'ve been having?"'
        ]
      },
      {
        category: "Symptom Characterization",
        requiredElements: ["Location", "Quality", "Severity", "Pattern"],
        commonMistakes: ["Not asking about quality", "Missing severity"],
        scoringGuide: "Get detailed description of the symptom",
        improvementExamples: [
          '"Where exactly do you feel this symptom?"',
          '"How would you describe the sensation?"',
          '"On a scale of 0 to 10, how severe is it?"',
          '"Is it constant or does it come and go?"'
        ]
      },
      {
        category: "Onset & Progression",
        requiredElements: ["When started", "Sudden vs gradual", "Worsening or improving"],
        commonMistakes: ["Missing onset timing", "Not asking about progression"],
        scoringGuide: "Establish timeline of symptom evolution",
        improvementExamples: [
          '"When did you first notice this symptom?"',
          '"Did it come on suddenly or gradually?"',
          '"Has it been getting better, worse, or staying the same?"'
        ]
      },
      {
        category: "Associated Symptoms",
        requiredElements: ["Other neurological symptoms", "Systemic symptoms"],
        commonMistakes: ["Only focusing on one symptom", "Missing red flags"],
        scoringGuide: "Ask about other related symptoms",
        improvementExamples: [
          '"Along with this, have you noticed any other symptoms?"',
          '"Any weakness, numbness, vision changes, or difficulty speaking?"',
          '"Have you had any fever, headache, or neck stiffness?"'
        ]
      },
      {
        category: "Risk Factors",
        requiredElements: ["Hypertension", "Diabetes", "Smoking", "Atrial fibrillation"],
        commonMistakes: ["Missing stroke risk factors", "Not asking about AF"],
        scoringGuide: "Assess modifiable and non-modifiable risk factors",
        improvementExamples: [
          '"Have you been told you have high blood pressure or diabetes?"',
          '"Do you have an irregular heart rhythm like atrial fibrillation?"',
          '"Do you smoke or have you ever smoked?"'
        ]
      },
      {
        category: "Past Medical History",
        requiredElements: ["Previous neurological events", "Other medical conditions"],
        commonMistakes: ["Not asking about prior TIA/stroke", "Missing seizure history"],
        scoringGuide: "Document all relevant past medical history",
        improvementExamples: [
          '"Have you ever had a stroke or transient ischemic attack (TIA)?"',
          '"Have you ever had a seizure or been diagnosed with epilepsy?"',
          '"Do you have any other medical conditions we should know about?"'
        ]
      },
      {
        category: "Medication History",
        requiredElements: ["Current medications", "Anticoagulants", "Antiepileptics", "Adherence"],
        commonMistakes: ["Missing anticoagulant history", "Not checking adherence"],
        scoringGuide: "Ask about all medications including blood thinners",
        improvementExamples: [
          '"What medications do you currently take?"',
          '"Are you taking any blood thinners like warfarin, apixaban, or rivaroxaban?"',
          '"Have you been prescribed medication for seizures?"',
          '"Do you take your medications as prescribed?"'
        ]
      },
      {
        category: "Family History",
        requiredElements: ["Neurological conditions in family", "Age of onset"],
        commonMistakes: ["Vague questions", "Missing specific conditions"],
        scoringGuide: "Ask about family history of stroke, seizures, migraine, neurodegenerative diseases",
        improvementExamples: [
          '"Has anyone in your family had a stroke or seizure?"',
          '"Is there a family history of migraine headaches or Parkinson\'s disease?"',
          '"At what age were they diagnosed?"'
        ]
      },
      {
        category: "Social History",
        requiredElements: ["Living situation", "Occupation", "Independence"],
        commonMistakes: ["Not assessing impact on daily life", "Missing functional status"],
        scoringGuide: "Understand how symptoms affect patient's life",
        improvementExamples: [
          '"How have these symptoms affected your daily activities?"',
          '"Are you still able to work and manage household tasks independently?"',
          '"Who lives with you at home?"'
        ]
      }
    ]
  },
  'Gynecology': {
    categories: [
      'Explicit Consent',
      'Introduction & Rapport',
      'Menstrual History',
      'Chief Complaint',
      'Obstetric History',
      'Contraceptive History',
      'Sexual History',
      'Past Medical History',
      'Family History'
    ],
    keyQuestions: [
      'Do I have your permission to ask some personal questions?',
      'When was your last menstrual period?',
      'How many days between periods?',
      'How many days does bleeding last?',
      'Do you have pain with your periods?',
      'Have you ever been pregnant?',
      'Do you use any form of contraception?'
    ],
    redFlags: [
      'Postmenopausal bleeding',
      'Intermenstrual bleeding',
      'Post-coital bleeding',
      'Pelvic mass'
    ],
    mustAsk: [
      'Explicit consent for intimate questions',
      'LMP, cycle regularity, flow',
      'Dysmenorrhea and severity',
      'Complete obstetric history (GTPAL)'
    ],
    terminology: ['LMP', 'menarche', 'menopause', 'dysmenorrhea', 'menorrhagia', 'metrorrhagia', 'GTPAL'],
    conditionSpecificGuidance: {
      default: "Focus on gynecological history with explicit consent",
    },
    detailedPoints: [
      {
        category: "Explicit Consent",
        requiredElements: ["Permission for personal questions", "Confidentiality assurance"],
        commonMistakes: ["Assuming consent", "Not asking explicitly"],
        scoringGuide: "Must explicitly ask permission before intimate history",
        improvementExamples: [
          '"Do I have your permission to ask you some personal questions about your gynecological health?"',
          '"This information is confidential. May I proceed with some personal health questions?"'
        ]
      },
      {
        category: "Menstrual History",
        requiredElements: ["Age at menarche", "LMP", "Cycle length", "Duration", "Flow", "Dysmenorrhea"],
        commonMistakes: ["Missing LMP", "Not documenting cycle regularity"],
        scoringGuide: "Document all menstrual parameters completely",
        improvementExamples: [
          '"How old were you when you had your first period?"',
          '"When was your last menstrual period?"',
          '"How many days pass from the start of one period to the next?"',
          '"How many days does your bleeding typically last?"',
          '"Do you have pain with your periods? How severe?"'
        ]
      },
      {
        category: "Obstetric History",
        requiredElements: ["Gravida", "Term deliveries", "Preterm deliveries", "Abortions", "Living children"],
        commonMistakes: ["Missing GTPAL components", "Confusing gravida/para"],
        scoringGuide: "Complete GTPAL is mandatory",
        improvementExamples: [
          '"How many times have you been pregnant in total?"',
          '"How many pregnancies went to full term?"',
          '"Have you had any miscarriages or terminations?"',
          '"How many living children do you have?"'
        ]
      }
    ]
  },
  'Obstetrics': {
    categories: [
      'Consent & Introduction',
      'GTPAL Documentation',
      'LMP & EDD',
      'Presenting Complaint',
      'Antenatal Care',
      'Past Obstetric History',
      'Past Medical History',
      'Fetal Movements',
      'Red Flags Screening'
    ],
    keyQuestions: [
      'How many times have you been pregnant?',
      'How many live children do you have?',
      'When was your last menstrual period?',
      'What is your expected due date?',
      'Have you felt the baby move?',
      'Any bleeding or pain in this pregnancy?',
      'Have you had your scans and blood tests?'
    ],
    redFlags: [
      'Reduced fetal movements',
      'Antepartum hemorrhage',
      'Severe headache with visual changes',
      'Epigastric pain',
      'Ruptured membranes'
    ],
    mustAsk: [
      'Complete GTPAL',
      'EDD from LMP',
      'Quickening (first fetal movements)',
      'Pre-eclampsia symptoms'
    ],
    terminology: ['GTPAL', 'LMP', 'EDD', 'EGA', 'quickening', 'primigravida', 'pre-eclampsia'],
    conditionSpecificGuidance: {
      default: "Focus on complete obstetric history with GTPAL documentation",
    },
    detailedPoints: [
      {
        category: "GTPAL Documentation",
        requiredElements: ["Gravida", "Term", "Preterm", "Abortions", "Living"],
        commonMistakes: ["Missing components", "Confusing terminology"],
        scoringGuide: "Complete GTPAL is mandatory for all obstetric patients",
        improvementExamples: [
          '"How many times have you been pregnant including this one?"',
          '"How many of those went to full term (37 weeks or more)?"',
          '"Have you had any miscarriages or terminations?"',
          '"How many living children do you have?"'
        ]
      },
      {
        category: "Fetal Movements",
        requiredElements: ["Quickening timing", "Current movement pattern", "Reduced movements"],
        commonMistakes: ["Not asking about movements", "Missing reduced movement assessment"],
        scoringGuide: "Ask about first felt movements and current pattern",
        improvementExamples: [
          '"At how many weeks did you first feel the baby move?"',
          '"Is the baby moving normally now?"',
          '"Have you noticed any decrease in movements?"'
        ]
      },
      {
        category: "Red Flags Screening",
        requiredElements: ["Headaches", "Visual changes", "Epigastric pain", "Bleeding", "Ruptured membranes"],
        commonMistakes: ["Missing pre-eclampsia symptoms", "Not asking about bleeding"],
        scoringGuide: "Screen for pre-eclampsia and other complications",
        improvementExamples: [
          '"Have you had any severe headaches or changes in your vision?"',
          '"Any pain under your ribs or in your upper stomach?"',
          '"Have you noticed any bleeding or fluid leaking?"'
        ]
      }
    ]
  },
  'Pediatrics': {
    categories: [
      'Parent/Caregiver Consent',
      'Introduction & Rapport',
      'Birth History',
      'Developmental Milestones',
      'Immunization History',
      'Nutritional History',
      'Presenting Complaint',
      'Past Medical History'
    ],
    keyQuestions: [
      'How old is the child?',
      'What concerns brought you in today?',
      'Was the child born at full term?',
      'What was the birth weight?',
      'Are immunizations up to date?',
      'At what age did the child sit, crawl, walk?',
      'What does the child eat?'
    ],
    redFlags: [
      'Loss of previously achieved milestones',
      'Persistent vomiting',
      'Lethargy or poor feeding',
      'Seizures',
      'Bruising in non-mobile infant'
    ],
    mustAsk: [
      'Birth history (gestational age, birth weight, delivery)',
      'Immunization schedule',
      'Developmental milestones for age',
      'Feeding history'
    ],
    terminology: ['APGAR', 'gestational age', 'NICU', 'developmental milestones', 'weaning', 'immunization schedule'],
    conditionSpecificGuidance: {
      default: "Focus on pediatric history with developmental assessment",
    },
    detailedPoints: [
      {
        category: "Developmental Milestones",
        requiredElements: ["Gross motor", "Fine motor", "Speech", "Social"],
        commonMistakes: ["Not assessing age-appropriate milestones", "Missing regression"],
        scoringGuide: "Assess all 4 developmental domains for age",
        improvementExamples: [
          '"At what age did your child start sitting up without support?"',
          '"When did they start crawling or walking?"',
          '"What words does your child say?"',
          '"Do they make eye contact and smile socially?"'
        ]
      },
      {
        category: "Immunization History",
        requiredElements: ["Vaccines received", "Dates", "Missing vaccines"],
        commonMistakes: ["Not reviewing vaccination record", "Missing catch-up schedule"],
        scoringGuide: "Document immunization status completely",
        improvementExamples: [
          '"Are your child\'s immunizations up to date?"',
          '"Which vaccines has your child received and when?"',
          '"Do you have the immunization record we can review?"'
        ]
      },
      {
        category: "Nutritional History",
        requiredElements: ["Breastfeeding/formula", "Weaning age", "Current diet", "Feeding difficulties"],
        commonMistakes: ["Not asking about weaning", "Missing feeding problems"],
        scoringGuide: "Understand child's nutritional intake",
        improvementExamples: [
          '"Is your child breastfed or formula fed?"',
          '"At what age did you start solid foods?"',
          '"What does your child typically eat in a day?"',
          '"Have you noticed any feeding difficulties?"'
        ]
      }
    ]
  }
};

// ============ INTELLIGENT SPEAKER DETECTION ============
interface ProcessedTranscript {
  formattedTranscript: string;
  speakerDetectionNotes: string;
  transcriptStats: {
    exchanges: number;
    studentLines: number;
    patientLines: number;
    totalWords: number;
  };
}

function intelligentlyProcessTranscript(messages: Array<{ role: string; content: string }>): ProcessedTranscript {
  const hasExplicitLabels = messages.some(msg => 
    msg.content.includes('STUDENT:') || 
    msg.content.includes('PATIENT:') ||
    msg.role === 'assistant' || 
    msg.role === 'user'
  );

  let formattedLines: string[] = [];
  let detectionMethod = "Rule-based detection";
  let studentLineCount = 0;
  let patientLineCount = 0;

  if (hasExplicitLabels) {
    for (const msg of messages) {
      if (msg.role === 'assistant' || msg.content.includes('STUDENT:')) {
        const cleanContent = msg.content.replace(/STUDENT:\s*/gi, '');
        formattedLines.push(`STUDENT: ${cleanContent}`);
        studentLineCount++;
      } else {
        const cleanContent = msg.content.replace(/PATIENT:\s*/gi, '');
        formattedLines.push(`PATIENT: ${cleanContent}`);
        patientLineCount++;
      }
    }
    detectionMethod = "Explicit speaker labels from database";
  } else {
    for (const msg of messages) {
      let content = msg.content;
      let detectedSpeaker: 'student' | 'patient' | 'unknown' = 'unknown';
      
      if (msg.role === 'assistant') {
        detectedSpeaker = 'student';
      } else if (msg.role === 'user') {
        detectedSpeaker = 'patient';
      }
      
      if (detectedSpeaker === 'unknown') {
        const lowerContent = content.toLowerCase();
        
        const studentIndicators = [
          /\b(i'?m\s+dr\.?\s+\w+)\b/i,
          /\b(what brings you in|tell me about your|when did the|how long have you|any past medical)\b/i,
          /\b(do you have any|are you taking|have you ever|can you describe)\b/i,
          /\b(consent|permission|examination|history)\b/i,
        ];
        
        const patientIndicators = [
          /\b(i feel|i have|i'm experiencing|it hurts)\b/i,
          /\b(yes|no|maybe|sometimes|usually|never)\b/i,
          /\b(my (head|stomach|chest|back|leg|arm))\b/i,
        ];
        
        let studentScore = 0;
        let patientScore = 0;
        
        for (const pattern of studentIndicators) {
          if (pattern.test(lowerContent)) studentScore++;
        }
        
        for (const pattern of patientIndicators) {
          if (pattern.test(lowerContent)) patientScore++;
        }
        
        if (content.length < 20 && /^(yes|no|ok|okay|sure|maybe)$/i.test(content.trim())) {
          patientScore += 3;
        }
        
        if (content.includes('?') && content.split('?').length > 2) {
          studentScore += 2;
        }
        
        detectedSpeaker = studentScore > patientScore ? 'student' : 'patient';
        detectionMethod = `Intelligent pattern detection (student:${studentScore}, patient:${patientScore})`;
      }
      
      const speakerLabel = detectedSpeaker === 'student' ? 'STUDENT' : 'PATIENT';
      if (detectedSpeaker === 'student') studentLineCount++;
      else patientLineCount++;
      
      formattedLines.push(`${speakerLabel}: ${content}`);
    }
  }
  
  const formattedTranscript = formattedLines.join('\n');
  const totalWords = formattedTranscript.split(/\s+/).length;
  
  return {
    formattedTranscript,
    speakerDetectionNotes: detectionMethod,
    transcriptStats: {
      exchanges: messages.length,
      studentLines: studentLineCount,
      patientLines: patientLineCount,
      totalWords: totalWords
    }
  };
}

// ============ ENHANCED CONSENT DETECTION ============
function detectConsent(messages: Array<{ role: string; content: string }>): { hasConsent: boolean; consentEvidence: string | null } {
  const consentPatterns = [
    /\b(?:do I have|may I have|can I get|do you give|would you give)\s+(?:your|)\s*(?:permission|consent|okay|approval)\b/i,
    /\b(?:is it|is that|are you)\s+(?:okay|alright|fine|comfortable|happy)\b/i,
    /\b(?:do you|would you)\s+(?:mind|allow)\b/i,
    /\b(?:may I|can I|could I|kin I|let me|lemme)\s+(?:ask|talk|proceed|examine|check|touch|palpate|listen)\b/i,
    /\b(?:that ok|that okay|that alright|sounds good|fine by you)\b/i,
    /\b(?:permission|consent|approv(?:al)?)\b/i,
    /\b(?:I'm ready|ready to begin|ready to start|let's begin)\b/i,
  ];
  
  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    for (const pattern of consentPatterns) {
      if (pattern.test(content)) {
        return { hasConsent: true, consentEvidence: msg.content };
      }
    }
  }
  
  return { hasConsent: false, consentEvidence: null };
}

// ============ NATURAL LANGUAGE PROMPT WITH CONDITION PRIORITIZATION ============
function buildAnalysisPrompt(
  transcript: string, 
  type: string, 
  departmentName: string,
  categories: string[],
  patientCondition: string
): string {
  const checklist = departmentChecklists[departmentName] || departmentChecklists['General Medicine'];
  const maxScore = 10;
  const halfScore = 5;

  const detailedPointsSection = checklist.detailedPoints.map(point => `
**${point.category}** (${point.scoringGuide})
- Required: ${point.requiredElements.join(', ')}
- Common mistakes: ${point.commonMistakes.join(', ')}
- Example phrasing: ${point.improvementExamples[0] || 'Use appropriate clinical language'}`).join('\n\n');

  const keyQuestionsSection = checklist.keyQuestions.map(q => `- "${q}"`).join('\n');

  const conditionContext = patientCondition ? `
**PATIENT CONTEXT**: This patient is presenting with ${patientCondition} in the ${departmentName} department.

The student should ask questions relevant to this specific presentation. For example:
- If it's chest pain, they should ask about character, radiation, triggers
- If it's shortness of breath, they should ask about orthopnea, PND, edema
- If it's headache, they should ask about aura, triggers, associated symptoms

**EVALUATE BASED ON**: Whether the student asked appropriate questions for this clinical scenario. Generic questions get partial credit. Condition-specific questions get full credit.
` : '';

  // Create the expected JSON structure as a template
  const jsonTemplate = {
    rating: 1,
    percentage: 0,
    points_considered: categories.map(cat => ({
      category: cat,
      score: 0,
      evidence: "string",
      why_this_score: "string"
    })),
    strengths: [
      { category: "Example Category", score: 10, evidence: "Example evidence quote from transcript" }
    ],
    areas_of_improvement: [
      { category: "Example Category", score: 0, evidence: "Example evidence quote from transcript" }
    ],
    suggestions: [
      "Example suggestion 1",
      "Example suggestion 2",
      "Example suggestion 3"
    ],
    overall_assessment: "Example overall assessment summary."
  };

  return `You are an OSCE examiner marking a medical student's history-taking in a ${type.toUpperCase()} simulation.

${conditionContext}

**SCORING GUIDELINES** (Be generous - credit attempts):
- 0 = No attempt at all
- ${halfScore} = Attempt made but incomplete or unclear
- ${maxScore} = Clear, complete, and appropriate question

**IMPORTANT**: 
- Credit ANY attempt at consent or introduction
- Don't penalize for transcription noise or grammar issues
- If the patient volunteered information, give partial credit

**${departmentName.toUpperCase()} CLINICAL CHECKLIST** (Score each category):

${detailedPointsSection}

**Key questions to look for**:
${keyQuestionsSection}

**Red flags that should be explored**:
${checklist.redFlags.map(flag => `- ${flag}`).join('\n')}

**Essential clinical points to cover**:
${checklist.mustAsk.map(item => `- ${item}`).join('\n')}

**Expected terminology**: ${checklist.terminology.join(', ')}

**TRANSCRIPT**:
${transcript}

**CRITICAL JSON FORMAT REQUIREMENTS**:
You MUST return a JSON object with the EXACT structure shown below. Do NOT return strings for strengths or areas_of_improvement. Each strength and area_of_improvement MUST be an object with "category", "score", and "evidence" fields.

**REQUIRED JSON STRUCTURE**:
\`\`\`json
${JSON.stringify(jsonTemplate, null, 2)}
\`\`\`

**FIELD DESCRIPTIONS**:
1. "rating": Integer from 1-5 stars (calculated from percentage: <20=1, 20-39=2, 40-59=3, 60-79=4, ≥80=5)
2. "percentage": Integer from 0-100 representing overall score
3. "points_considered": Array of objects for EACH category listed above:
   - "category": Exact category name from the checklist above
   - "score": Integer 0, ${halfScore}, or ${maxScore}
   - "evidence": Direct quote from transcript showing what student said/did (max 100 chars)
   - "why_this_score": Brief explanation of scoring rationale (1 sentence)
4. "strengths": Array of objects (3-5 items) where student performed well:
   - "category": String describing what was done well
   - "score": Integer score awarded for this item (use ${halfScore} or ${maxScore})
   - "evidence": Direct quote from transcript (max 100 chars)
5. "areas_of_improvement": Array of objects (3-5 items) where student needs improvement:
   - "category": String describing what was missed or inadequate
   - "score": Integer score awarded (usually 0 or ${halfScore})
   - "evidence": Direct quote showing the gap OR "Not addressed" if completely missing
6. "suggestions": Array of 8-10 strings with actionable, specific advice (each 10-20 words)
7. "overall_assessment": String with 2-3 sentences summarizing performance

**STRENGTHS EXAMPLE** (must follow this exact object format):
\`\`\`json
"strengths": [
  { "category": "Consent Obtained", "score": 10, "evidence": "Do I have your permission to ask you some questions?" },
  { "category": "Open-ended Chief Complaint", "score": 8, "evidence": "What brings you in to see me today?" },
  { "category": "Pain Location Identified", "score": 10, "evidence": "Where exactly is the chest discomfort located?" }
]
\`\`\`

**AREAS OF IMPROVEMENT EXAMPLE** (must follow this exact object format):
\`\`\`json
"areas_of_improvement": [
  { "category": "Missing Radiation Question", "score": 0, "evidence": "Not addressed" },
  { "category": "No Severity Scale", "score": 2, "evidence": "It's been bothering me... (no 0-10 scale asked)" },
  { "category": "Past Medical History", "score": 0, "evidence": "Not addressed" }
]
\`\`\`

**IMPORTANT RULES**:
- NEVER return "Score: | Evidence:" as a string - this will break the UI
- EVERY strength and area_of_improvement MUST be an object with category, score, and evidence
- Use direct quotes from transcript for evidence when available
- If no evidence exists, use "Not addressed" as the evidence string
- Ensure all category names match the checklist categories exactly
- Suggestions should be specific and actionable, not generic

**TASK**: Analyze the transcript and return ONLY valid JSON matching the exact structure above. No markdown, no explanations, no additional text.

Return ONLY the JSON object.`;
}

// ============ NORMALIZE FEEDBACK RESPONSE ============
function normalizeFeedbackResponse(feedback: any, categories: string[], departmentName: string): any {
  // If strengths is array of strings (DeepSeek format), convert to object format
  if (feedback.strengths && Array.isArray(feedback.strengths) && typeof feedback.strengths[0] === 'string') {
    const strengthsArray = feedback.strengths;
    feedback.strengths = strengthsArray
      .filter((s: string) => s && s.trim() && !s.includes('Score: | Evidence:'))
      .map((s: string, index: number) => {
        const match = s.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          return {
            category: match[1].trim(),
            score: 5,
            evidence: match[2].trim()
          };
        }
        return {
          category: `Strength ${index + 1}`,
          score: 5,
          evidence: s
        };
      });
    
    if (feedback.strengths.length === 0) {
      feedback.strengths = [{
        category: "Basic Structure",
        score: 5,
        evidence: "Student attempted history taking"
      }];
    }
  }

  // If areas_of_improvement is array of strings, convert to object format
  if (feedback.areas_of_improvement && Array.isArray(feedback.areas_of_improvement) && typeof feedback.areas_of_improvement[0] === 'string') {
    const improvementsArray = feedback.areas_of_improvement;
    feedback.areas_of_improvement = improvementsArray
      .filter((s: string) => s && s.trim() && !s.includes('Score: | Evidence:'))
      .map((s: string, index: number) => {
        const match = s.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          return {
            category: match[1].trim(),
            score: 0,
            evidence: match[2].trim()
          };
        }
        return {
          category: `Area ${index + 1}`,
          score: 0,
          evidence: s
        };
      });
    
    if (feedback.areas_of_improvement.length === 0 && feedback.suggestions) {
      feedback.areas_of_improvement = feedback.suggestions.slice(0, 5).map((s: string, index: number) => ({
        category: categories[index] || `Category ${index + 1}`,
        score: 0,
        evidence: s.substring(0, 100)
      }));
    }
  }

  // Ensure suggestions are unique and not empty
  if (feedback.suggestions) {
    feedback.suggestions = [...new Set(feedback.suggestions.filter((s: string) => s && s.trim()))];
  }

  return feedback;
}

// ============ APPLY ZERO SCORE FOR NO CONSENT (but keep all analysis) ============
function applyZeroScoreForNoConsent(feedback: any, patientCondition: string, departmentName: string): any {
  // Store the original percentage for reference (but we'll override the displayed score)
  const originalPercentage = feedback.percentage;
  
  // Override percentage and rating to 0
  feedback.percentage = 0;
  feedback.rating = 1;
  
  // Add consent failure as FIRST area of improvement (prepend to existing list)
  const consentImprovement = {
    category: "Consent Not Obtained",
    score: 0,
    evidence: "Not addressed"
  };
  
  if (feedback.areas_of_improvement) {
    // Check if consent is already mentioned
    const hasConsentMention = feedback.areas_of_improvement.some((item: any) => 
      item.category?.toLowerCase().includes('consent')
    );
    
    if (!hasConsentMention) {
      feedback.areas_of_improvement = [
        consentImprovement,
        ...(feedback.areas_of_improvement || [])
      ];
    }
  } else {
    feedback.areas_of_improvement = [consentImprovement];
  }
  
  // Add consent suggestion as FIRST item
  const consentSuggestion = "CRITICAL: Always obtain consent before beginning any patient encounter. Say: 'Do I have your permission to ask you some questions?' This is a mandatory requirement that affects your grade significantly.";
  
  if (feedback.suggestions) {
    // Remove any existing consent suggestions to avoid duplication, then prepend
    feedback.suggestions = feedback.suggestions.filter((s: string) => 
      !s.toLowerCase().includes('consent') && !s.toLowerCase().includes('permission')
    );
    feedback.suggestions = [consentSuggestion, ...feedback.suggestions];
  } else {
    feedback.suggestions = [consentSuggestion];
  }
  
  // Update overall assessment to mention consent failure AND keep the original analysis
  const conditionPhrase = patientCondition ? `presenting with ${patientCondition}` : '';
  const originalAssessment = feedback.overall_assessment || '';
  
  feedback.overall_assessment = `⚠️ CRITICAL FAILURE: The student did not obtain consent before beginning the consultation. This is a mandatory requirement in OSCE examinations, resulting in an automatic score of 0% regardless of other performance. ${originalAssessment}`;
  
  return feedback;
}

// ============ FALLBACK RESPONSE ==========
function getFallbackResponse(
  type: string, 
  departmentName: string, 
  messageCount: number, 
  hasConsent: boolean = false,
  patientCondition: string = ''
): any {
  const checklist = departmentChecklists[departmentName] || departmentChecklists['General Medicine'];
  const categories = type === 'physical_exam' ? PHYSICAL_CATEGORIES : 
                     type === 'counselling' ? COUNSEL_CATEGORIES : checklist.categories;
  const maxScore = 10;
  
  const consentScore = hasConsent ? 5 : 0;
  
  const pointsConsidered = categories.map(category => ({
    category,
    score: category === 'Consent & Introduction' ? consentScore : 0,
    evidence: category === 'Consent & Introduction' && hasConsent ? "Consent was attempted" : "Not addressed",
    why_this_score: category === 'Consent & Introduction' && hasConsent 
      ? "Student attempted to get consent"
      : "No evidence in conversation"
  }));
  
  const totalScore = consentScore;
  const maxPossibleScore = categories.length * maxScore;
  const calculatedPercentage = Math.round((totalScore / maxPossibleScore) * 100);
  
  // If no consent, override to 0
  const percentage = hasConsent ? calculatedPercentage : 0;
  const rating = percentage < 20 ? 1 : percentage < 40 ? 2 : percentage < 60 ? 3 : percentage < 80 ? 4 : 5;
  
  const conditionPhrase = patientCondition ? `presenting with ${patientCondition}` : `in ${departmentName}`;
  
  const suggestions = [
    `Start with a proper introduction: "Hello, my name is Dr. [Name]. Do I have your permission to ask you some questions?"`,
    `Ask an open-ended question for the chief complaint: "What brings you in today?"`,
    `Use a systematic framework like SOCRATES to explore symptoms thoroughly`,
    `Take a complete past medical history including chronic conditions`,
    `Review all current medications, including over-the-counter ones`,
    `Ask about allergies and any reactions`,
    `Document family history of relevant conditions`,
    `Assess social history including smoking, alcohol, and occupation`,
    `Perform a review of systems to identify associated symptoms`,
    `Summarize your findings back to the patient to confirm understanding`,
    `Close with a clear plan and ask if the patient has questions`
  ];
  
  const conditionSpecificTips = patientCondition ? [
    `Ask specific questions about the ${patientCondition.toLowerCase()} presentation`,
    `Explore how the symptoms affect the patient's daily activities`,
    `Inquire about any previous treatments or investigations for this condition`
  ] : [];
  
  const allSuggestions = [...conditionSpecificTips, ...suggestions];
  
  const strengths = hasConsent ? [{
    category: "Consent Obtained",
    score: 5,
    evidence: "Student attempted to get consent"
  }] : [];
  
  const areasOfImprovement = categories.slice(1).map(cat => ({
    category: cat,
    score: 0,
    evidence: "Not addressed"
  }));
  
  // If no consent, add consent failure as first AOI
  if (!hasConsent) {
    areasOfImprovement.unshift({
      category: "Consent Not Obtained",
      score: 0,
      evidence: "Not addressed"
    });
  }
  
  let overallAssessment = `This ${departmentName} encounter ${conditionPhrase} showed significant gaps. `;
  if (!hasConsent) {
    overallAssessment = `⚠️ CRITICAL FAILURE: The student did not obtain consent before beginning the consultation. This is a mandatory requirement in OSCE examinations, resulting in an automatic score of 0% regardless of other performance. ` + overallAssessment;
  } else {
    overallAssessment += hasConsent ? 'Consent was obtained, but ' : '';
    overallAssessment += `the student failed to take a complete history. Only ${messageCount} exchanges occurred. Focus on systematic history-taking structure.`;
  }
  
  return {
    rating,
    percentage,
    points_considered: pointsConsidered,
    strengths,
    areas_of_improvement: areasOfImprovement,
    suggestions: allSuggestions.slice(0, 12),
    overall_assessment: overallAssessment,
    patientCondition: patientCondition || undefined,
    department: departmentName
  };
}

// ============ MAIN POST HANDLER ============
export async function POST(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    console.log('📊 Starting analysis for chat:', params.chatId);
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let departmentName = 'General Medicine';
    let patientCondition = '';
    
    try {
      const body = await request.json();
      departmentName = body.departmentName || 'General Medicine';
      patientCondition = body.patientCondition || '';
      console.log('📋 Department:', departmentName);
      console.log('🩺 Patient Condition:', patientCondition);
    } catch (e) {
      console.log('⚠️ No department/condition in request');
    }

    // Token check (non-blocking)
    try {
      const tokenCheck = await TokenService.deductTokens(
        session.user.id,
        'osce_analysis',
        1,
        { service: 'session_analysis' }
      );
      if (!tokenCheck.success) {
        console.log('⚠️ Token deduction failed:', tokenCheck.message);
      }
    } catch (tokenError) {
      console.log('⚠️ Token service error, continuing');
    }
   
    const chat = await getChatById(params.chatId);
    if (!chat) {
      console.error('❌ Chat not found for ID:', params.chatId);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    
    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const messages = await getMessagesByChat(params.chatId);
    if (messages.length === 0) {
      const fallback = getFallbackResponse('clerking', departmentName, 0, false, patientCondition);
      return NextResponse.json(fallback);
    }
    
    // Enhanced consent detection
    const { hasConsent, consentEvidence } = detectConsent(messages);
    console.log('🔍 Consent detected:', hasConsent, consentEvidence ? `Evidence: "${consentEvidence.substring(0, 50)}..."` : 'No evidence');
    
    const { formattedTranscript, transcriptStats } = intelligentlyProcessTranscript(messages);
    console.log('📊 Transcript stats:', transcriptStats);

    const checklist = departmentChecklists[departmentName] || departmentChecklists['General Medicine'];

    let type = 'clerking';
    if (chat.sessionId) {
      try {
        const sessionData = await getSessionById(chat.sessionId);
        if (sessionData) type = sessionData.type || 'clerking';
      } catch (e) {}
    }

    const categories = type === 'physical_exam' ? PHYSICAL_CATEGORIES : 
                       type === 'counselling' ? COUNSEL_CATEGORIES : checklist.categories;

    const prompt = buildAnalysisPrompt(formattedTranscript, type, departmentName, categories, patientCondition);
    console.log('📤 Sending to AI with condition:', patientCondition, '| Consent:', hasConsent);

    // Call AI with fallback (Google -> OpenAI -> DeepSeek)
    let response;
    try {
      response = await callAIWithFallback(prompt);
    } catch (aiError: any) {
      console.error('❌ All AI providers failed:', aiError.message);
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    let result = response.choices[0].message.content;
    if (!result) {
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    result = result.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    let feedback;
    try {
      feedback = JSON.parse(result);
      feedback = normalizeFeedbackResponse(feedback, categories, departmentName);
    } catch (parseError) {
      console.error('❌ Parse error:', parseError);
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    // Ensure consent point gets credit if consent was obtained
    if (hasConsent && feedback.points_considered) {
      const consentPoint = feedback.points_considered.find((p: any) => 
        p.category.includes('Consent') || p.category.includes('Introduction')
      );
      if (consentPoint && consentPoint.score === 0) {
        consentPoint.score = 5;
        consentPoint.evidence = consentEvidence || "Student attempted to get consent";
        consentPoint.why_this_score = "Student obtained consent before proceeding";
      }
    }

    const maxScore = 10;
    if (feedback.points_considered) {
      const totalScore = feedback.points_considered.reduce((sum: number, point: any) => sum + (point.score || 0), 0);
      const maxPossibleScore = categories.length * maxScore;
      const calculatedPercentage = Math.round((totalScore / maxPossibleScore) * 100);
      feedback.percentage = calculatedPercentage;
      
      if (calculatedPercentage < 20) feedback.rating = 1;
      else if (calculatedPercentage < 40) feedback.rating = 2;
      else if (calculatedPercentage < 60) feedback.rating = 3;
      else if (calculatedPercentage < 80) feedback.rating = 4;
      else feedback.rating = 5;
    }

    feedback.strengths = feedback.strengths || [];
    feedback.areas_of_improvement = feedback.areas_of_improvement || [];
    feedback.suggestions = feedback.suggestions || [];
    
    if (feedback.suggestions.length < 5) {
      const basicSuggestions = [
        `Start with a proper introduction and consent`,
        `Use open-ended questions to explore the chief complaint`,
        `Take a systematic approach to history-taking`,
        `Summarize findings back to the patient`,
        `Close with a clear plan and check for questions`
      ];
      feedback.suggestions = [...feedback.suggestions, ...basicSuggestions].slice(0, 10);
    }
    
    feedback.patientCondition = patientCondition || undefined;
    feedback.department = departmentName;

    // 🔴 APPLY ZERO SCORE RULE IF NO CONSENT (but keep all analysis)
    if (!hasConsent) {
      console.log('⚠️ No consent detected - applying zero score rule while preserving analysis');
      feedback = applyZeroScoreForNoConsent(feedback, patientCondition, departmentName);
    }

    try {
      await updateChat(params.chatId, {
        latestScore: feedback.percentage,
        latestGrade: `${feedback.rating}/5`,
        latestFeedback: JSON.stringify(feedback),
      });
      console.log('✅ Saved to database');
    } catch (dbError) {
      console.error('⚠️ DB save error:', dbError);
    }

    return NextResponse.json(feedback);
    
  } catch (error) {
    console.error("❌ Fatal error:", error);
    const fallback = getFallbackResponse('clerking', 'General Medicine', 0, false, '');
    return NextResponse.json(fallback);
  }
}

// ============ GET HANDLER ============
export async function GET(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let departmentName = 'General Medicine';
    let patientCondition = '';
    
    try {
      const url = new URL(request.url);
      departmentName = url.searchParams.get('department') || 'General Medicine';
      patientCondition = url.searchParams.get('condition') || '';
    } catch (e) {}

    const chat = await getChatById(params.chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    
    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const messages = await getMessagesByChat(params.chatId);
    if (messages.length === 0) {
      const fallback = getFallbackResponse('clerking', departmentName, 0, false, patientCondition);
      return NextResponse.json(fallback);
    }
    
    // Enhanced consent detection
    const { hasConsent, consentEvidence } = detectConsent(messages);
    
    const { formattedTranscript, transcriptStats } = intelligentlyProcessTranscript(messages);
    const checklist = departmentChecklists[departmentName] || departmentChecklists['General Medicine'];

    let type = 'clerking';
    if (chat.sessionId) {
      try {
        const sessionData = await getSessionById(chat.sessionId);
        if (sessionData) type = sessionData.type || 'clerking';
      } catch (e) {}
    }

    const categories = type === 'physical_exam' ? PHYSICAL_CATEGORIES : 
                       type === 'counselling' ? COUNSEL_CATEGORIES : checklist.categories;

    const prompt = buildAnalysisPrompt(formattedTranscript, type, departmentName, categories, patientCondition);

    // Call AI with fallback
    let response;
    try {
      response = await callAIWithFallback(prompt);
    } catch (aiError: any) {
      console.error('AI error:', aiError.message);
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    let result = response.choices[0].message.content;
    if (!result) {
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    result = result.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    let feedback;
    try {
      feedback = JSON.parse(result);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      const fallback = getFallbackResponse(type, departmentName, transcriptStats.exchanges, hasConsent, patientCondition);
      return NextResponse.json(fallback);
    }

    // Ensure consent point gets credit if consent was obtained
    if (hasConsent && feedback.points_considered) {
      const consentPoint = feedback.points_considered.find((p: any) => 
        p.category.includes('Consent') || p.category.includes('Introduction')
      );
      if (consentPoint && consentPoint.score === 0) {
        consentPoint.score = 5;
        consentPoint.evidence = consentEvidence || "Student attempted to get consent";
        consentPoint.why_this_score = "Student obtained consent before proceeding";
      }
    }

    const maxScore = 10;
    if (feedback.points_considered) {
      const totalScore = feedback.points_considered.reduce((sum: number, point: any) => sum + (point.score || 0), 0);
      const maxPossibleScore = categories.length * maxScore;
      const calculatedPercentage = Math.round((totalScore / maxPossibleScore) * 100);
      feedback.percentage = calculatedPercentage;
      
      if (calculatedPercentage < 20) feedback.rating = 1;
      else if (calculatedPercentage < 40) feedback.rating = 2;
      else if (calculatedPercentage < 60) feedback.rating = 3;
      else if (calculatedPercentage < 80) feedback.rating = 4;
      else feedback.rating = 5;
    }

    feedback.strengths = feedback.strengths || [];
    feedback.areas_of_improvement = feedback.areas_of_improvement || [];
    feedback.suggestions = feedback.suggestions || [];
    
    if (feedback.suggestions.length < 5) {
      feedback.suggestions = [
        `Start with a proper introduction and consent`,
        `Use open-ended questions to explore the chief complaint`,
        `Take a systematic approach to history-taking`,
        `Summarize findings back to the patient`,
        `Close with a clear plan and check for questions`
      ];
    }
    
    feedback.patientCondition = patientCondition || undefined;
    feedback.department = departmentName;

    // 🔴 APPLY ZERO SCORE RULE IF NO CONSENT (but keep all analysis)
    if (!hasConsent) {
      console.log('⚠️ No consent detected - applying zero score rule while preserving analysis');
      feedback = applyZeroScoreForNoConsent(feedback, patientCondition, departmentName);
    }

    try {
      await updateChat(params.chatId, {
        latestScore: feedback.percentage,
        latestGrade: `${feedback.rating}/5`,
        latestFeedback: JSON.stringify(feedback),
      });
    } catch (dbError) {
      console.error('DB save error:', dbError);
    }

    return NextResponse.json(feedback);
    
  } catch (error) {
    console.error("Fatal error:", error);
    const fallback = getFallbackResponse('clerking', 'General Medicine', 0, false, '');
    return NextResponse.json(fallback);
  }
}

const PHYSICAL_CATEGORIES = [
  'Consent',
  'Introduction & Rapport',
  'General Inspection',
  'Vital Signs',
  'Specific System Examination',
  'Additional Tests',
  'Patient Comfort',
  'Summary of Findings',
];

const COUNSEL_CATEGORIES = [
  'Consent',
  'Introduction & Rapport',
  'Assess Patient Understanding',
  'Provide Tailored Information',
  'Empathy & Address Emotions',
  'Check Understanding (Teach-Back)',
  'Action Plan & Follow-Up',
  'Offer Further Support',
];