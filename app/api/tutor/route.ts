import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { aiClient } from "@/lib/services/aiClientService";

interface TutorRequest {
  question: string;
  context: {
    departmentName: string;
    patientCondition: string;
    currentStep: number;
    totalSteps: number;
    conversationType: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  };
  conversationHistory: Array<{ role: string; content: string }>;
  milestones?: {
    introduced: boolean;
    consent: boolean;
    patientInfo: boolean;
    chiefComplaint: boolean;
    historyTaking: boolean;
    redFlags: boolean;
    ice: boolean;
    systemsReview: boolean;
    pastHistory: boolean;
    drugHistory: boolean;
    socialHistory: boolean;
    greeted?: boolean;
    askedQuestions?: boolean;
    toldInfo?: boolean;
    helpedDecision?: boolean;
    explainedEmpathy?: boolean;
    retellRequested?: boolean;
  };
}

// Define types for approaches
interface PainApproach {
  approach: string;
  keyQuestions: string[];
}

interface CounselingApproach {
  approach: string;
  steps: string[];
  stepDetails: Record<string, string[]>;
}

interface PhysicalExamApproach {
  approach: string;
  keyQuestions: string[];
  steps: string[];
}

interface FlashcardApproach {
  approach: string;
  steps: string[];
}

// Department-specific guidance
const departmentGuidance: Record<string, string> = {
  'Gynecology': 'Focus on menstrual history, obstetric history, contraceptive use, sexual history, cervical screening, and gynecological symptoms.',
  'Obstetrics': 'Focus on LMP, EDD, parity, gravida, antenatal care, fetal movements, previous pregnancies, and obstetric complications.',
  'Pediatrics': 'Focus on birth history, developmental milestones, immunization status, feeding history, and growth parameters. Ask parent/guardian appropriately.',
  'Medicine': 'Focus on systematic history taking based on presenting complaint, past medical history, drug history, allergies, family history, social history, and review of systems.',
  'Surgery': 'Focus on acute vs chronic presentation, pain characteristics (if pain present), previous surgeries, trauma history, bleeding risk, and surgical sieve differentials.',
  'Psychiatry': 'Focus on mood, sleep, appetite, energy, concentration, suicidal ideation, self-harm, substance use, and psychosocial stressors.',
  'Emergency': 'Focus on ABCDE approach, red flags, time-critical symptoms, mechanism of injury, and rapid focused history.',
  'Orthopedics': 'Focus on mechanism of injury, functional impact, previous fractures, and specific joint/symptom questions.',
  'Cardiology': 'Focus on chest pain characteristics (using SOCRATES if pain present), cardiac risk factors, family history of heart disease, and cardiac medications.',
  'Respiratory': 'Focus on dyspnea, cough, sputum, hemoptysis, smoking history, occupational exposures, and respiratory medications.',
  'Neurology': 'Focus on onset, progression, associated symptoms, headache characteristics (using SOCRATES if headache), seizure history, and neurological deficits.',
  'Gastroenterology': 'Focus on abdominal pain characteristics, bowel habits, nausea, vomiting, blood in stool, weight changes, and dietary factors.',
  'Nephrology': 'Focus on urinary symptoms, fluid balance, hypertension, dialysis history, and electrolyte disturbances.',
  'Endocrinology': 'Focus on weight changes, energy levels, temperature tolerance, thirst, urination, and thyroid symptoms.',
  'Hematology': 'Focus on fatigue, bleeding, bruising, lymphadenopathy, transfusion history, and clotting history.',
  'Oncology': 'Focus on cancer diagnosis, treatment history, metastasis symptoms, performance status, and pain management.',
  'Rheumatology': 'Focus on joint pain location, morning stiffness, swelling, systemic symptoms, and functional impact.',
  'Infectious Disease': 'Focus on fever pattern, travel history, exposure history, immunization status, and contact history.'
};

