import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(auth)/auth";
import { aiClient } from "@/lib/services/aiClientService";

async function callAIWithFallback(prompt: string, maxRetries: number = 2) {
  const response = await aiClient.complete(prompt, {
    temperature: 0.3,
    maxTokens: 400,
  });
  
  return {
    choices: [{ message: { content: response.content } }]
  };
}

// ============ TYPES ============

type StageMessage = {
  message: string;
  category: string;
  type: 'error' | 'warning' | 'success';
  rationale: string;
};

type StageMessages = {
  clerking: Record<string, StageMessage>;
  counselling: Record<string, StageMessage>;
  physical_exam: Record<string, StageMessage>;
};

// ============ OSCE TYPE STAGES (COMPLETE SEQUENCES) ============

const osceTypeStages: Record<string, string[]> = {
  'clerking': [
    'INTRODUCTION', 'CONSENT', 'PATIENT_INFO', 'CHIEF_COMPLAINT',
    'ONSET', 'CHARACTER', 'RADIATION', 'TIMING', 'AGG_ALLEV',
    'ASSOCIATED', 'RED_FLAGS', 'RISK_FACTORS',
    'PAST_HISTORY', 'DRUG_HISTORY', 'FAMILY_HISTORY', 'SOCIAL_HISTORY',
    'REVIEW_OF_SYSTEMS', 'ICE', 'CLOSURE'
  ],
  'counselling': [
    'INTRODUCTION', 'CONSENT', 'PATIENT_INFO',
    'ASSESS_UNDERSTANDING', 'ASSESS_CONCERNS', 'PROVIDE_INFORMATION',
    'CHECK_UNDERSTANDING', 'ADDRESS_EMOTIONS', 'ACTION_PLAN',
    'FOLLOW_UP', 'CLOSURE'
  ],
  'physical_exam': [
    'INTRODUCTION', 'CONSENT', 'PATIENT_INFO',
    'GENERAL_INSPECTION', 'VITAL_SIGNS', 'SYSTEM_EXAMINATION',
    'PATIENT_COMFORT', 'SUMMARY', 'CLOSURE'
  ]
};

// Non-pain conditions that should NOT use severity questions
const nonPainConditions: string[] = [
  'shortness of breath', 'dyspnea', 'cough', 'fever', 'dizziness', 
  'fatigue', 'weakness', 'nausea', 'vomiting', 'diarrhea', 
  'constipation', 'rash', 'bleeding', 'swelling', 'weight loss',
  'palpitations', 'syncope', 'seizure'
];

// Pain conditions that SHOULD use SOCRATES with severity
const painConditions: string[] = [
  'chest pain', 'abdominal pain', 'joint pain', 'back pain', 
  'leg pain', 'arm pain', 'muscle pain', 'nerve pain', 'headache'
];

function shouldUseSeverity(condition: string): boolean {
  const lowerCondition = condition.toLowerCase();
  
  // Explicit pain conditions use severity
  for (const pain of painConditions) {
    if (lowerCondition.includes(pain)) {
      return true;
    }
  }
  
  // Non-pain conditions do NOT use severity
  for (const nonPain of nonPainConditions) {
    if (lowerCondition.includes(nonPain)) {
      return false;
    }
  }
  
  // Default: check if it contains the word 'pain'
  return lowerCondition.includes('pain');
}

// ============ INTRODUCTION EXAMPLES BY OSCE TYPE ============