// Counseling-specific condition guidance
const counselingConditionGuidance: Record<string, {
  definition: string;
  causes: string[];
  clinicalPresentation: string[];
  complications: string[];
  investigations: string[];
  treatment: string[];
  prognosis: string;
}> = {
  'hypertension': {
    definition: 'Hypertension is persistently elevated blood pressure above 140/90 mmHg.',
    causes: ['Family history', 'High salt intake', 'Obesity', 'Lack of exercise', 'Stress', 'Alcohol consumption', 'Age > 65 years'],
    clinicalPresentation: ['Often asymptomatic', 'Headaches (especially in the morning)', 'Dizziness', 'Blurred vision', 'Chest pain', 'Shortness of breath'],
    complications: ['Stroke', 'Heart attack', 'Heart failure', 'Kidney disease', 'Vision loss', 'Peripheral artery disease'],
    investigations: ['Blood pressure monitoring (clinic and ambulatory)', 'Blood tests (renal function, lipids, glucose)', 'Urinalysis', 'ECG', 'Echocardiogram'],
    treatment: ['Conservative: Low salt diet, exercise, weight loss, stress management', 'Medical: ACE inhibitors, ARBs, Calcium channel blockers, Diuretics, Beta-blockers'],
    prognosis: 'With good control, patients can live normal lives. Uncontrolled hypertension leads to end-organ damage.'
  },
  'diabetes': {
    definition: 'Diabetes mellitus is a chronic condition where blood glucose levels are too high due to insulin deficiency or resistance.',
    causes: ['Family history', 'Obesity', 'Physical inactivity', 'Poor diet', 'Age > 45 years', 'Gestational diabetes history'],
    clinicalPresentation: ['Polyuria (frequent urination)', 'Polydipsia (excessive thirst)', 'Polyphagia (excessive hunger)', 'Weight loss', 'Fatigue', 'Blurred vision', 'Slow-healing wounds'],
    complications: ['Heart disease', 'Stroke', 'Kidney failure', 'Nerve damage (neuropathy)', 'Foot ulcers/amputation', 'Blindness (retinopathy)'],
    investigations: ['Fasting blood glucose', 'Random blood glucose', 'HbA1c', 'Oral glucose tolerance test', 'Urinalysis for ketones'],
    treatment: ['Conservative: Diet control, exercise, weight management', 'Medical: Metformin, Sulphonylureas, DPP-4 inhibitors, SGLT2 inhibitors, Insulin'],
    prognosis: 'Good with tight glucose control. Complications are preventable with proper management.'
  },
  'asthma': {
    definition: 'Asthma is a chronic inflammatory airway disease causing recurrent episodes of wheezing, breathlessness, chest tightness, and cough.',
    causes: ['Family history', 'Allergies (hay fever, eczema)', 'Viral infections', 'Occupational exposures', 'Smoking (including passive)', 'Premature birth'],
    clinicalPresentation: ['Wheezing', 'Chest tightness', 'Shortness of breath', 'Cough (especially at night/early morning)', 'Symptoms worse with exercise, cold air, or allergens'],
    complications: ['Status asthmaticus', 'Respiratory failure', 'Pneumonia', 'Pneumothorax', 'Airway remodeling', 'Impaired quality of life'],
    investigations: ['Spirometry', 'Peak flow monitoring', 'Bronchodilator reversibility test', 'Allergy testing', 'Chest X-ray'],
    treatment: ['Conservative: Avoid triggers, smoking cessation, breathing exercises', 'Medical: SABA (relievers), ICS (preventers), LABA, Leukotriene receptor antagonists'],
    prognosis: 'Most patients achieve good control with medication. Some children outgrow asthma.'
  },
  'hiv': {
    definition: 'Human Immunodeficiency Virus (HIV) attacks the immune system, specifically CD4 cells, leading to acquired immunodeficiency syndrome (AIDS).',
    causes: ['Unprotected sexual contact', 'Sharing contaminated needles', 'Mother-to-child transmission', 'Blood transfusion (rare now)', 'Occupational exposure'],
    clinicalPresentation: ['Acute: Flu-like illness (fever, sore throat, rash)', 'Chronic: Persistent lymphadenopathy, weight loss, diarrhea', 'AIDS: Opportunistic infections (TB, candidiasis, PCP), malignancies'],
    complications: ['AIDS-defining illnesses', 'Opportunistic infections', 'Wasting syndrome', 'HIV-associated dementia', 'Kaposi sarcoma', 'Lymphoma'],
    investigations: ['HIV antibody test (ELISA, rapid test)', 'Confirmatory Western blot', 'CD4 count', 'Viral load', 'Genotype resistance testing'],
    treatment: ['Conservative: Healthy lifestyle, nutrition, safe sex, adherence to ART', 'Medical: ART (combination of NRTIs, NNRTIs, PIs, INSTIs), Prophylaxis for OIs'],
    prognosis: 'With ART, near-normal life expectancy. Without treatment, progression to AIDS in ~10 years.'
  },
  'tuberculosis': {
    definition: 'Tuberculosis (TB) is a bacterial infection caused by Mycobacterium tuberculosis, primarily affecting the lungs but can affect other organs.',
    causes: ['Close contact with infectious person', 'Coughing/sneezing droplets', 'Immunocompromised state (HIV)', 'Poor ventilation', 'Malnutrition', 'Alcoholism'],
    clinicalPresentation: ['Chronic cough (>3 weeks)', 'Hemoptysis (blood in sputum)', 'Fever (night sweats)', 'Weight loss', 'Chest pain', 'Fatigue', 'Anorexia'],
    complications: ['Miliary TB (disseminated)', 'Pleural effusion', 'Pneumothorax', 'Pott disease (spine)', 'TB meningitis', 'Death if untreated'],
    investigations: ['Sputum smear microscopy', 'GeneXpert MTB/RIF', 'Chest X-ray', 'TB culture (gold standard)', 'Tuberculin skin test', 'IGRA'],
    treatment: ['Conservative: Isolation, nutrition, ventilation, sputum hygiene', 'Medical: RIPE regimen (Rifampicin, Isoniazid, Pyrazinamide, Ethambutol) for 6 months'],
    prognosis: 'Excellent with full treatment adherence (95% cure rate). Defaulting leads to drug resistance.'
  },
  'contraception': {
    definition: 'Contraception refers to methods used to prevent pregnancy, allowing couples to plan their family size and spacing.',
    causes: ['Reasons to use: Family planning, birth spacing, medical conditions', 'Not for STI prevention (except condoms)'],
    clinicalPresentation: ['Patient desire to avoid pregnancy', 'Medical contraindications to pregnancy', 'Previous contraceptive experience'],
    complications: ['Method-specific: DVT (combined pills), weight changes, irregular bleeding, device displacement (IUD), allergy (condoms)'],
    investigations: ['Pregnancy test (rule out pregnancy)', 'BP measurement', 'BMI calculation', 'STI screening', 'Pelvic exam for IUD'],
    treatment: ['Conservative: Fertility awareness, withdrawal', 'Medical: Combined pills, POP, implant, injection, IUD (copper/hormonal), vaginal ring', 'Permanent: Tubal ligation, vasectomy'],
    prognosis: 'Highly effective when used correctly. Non-hormonal methods for breastfeeding. Emergency contraception available.'
  },
  'cervical_cancer_screening': {
    definition: 'Cervical cancer screening detects precancerous changes in the cervix to prevent invasive cervical cancer.',
    causes: ['Persistent HPV infection (types 16, 18)', 'Early sexual debut', 'Multiple sexual partners', 'Smoking', 'Immunosuppression', 'Long-term OC use'],
    clinicalPresentation: ['Usually asymptomatic in early stages', 'Post-coital bleeding', 'Intermenstrual bleeding', 'Postmenopausal bleeding', 'Vaginal discharge', 'Pelvic pain (advanced)'],
    complications: ['Invasive cervical cancer', 'Spread to bladder/rectum/lungs', 'Hydronephrosis', 'Renal failure', 'Death'],
    investigations: ['Pap smear (cytology)', 'HPV DNA testing', 'Visual inspection with acetic acid (VIA)', 'Colposcopy', 'Biopsy if abnormal'],
    treatment: ['Conservative: Lifestyle changes, smoking cessation, HPV vaccine', 'Screening: Regular Pap smears every 3-5 years', 'Pre-cancer: Cryotherapy, LEEP, cone biopsy', 'Cancer: Surgery, radiation, chemotherapy'],
    prognosis: 'Excellent if caught early (near 100% cure for pre-cancer). Advanced disease poorer prognosis.'
  },
  'breast_cancer': {
    definition: 'Breast cancer is a malignant tumor that develops from breast cells, usually in the ducts or lobules.',
    causes: ['Family history', 'BRCA1/BRCA2 mutations', 'Early menarche', 'Late menopause', 'Nulliparity', 'Late first pregnancy', 'HRT use', 'Obesity'],
    clinicalPresentation: ['Breast lump (painless, firm, irregular)', 'Nipple changes (retraction, discharge, crusting)', 'Skin changes (dimpling, peau d\'orange)', 'Axillary lymphadenopathy', 'Pain (late)'],
    complications: ['Metastasis (bone, liver, lung, brain)', 'Lymphedema (post-surgery)', 'Treatment side effects', 'Recurrence'],
    investigations: ['Mammography', 'Breast ultrasound', 'MRI breast', 'Core needle biopsy (gold standard)', 'ER/PR/HER2 status', 'Genetic testing'],
    treatment: ['Conservative: Healthy lifestyle, weight management', 'Medical: Chemotherapy, Hormonal therapy, Targeted therapy (HER2)', 'Surgical: Lumpectomy, Mastectomy, Sentinel node biopsy', 'Radiotherapy'],
    prognosis: 'Excellent for early-stage (90%+ 5-year survival). Depends on stage, grade, receptor status, and response to treatment.'
  },
  'prostate_cancer': {
    definition: 'Prostate cancer is malignant growth in the prostate gland, often slow-growing but can be aggressive.',
    causes: ['Age (>50 years)', 'Family history', 'African/Caribbean ethnicity', 'BRCA mutations', 'High-fat diet', 'Obesity'],
    clinicalPresentation: ['Often asymptomatic (early)', 'Urinary symptoms (frequency, hesitancy, weak stream)', 'Hematuria', 'Erectile dysfunction', 'Bone pain (advanced)', 'Weight loss'],
    complications: ['Bone metastases (pain, fractures)', 'Spinal cord compression', 'Urinary obstruction', 'Renal failure', 'Incontinence after treatment'],
    investigations: ['PSA blood test', 'Digital rectal examination (DRE)', 'Multiparametric MRI', 'Transrectal ultrasound biopsy', 'Bone scan (if metastatic)'],
    treatment: ['Conservative: Active surveillance (low risk)', 'Medical: Hormonal therapy (ADT), Chemotherapy', 'Surgical: Radical prostatectomy', 'Radiotherapy: External beam, Brachytherapy'],
    prognosis: 'Excellent for localized disease (nearly 100% 5-year survival). Advanced disease poorer but treatable.'
  },
  'sickle_cell': {
    definition: 'Sickle cell disease is an inherited blood disorder causing abnormal hemoglobin (HbS), leading to sickle-shaped red blood cells.',
    causes: ['Inheritance from both parents (HbSS)', 'Trait from one parent (HbAS)', 'Family history', 'African, Caribbean, Mediterranean, Middle Eastern ancestry'],
    clinicalPresentation: ['Chronic hemolytic anemia', 'Painful vaso-occlusive crises', 'Hand-foot syndrome (dactylitis)', 'Acute chest syndrome', 'Splenic sequestration', 'Stroke risk'],
    complications: ['Stroke', 'Pulmonary hypertension', 'Avascular necrosis', 'Leg ulcers', 'Priapism', 'Gallstones', 'Renal failure', 'Infections'],
    investigations: ['Newborn screening', 'Hemoglobin electrophoresis', 'Complete blood count', 'Peripheral smear', 'Sickling test', 'Prenatal testing'],
    treatment: ['Conservative: Hydration, folic acid, avoid triggers', 'Medical: Hydroxyurea, Pain management, Blood transfusions', 'Curative: Bone marrow transplant', 'Supportive: Vaccinations, Penicillin prophylaxis'],
    prognosis: 'Improved with hydroxyurea and comprehensive care. Life expectancy now >50 years, but still reduced.'
  }
};