const introductionExamples: Record<string, string[]> = {
  'clerking': [
    '"Hello, my name is Dr. [Name]. I\'m the physician on duty today. Can you confirm your full name for me?"',
    '"Good morning, I\'m Dr. [Name] from the medical team. I\'d like to ask you some questions about your health. Is that okay?"',
    '"Hi there, I\'m Dr. [Name]. I\'ll be taking care of you today. First, could you tell me your name?"',
    '"Hello, I\'m Dr. [Name]. I understand you\'re here about a health concern. Let me introduce myself properly."',
    '"Good [morning/afternoon], I\'m Dr. [Name]. I\'m part of the medical team. What name do you prefer to be called?"'
  ],
  'counselling': [
    '"Hello, I\'m Dr. [Name]. I\'d like to sit down with you and talk through your health situation today. Is that alright?"',
    '"Good morning, I\'m Dr. [Name] from the counselling team. I understand you have some questions about your diagnosis. I\'m here to help."',
    '"Hi, I\'m Dr. [Name]. I specialize in patient education and support. Would you be comfortable if we discussed your health together?"',
    '"Hello, I\'m Dr. [Name]. I\'m here to support you and answer your questions. What would you like me to call you?"',
    '"Welcome, I\'m Dr. [Name]. I understand this may be difficult to discuss. I\'m here to listen and help you understand your options."'
  ],
  'physical_exam': [
    '"Hello, I\'m Dr. [Name]. I need to perform a physical examination today. First, can you confirm your name and date of birth?"',
    '"Good morning, I\'m Dr. [Name]. I\'ll be examining you to better understand what\'s going on. Is that okay with you?"',
    '"Hi, I\'m Dr. [Name]. I\'m going to examine [specific body part]. Please let me know if anything is uncomfortable."',
    '"Hello, I\'m Dr. [Name]. Before we begin the examination, let me introduce myself properly and explain what I\'ll be doing."',
    '"Good [morning/afternoon], I\'m Dr. [Name]. I\'ll need to perform a physical exam. Everything will be explained as we go."'
  ]
};

// ============ CONSENT EXAMPLES BY OSCE TYPE ============

const consentExamples: Record<string, string[]> = {
  'clerking': [
    '"Before we begin, do I have your permission to ask you some questions about your health and medical history?"',
    '"Is it alright if I take a few minutes to ask you about your symptoms and health background?"',
    '"Would you be comfortable if I ask you some questions to better understand your situation?"',
    '"May I proceed with taking your medical history? Everything you share will be confidential."',
    '"I\'d like to ask you about your health concerns. Do I have your consent to do that?"'
  ],
  'counselling': [
    '"Would you be comfortable if we spend some time discussing your health condition and what it means for you?"',
    '"May I share some information with you about your diagnosis and answer any questions you might have?"',
    '"Is this a good time for us to talk through your treatment options and address your concerns?"',
    '"Do I have your permission to discuss your health situation and help you understand what comes next?"',
    '"Would you like me to explain what we know about your condition and answer your questions?"'
  ],
  'physical_exam': [
    '"May I have your permission to perform a physical examination? I\'ll explain each step as I go."',
    '"Is it okay if I examine you now? Please let me know if anything makes you uncomfortable."',
    '"Do I have your consent to proceed with the examination? You can ask me to stop at any time."',
    '"Would you be comfortable if I examine [specific body part]? I\'ll be as gentle as possible."',
    '"May I examine you to check for any physical signs? Please tell me if anything hurts."'
  ]
};

// ============ PATIENT INFO EXAMPLES ============

const patientInfoExamples: string[] = [
  '"Before we continue, could you please confirm your full name and date of birth?"',
  '"Can you tell me your full name and how old you are?"',
  '"Just to confirm our records, what is your name and age?"',
  '"May I ask your name and date of birth for my documentation?"',
  '"Could you please state your full name and age for me?"'
];

// ============ DEPARTMENT GUIDANCE ============