// Counseling-specific GATHER approach
const counselingGatherApproach: CounselingApproach = {
  approach: 'GATHER (Greet, Ask, Tell, Help, Explain/Empathy, Retell/Return)',
  steps: ['GREET', 'ASK', 'TELL', 'HELP', 'EXPLAIN/EMPATHY', 'RETELL/RETURN'],
  stepDetails: {
    'GREET': [
      'Greet the examiner: "Good morning/afternoon, Sir/Ma"',
      'Greet the patient: "Good morning/afternoon, please are you Mr/Mrs X?"',
      'Establish rapport: "How are you doing today?"',
      'Introduce yourself: "I am a candidate for this examination and I have been asked to counsel you regarding your condition"',
      'Assure confidentiality: "Whatever is discussed here will not be divulged without your permission"',
      'Obtain consent: "Please, Sir/Ma, may I proceed?"'
    ],
    'ASK': [
      'Language preference: "Is English your preferred means of communication?" (If no, request interpreter)',
      'Setting comfort: "Are you comfortable here? Would you like to move elsewhere?"',
      'Family presence: "Would you like a family member here with you?"',
      'Quick biodata: Confirm name, age, occupation',
      'Quick history: Brief history focusing on symptoms, risk factors, possible complications',
      'Knowledge assessment: "What can you tell me about your condition?"'
    ],
    'TELL': [
      'DEFINITION: Define the condition precisely with key terms',
      'CAUSES: Explain risk factors, pathogenesis, mode of inheritance',
      'CLINICAL PRESENTATION: Describe signs and symptoms',
      'COMPLICATIONS: Explain undesired outcomes if not managed promptly',
      'INVESTIGATIONS: Specify relevant diagnostic tests',
      'TREATMENT: Cover Conservative, Medical, and Surgical approaches',
      'PROGNOSIS: Explain expected outcomes from management'
    ],
    'HELP': [
      'Check understanding: "Do you understand everything I have told you?"',
      'Ask about questions: "Do you have any questions for me?"',
      'Explore decision: "What have you decided to do?" (Especially for contraceptives, procedures, surgeries)',
      'Support informed decision making by presenting options and their implications'
    ],
    'EXPLAIN/EMPATHY': [
      'Answer all patient questions clearly and thoroughly',
      'Show empathy throughout: "I know it has been tough for you"',
      'Be polite, understanding, and convey sympathies when appropriate',
      '"Be rest assured you are in the right hands"'
    ],
    'RETELL/RETURN': [
      'Request patient to repeat: "Can you please tell me in your own words what you understood?"',
      'Clarify any misunderstandings',
      'Schedule follow-up: "Please come back for review after [timeframe]"',
      'Provide written information if available'
    ]
  }
};

// Condition-specific approaches for pain conditions
const conditionApproaches: Record<string, PainApproach> = {
  'chest pain': {
    approach: 'SOCRATES',
    keyQuestions: [
      'Site: Where exactly is the pain?',
      'Onset: When did it start? Sudden or gradual?',
      'Character: What does it feel like? (crushing, sharp, burning, stabbing)',
      'Radiation: Does it go anywhere? (jaw, arm, back, neck)',
      'Associated symptoms: Any shortness of breath, sweating, nausea, palpitations?',
      'Timing: Constant or intermittent? How long does it last?',
      'Exacerbating/Relieving: What makes it better or worse? (exercise, rest, GTN)',
      'Severity: On a scale of 0-10, how bad is it?'
    ]
  },
  'abdominal pain': {
    approach: 'SOCRATES + GI-specific',
    keyQuestions: [
      'Site: Where in the abdomen? (quadrant or region)',
      'Onset: When did it start? Sudden or gradual?',
      'Character: What does it feel like? (colicky, sharp, dull, burning)',
      'Radiation: Does it go to back, shoulder, or elsewhere?',
      'Associated symptoms: Nausea, vomiting, diarrhea, constipation, fever?',
      'Timing: Constant or cramping? Related to meals?',
      'Exacerbating/Relieving: What makes it better or worse? (eating, passing stool, position)',
      'Severity: On a scale of 0-10?'
    ]
  },
  'headache': {
    approach: 'SOCRATES + red flags',
    keyQuestions: [
      'Site: Where is the headache? (whole head, one side, behind eyes)',
      'Onset: When did it start? Sudden (thunderclap) or gradual?',
      'Character: Throbbing, pressure-like, stabbing, band-like?',
      'Radiation: Does it spread to neck or shoulders?',
      'Associated symptoms: Visual changes, nausea, photophobia, neurological symptoms?',
      'Timing: Constant or episodic? How long do attacks last?',
      'Exacerbating/Relieving: What triggers it? What helps? (medication, rest, dark room)',
      'Severity: Rate 0-10',
      'RED FLAGS: Worst headache ever, neurological deficit, fever, trauma, immunocompromised'
    ]
  },
  'joint pain': {
    approach: 'SOCRATES + functional impact',
    keyQuestions: [
      'Site: Which joints? Symmetrical or single? Large or small joints?',
      'Onset: Acute or chronic?',
      'Character: Aching, sharp, burning?',
      'Radiation: Does it affect other areas?',
      'Associated symptoms: Swelling, redness, warmth, stiffness, fatigue, rash?',
      'Timing: Morning stiffness (how long?), worse with activity or rest?',
      'Exacerbating/Relieving: What helps? (NSAIDs, rest, heat/cold)',
      'Severity: 0-10, affecting daily activities?'
    ]
  },
  'back pain': {
    approach: 'SOCRATES + red flags',
    keyQuestions: [
      'Site: Upper, mid, or lower back?',
      'Onset: Traumatic or spontaneous?',
      'Character: Aching, shooting, burning?',
      'Radiation: Down legs?',
      'Associated symptoms: Neurological symptoms (numbness, weakness, bladder/bowel changes)',
      'Timing: Constant or intermittent? Worse with movement?',
      'Exacerbating/Relieving: Lying flat, sitting, walking?',
      'Severity: 0-10',
      'RED FLAGS: Trauma, fever, neurological deficit, cancer history, cauda equina symptoms'
    ]
  },
  'leg pain': {
    approach: 'SOCRATES + vascular/neurological',
    keyQuestions: [
      'Site: Thigh, calf, or whole leg?',
      'Onset: Acute or chronic?',
      'Character: Cramping, burning, sharp, aching?',
      'Radiation: From back? To foot?',
      'Associated symptoms: Swelling, redness, warmth, numbness, weakness?',
      'Timing: Worse with walking? (claudication) Better with rest?',
      'Exacerbating/Relieving: Exercise, elevation, rest, medication?',
      'Severity: 0-10, limiting walking distance?'
    ]
  }
};