const departmentGuidance: Record<string, { focus: string; keyAreas: string[]; specificNote?: string }> = {
  'General Medicine': {
    focus: 'systematic history-taking',
    keyAreas: ['chief complaint', 'past medical history', 'medications', 'family history', 'social history']
  },
  'Cardiology': {
    focus: 'cardiac symptom characterization and risk factors',
    keyAreas: ['chest pain character', 'radiation to arm/jaw/back', 'orthopnea', 'PND', 'edema', 'cardiac risk factors']
  },
  'Neurology': {
    focus: 'neurological symptom localization and characterization',
    keyAreas: ['onset timing', 'symptom quality', 'associated symptoms', 'stroke risk factors', 'seizure history']
  },
  'Gynecology': {
    focus: 'gynecological history with explicit consent for intimate questions',
    keyAreas: ['menstrual history (LMP, cycle, flow)', 'obstetric history (GTPAL)', 'contraception', 'sexual history'],
    specificNote: 'For gynecology, you MUST explicitly ask permission before asking intimate questions.'
  },
  'Obstetrics': {
    focus: 'complete obstetric history and antenatal care',
    keyAreas: ['GTPAL documentation', 'LMP and EDD', 'fetal movements', 'antenatal screenings', 'red flags (pre-eclampsia)']
  },
  'Surgery': {
    focus: 'surgical history and perioperative assessment',
    keyAreas: ['symptom onset', 'previous surgeries', 'bleeding risk', 'bowel/bladder function']
  },
  'Pediatrics': {
    focus: 'pediatric history with parent/caregiver consent',
    keyAreas: ['birth history', 'developmental milestones', 'immunizations', 'nutrition', 'growth parameters'],
    specificNote: 'For pediatrics, introduce yourself to both parent and child, then ask the parent for consent.'
  },
  'Emergency Medicine': {
    focus: 'acute presentation and red flag identification',
    keyAreas: ['onset timing', 'severity', 'red flags', 'vital signs', 'ABC assessment']
  },
  'Respiratory': {
    focus: 'respiratory symptom characterization',
    keyAreas: ['cough character', 'sputum', 'dyspnea', 'wheeze', 'hemoptysis', 'smoking history']
  }
};

// ============ STAGE-SPECIFIC MESSAGES ============