// Non-pain symptom approaches (NO severity questions)
const nonPainApproaches: Record<string, { approach: string; keyQuestions: string[] }> = {
  'shortness of breath': {
    approach: 'OLS TAN (Onset, Limitation, Sputum, Triggers, Associated symptoms, Night symptoms)',
    keyQuestions: [
      'Onset: When did it start? Acute or gradual onset?',
      'Limitation: How far can you walk? Any functional limitation?',
      'Sputum: Any cough producing sputum? Color, amount, blood?',
      'Triggers: What makes it worse? (cold air, exercise, allergens, lying flat)',
      'Associated symptoms: Chest pain, wheeze, fever, palpitations?',
      'Night symptoms: Does it wake you from sleep? (PND, orthopnea)'
    ]
  },
  'cough': {
    approach: 'CHARACTER',
    keyQuestions: [
      'Character: Dry or productive?',
      'History: How long? Acute (<3 weeks) or chronic (>8 weeks)?',
      'Associated symptoms: Fever, chest pain, wheeze, hemoptysis?',
      'Red flags: Hemoptysis, weight loss, night sweats, hoarseness?',
      'Triggers: Cold air, exercise, allergens, lying down?',
      'Expectoration: Sputum color, amount, blood?'
    ]
  },
  'fever': {
    approach: 'FACTORS',
    keyQuestions: [
      'Fever pattern: How high? Continuous, intermittent, or relapsing?',
      'Associated symptoms: Headache, myalgia, rash, sore throat, GI symptoms?',
      'Chills/rigors: Any shaking chills?',
      'Timing: When does fever occur? Any diurnal pattern?',
      'Onset: Sudden or gradual?',
      'Risk factors: Travel, sick contacts, vaccinations, immunocompromised?'
    ]
  },
  'dizziness': {
    approach: 'DIZZINESS',
    keyQuestions: [
      'Duration: Seconds, minutes, hours, or constant?',
      'Intensity: Mild, moderate, severe?',
      'Zoning in: Presyncopal, vertigo, or disequilibrium?',
      'Triggers: Positional change, head movement, stress?',
      'Inconsistency: Always present or intermittent?',
      'Neurological: Any focal symptoms, hearing loss, tinnitus?'
    ]
  },
  'fatigue': {
    approach: 'FATIGUE',
    keyQuestions: [
      'Function: How does it affect daily activities?',
      'Associated symptoms: Weight loss, fever, night sweats, pain?',
      'Timing: Constant or worse at certain times?',
      'Impact: Work, social life, self-care?',
      'General review: Sleep, mood, appetite, energy levels?',
      'Underlying conditions: Anemia, thyroid, diabetes, depression?'
    ]
  },
  'weight loss': {
    approach: 'WEIGHT',
    keyQuestions: [
      'Worrying: Any red flags? (fever, night sweats, lymph nodes)',
      'Evaluation: How much weight? Percentage of body weight?',
      'Intentional: Trying to lose weight? Diet? Exercise?',
      'General review: Appetite, swallowing, bowel habits',
      'History: Duration of weight loss? Progressive or stable?'
    ]
  },
  'nausea': {
    approach: 'HAVOC',
    keyQuestions: [
      'History: Duration, frequency, any pattern?',
      'Associated symptoms: Abdominal pain, diarrhea, fever, headache?',
      'Vomiting characteristics: Projectile? Blood? Bilious?',
      'Onset: Acute or chronic? Related to meals?',
      'Content: Food, bile, blood (coffee ground or bright red)?'
    ]
  },
  'rash': {
    approach: 'RASH',
    keyQuestions: [
      'Redness: Any color changes?',
      'Appearance: Macules, papules, vesicles, plaques, pustules?',
      'Site: Where did it start? Spread?',
      'History: When did it first appear?',
      'Evolution: Changed over time?',
      'Associated symptoms: Itching, pain, fever, joint pain?'
    ]
  },
  'bleeding': {
    approach: 'BLEEDING',
    keyQuestions: [
      'Bleeding site: Where? (nose, gums, GI, skin, menorrhagia)',
      'Location: Mucosal or cutaneous?',
      'Extent: How much blood?',
      'Exacerbating factors: Trauma, medications, surgery?',
      'Duration: How long does bleeding last?',
      'Intensity: Mild, moderate, severe?'
    ]
  }
};

// Physical examination approach
const physicalExamApproach: PhysicalExamApproach = {
  approach: 'PIPPA (Position, Inspect, Palpate, Percuss, Auscultate)',
  keyQuestions: [
    'Position: "Could you please lie down/sit up for me?"',
    'Inspect: "I\'m going to look at your [body part] first"',
    'Palpate: "Now I\'m going to feel your [area], please tell me if anything hurts"',
    'Percuss: "I\'m going to tap gently, it might sound hollow"',
    'Auscultate: "I\'m going to listen with my stethoscope, please breathe normally"'
  ],
  steps: [
    'Introduction: "Hello, I\'m Dr. [Name], I need to examine you today"',
    'Consent: "Do I have your permission to examine you?"',
    'Explanation: "I\'m going to check your [area], it will take about X minutes"',
    'Positioning: Position patient appropriately for the examination',
    'Inspection: Look for asymmetry, scars, swelling, color changes',
    'Palpation: Feel for tenderness, masses, temperature, pulses',
    'Percussion: Tap to assess underlying structures (if relevant)',
    'Auscultation: Listen with stethoscope (heart, lungs, abdomen)',
    'Reassure: "You\'re doing great, nearly finished"',
    'Summarize: "I\'ve completed my examination. Your [findings] show..."',
    'Closure: "Do you have any questions about the examination?"'
  ]
};

// Flashcard approach
const flashcardApproach: FlashcardApproach = {
  approach: 'QAEx (Question, Answer, Explanation)',
  steps: [
    'Question: Present a clinical scenario or direct question',
    'Answer: Student provides their answer',
    'Explanation: Provide correct answer with rationale'
  ]
};

// Helper function to determine if condition should use severity questions
function isPainCondition(condition: string): boolean {
  const lowerCondition = condition.toLowerCase();
  
  const painKeywords = ['chest pain', 'abdominal pain', 'joint pain', 'back pain', 'leg pain', 'arm pain', 'muscle pain', 'nerve pain', 'headache'];
  
  for (const keyword of painKeywords) {
    if (lowerCondition.includes(keyword)) {
      return true;
    }
  }
  
  return lowerCondition.includes('pain');
}

// Get appropriate approach based on condition
function getApproachForCondition(condition: string): { approach: string; keyQuestions: string[]; isPain: boolean } {
  const conditionLower = condition.toLowerCase();
  const isPain = isPainCondition(condition);
  
  if (isPain) {
    for (const [key, value] of Object.entries(conditionApproaches)) {
      if (conditionLower.includes(key)) {
        return { ...value, isPain: true };
      }
    }
    
    return {
      approach: 'SOCRATES (for pain symptoms)',
      keyQuestions: [
        'Site: Where exactly is the pain?',
        'Onset: When did it start? Sudden or gradual?',
        'Character: What does it feel like? (sharp, dull, burning, stabbing)',
        'Radiation: Does it go anywhere?',
        'Associated symptoms: Any other symptoms with the pain?',
        'Timing: Constant or intermittent?',
        'Exacerbating/Relieving: What makes it better or worse?',
        'Severity: On a scale of 0-10?'
      ],
      isPain: true
    };
  }
  
  for (const [key, value] of Object.entries(nonPainApproaches)) {
    if (conditionLower.includes(key)) {
      return { approach: value.approach, keyQuestions: value.keyQuestions, isPain: false };
    }
  }
  
  return {
    approach: 'OPQRST (without severity questions)',
    keyQuestions: [
      'Onset: When did the symptom start?',
      'Provocation/Palliation: What makes it better or worse?',
      'Quality: How would you describe the symptom?',
      'Region/Radiation: Where is it located? Does it spread?',
      'Timing: How often does it occur?'
    ],
    isPain: false
  };
}