const createStageMessages = (isPainCondition: boolean): StageMessages => {
  const severityMessage: StageMessage = isPainCondition 
    ? { message: 'Assess severity on a scale', category: 'History Taking', type: 'warning', rationale: 'Severity helps monitor progression and urgency' }
    : { message: 'Ask how the symptom affects their daily activities', category: 'History Taking', type: 'warning', rationale: 'Functional impact is more relevant than severity for non-pain symptoms' };
  
  return {
    'clerking': {
      'INTRODUCTION': { message: 'Introduce yourself to the patient', category: 'Introduction', type: 'error', rationale: 'Professional introduction establishes trust and rapport' },
      'CONSENT': { message: 'Ask for consent before proceeding', category: 'Consent', type: 'error', rationale: 'Consent is required before taking any history' },
      'PATIENT_INFO': { message: 'Confirm patient identity - ask for name and age', category: 'Patient Information', type: 'error', rationale: 'Always verify patient identity before proceeding' },
      'CHIEF_COMPLAINT': { message: 'Ask an open-ended question about their main concern', category: 'Chief Complaint', type: 'error', rationale: 'Start with the patient\'s own words' },
      'ONSET': { message: 'Ask when the symptoms started', category: 'History Taking', type: 'warning', rationale: 'Onset helps determine acute vs chronic condition' },
      'CHARACTER': { message: 'Ask them to describe the sensation', category: 'History Taking', type: 'warning', rationale: 'Character helps identify the underlying cause' },
      'RADIATION': { message: 'Ask if the sensation spreads anywhere', category: 'History Taking', type: 'warning', rationale: 'Radiation patterns help with differential diagnosis' },
      'SEVERITY': severityMessage,
      'TIMING': { message: 'Ask about timing and frequency', category: 'History Taking', type: 'warning', rationale: 'Pattern helps with diagnosis' },
      'AGG_ALLEV': { message: 'Ask what makes it better or worse', category: 'History Taking', type: 'warning', rationale: 'Triggers and relief factors are key diagnostic clues' },
      'ASSOCIATED': { message: 'Ask about associated symptoms', category: 'Associated Symptoms', type: 'warning', rationale: 'Associated symptoms provide diagnostic clues' },
      'RED_FLAGS': { message: 'Screen for red flag symptoms', category: 'Red Flags', type: 'error', rationale: 'Red flags may indicate serious conditions requiring urgent attention' },
      'RISK_FACTORS': { message: 'Ask about risk factors', category: 'Risk Factors', type: 'warning', rationale: 'Risk factors help with prevention and management' },
      'PAST_HISTORY': { message: 'Take a past medical history', category: 'Past History', type: 'warning', rationale: 'Past history affects current management' },
      'DRUG_HISTORY': { message: 'Ask about medications and allergies', category: 'Drug History', type: 'warning', rationale: 'Medications affect treatment decisions' },
      'FAMILY_HISTORY': { message: 'Ask about family history', category: 'Family History', type: 'warning', rationale: 'Family history identifies genetic risks' },
      'SOCIAL_HISTORY': { message: 'Ask about social history', category: 'Social History', type: 'warning', rationale: 'Social factors impact health outcomes' },
      'REVIEW_OF_SYSTEMS': { message: 'Perform a review of systems', category: 'Review of Systems', type: 'warning', rationale: 'Systematic review catches missed symptoms' },
      'ICE': { message: 'Explore ideas, concerns, and expectations', category: 'Closure', type: 'success', rationale: 'Patient-centered care improves outcomes' },
      'CLOSURE': { message: 'Summarize findings and close the consultation', category: 'Closure', type: 'success', rationale: 'Summary confirms understanding' }
    },
    'counselling': {
      'INTRODUCTION': { message: 'Introduce yourself and explain your role as a counsellor', category: 'Introduction', type: 'error', rationale: 'Clear role establishment builds trust for sensitive discussions' },
      'CONSENT': { message: 'Get explicit consent for the counselling conversation', category: 'Consent', type: 'error', rationale: 'Patients need to agree to counselling sessions' },
      'PATIENT_INFO': { message: 'Confirm patient identity and basic information', category: 'Patient Information', type: 'error', rationale: 'Always verify patient identity before counselling' },
      'ASSESS_UNDERSTANDING': { message: 'Find out what the patient already knows', category: 'Counselling', type: 'warning', rationale: 'Start from patient\'s existing knowledge' },
      'ASSESS_CONCERNS': { message: 'Ask about their specific worries and fears', category: 'Counselling', type: 'warning', rationale: 'Addressing concerns is central to counselling' },
      'PROVIDE_INFORMATION': { message: 'Provide clear, tailored information', category: 'Counselling', type: 'warning', rationale: 'Use plain language, avoid medical jargon' },
      'CHECK_UNDERSTANDING': { message: 'Use teach-back to confirm understanding', category: 'Counselling', type: 'warning', rationale: 'Teach-back improves recall and adherence' },
      'ADDRESS_EMOTIONS': { message: 'Acknowledge and validate the patient\'s emotions', category: 'Counselling', type: 'warning', rationale: 'Emotional support is essential for patient-centered care' },
      'ACTION_PLAN': { message: 'Create a shared action plan', category: 'Counselling', type: 'success', rationale: 'Clear plan improves adherence' },
      'FOLLOW_UP': { message: 'Arrange follow-up and support', category: 'Counselling', type: 'success', rationale: 'Follow-up ensures continuity of care' },
      'CLOSURE': { message: 'Summarize and close the counselling session', category: 'Closure', type: 'success', rationale: 'End with summary and opportunity for questions' }
    },
    'physical_exam': {
      'INTRODUCTION': { message: 'Introduce yourself and explain the need for examination', category: 'Introduction', type: 'error', rationale: 'Professional introduction establishes trust' },
      'CONSENT': { message: 'Get consent for the physical examination', category: 'Consent', type: 'error', rationale: 'Consent is required before any examination' },
      'PATIENT_INFO': { message: 'Confirm patient identity', category: 'Patient Information', type: 'error', rationale: 'Verify patient identity before examining' },
      'GENERAL_INSPECTION': { message: 'Start with general inspection of the patient', category: 'Physical Exam', type: 'warning', rationale: 'Observe general appearance, distress, pallor, jaundice' },
      'VITAL_SIGNS': { message: 'Check vital signs', category: 'Physical Exam', type: 'warning', rationale: 'Vitals are essential baseline assessment' },
      'SYSTEM_EXAMINATION': { message: 'Perform focused examination of the relevant system', category: 'Physical Exam', type: 'warning', rationale: 'Examine the system related to the chief complaint' },
      'PATIENT_COMFORT': { message: 'Ensure patient comfort throughout the examination', category: 'Physical Exam', type: 'warning', rationale: 'Patient comfort improves cooperation' },
      'SUMMARY': { message: 'Summarize your physical examination findings', category: 'Closure', type: 'success', rationale: 'Patient should know what you found' },
      'CLOSURE': { message: 'Close the examination and ask if they have questions', category: 'Closure', type: 'success', rationale: 'End with opportunity for questions' }
    }
  };
};