// Get counseling info for specific condition
function getCounselingInfo(condition: string): typeof counselingConditionGuidance.hypertension {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('hypertension') || conditionLower.includes('high blood pressure')) {
    return counselingConditionGuidance.hypertension;
  }
  if (conditionLower.includes('diabetes') || conditionLower.includes('sugar')) {
    return counselingConditionGuidance.diabetes;
  }
  if (conditionLower.includes('asthma')) {
    return counselingConditionGuidance.asthma;
  }
  if (conditionLower.includes('hiv')) {
    return counselingConditionGuidance.hiv;
  }
  if (conditionLower.includes('tuberculosis') || conditionLower.includes('tb')) {
    return counselingConditionGuidance.tuberculosis;
  }
  if (conditionLower.includes('contraception')) {
    return counselingConditionGuidance.contraception;
  }
  if (conditionLower.includes('cervical')) {
    return counselingConditionGuidance.cervical_cancer_screening;
  }
  if (conditionLower.includes('breast')) {
    return counselingConditionGuidance.breast_cancer;
  }
  if (conditionLower.includes('prostate')) {
    return counselingConditionGuidance.prostate_cancer;
  }
  if (conditionLower.includes('sickle')) {
    return counselingConditionGuidance.sickle_cell;
  }
  
  return {
    definition: 'This is the medical condition we need to discuss today.',
    causes: ['Based on your medical history and risk factors'],
    clinicalPresentation: ['As discussed in your medical records'],
    complications: ['We should discuss these based on your specific situation'],
    investigations: ['Will be determined based on your clinical presentation'],
    treatment: ['We will discuss the best options for you'],
    prognosis: 'This depends on early detection and proper management.'
  };
}

// Generate system prompt - with call-to-action in introduction
function generateSystemPrompt(context: TutorRequest['context'], milestones?: any, isFirstMessage?: boolean): string {
  const department = context.departmentName;
  const condition = context.patientCondition;
  const osceType = context.conversationType;
  
  const approachInfo = getApproachForCondition(condition);
  const departmentGuide = departmentGuidance[department] || departmentGuidance['Medicine'];
  
  const completedItems: string[] = [];
  if (milestones) {
    if (osceType === 'counselling') {
      if (milestones.greeted) completedItems.push('✅ GREET - Completed');
      if (milestones.askedQuestions) completedItems.push('✅ ASK - Completed');
      if (milestones.toldInfo) completedItems.push('✅ TELL - Completed');
      if (milestones.helpedDecision) completedItems.push('✅ HELP - Completed');
      if (milestones.explainedEmpathy) completedItems.push('✅ EXPLAIN/EMPATHY - Completed');
      if (milestones.retellRequested) completedItems.push('✅ RETELL/RETURN - Completed');
    } else {
      if (milestones.introduced) completedItems.push('✅ Introduction - Completed');
      if (milestones.consent) completedItems.push('✅ Consent - Completed');
      if (milestones.patientInfo) completedItems.push('✅ Patient Information - Completed');
      if (milestones.chiefComplaint) completedItems.push('✅ Chief Complaint - Completed');
      if (milestones.historyTaking) completedItems.push('✅ History Taking - Completed');
      if (milestones.redFlags) completedItems.push('✅ Red Flags - Completed');
      if (milestones.pastHistory) completedItems.push('✅ Past Medical History - Completed');
      if (milestones.drugHistory) completedItems.push('✅ Drug History - Completed');
      if (milestones.socialHistory) completedItems.push('✅ Social History - Completed');
      if (milestones.systemsReview) completedItems.push('✅ Review of Systems - Completed');
      if (milestones.ice) completedItems.push('✅ ICE - Completed');
    }
  }
  
  let approachText = '';
  if (osceType === 'counselling') {
    approachText = `
## COUNSELING APPROACH - GATHER:
${counselingGatherApproach.steps.map((s: string) => `- ${s}`).join('\n')}
`;
  } else if (osceType === 'physical_exam') {
    approachText = `
## PHYSICAL EXAMINATION APPROACH (PIPPA):
${physicalExamApproach.steps.map((step: string, i: number) => `${i+1}. ${step}`).join('\n')}
`;
  } else if (osceType === 'clerking') {
    approachText = `
## HISTORY TAKING APPROACH FOR THIS CONDITION:
**Approach:** ${approachInfo.approach}
**IMPORTANT:** ${approachInfo.isPain ? 'This is a PAIN condition. Severity questions ARE appropriate.' : 'This is a NON-PAIN condition. Do NOT ask about severity. Ask about FUNCTIONAL IMPACT instead.'}
`;
  } else {
    approachText = `
## FLASHCARD APPROACH:
**Approach:** ${flashcardApproach.approach}
`;
  }
  
  let counselingInfo = '';
  if (osceType === 'counselling') {
    const counselingConditionData = getCounselingInfo(condition);
    counselingInfo = `
## CONDITION-SPECIFIC INFORMATION FOR ${condition.toUpperCase()}:
${counselingConditionData.definition}
`;
  }
  
  // Different instructions for first message vs subsequent messages
  const roleInstructions = isFirstMessage ? `
## THIS IS YOUR FIRST/INTRODUCTION MESSAGE:
You must introduce yourself AND immediately give the student a call-to-action to begin.

CRITICAL: After introducing yourself, you MUST say something like:
- "Show me your ${osceType} skills and I will be here to assist. Your turn, I'm waiting."
- "Go ahead and begin your consultation with the patient. I'm ready to appraise your approach."
- "Start your ${osceType} when you're ready. I'll be here to give you feedback."
- "The floor is yours. Begin your patient consultation and I'll appraise your approach."

NEVER just say "Hi, I'm Ace" and stop. Always pass the turn to the student clearly.
` : `
## THIS IS A FOLLOW-UP MESSAGE:
You are appraising what the student just said. End with a call-to-action asking if they want to retry or continue.
`;

  return `You are Ace, a world-class medical educator and OSCE tutor.

## YOUR ROLE - CRITICAL:
You are an APPRAISER, not a director. You ONLY evaluate what the student has already said or done.
You NEVER tell the student what to do next.

## WHAT YOU CAN DO:
- Point out what the student did correctly or incorrectly
- Explain WHY something is wrong
- Give specific examples of what they SHOULD HAVE said

## WHAT YOU CANNOT DO:
- Say "Now ask about..." or "Next, you should..."
- List steps they haven't completed yet

${roleInstructions}

## CALL TO ACTION IN FOLLOW-UPS:
After your appraisal (in non-intro messages), you MUST end with a call-to-action statement like:
- "Now that you know this, would you like to retry that step, or shall we continue? I'm here to help."
- "Would you like to practice that again, or shall we move forward with your practice?"
- "Great work! Keep going with this momentum."

## CURRENT SCENARIO:
- **Department:** ${department}
- **Patient Condition:** ${condition}
- **OSCE Type:** ${osceType}

## DEPARTMENT GUIDANCE:
${departmentGuide}

${approachText}

${counselingInfo}

## COMPLETED STEPS:
${completedItems.length > 0 ? completedItems.join('\n') : 'None yet'}

## RESPONSE FORMAT (for follow-ups, not intro):
1. Acknowledge what they did well (if anything)
2. Point out errors or missing steps (if any)
3. Explain WHY it matters
4. END with a call-to-action

Example responses:
- "Good introduction. You stated your name and role clearly. Would you like to continue with your consultation?"

- "You missed seeking consent. Without consent, your score becomes 0. Would you like to retry this step, or shall we continue with your practice?"

- "You asked about pain severity, but this patient has shortness of breath. Focus on functional impact instead. Now that you know this, would you like to try again or continue?"

${isFirstMessage ? 'Remember: This is your FIRST message. Introduce yourself AND give a clear call-to-action for the student to begin. Do not just say "Hi, I\'m Ace" and stop.' : ''}`;
}

async function callAI(prompt: string) {
  const response = await aiClient.complete(prompt, {
    temperature: 0.7,
    maxTokens: 350,
  });
  
  return {
    choices: [{ message: { content: response.content } }]
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: TutorRequest = await request.json();
    const { question, context, conversationHistory, milestones } = body;

    // Check if this is the first message (no conversation history or empty)
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    
    const systemPrompt = generateSystemPrompt(context, milestones, isFirstMessage);

    const recentHistory = conversationHistory.slice(-5)
      .map((m: { role: string; content: string }) => `${m.role === 'student' ? 'Student' : 'Patient'}: ${m.content}`)
      .join('\n');

    let prompt = '';

    if (isFirstMessage) {
      // First message - just introduce and pass turn
      prompt = `${systemPrompt}

## YOUR TASK:
This is the start of the session. Introduce yourself as Ace and give the student a clear call-to-action to begin their ${context.conversationType}.

CRITICAL: You MUST end with a call to action like:
- "Show me your ${context.conversationType} skills and I will be here to assist. Your turn, I'm waiting."
- "Go ahead and begin your consultation with the patient. I'm ready to appraise your approach."

Do not just say "Hi, I'm Ace" and stop. Always pass the turn to the student.`;
    } else {
      // Follow-up message - appraise what they said
      prompt = `${systemPrompt}

## STUDENT'S LATEST RESPONSE TO APPRAISE:
"${question}"

## RECENT CONVERSATION:
${recentHistory || 'No previous conversation.'}

## YOUR TASK:
Appraise what the student just said. Do NOT tell them what to do next.
Then END with a call-to-action asking if they want to retry or continue.

Remember: You appraise. You don't direct. Always end with a call to action.`;
    }

    const response = await callAI(prompt);
    let answer = response.choices[0].message.content || (isFirstMessage 
      ? "Hi, I'm Ace! I'm here to appraise your clinical approach. Show me your clerking skills and I will be here to assist. Your turn, I'm waiting."
      : "I'm here to help appraise your approach. Would you like to try again or continue with your practice?");

    // For follow-ups, ensure there's a call to action
    if (!isFirstMessage) {
      const hasCallToAction = /would you like|shall we|keep going|continue|retry|try again|your turn/i.test(answer);
      if (!hasCallToAction) {
        answer += " Would you like to continue with your practice, or would you like to try that step again? I'm here to help.";
      }
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Tutor error:', error);
    return NextResponse.json({ 
      answer: "Hi, I'm Ace! I'm having trouble connecting right now. Show me your clinical skills when you're ready. Your turn, I'm waiting." 
    });
  }
}