// ============ PARSE STUDENT RESPONSES ============

function parseStudentResponse(text: string): Record<string, boolean> {
  const lower = text.toLowerCase();
  
  return {
    hasIntroduction: /(?:i'?m|i am|my name is|dr\.?|doctor|dr\s+[a-z]+|doctor\s+[a-z]+)\s+\w+/i.test(text) || 
                     /\b(?:introduce|introduction|hello|good morning|good afternoon|hi there|hey)\b/i.test(text) &&
                     /\b(?:i'?m|i am|my name|dr\.?|doctor)\b/i.test(text),
    hasConsent: /\b(?:consent|permission|agree|okay|alright|may i|can i|do you mind|is that okay|would you be happy|are you comfortable|would you allow|is it alright|may we|can we proceed|is it ok|is it okay|would it be okay)\b/i.test(text) ||
                /\b(?:ask you some questions|take a history|discuss your|talk about your|examine you|check you|proceed with)\b/i.test(text) &&
                /\b(?:may|can|could|would you|do you|is it)\b/i.test(text),
    hasPatientInfo: /\b(?:name|confirm your name|what is your name|your name|date of birth|age|how old|dob|full name)\b/i.test(text) &&
                    /\b(?:can you|could you|please tell|may i ask|what is|tell me)\b/i.test(text),
    hasChiefComplaint: /\b(?:what brings|what brought|tell me about|what seems to be|what'?s the problem|how can i help|what happened|why are you here|what'?s going on|what'?s troubling|chief complaint|presenting complaint)\b/i.test(text),
    hasOnset: /\b(?:when|start|begin|onset|first notice|how long|duration|since)\b/i.test(text),
    hasCharacter: /\b(?:describe|character|feel like|sharp|dull|burning|stabbing|aching|throbbing|cramping|pressure|tightness|quality)\b/i.test(text),
    hasSeverity: /\b(?:scale|rate|severe|mild|moderate|worst|pain level|score|how bad|intensity)\b/i.test(text),
    hasRadiation: /\b(?:spread|radiate|move|travel|go to|arm|back|jaw|shoulder|neck|leg|radiation)\b/i.test(text),
    hasTiming: /\b(?:timing|constant|intermittent|comes and goes|duration|how long|continuous|episode|attack)\b/i.test(text),
    hasAggAllev: /\b(?:worse|better|aggravate|alleviate|relieve|improve|what makes|trigger|precipitate)\b/i.test(text),
    hasAssociated: /\b(?:associated|along with|accompany|also have|other symptom|anything else|nausea|vomiting|fever|chills|sweating|dizziness|shortness of breath|fatigue|weight loss)\b/i.test(text),
    hasRedFlags: /\b(?:red flag|worst.*headache|sudden|severe|unexplained|neurological|fever|blood|trauma|unconscious|emergency|syncope|seizure)\b/i.test(text),
    hasRiskFactors: /\b(?:risk|smok|alcohol|hypertension|diabetes|cholesterol|family history|predispose|lifestyle|obesity|sedentary)\b/i.test(text),
    hasPastHistory: /\b(?:past medical|previous|history of|chronic|condition|diagnosed|suffer from|medical history|pmh|comorbidities)\b/i.test(text),
    hasDrugHistory: /\b(?:medication|drug|prescription|pill|tablet|injection|inhaler|allergy|allergic|reaction|dhx|meds|medicine|otc|supplement)\b/i.test(text),
    hasFamilyHistory: /\b(?:family|relative|mother|father|sibling|brother|sister|parent|child|hereditary|genetic|fhx)\b/i.test(text),
    hasSocialHistory: /\b(?:social|work|job|occupation|live|housing|smoke|alcohol|drink|exercise|diet|travel|home|marital|shx|living situation)\b/i.test(text),
    hasICE: /\b(?:idea|concern|expect|worry|fear|think is wrong|hope for|expected outcome|what do you think|anxious about|nervous about|what are you hoping)\b/i.test(text),
    hasAssessUnderstanding: /\b(?:what do you know|what have you been told|what do you understand|already know about|heard about)\b/i.test(text),
    hasAssessConcerns: /\b(?:worry|concern|fear|anxious|nervous|scared|afraid|what bothers|what worries)\b/i.test(text),
    hasAddressEmotions: /\b(?:feel|feeling|emotion|understand this is|must be|difficult|hard|i hear|i see that)\b/i.test(text),
    hasActionPlan: /\b(?:plan|next steps|we will|we should|going to do|recommend|suggest|let's|together)\b/i.test(text)
  };
}

// ============ DETERMINE CURRENT STAGE ============

function determineStage(
  parsed: Record<string, boolean>,
  milestones: any,
  messageCount: number,
  osceType: string
): string {
  const stages = osceTypeStages[osceType] || osceTypeStages['clerking'];
  
  // CRITICAL: INTRODUCTION MUST COME FIRST
  if (!parsed.hasIntroduction && !milestones?.introduced) {
    return 'INTRODUCTION';
  }
  
  // CRITICAL: CONSENT MUST COME SECOND
  if (!parsed.hasConsent && !milestones?.consent) {
    return 'CONSENT';
  }
  
  // CRITICAL: PATIENT INFO MUST COME THIRD
  if (!parsed.hasPatientInfo && !milestones?.patientInfo) {
    return 'PATIENT_INFO';
  }
  
  // Then proceed with remaining stages IN ORDER
  for (const stage of stages) {
    if (stage === 'INTRODUCTION' || stage === 'CONSENT' || stage === 'PATIENT_INFO') continue;
    
    const stageCompleted = milestones?.[stage.toLowerCase()] || false;
    if (stageCompleted) continue;
    
    switch (stage) {
      case 'CHIEF_COMPLAINT':
        if (!parsed.hasChiefComplaint) return stage;
        break;
      case 'ONSET':
      case 'ASSESS_UNDERSTANDING':
      case 'GENERAL_INSPECTION':
        if (!parsed.hasOnset) return stage;
        break;
      case 'CHARACTER':
      case 'PROVIDE_INFORMATION':
      case 'VITAL_SIGNS':
        if (!parsed.hasCharacter) return stage;
        break;
      case 'RADIATION':
      case 'ADDRESS_EMOTIONS':
      case 'SYSTEM_EXAMINATION':
        if (!parsed.hasRadiation) return stage;
        break;
      case 'SEVERITY':
        if (!parsed.hasSeverity) return stage;
        break;
      case 'TIMING':
        if (!parsed.hasTiming) return stage;
        break;
      case 'AGG_ALLEV':
      case 'ACTION_PLAN':
        if (!parsed.hasAggAllev) return stage;
        break;
      case 'ASSOCIATED':
        if (!parsed.hasAssociated) return stage;
        break;
      case 'ASSESS_CONCERNS':
        if (!parsed.hasAssessConcerns) return stage;
        break;
      case 'RED_FLAGS':
        if (!parsed.hasRedFlags) return stage;
        break;
      case 'RISK_FACTORS':
        if (!parsed.hasRiskFactors) return stage;
        break;
      case 'PAST_HISTORY':
        if (!parsed.hasPastHistory) return stage;
        break;
      case 'DRUG_HISTORY':
        if (!parsed.hasDrugHistory) return stage;
        break;
      case 'FAMILY_HISTORY':
        if (!parsed.hasFamilyHistory) return stage;
        break;
      case 'SOCIAL_HISTORY':
        if (!parsed.hasSocialHistory) return stage;
        break;
      case 'REVIEW_OF_SYSTEMS':
        if (!parsed.hasAssociated) return stage;
        break;
      case 'ICE':
      case 'CLOSURE':
      case 'SUMMARY':
      case 'FOLLOW_UP':
        if (!parsed.hasICE) return stage;
        break;
    }
  }
  
  return 'COMPLETE';
}

// ============ GET STAGE-SPECIFIC HINT ============

function getStageHint(
  stage: string,
  osceType: string,
  departmentName: string,
  condition: string
): any {
  const isPainCondition = shouldUseSeverity(condition);
  const stageMessages = createStageMessages(isPainCondition);
  
  // Type-safe access with proper guards
  const osceTypeMessages = stageMessages[osceType as keyof StageMessages];
  if (!osceTypeMessages) {
    return {
      type: 'warning',
      message: `Continue with the ${osceType}`,
      category: osceType === 'clerking' ? 'History Taking' : osceType === 'counselling' ? 'Counselling' : 'Physical Exam',
      rationale: 'Follow the clinical framework',
      suggestion: stage === 'INTRODUCTION' ? introductionExamples[osceType]?.[0] || '"Hello, I\'m Dr. Smith"' : null
    };
  }
  
  const stageData = osceTypeMessages[stage];
  if (!stageData) {
    return {
      type: 'warning',
      message: `Continue with the ${osceType}`,
      category: osceType === 'clerking' ? 'History Taking' : osceType === 'counselling' ? 'Counselling' : 'Physical Exam',
      rationale: 'Follow the clinical framework',
      suggestion: stage === 'INTRODUCTION' ? introductionExamples[osceType]?.[0] || '"Hello, I\'m Dr. Smith"' : null
    };
  }
  
  // Get suggestion based on stage and type
  let suggestion = '';
  
  if (stage === 'INTRODUCTION') {
    const examples = introductionExamples[osceType];
    suggestion = examples?.[Math.floor(Math.random() * examples.length)] || '"Hello, I\'m Dr. Smith"';
  } else if (stage === 'CONSENT') {
    const examples = consentExamples[osceType];
    suggestion = examples?.[Math.floor(Math.random() * examples.length)] || '"May I have your permission?"';
  } else if (stage === 'PATIENT_INFO') {
    suggestion = patientInfoExamples[Math.floor(Math.random() * patientInfoExamples.length)];
  } else if (stage === 'SEVERITY' && !isPainCondition) {
    suggestion = `Instead of asking about severity, ask: "How does this ${condition} affect your daily activities?"`;
  } else {
    suggestion = stageData.message;
  }
  
  // Make condition-specific
  if (condition !== 'General Medical Condition' && condition !== 'their health condition') {
    if (stage === 'CHIEF_COMPLAINT') {
      suggestion = `"What brings you in today regarding your ${condition}?"`;
    } else if (stage === 'ONSET') {
      suggestion = `"When did your ${condition} symptoms first start?"`;
    } else if (stage === 'CHARACTER') {
      suggestion = `"How would you describe the sensation of your ${condition}?"`;
    }
  }
  
  // Add department-specific note
  const deptNote = departmentGuidance[departmentName]?.specificNote;
  
  // Add pain/non-pain specific note to rationale
  let extraRationale = '';
  if (stage === 'SEVERITY' && !isPainCondition) {
    extraRationale = ' For non-pain conditions, functional impact is more relevant than severity scores.';
  }
  
  return {
    type: stageData.type,
    message: stageData.message,
    category: stageData.category,
    rationale: stageData.rationale + (deptNote ? ` ${deptNote}` : '') + extraRationale,
    suggestion: suggestion
  };
}

// ============ GENERATE DYNAMIC AI HINT ============

async function generateDynamicHint(
  stage: string,
  osceType: string,
  departmentName: string,
  condition: string,
  transcriptText: string,
  messageCount: number,
  previousHints: string[]
): Promise<any> {
  const isPainCondition = shouldUseSeverity(condition);
  const deptGuide = departmentGuidance[departmentName] || {
    focus: `taking a thorough history for ${condition}`,
    keyAreas: ['chief complaint', 'symptom characterization', 'relevant history', 'red flags']
  };
  
  const recentHintsContext = previousHints.slice(-3).join(', ');
  
  const prompt = `You are an OSCE examiner providing a hint for a medical student.

**CONTEXT:**
- Department: ${departmentName}
- OSCE Type: ${osceType}
- Patient Condition: ${condition}
- Is this a PAIN condition? ${isPainCondition ? 'YES - use severity questions' : 'NO - do NOT use severity questions'}
- Current Stage: ${stage}
- Messages Exchanged: ${messageCount}
- Recent hints given: ${recentHintsContext || 'None yet'}

**DEPARTMENT GUIDANCE:**
- Focus: ${deptGuide.focus}
- Key Areas: ${deptGuide.keyAreas.join(', ')}

**CONVERSATION SO FAR:**
${transcriptText.slice(-800)}

**YOUR TASK:**
Provide a hint for what the student is missing at stage "${stage}". 

**CRITICAL RULES:**
- If this is NOT a pain condition (${!isPainCondition}), NEVER suggest asking about severity or using a pain scale
- Keep message under 60 characters
- Use natural, conversational language
- Be unique - don't repeat the same phrasing as previous hints
- Include a specific example phrase the student can say

Return ONLY valid JSON:
{
  "type": "error|warning|success",
  "message": "Short, unique hint (max 60 chars)",
  "category": "Category name",
  "rationale": "Brief reason",
  "suggestion": "Example phrase specific to ${condition}"
}`;

  try {
    const response = await callAIWithFallback(prompt);
    let content = response.choices[0].message.content || '';
    content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    const hint = JSON.parse(content);
    
    if (hint.message && hint.message.length > 65) {
      hint.message = hint.message.substring(0, 62) + '...';
    }
    
    return hint;
  } catch (error) {
    console.error('AI hint generation failed, using fallback');
    return getStageHint(stage, osceType, departmentName, condition);
  }
}

// ============ MAIN POST HANDLER ============

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversation, fullHistory, context } = body;

    const transcript = fullHistory || conversation;
    const transcriptText = transcript
      .map((m: any) => `${m.role === 'student' ? 'STUDENT' : 'PATIENT'}: ${m.content}`)
      .join('\n');

    const messageCount = context.messageCount || transcript.length;
    const condition = context.patientCondition || 'their health condition';
    const departmentName = context.departmentName || 'General Medicine';
    const conversationType = context.conversationType || 'clerking';
    const previousHints = context.previousHints || [];
    
    // Parse student responses
    const allStudentText = transcript
      .filter((m: any) => m.role === 'student')
      .map((m: any) => m.content)
      .join(' ');
    
    const parsed = parseStudentResponse(allStudentText);
    const milestones = context.milestones || {};
    
    // Determine current stage
    const currentStage = determineStage(parsed, milestones, messageCount, conversationType);
    
    const isPainCondition = shouldUseSeverity(condition);
    
    console.log('📊 Hint Analysis:', {
      department: departmentName,
      osceType: conversationType,
      condition,
      isPainCondition,
      messageCount,
      currentStage,
      hasIntroduction: parsed.hasIntroduction,
      hasConsent: parsed.hasConsent,
      hasPatientInfo: parsed.hasPatientInfo,
      hasSeverity: parsed.hasSeverity,
    });
    
    // Handle COMPLETE stage
    if (currentStage === 'COMPLETE') {
      const closureMessages = [
        `"Let me summarize what we've discussed about your ${condition}. Do you have any questions?"`,
        `"To summarize, here's what we talked about. Is there anything you'd like me to clarify?"`,
        `"Let me make sure I understand everything correctly. Here's a summary of our discussion."`,
        `"Based on our conversation about your ${condition}, here are the key points."`,
        `"Thank you for sharing this with me. Let me summarize what I've heard."`
      ];
      
      return NextResponse.json({
        type: 'success',
        message: 'Great job! Complete the consultation',
        category: 'Closure',
        rationale: 'Summarize findings and close professionally',
        suggestion: closureMessages[Math.floor(Math.random() * closureMessages.length)]
      });
    }
    
    // Get hint
    let hint;
    const criticalStages = ['INTRODUCTION', 'CONSENT', 'PATIENT_INFO', 'CHIEF_COMPLAINT', 'RED_FLAGS'];
    
    if (criticalStages.includes(currentStage) || messageCount < 10) {
      hint = getStageHint(currentStage, conversationType, departmentName, condition);
    } else {
      hint = await generateDynamicHint(
        currentStage, conversationType, departmentName, condition, transcriptText, messageCount, previousHints
      );
    }
    
    return NextResponse.json(hint);

  } catch (error) {
    console.error('Hint API error:', error);
    return NextResponse.json({ 
      type: 'error', 
      message: 'Introduce yourself and get consent to begin', 
      category: 'Introduction',
      rationale: 'Start the consultation properly - this is mandatory',
      suggestion: '"Hello, I\'m Dr. Smith. May I ask you some questions about your health?"'
    });
  }
}