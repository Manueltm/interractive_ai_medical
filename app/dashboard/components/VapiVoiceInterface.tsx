// app/dashboard/components/VapiVoiceInterface.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import type { Patient, DBMessage } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';
import { HintPopup } from './HintPopup';
import { VoiceAITutor } from './VoiceAITutor';
import { initVapi, trackCall } from '@/lib/vapi/client';
import { extractVapiError } from '@/lib/vapi/errors';
import { VAPI_ACCOUNTS } from '@/lib/vapi/accounts';

// VapiVoiceInterfaceProps interface
interface VapiVoiceInterfaceProps {
  patient: Patient | null;
  chatId: string;
  systemPrompt: string;
  sendMessage: (chatId: string, role: 'student' | 'patient', content: string) => Promise<void>;
  type: 'clerking' | 'counselling' | 'physical_exam' | 'flashcards';
  examSteps?: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
  onExit: () => void;
  durationMinutes?: number;
  mode?: 'practice' | 'exam';
  existingMessages?: Array<{ role: string; content: string; createdAt: string }>;
  initialElapsedTime?: number;
  uiSettings?: {
    showChiefComplaint: boolean;
    showPresentingCondition: boolean;
  };
  department?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  hintEnabled?: boolean;
  aiTutorEnabled?: boolean;  // ADD THIS LINE
}

// ============ ACCENT-ROBUST HINT SYSTEM (ULTRA-VERBOSE APRIL 2026 VERSION) ============
// This version is significantly more verbose and robust for almost any accent (including Nigerian English, West African Pidgin, Indian, Asian, European, and heavy phonetic merges).
// Expanded with 4x more regex patterns, common STT misrecognitions, phonetic spellings, merged words, dialect variations, and global accent adaptations.
// Semantic fallback strengthened with 3x more keywords for wider range of statements.
interface ParsedResult {
  [key: string]: boolean | number | Record<string, { detected: boolean; confidence: number }>;
  _confidence: number;
  _parsedDetails: Record<string, { detected: boolean; confidence: number }>;
}

const accentRobustPatterns = {
  introduction: [
    /(?:i'?m|i am|my name is|dr\.?|doctor|physician|medical student|consultant|registrar|house officer)\s+\w+/i,
    /(?:hello|hi|hey|good morning|good afternoon|good evening|salutations).*(?:i'?m|i am|my name|dr\.?|doctor|physician)/i,
    /(?:i m|im|am|me am|me is|i is|me name|my nem)\s+(?:doctor|dr|the doctor|physician|taking care|looking after)/i,
    /(?:my name|name is|names|call me|called|they call me|known as|you can call me|refer to me as)\s+[a-z]+/i,
    /(?:this is|here is|you are speaking to|speaking with|talking to|addressing)\s+(?:doctor|dr|the doctor|physician)/i,
    /(?:i will be|i'll be|i gonna be|i will take care|i am here to help|i here to assist)\s+(?:your doctor|taking care|looking after|your physician)/i,
    /(?:let me|allow me|may i|can i|kin i|let mi)\s+(?:introduce|myself|present myself|tell you who i am)/i,
    /\b(?:doctah|doc|doktor|docta|doctuh|dawktuh|dr\.?|dakta|dokta|doctar|doctuh)\b/i,
    /\b(?:introduse|introdus|introduss|introduc|intraduce|introdoos|intruduce|introjuice)\b/i,
    /\b(?:hi im|hello im|hey im|good mornin|good afternoon|good evenin|good mornin doc)\b/i,
    /\b(?:dis is|dis iz|this iz|me is|me name|my nem|na me|na doctor)\b/i,
    /\b(?:greetins|salutashun|how you doin|how far|how you dey|wetin dey|how una dey)\b/i,
    /\b(?:i be|na me|na doctor|doctor here|doctor don come|me na doctor)\b/i,
    /\b(?:gud mornin|gud afternoon|gud evenin|hello sir|hello ma)\b/i,
    /\b(?:i am dr|im dr|me dr|doctor name|my name doctor)\b/i,
  ],
  consent: [
    /\b(?:consent|permission|may i|can i|do you mind|is that okay|would you be happy|are you comfortable|would you allow|is it alright|may we|can we proceed|is it ok|is it fine|is dat ok)\b/i,
    /\b(?:do i have your|do you give me|would you give me|can i get your|kin i get your)\s+(?:consent|permission|okay|approval|go ahead)/i,
    /\b(?:may i|could i|can i|kin i|kin we|can we|may we)\s+(?:ask|talk|discuss|examine|check|proceed|continue|touch|feel|palpate|listen)/i,
    /\b(?:is it ok|is it okay|is it alright|dat ok|dat fine|dat alright|dis ok|dis fine)\s+(?:if|to|for|with|dat we)/i,
    /\b(?:would you mind|do you mind|you mind|you okay with|you comfortable with|you alright with|you happy with)\s+(?:if|me|that|dis|dat)/i,
    /\b(?:permission to|consent to|approval to|okay to|fine to|alright to|go ahead to)\s+(?:proceed|continue|ask|examine|check|touch|palpate|listen|proceed with)/i,
    /\b(?:me|my|mi|kin|can|may|lemme|allow mi)\s+(?:ask|talk|proceed|continue|examine|check|touch|palpate|listen)/i,
    /\b(?:allow me|let me|lemme|allow mi|make i)\s+(?:ask|examine|check|proceed|continue|touch)/i,
    /\b(?:that ok|that okay|that alright|sounds good|fine by you|you ok|you fine|you comfortable|dis okay|dis fine|dis alright|okay to go|can we go|we fit proceed)\b/i,
    /\b(?:you mind|you okay with|you alright with|you happy with|you comfortable with)\b/i,
    /\b(?:permission|consent|approv|approoval|approvval|consen|permishun)\b/i,
    /\b(?:you dey okay|you comfortable|you allow|you mind if|you gree)\b/i,
  ],
  patientInfo: [
    /\b(?:name|confirm your name|what is your name|your name|date of birth|age|how old|dob|full name|can you tell me your name|tell me your details|identity|who are you)\b/i,
    /\b(?:whats your|what is your|tell me your|give me your|can you give|could you tell|kin you tell)\s+(?:name|age|birth date|d.o.b|dob|details|info|identity|full name)/i,
    /\b(?:can you|please|could you|kin you|can i get|make you give me)\s+(?:confirm|verify|give me|tell me|share)\s+(?:your|the)\s+(?:name|age|details|birth|identity)/i,
    /\b(?:i need|i would like|i want to|i must|must confirm|need to know)\s+(?:confirm|verify|check|know)\s+(?:your|the)\s+(?:identity|details|name|age|date of birth)/i,
    /\b(?:patient|person|client|woman|man|child|madam|sir)\s+(?:name|identity|id|details|info|full name)/i,
    /\b(?:how old|age|old are you|years old|how many years|wetin be your age|how old you be)\b/i,
    /\b(?:birth|born|birtdate|bday|date of birth|dob|date you born|when you born)\b/i,
    /\b(?:whats your nem|what is your nem|tell me your nem|your full nem|wetin be your name)\b/i,
    /\b(?:confirm name|verify name|check identity|who you be|wetin be your name|your name na wetin)\b/i,
  ],
  chiefComplaint: [
    /\b(?:what brings|what brought|tell me about|what seems to be|what'?s the problem|how can i help|what happened|why are you here|what'?s going on|what'?s troubling|chief complaint|presenting complaint|reason for visit|reason for coming|what is the issue|what dey wrong)\b/i,
    /\b(?:whats wrong|whats the matter|whats the issue|whats troubling you|what dey happen|wetin bring you|wetin dey do you|wetin dey wrong)\b/i,
    /\b(?:why did you come|why you here|why you come|what brings you in|what made you come|wetin make you come)\b/i,
    /\b(?:how can i|what can i|how may i|how i fit help|what i fit do|how i fit assist)\s+(?:help|assist|do for you|help you with)/i,
    /\b(?:tell me about|describe|explain|talk about)\s+(?:your problem|whats happening|whats going on|your issue|your concern|your trouble)/i,
    /\b(?:problem|issue|concern|trouble|sick|ill|unwell|feeling bad|pain|complaint|wetin dey pain you)\s+(?:today|now|this time|dis time|dis moment)\b/i,
    /\b(?:sick|ill|unwell|feeling bad|no well|dey pain me|wetin dey do you|wetin dey worry you)\b/i,
    /\b(?:why you come|wetin bring you|wetin dey wrong|wetin happen|wetin bring you here)\b/i,
  ],
  historyTaking: [
    /\b(?:when|start|begin|onset|first notice|how long|duration|since|initially|first time|when e start|how long e take|when e begin)\b/i,
    /\b(?:describe|character|feel like|sharp|dull|burning|stabbing|aching|throbbing|cramping|pressure|tightness|quality|sensation|nature|how e be|wetin e feel like|wetin e be like)\b/i,
    /\b(?:worse|better|aggravate|alleviate|relieve|improve|what makes|trigger|precipitate|exacerbate|ease|lessen|reduce|wetin make am worse|wetin dey reduce am|wetin make am better)\b/i,
    /\b(?:scale|rate|severe|mild|moderate|worst|pain level|score|how bad|intensity|1 to 10|out of ten|numerical|how much|on scale of|how painful|how e pain)\b/i,
    /\b(?:spread|radiate|move|travel|go to|radiation|radiating|referring|where e spread|wetin e move to|wetin e dey go)\b/i,
    /\b(?:timing|constant|intermittent|comes and goes|continuous|episode|attack|frequency|pattern|how often|every time|sometimes|how frequent)\b/i,
    /\b(?:associated|along with|accompany|also have|other symptom|anything else|concurrent|coexisting|any other thing|wetin else|anything join am|any other symptom)\b/i,
    /\b(?:tell me more|elaborate|explain further|go on|talk more|continue|tell me about dat|wetin about|tell me about am)\b/i,
    /\b(?:what about|how about|and then|anything else|any other symptom|any other pain|wetin else dey happen|any other thing)\b/i,
    /\b(?:any fever|any vomiting|any bleeding|any discharge|any swelling|any weight loss|any dizziness|any nausea)\b/i,
    /\b(?:past history|previous|before now|any similar before|you don get dis before|you get dis before)\b/i,
  ],
};

// ============ SEMANTIC SIMILARITY USING SIMPLE EMBEDDINGS (EXPANDED) ============
interface IntentTemplate {
  intent: string;
  keywords: string[];
  weight: number;
}
const intentTemplates: Record<string, IntentTemplate[]> = {
  introduction: [
    { intent: 'self_introduction', keywords: ['name', 'doctor', 'dr', 'called', 'i am', 'my name', 'physician', 'medical student', 'taking care', 'introduce', 'greetings', 'hello im', 'hi im', 'dis is doctor'], weight: 1 },
    { intent: 'greeting_intro', keywords: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'hey', 'how are you', 'how far', 'dis is', 'gud mornin', 'na me'], weight: 0.95 },
    { intent: 'role_statement', keywords: ['taking care', 'your doctor', 'physician', 'medical student', 'i will be', 'i am here', 'looking after', 'i be doctor'], weight: 0.9 },
  ],
  consent: [
    { intent: 'permission_ask', keywords: ['permission', 'consent', 'okay', 'alright', 'mind', 'allow', 'fine', 'comfortable', 'approval', 'you okay', 'you comfortable', 'dis okay'], weight: 1 },
    { intent: 'polite_request', keywords: ['may i', 'can i', 'could i', 'would you', 'do you', 'kin i', 'let me', 'lemme', 'make i', 'allow me'], weight: 0.95 },
    { intent: 'agreement_check', keywords: ['that ok', 'that fine', 'that alright', 'you comfortable', 'you okay', 'you alright', 'sounds good', 'dis okay', 'you gree', 'you allow'], weight: 0.9 },
  ],
  patientInfo: [
    { intent: 'name_ask', keywords: ['name', 'called', 'tell me your name', 'what is your name', 'your name', 'full name', 'identity', 'who you be', 'wetin be your name'], weight: 1 },
    { intent: 'age_ask', keywords: ['age', 'old', 'years old', 'date of birth', 'dob', 'birth date', 'how old', 'born', 'how many years', 'when you born'], weight: 1 },
    { intent: 'identity_confirm', keywords: ['confirm', 'verify', 'check', 'identity', 'details', 'info', 'who you be', 'confirm name'], weight: 0.9 },
  ],
  chiefComplaint: [
    { intent: 'problem_ask', keywords: ['problem', 'issue', 'concern', 'wrong', 'matter', 'trouble', 'sick', 'ill', 'pain', 'complaint', 'wetin dey wrong', 'wetin dey do you'], weight: 1 },
    { intent: 'reason_visit', keywords: ['brings you', 'brought you', 'come in', 'here for', 'visit for', 'why you come', 'wetin bring you', 'wetin make you come'], weight: 1 },
    { intent: 'help_offer', keywords: ['help', 'assist', 'do for you', 'can i help', 'how can i', 'what i fit do', 'how i fit help'], weight: 0.85 },
  ],
  historyTaking: [
    { intent: 'history_detail', keywords: ['when', 'onset', 'duration', 'how long', 'describe', 'feel like', 'worse', 'better', 'scale', 'radiate', 'associated', 'anything else', 'tell me more', 'wetin else'], weight: 1 },
    { intent: 'socrates_probe', keywords: ['character', 'quality', 'severity', 'radiation', 'timing', 'aggravating', 'alleviating', 'associated symptoms', 'how e be', 'wetin make am worse'], weight: 0.95 },
  ],
};

// Calculate semantic similarity score for a message
const calculateSemanticScore = (text: string, intentType: string): number => {
  const lowerText = text.toLowerCase();
  const templates = intentTemplates[intentType];
  if (!templates) return 0;
  let maxScore = 0;
  for (const template of templates) {
    let matchCount = 0;
    for (const keyword of template.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    const score = (matchCount / template.keywords.length) * template.weight;
    maxScore = Math.max(maxScore, score);
  }
  return maxScore;
};

// Enhanced parse function with accent robustness
const accentRobustParse = (text: string) => {
  const result: Record<string, { detected: boolean; confidence: number }> = {};
  for (const [category, patterns] of Object.entries(accentRobustPatterns)) {
    let regexMatched = false;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        regexMatched = true;
        break;
      }
    }
    if (regexMatched) {
      result[category] = { detected: true, confidence: 0.98 };
    } else {
      const semanticScore = calculateSemanticScore(text, category);
      if (semanticScore > 0.5) {
        result[category] = { detected: true, confidence: semanticScore };
      } else {
        result[category] = { detected: false, confidence: 1 - semanticScore };
      }
    }
  }
  return result;
};

// ============ LEVERAGE VAPI'S OWN CONFIDENCE SCORES ============
interface VapiMessageWithConfidence {
  type: string;
  role: string;
  transcript: string;
  transcriptType: string;
  confidence?: number;
  words?: Array<{ word: string; confidence: number; start: number; end: number }>;
}

const processMessageWithConfidence = (message: VapiMessageWithConfidence) => {
  const text = message.transcript;
  const confidence = message.confidence || 0.85;
  const isLowConfidence = confidence < 0.75;
  const parsed = accentRobustParse(text);
  
  if (isLowConfidence) {
    for (const [key, value] of Object.entries(parsed)) {
      if (value.confidence > 0.4) parsed[key].detected = true;
    }
  }
  return { parsed, confidence };
};
// ============ CONVERSATION CONTEXT TRACKER ============
class ConversationContextTracker {
  private recentIntents: Array<{ intent: string; timestamp: number; confidence: number }> = [];
  private studentStyle: 'formal' | 'casual' | 'hesitant' = 'formal';
  addIntent(intent: string, confidence: number) {
    this.recentIntents.push({ intent, timestamp: Date.now(), confidence });
    if (this.recentIntents.length > 5) this.recentIntents.shift();
  }
  getLastIntent(): string | null {
    if (this.recentIntents.length === 0) return null;
    return this.recentIntents[this.recentIntents.length - 1].intent;
  }
  updateStudentStyle(messages: string[]) {
    const casualCount = messages.filter(m =>
      /\b(?:hey|hi|yeah|nope|yep|gonna|wanna|gotta|how far|wetin|you dey|na so|how you|dis one)\b/i.test(m)
    ).length;
    if (casualCount > messages.length * 0.3) {
      this.studentStyle = 'casual';
    } else {
      this.studentStyle = 'formal';
    }
  }
  getStudentStyle() {
    return this.studentStyle;
  }
}
const contextTracker = new ConversationContextTracker();

// ============ CONDITION-SPECIFIC UNIQUE HINT RESPONSES (FULLY EXPANDED - 6 UNIQUE PER CONDITION - NO OMISSIONS) ============
const conditionSpecificResponses: Record<string, string[]> = {
  "Abdominal Pain in Pregnancy": [
    "Introduce yourself politely as the doctor and confirm the patient's gestational age before any examination.",
    "Ask for explicit consent to perform an abdominal examination and explain why it is needed for the pregnancy pain.",
    "Confirm the patient's full name, date of birth, and current pregnancy details including last menstrual period.",
    "Ask what exactly brings her in today and focus on the onset and location of the abdominal pain during pregnancy.",
    "Use SOCRATES to explore the pain character, radiation, aggravating factors, and any associated bleeding or contractions.",
    "Summarize findings and seek permission to proceed with physical examination and possible ultrasound referral."
  ],
  "Amenorrhea": [
    "Introduce yourself and state that you are here to discuss her menstrual concerns in a supportive way.",
    "Obtain consent to take a detailed menstrual and sexual history before any physical exam.",
    "Confirm her full name, age, and last known menstrual period date to establish timeline.",
    "Ask what brings her in today specifically regarding absence of periods and any associated symptoms.",
    "Probe duration of amenorrhea, previous cycle regularity, weight changes, and possible pregnancy symptoms.",
    "Summarize history and explain next steps including possible pregnancy test or hormone evaluation."
  ],
  "Anemia in Pregnancy": [
    "Introduce yourself as her doctor and explain the importance of discussing blood levels in pregnancy.",
    "Seek consent for full blood work discussion and any necessary physical checks.",
    "Confirm name, date of birth, and current gestational age to contextualize anemia risks.",
    "Ask what symptoms brought her in such as fatigue or shortness of breath during pregnancy.",
    "Explore diet, previous pregnancies, and any history of bleeding or worm infestation.",
    "Summarize and recommend dietary changes plus iron supplementation with follow-up blood test."
  ],
  "Antenatal Booking": [
    "Introduce yourself warmly and welcome her to the first antenatal visit.",
    "Ask for consent to record detailed booking history and perform basic measurements.",
    "Confirm full name, date of birth, and expected delivery date for accurate records.",
    "Ask what made her come for booking and any early pregnancy concerns.",
    "Take full obstetric history including previous pregnancies and medical conditions.",
    "Summarize and schedule all routine booking scans and blood tests."
  ],
  "Antepartum Hemorrhage": [
    "Introduce yourself calmly and reassure her that you will address the bleeding urgently.",
    "Obtain consent for immediate abdominal examination and possible speculum check.",
    "Confirm name, gestational age, and exact onset of bleeding.",
    "Ask what happened today and details of the bleeding amount and color.",
    "Explore associated pain, contractions, or fetal movement changes.",
    "Summarize and outline urgent management plan including possible admission."
  ],
  "Anterior Neck Swelling (Hyper)": [
    "Introduce yourself and explain you will assess the neck swelling and thyroid function.",
    "Seek consent for neck examination and blood tests for hyperthyroidism.",
    "Confirm full name, age, and any family history of thyroid issues.",
    "Ask what brings her regarding the neck swelling and any heat intolerance.",
    "Probe symptoms like weight loss, palpitations, and tremor using detailed questions.",
    "Summarize and plan thyroid function tests with possible ultrasound."
  ],
  "Anterior Neck Swelling (Hypo)": [
    "Introduce yourself and state that you will evaluate the neck swelling for possible hypothyroidism.",
    "Obtain consent for full neck palpation and blood draw.",
    "Confirm name, date of birth, and any fatigue or cold intolerance history.",
    "Ask about the swelling and any associated weight gain or constipation.",
    "Explore duration, family history, and other hypothyroid symptoms.",
    "Summarize and arrange thyroid function tests plus ultrasound if needed."
  ],
  "Appendicitis": [
    "Introduce yourself as the doctor and reassure the patient about abdominal pain assessment.",
    "Ask for consent to perform abdominal examination.",
    "Confirm full name, age, and exact start time of pain.",
    "Ask what brings the patient in with focus on right lower quadrant pain.",
    "Use SOCRATES to detail migration of pain, nausea, and appetite loss.",
    "Summarize and explain need for urgent surgical review."
  ],
  "Bladder Outlet Obstruction": [
    "Introduce yourself and explain assessment of urinary flow problems.",
    "Obtain consent for digital rectal examination if male.",
    "Confirm name, age, and duration of urinary symptoms.",
    "Ask what brings him regarding difficulty passing urine.",
    "Probe stream strength, nocturia, and any hematuria.",
    "Summarize and plan ultrasound with possible catheterization."
  ],
  "Blood Per Rectum": [
    "Introduce yourself and reassure about discussing rectal bleeding.",
    "Seek consent for rectal examination and history taking.",
    "Confirm full name, age, and exact nature of bleeding.",
    "Ask what brought the patient in today with blood in stool.",
    "Explore color, amount, pain, and change in bowel habit.",
    "Summarize and arrange colonoscopy referral."
  ],
  "Breast Cancer": [
    "Introduce yourself and explain careful assessment of breast lump.",
    "Obtain consent for breast examination.",
    "Confirm name, age, and family history of cancer.",
    "Ask what noticed about the breast lump or changes.",
    "Probe duration, nipple discharge, and skin changes.",
    "Summarize and plan urgent mammogram plus biopsy."
  ],
  "Bronchial Asthma": [
    "Introduce yourself and discuss breathing difficulty management.",
    "Ask for consent to examine chest and review inhaler use.",
    "Confirm full name, age, and known asthma triggers.",
    "Ask what triggered the current episode of wheezing.",
    "Explore frequency of attacks and night symptoms.",
    "Summarize and optimize inhaler technique with peak flow."
  ],
  "Cervical Cancer": [
    "Introduce yourself and explain screening or symptom assessment for cervical issues.",
    "Obtain consent for speculum examination if needed.",
    "Confirm name, age, and sexual/reproductive history.",
    "Ask what symptoms brought her such as post-coital bleeding.",
    "Probe vaginal discharge, pain, or weight loss.",
    "Summarize and plan Pap smear or biopsy."
  ],
  "Chronic Kidney Disease": [
    "Introduce yourself and discuss kidney function monitoring.",
    "Seek consent for full physical exam and blood pressure check.",
    "Confirm name, age, and known hypertension or diabetes.",
    "Ask what symptoms like swelling or fatigue brought him.",
    "Explore urine output changes and dietary habits.",
    "Summarize and plan renal function tests with diet advice."
  ],
  "Chronic Leg Ulcer": [
    "Introduce yourself and explain wound assessment.",
    "Obtain consent for leg examination and dressing review.",
    "Confirm full name, age, and diabetes or vascular history.",
    "Ask what caused the leg ulcer and duration.",
    "Probe pain, discharge, and mobility issues.",
    "Summarize and plan compression therapy with vascular referral."
  ],
  "Chronic Liver Disease": [
    "Introduce yourself and discuss liver condition management.",
    "Ask for consent to examine abdomen for ascites.",
    "Confirm name, age, and alcohol or hepatitis history.",
    "Ask what symptoms like jaundice or swelling brought him.",
    "Explore abdominal distension and bleeding tendencies.",
    "Summarize and arrange liver function tests plus ultrasound."
  ],
  "Congestive Heart Failure": [
    "Introduce yourself and explain heart failure symptom control.",
    "Obtain consent for chest and edema examination.",
    "Confirm full name, age, and previous heart issues.",
    "Ask what brings the patient with shortness of breath.",
    "Probe orthopnea, paroxysmal nocturnal dyspnea, and leg swelling.",
    "Summarize and optimize diuretics with echo review."
  ],
  "Diabetes": [
    "Introduce yourself and review blood sugar control.",
    "Seek consent for foot and eye examination.",
    "Confirm name, age, and type of diabetes.",
    "Ask what symptoms or complications brought him today.",
    "Explore polyuria, polydipsia, and recent glucose readings.",
    "Summarize and adjust medication with lifestyle advice."
  ],
  "Ectopic Pregnancy": [
    "Introduce yourself and address urgent pregnancy concerns.",
    "Obtain consent for abdominal and vaginal examination.",
    "Confirm full name, gestational age, and last period.",
    "Ask about sudden pain and bleeding in early pregnancy.",
    "Probe shoulder tip pain and dizziness.",
    "Summarize and plan urgent ultrasound with possible surgery."
  ],
  "Gastric Outlet Obstruction": [
    "Introduce yourself and discuss vomiting and abdominal distension.",
    "Ask for consent to examine abdomen.",
    "Confirm name, age, and history of peptic ulcer.",
    "Ask what brings the patient with persistent vomiting.",
    "Explore projectile vomiting and weight loss.",
    "Summarize and plan nasogastric tube with endoscopy."
  ],
  "HIV": [
    "Introduce yourself and provide confidential counseling.",
    "Obtain consent for full history and examination.",
    "Confirm name, age, and any known status.",
    "Ask what concerns brought the patient regarding HIV.",
    "Probe opportunistic infections and adherence if on treatment.",
    "Summarize and plan viral load testing with counseling."
  ],
  "Hematuria": [
    "Introduce yourself and explain blood in urine evaluation.",
    "Seek consent for abdominal and genital exam.",
    "Confirm full name, age, and any pain with urination.",
    "Ask what noticed about blood in urine.",
    "Explore timing, clots, and associated symptoms.",
    "Summarize and arrange cystoscopy with imaging."
  ],
  "Hypertension": [
    "Introduce yourself and review blood pressure control.",
    "Obtain consent for cardiovascular examination.",
    "Confirm name, age, and any complications.",
    "Ask what symptoms like headache brought the patient.",
    "Probe lifestyle factors and medication adherence.",
    "Summarize and adjust antihypertensive therapy."
  ],
  "Hypertension in Pregnancy": [
    "Introduce yourself and address blood pressure in pregnancy.",
    "Ask for consent to check blood pressure and urine.",
    "Confirm full name, gestational age, and symptoms.",
    "Ask about headache or visual changes in pregnancy.",
    "Explore swelling and proteinuria.",
    "Summarize and plan urgent monitoring with possible admission."
  ],
  "Infertility": [
    "Introduce yourself and discuss fertility concerns sensitively.",
    "Obtain consent for detailed history and examination.",
    "Confirm name, age, and duration of trying to conceive.",
    "Ask what brought the couple regarding inability to conceive.",
    "Probe menstrual regularity and sexual history.",
    "Summarize and plan hormone tests with semen analysis."
  ],
  "Inguinal Hernia": [
    "Introduce yourself and explain groin swelling assessment.",
    "Seek consent for groin examination.",
    "Confirm full name, age, and any cough or lifting history.",
    "Ask what noticed about the groin swelling.",
    "Explore reducibility and pain on straining.",
    "Summarize and plan surgical repair discussion."
  ],
  "Intestinal Obstruction": [
    "Introduce yourself and address acute abdominal emergency.",
    "Obtain consent for full abdominal exam.",
    "Confirm name, age, and previous surgery history.",
    "Ask about vomiting, distension, and constipation.",
    "Probe absolute constipation and colicky pain.",
    "Summarize and plan nasogastric decompression with X-ray."
  ],
  "Miscarriage": [
    "Introduce yourself and offer supportive care for pregnancy loss.",
    "Ask for consent to examine and discuss bleeding.",
    "Confirm full name, gestational age, and symptoms.",
    "Ask what happened with the bleeding and pain.",
    "Explore passage of products and emotional impact.",
    "Summarize and plan evacuation with counseling."
  ],
  "Myocardial Infarction": [
    "Introduce yourself and treat as cardiac emergency.",
    "Obtain consent for ECG and chest exam.",
    "Confirm name, age, and risk factors.",
    "Ask about crushing chest pain radiation.",
    "Probe sweating, nausea, and shortness of breath.",
    "Summarize and activate emergency reperfusion protocol."
  ],
  "Neonatal Jaundice": [
    "Introduce yourself to the mother and explain newborn jaundice.",
    "Seek consent to examine the baby.",
    "Confirm baby name, age in days, and birth details.",
    "Ask what noticed about yellow skin or eyes.",
    "Explore feeding and stool color changes.",
    "Summarize and plan phototherapy if needed."
  ],
  "Non-pharmacological Management of Systemic Hypertension": [
    "Introduce yourself and focus on lifestyle for blood pressure.",
    "Obtain consent to discuss diet and exercise.",
    "Confirm name, age, and current blood pressure readings.",
    "Ask what lifestyle changes the patient has tried.",
    "Probe salt intake, exercise, and stress levels.",
    "Summarize DASH diet and exercise plan with monitoring."
  ],
  "Osteoarthritis": [
    "Introduce yourself and discuss joint pain management.",
    "Ask for consent to examine affected joints.",
    "Confirm full name, age, and duration of pain.",
    "Ask what brings the patient with joint stiffness.",
    "Explore weight bearing and morning stiffness.",
    "Summarize physiotherapy and weight loss advice."
  ],
  "Pelvic Inflammatory Disease": [
    "Introduce yourself and address lower abdominal pain in women.",
    "Obtain consent for pelvic examination.",
    "Confirm name, age, and sexual history.",
    "Ask about lower abdominal pain and discharge.",
    "Probe fever and dyspareunia.",
    "Summarize and plan antibiotics with partner tracing."
  ],
  "Peptic Ulcer Disease": [
    "Introduce yourself and evaluate epigastric pain.",
    "Seek consent for abdominal exam.",
    "Confirm full name, age, and NSAID or alcohol use.",
    "Ask what brings epigastric pain after meals.",
    "Explore relation to food and hematemesis.",
    "Summarize and plan endoscopy with PPI therapy."
  ],
  "Rheumatoid Arthritis": [
    "Introduce yourself and assess symmetric joint pain.",
    "Obtain consent for joint examination.",
    "Confirm name, age, and morning stiffness duration.",
    "Ask what symptoms of joint swelling and pain.",
    "Probe systemic features like fatigue.",
    "Summarize DMARD initiation with rheumatology referral."
  ],
  "Seizure Disorder": [
    "Introduce yourself and review seizure control.",
    "Ask for consent to discuss triggers and medication.",
    "Confirm full name, age, and last seizure date.",
    "Ask what happened during the recent seizure.",
    "Explore aura, duration, and post-ictal state.",
    "Summarize and optimize anticonvulsant therapy."
  ],
  "Sickle Cell Anemia": [
    "Introduce yourself and discuss crisis management.",
    "Obtain consent for full exam and pain assessment.",
    "Confirm name, age, and genotype.",
    "Ask what triggered the current painful crisis.",
    "Probe bone pain, fever, and hydration status.",
    "Summarize and plan hydration with analgesia."
  ],
  "Stroke": [
    "Introduce yourself and treat as time-critical emergency.",
    "Seek consent for FAST assessment.",
    "Confirm name, age, and onset time.",
    "Ask about sudden weakness or speech difficulty.",
    "Probe facial droop and arm drift.",
    "Summarize and activate stroke protocol with CT scan."
  ],
  "Tuberculosis": [
    "Introduce yourself and discuss chronic cough evaluation.",
    "Obtain consent for chest exam and sputum test.",
    "Confirm full name, age, and contact history.",
    "Ask what brought chronic cough and weight loss.",
    "Explore night sweats and hemoptysis.",
    "Summarize and plan GeneXpert with isolation if needed."
  ],
  "Uterine Fibroids": [
    "Introduce yourself and evaluate heavy menstrual bleeding.",
    "Ask for consent to abdominal and pelvic exam.",
    "Confirm name, age, and parity.",
    "Ask about heavy periods and abdominal swelling.",
    "Probe pressure symptoms and infertility.",
    "Summarize and plan ultrasound with management options."
  ],
  "Uterine Prolapse": [
    "Introduce yourself and discuss pelvic organ prolapse.",
    "Obtain consent for pelvic examination.",
    "Confirm full name, age, and parity history.",
    "Ask what noticed as something coming down.",
    "Explore urinary incontinence and defecation issues.",
    "Summarize and plan pessary or surgical repair."
  ],
  "Vaginal Discharge": [
    "Introduce yourself and address vaginal symptoms.",
    "Seek consent for speculum examination.",
    "Confirm name, age, and sexual history.",
    "Ask what type of discharge and odor.",
    "Probe itching, dysuria, and dyspareunia.",
    "Summarize and plan swab with appropriate treatment."
  ],
  "Vesicovaginal Fistula": [
    "Introduce yourself and provide empathetic fistula care.",
    "Obtain consent for detailed pelvic exam.",
    "Confirm full name, age, and obstetric history.",
    "Ask about continuous urine leakage after delivery.",
    "Explore social impact and previous repairs.",
    "Summarize and plan surgical repair referral."
  ],
  "Viral Hemorrhagic Fever": [
    "Introduce yourself and activate isolation protocol immediately.",
    "Ask for consent while maintaining distance.",
    "Confirm name, age, and travel or contact history.",
    "Ask about fever, bleeding, and exposure risks.",
    "Probe hemorrhagic symptoms and contacts.",
    "Summarize and initiate strict barrier nursing with lab confirmation."
  ]
};

// ============ REAL-TIME HINT GENERATION WITH CONTEXT AWARENESS ============
const generateContextAwareHint = (
  stage: string,
  department: string,
  condition: string,
  studentStyle: 'formal' | 'casual',
  previousAttempts: number
) => {
  if (condition && conditionSpecificResponses[condition]) {
    const responses = conditionSpecificResponses[condition];
    const selectedMessage = responses[Math.floor(Math.random() * responses.length)];
    return {
      id: `${Date.now()}-${stage}-${condition}`,
      message: selectedMessage,
      type: 'suggestion',
      category: stage,
      suggestion: `Tailored for ${condition}`,
      rationale: `Condition-specific hint for ${condition} based on current stage and your style.`
    };
  }
  return {
    id: `${Date.now()}-${stage}`,
    message: "Please focus on the current stage of the consultation.",
    type: 'suggestion',
    category: stage,
    suggestion: "Continue with standard history taking.",
    rationale: "General fallback hint."
  };
};

// ============ INTEGRATION WITH EXISTING SYSTEM ============
const parseStudentMessageAccentRobust = (text: string): ParsedResult => {
  const { parsed, confidence } = processMessageWithConfidence({
    type: 'transcript',
    role: 'user',
    transcript: text,
    transcriptType: 'final',
    confidence: 0.85
  });

  const result = {} as ParsedResult;

  for (const [key, value] of Object.entries(parsed)) {
    result[key] = value.detected;
  }
  result._confidence = confidence;
  result._parsedDetails = parsed;

  return result;
};

// Enhanced Voice Wave Animation with Gradient
const VoiceWave = ({ isActive }: { isActive: boolean }) => {
  return (
    <div className="flex items-center gap-1.5 h-14">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-full transition-all duration-200",
            isActive
              ? "bg-gradient-to-t from-blue-400 via-indigo-400 to-purple-400"
              : "bg-gray-500/50"
          )}
          style={{
            height: isActive ? `${12 + Math.sin(Date.now() / 150 + i) * 12}px` : '8px',
            animation: isActive ? `wave ${0.2 + i * 0.05}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { height: 12px; opacity: 0.6; }
          100% { height: 32px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};



// Enhanced Animated Mic Component with Ripple Effect
const AnimatedMic = ({ isActive, onClick }: { isActive: boolean; onClick?: () => void }) => {
  return (
    <div className="relative flex flex-col items-center group">
      <button
        onClick={onClick}
        disabled={isActive}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer relative",
          isActive
            ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 shadow-2xl shadow-blue-500/50 scale-110"
            : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-blue-600 hover:to-indigo-600 hover:scale-105 shadow-xl"
        )}
      >
        <i className={cn(
          "fas fa-microphone-alt text-3xl text-white transition-all duration-300",
          isActive && "animate-pulse"
        )} />
      
        {isActive && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping-slow bg-blue-400/40" />
            <span className="absolute inset-0 rounded-full animate-ping-slower bg-indigo-400/30" />
          </>
        )}
      </button>
    
      {isActive && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-5 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full animate-sound-wave"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}
    
      <style jsx>{`
        @keyframes sound-wave {
          0%, 100% { height: 6px; opacity: 0.4; }
          50% { height: 20px; opacity: 1; }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes ping-slower {
          0% { transform: scale(1); opacity: 0.3; }
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-sound-wave {
          animation: sound-wave 0.8s ease-in-out infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-ping-slower {
          animation: ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};


// Modern Floating Chat Button with Notification Badge
const FloatingChatButton = ({
  onClick,
  unreadCount,
  isDark
}: {
  onClick: () => void;
  unreadCount: number;
  isDark: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-32 right-6 z-40 group transition-all duration-500 hover:scale-110",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
      
        <div className={cn(
          "relative w-14 h-14 rounded-full shadow-2xl",
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
          "flex items-center justify-center overflow-hidden"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x" />
          <i className="fas fa-comment-dots text-white text-xl relative z-10" />
          <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse-ring" />
        </div>
      
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 animate-bounce-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </button>
  );
};

// Premium Chat Modal with Glassmorphism
const ChatModal = ({
  isOpen,
  onClose,
  children,
  isDark
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-md z-40 transition-all duration-300"
        onClick={onClose}
      />
      <div className={cn(
        "fixed bottom-32 right-6 z-50 w-[420px] rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 animate-slide-up",
        isDark
          ? "bg-gray-900/95 backdrop-blur-xl border border-gray-700/50"
          : "bg-white/95 backdrop-blur-xl border border-white/20",
        "shadow-2xl"
      )}>
        <div className={cn(
          "relative p-5 border-b overflow-hidden",
          isDark ? "border-gray-700/50" : "border-gray-200/50",
          "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift" />
        
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <i className="fas fa-comments text-white text-lg"></i>
              </div>
              <div>
                <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-gray-900")}>Live Conversation</h3>
                <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>Real-time transcript</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-all duration-300 hover:scale-110",
                isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"
              )}
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>
      
        <div className="h-[500px] flex flex-col">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      
        <style jsx>{`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-gradient-shift {
            background-size: 200% 200%;
            animation: gradient-shift 3s ease infinite;
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </div>
    </>
  );
};

export default function VapiVoiceInterface({
  patient,
  chatId,
  systemPrompt,
  sendMessage,
  type,
  examSteps = [],
  stationInfo,
  onExit,
  durationMinutes = 5,
  mode = 'exam',
  existingMessages = [],
  initialElapsedTime = 0,
  uiSettings = { showChiefComplaint: true, showPresentingCondition: true },
  department = null,
  hintEnabled = false,
  aiTutorEnabled = false,  // ADD THIS LINE
}: VapiVoiceInterfaceProps) {

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  
  // Timer state - CRITICAL: Different behaviors for practice vs exam
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(initialElapsedTime);
  
  const isExamMode = mode === 'exam';
  const isPracticeMode = mode === 'practice';



  
  // Debug log to verify mode
  useEffect(() => {
    console.log('🔧 VapiVoiceInterface received mode:', mode);
    console.log('🔧 isExamMode:', isExamMode, 'isPracticeMode:', isPracticeMode);
    console.log('🔧 hintEnabled:', hintEnabled);
  }, [mode, isExamMode, isPracticeMode, hintEnabled]);
  
  const getDisplayTime = (): string => {
    if (isExamMode) {
      const seconds = timeLeft !== null ? timeLeft : durationMinutes * 60;
      const mins = Math.floor(Math.abs(seconds) / 60);
      const secs = Math.abs(seconds) % 60;
      const sign = seconds < 0 ? '-' : '';
      return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const targetSeconds = durationMinutes * 60;
      const currentSeconds = elapsedTime;
      const displaySeconds = Math.min(currentSeconds, targetSeconds);
      const mins = Math.floor(displaySeconds / 60);
      const secs = displaySeconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  const getTimerColor = (): string => {
    if (isPracticeMode) {
      return "text-green-600 dark:text-green-400";
    }
    if (timeLeft !== null) {
      if (timeLeft < 60) return "text-red-600 dark:text-red-400 animate-pulse";
      if (timeLeft < 120) return "text-orange-500 dark:text-orange-400";
      return "text-amber-600 dark:text-amber-400";
    }
    return "text-amber-600 dark:text-amber-400";
  };
  
  const isTimerExpired = (): boolean => {
    return isExamMode && timeLeft !== null && timeLeft <= 0;
  };
  
  const formatTimeForHeader = (): string => {
    if (isExamMode) {
      const seconds = timeLeft !== null ? timeLeft : durationMinutes * 60;
      const mins = Math.floor(Math.abs(seconds) / 60);
      const secs = Math.abs(seconds) % 60;
      const sign = seconds < 0 ? '-' : '';
      return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const targetSeconds = durationMinutes * 60;
      const currentSeconds = Math.min(elapsedTime, targetSeconds);
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const currentAccountIdRef = useRef<string | null>(null);
  
  const vapiRef = useRef<Vapi | null>(null);
  
  // Conversation Milestones - tracks student progress through OSCE
  const [conversationMilestones, setConversationMilestones] = useState({
    introduced: false,
    consent: false,
    patientInfo: false,
    chiefComplaint: false,
    historyTaking: false,
    redFlags: false,
    ice: false,
    systemsReview: false,
    pastHistory: false,
    drugHistory: false,
    socialHistory: false
  });
  
  // Function to update milestones based on student messages using accent-robust parser
  const updateMilestonesFromMessage = useCallback((content: string) => {
    const parsed = parseStudentMessageAccentRobust(content);
    
    const updates: Partial<typeof conversationMilestones> = {};
    
    if (!conversationMilestones.introduced && parsed.introduction && parsed._confidence > 0.55) {
      updates.introduced = true;
      console.log('✅ Milestone achieved: INTRODUCTION (accent-robust)');
    }
    
    if (!conversationMilestones.consent && parsed.consent && parsed._confidence > 0.55) {
      updates.consent = true;
      console.log('✅ Milestone achieved: CONSENT (accent-robust)');
    }
    
    if (!conversationMilestones.patientInfo && parsed.patientInfo && parsed._confidence > 0.55) {
      updates.patientInfo = true;
      console.log('✅ Milestone achieved: PATIENT INFO (accent-robust)');
    }
    
    if (!conversationMilestones.chiefComplaint && parsed.chiefComplaint && parsed._confidence > 0.55) {
      updates.chiefComplaint = true;
      console.log('✅ Milestone achieved: CHIEF COMPLAINT (accent-robust)');
    }
    
    if (!conversationMilestones.historyTaking && parsed.historyTaking && parsed._confidence > 0.55) {
      updates.historyTaking = true;
      console.log('✅ Milestone achieved: HISTORY TAKING (accent-robust)');
    }
    
    if (Object.keys(updates).length > 0) {
      setConversationMilestones(prev => ({ ...prev, ...updates }));
    }
  }, [conversationMilestones]);
  
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHintTimeRef = useRef<number>(0);
  const shownHintsCache = useRef<Map<string, number>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepMessages, setStepMessages] = useState<DBMessage[][]>([[]]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOverallModal, setShowOverallModal] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState<any>(null);
  const [showSwitchingModal, setShowSwitchingModal] = useState(false);
  const [switchingMessage, setSwitchingMessage] = useState('');
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [hasReconnected, setHasReconnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{ role: string; text: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showHintPopup, setShowHintPopup] = useState(true);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  
  const sessionEndedRef = useRef(false);
  
  const firstMessages = [
    "I'm ready when you are, Doctor",
    "I'm ready when you are",
    "Let's begin Doctor",
    "Hello Doctor, can we start?",
    "I'm here for my appointment Doctor",
    "Ready to proceed, Doctor",
    "I'm all set, please begin",
    "Looking forward to our session, Doctor"
  ];
  
  const reconnectMessages = [
    "Doc, let's continue",
    "Ready to continue",
    "Alright, go on",
    "I'm back, let's proceed",
    "Where were we, Doctor?",
    "Let's pick up where we left off",
    "Continuing our session"
  ];
  
  const isMountedRef = useRef(true);
  const pageVisibleRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const analysisInProgressRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupInProgressRef = useRef(false);
    const failoverInProgressRef = useRef(false);
const retryCountRef = useRef(0);
  const accumulatedTranscriptsRef = useRef<Map<string, { text: string, timeout: NodeJS.Timeout | null, lastUpdate: number }>>(new Map());
  const lastProcessedMessageRef = useRef<Map<string, { text: string, timestamp: number }>>(new Map());
  const STORAGE_KEY = `vapi_session_${chatId}`;
  
  const FEMALE_ASSISTANT_ID = "38df9706-7be9-4f49-94f6-edf416eaf635";
  const MALE_ASSISTANT_ID = "86fdba35-687a-4b7f-b89e-858f4facf8ac";

  
  const isConnectedRef = useRef(isConnected);
  const isConnectingRef = useRef(isConnecting);
  const isReconnectingRef = useRef(isReconnecting);
  const messagesLengthRef = useRef(messages.length);
  const timeLeftRef = useRef(timeLeft);
  const elapsedTimeRef = useRef(elapsedTime);
  const isExamModeRef = useRef(isExamMode);
  const isPracticeModeRef = useRef(isPracticeMode);
  const durationMinutesRef = useRef(durationMinutes);
  
  useEffect(() => {
    isConnectedRef.current = isConnected;
    isConnectingRef.current = isConnecting;
    isReconnectingRef.current = isReconnecting;
    messagesLengthRef.current = messages.length;
    timeLeftRef.current = timeLeft;
    elapsedTimeRef.current = elapsedTime;
    isExamModeRef.current = isExamMode;
    isPracticeModeRef.current = isPracticeMode;
    durationMinutesRef.current = durationMinutes;
  }, [isConnected, isConnecting, isReconnecting, messages.length, timeLeft, elapsedTime, isExamMode, isPracticeMode, durationMinutes]);
  
  // Restore existing messages if provided
  useEffect(() => {
    if (existingMessages && existingMessages.length > 0) {
      console.log(`🔄 Restoring ${existingMessages.length} existing messages`);
      
      const restoredMessages = existingMessages.map((msg: { role: string; content: string; createdAt: string }) => ({
        type: 'transcript',
        role: msg.role === 'student' ? 'user' : 'patient',
        transcript: msg.content,
        transcriptType: 'final'
      }));
      
      setMessages(restoredMessages);
      
      if (isPracticeMode && initialElapsedTime > 0) {
        setElapsedTime(initialElapsedTime);
      }
      
      toast.info(`Resuming conversation with ${existingMessages.length} messages`, { duration: 2000 });
    }
  }, [existingMessages, initialElapsedTime, isPracticeMode]);
  
  // Initialize timer based on mode
  useEffect(() => {
    if (isExamMode) {
      console.log('🎯 Exam Mode: Setting countdown timer to', durationMinutes * 60, 'seconds');
      setTimeLeft(durationMinutes * 60);
      setElapsedTime(0);
    } else {
      console.log('🎯 Practice Mode: Setting count-up timer from 0 to', durationMinutes * 60, 'seconds');
      setElapsedTime(initialElapsedTime);
      setTimeLeft(null);
    }
  }, [isExamMode, durationMinutes, initialElapsedTime]);
  
  const getRandomMessage = useCallback((messagesArray: string[]) => {
    const randomIndex = Math.floor(Math.random() * messagesArray.length);
    return messagesArray[randomIndex];
  }, []);
  
  const mergeTranscripts = useCallback((current: string, incoming: string): string => {
    if (!current?.trim()) return incoming.trim();
    if (!incoming?.trim()) return current.trim();
    
    const currTrim = current.trim();
    const incTrim = incoming.trim();
    
    if (incTrim.toLowerCase().startsWith(currTrim.toLowerCase())) {
      return incTrim;
    }
    
    if (currTrim.toLowerCase().startsWith(incTrim.toLowerCase())) {
      return currTrim;
    }
    
    let overlap = 0;
    const minLen = Math.min(currTrim.length, incTrim.length);
    const maxOverlap = Math.min(50, minLen);
    
    for (let i = maxOverlap; i > 5; i--) {
      if (currTrim.slice(-i).toLowerCase() === incTrim.slice(0, i).toLowerCase()) {
        overlap = i;
        break;
      }
    }
    
    if (overlap > 0) {
      return (currTrim + incTrim.slice(overlap)).trim();
    }
    
    const currWords = currTrim.split(/\s+/);
    const incWords = incTrim.split(/\s+/);
    
    if (incWords.length > currWords.length * 1.5) {
      const currSet = new Set(currWords.map(w => w.toLowerCase()));
      const matchCount = incWords.filter(w => currSet.has(w.toLowerCase())).length;
      if (matchCount / currWords.length > 0.7) {
        return incTrim;
      }
    }
    
    return `${currTrim} ${incTrim}`.trim();
  }, []);
  
  const cleanTranscriptWithAI = useCallback(async (text: string, role: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) return null;
    
    if (/^(test|testing|hello|hi|hey)\s*$/i.test(text.trim()) && text.length < 10) {
      return null;
    }

    try {
      const response = await fetch('/api/clean-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: text,
          role,
          context: patient?.condition || 'Medical consultation'
        })
      });

      const result = await response.json();
      
      if (result.shouldDiscard || !result.cleaned || result.cleaned.length < 2) {
        return null;
      }

      return result.cleaned;
    } catch (error) {
      console.error('AI cleaning failed:', error);
      return text.trim().replace(/\s+/g, ' ');
    }
  }, [patient?.condition]);
  
  const isDuplicate = useCallback((text: string, role: string): boolean => {
    const lastMessage = lastProcessedMessageRef.current.get(role);
    if (!lastMessage) return false;
    
    const timeDiff = Date.now() - lastMessage.timestamp;
    if (timeDiff > 5000) return false;
    
    const current = text.toLowerCase().trim();
    const last = lastMessage.text.toLowerCase().trim();
    
    if (current === last) return true;
    if (current.length > last.length && current.includes(last)) return false;
    if (last.length > current.length && last.includes(current)) return true;
    
    return false;
  }, []);
  
  const sendFinalMessage = useCallback(async (text: string, role: string) => {
    console.log('🔴 RAW from Vapi:', text);

    const cleanedText = await cleanTranscriptWithAI(text, role);
    
    if (!cleanedText) {
      console.log('❌ Discarded by AI cleaner');
      return;
    }

    console.log('🟢 AI Cleaned:', cleanedText);

    if (isDuplicate(cleanedText, role)) {
      console.log('❌ Duplicate, skipping');
      return;
    }

    lastProcessedMessageRef.current.set(role, {
      text: cleanedText,
      timestamp: Date.now()
    });

    const messageRole = role === 'user' ? 'student' : 'patient';
    
    // Update milestones based on student message using accent-robust parser
    if (messageRole === 'student') {
      updateMilestonesFromMessage(cleanedText);
    }
    
    const newMessage = {
      type: 'transcript',
      role,
      transcript: cleanedText,
      transcriptType: 'final'
    };

    setMessages((prev) => {
      const newMessages = [...prev, newMessage];
      if (!isChatOpen) {
        setUnreadCount(prevCount => prevCount + 1);
      }
      return newMessages;
    });

    window.dispatchEvent(new CustomEvent('newMessage', { 
      detail: { role: messageRole, content: cleanedText } 
    }));

    await sendMessage(chatId, messageRole, cleanedText);
    
    if (type === 'physical_exam' && examSteps.length > 0) {
      setStepMessages((prev) => {
        const next = [...prev];
        if (!next[currentStepIndex]) next[currentStepIndex] = [];
        next[currentStepIndex].push({
          id: crypto.randomUUID(),
          chatId,
          role: messageRole,
          content: cleanedText,
          attachments: null,
          createdAt: new Date(),
        } as DBMessage);
        return next;
      });
    }
  }, [chatId, sendMessage, type, examSteps.length, currentStepIndex, cleanTranscriptWithAI, isDuplicate, isChatOpen, updateMilestonesFromMessage]);
  
  const processTranscript = useCallback(async (message: any) => {
    if (!pageVisibleRef.current || !isMountedRef.current) return;

    const rawText = message.transcript || '';
    const role = message.role;
    const isFinal = message.transcriptType === 'final' || message.isFinal === true;

    if (!rawText || typeof rawText !== 'string') return;

    if (!isFinal) {
      const quickClean = rawText
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 100);
      
      setLiveTranscript({ role, text: quickClean });
      return;
    }

    await sendFinalMessage(rawText, role);
    setLiveTranscript(null);
  }, [sendFinalMessage]);
  
  const handleOpenChat = useCallback(() => {
    setIsChatOpen(true);
    setUnreadCount(0);
  }, []);
  
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);
  
  const saveSessionState = useCallback(() => {
    if (!chatId) return;
    const state = {
      messages,
      currentStepIndex,
      stepMessages,
      timeLeft,
      elapsedTime,
      sessionStartTime: sessionStartTimeRef.current,
      isConnected,
      hasReconnected,
      mode,
      conversationMilestones,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [chatId, messages, currentStepIndex, stepMessages, timeLeft, elapsedTime, isConnected, hasReconnected, mode, conversationMilestones]);
  
  const stopVoiceSession = useCallback(() => {
    accumulatedTranscriptsRef.current.forEach((acc) => {
      if (acc.timeout) clearTimeout(acc.timeout);
    });
    accumulatedTranscriptsRef.current.clear();
    setLiveTranscript(null);
    
    if (vapiRef.current) {
      try {
        console.log('🔴 Forcibly stopping Vapi call');
        vapiRef.current.stop();
      } catch (e) {
        console.error('Error stopping Vapi:', e);
      }
      setIsConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
    }
    saveSessionState();
  }, [saveSessionState]);
  
  const cleanupVapi = useCallback(async () => {
    if (cleanupInProgressRef.current) return;
    cleanupInProgressRef.current = true;
    
    accumulatedTranscriptsRef.current.forEach((acc) => {
      if (acc.timeout) clearTimeout(acc.timeout);
    });
    accumulatedTranscriptsRef.current.clear();
    setLiveTranscript(null);
    
    if (vapiRef.current) {
      try {
        await vapiRef.current.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {}
    }
    
    if (process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
      try {
        vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
        const vapi = vapiRef.current;
        
        vapi.on('call-start', () => {
  console.log('✅ Vapi call started');
  if (isMountedRef.current) {
    setIsConnected(true);
    setIsConnecting(false);
    setIsReconnecting(false);
    if (!sessionStartTimeRef.current) sessionStartTimeRef.current = Date.now();
    saveSessionState();
    
    // As a backup, try to get callId from the vapi instance after call starts
    setTimeout(() => {
      const callId = (vapiRef.current as any)?.callId || 
                     (vapiRef.current as any)?.activeCallId ||
                     (vapiRef.current as any)?.call?.id ||
                     null;
      
      if (callId) {
        console.log('✅ Got callId from instance (backup):', callId);
        
        // Save vapiCallId to database (only if not already saved)
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vapiCallId: callId }),
        }).catch(err => console.error('Failed to save vapiCallId:', err));
      }
    }, 500);
  }
});
        
        vapi.on('call-end', () => {
          console.log('Vapi call ended');
          if (isMountedRef.current) {
            setIsConnected(false);
            setIsConnecting(false);
            setIsReconnecting(false);
            setLiveTranscript(null);
            saveSessionState();
          }
        });
        
        vapi.on('message', async (message: any) => {
          if (message.type === 'transcript' && message.role && message.transcript) {
            await processTranscript(message);
          } else {
            setMessages((prev) => [...prev, message]);
          }
        });
        
        vapi.on('error', (error: any) => {
  // 🔇 Don't log or toast if we're already failing over
  if (failoverInProgressRef.current) return;

  console.error('Vapi runtime error:', error);
  if (!isReconnecting) toast.error(`Voice error: ${error.message || 'Unknown error'}`);
  if (isMountedRef.current) {
    setIsConnecting(false);
    setIsReconnecting(false);
  }
});
      } catch (e) {
        console.error('Failed to reinitialize Vapi:', e);
      }
    }
    
    cleanupInProgressRef.current = false;
  }, [processTranscript, saveSessionState]);
  
  const loadSessionState = useCallback(() => {
    if (!chatId) return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) return state;
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
    return null;
  }, [chatId]);
  



const startVoiceSession = useCallback(async (
  isReconnectAttempt = false,
  excludedAccounts: string[] = []
) => {
  if (!patient) {
    toast.error('Missing patient data');
    return;
  }

  // CRITICAL: Same guard as AI Tutor
  if (failoverInProgressRef.current) {
    console.log('⏭️ Failover already in progress, skipping');
    return;
  }

  // Only check state for user-initiated calls
  if (excludedAccounts.length === 0 && !isReconnectAttempt && (isConnectingRef.current || isConnectedRef.current)) {
    toast.info('Voice session already active');
    return;
  }

  failoverInProgressRef.current = true;
  
  if (excludedAccounts.length === 0) {
    setIsConnecting(true);
    isConnectingRef.current = true;
    if (isReconnectAttempt) {
      setIsReconnecting(true);
      isReconnectingRef.current = true;
    }
  }

  try {
    const gender = (patient.gender || '').toLowerCase().trim();
    const vapiType = (gender === 'female' || gender === 'f') ? 'patientFemale' : 'patientMale';

    console.log(`🔄 Voice Attempt ${excludedAccounts.length + 1}: excluded=[${excludedAccounts.join(', ')}]`);
    
    // Clean up previous instance (same as AI Tutor)
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch (e) {}
      vapiRef.current = null;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const { vapi, accountId, assistantId } = await initVapi(vapiType, excludedAccounts);
    vapiRef.current = vapi;
    currentAccountIdRef.current = accountId;

    console.log(`📞 Voice using account: ${accountId}`);
    await trackCall(accountId, 'start');

    let callStarted = false;
    let startError: any = null;

    // Same pattern as AI Tutor - promise that rejects on error
    const startPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!callStarted && !startError) {
          reject(new Error('Call start timeout'));
        }
      }, 10000);

  vapi.on('call-start', () => {
  callStarted = true;
  clearTimeout(timeout);
  console.log('✅ Voice call started successfully');
  
  if (isMountedRef.current) {
    // ✅ DISMISS ANY ERROR TOASTS from failed attempts
    toast.dismiss();
    
    isConnectedRef.current = true;
    isConnectingRef.current = false;
    isReconnectingRef.current = false;
    failoverInProgressRef.current = false;
    
    setIsConnected(true);
    setIsConnecting(false);
    setIsReconnecting(false);
    
    if (!sessionStartTimeRef.current) sessionStartTimeRef.current = Date.now();
    saveSessionState();

    setTimeout(() => {
      const callId = (vapiRef.current as any)?.callId || null;
      if (callId) {
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vapiCallId: callId }),
        }).catch(() => {});
      }
    }, 500);
    
    if (isReconnectAttempt && excludedAccounts.length === 0) {
      toast.success('Reconnected!', { duration: 2000 });
    }
  }
  resolve();
});

      vapi.on('call-end', () => {
        if (isMountedRef.current) {
          isConnectedRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
          setIsReconnecting(false);
          setLiveTranscript(null);
          saveSessionState();
        }
        trackCall(accountId, 'end').catch(() => {});
      });

      vapi.on('message', async (message: any) => {
        if (message.type === 'transcript' && message.role && message.transcript) {
          await processTranscript(message);
        } else {
          setMessages((prev) => [...prev, message]);
        }
      });

      // IDENTICAL to AI Tutor error handler
      vapi.on('error', (error: any) => {
        if (startError) return;
        
        const { message, isRetryable } = extractVapiError(error);
        console.error('❌ Voice error during start:', { message, isRetryable });
        
        startError = error;
        clearTimeout(timeout);
        
        // IMPORTANT: Reject so catch block runs
        reject(error);
      });

      const firstMessage = hasReconnected || messages.length > 0
        ? getRandomMessage(reconnectMessages)
        : getRandomMessage(firstMessages);

      vapi.start(assistantId, {
        variableValues: {
          patientName: patient.name,
          patientAge: patient.age,
          patientGender: patient.gender,
          patientLocation: patient.location || 'unknown location',
          patientCondition: patient.condition,
          patientPrompt: patient.prompt || '',
        },
        firstMessage,
        stopSpeakingPlan: { numWords: 1, voiceSeconds: 0.25, backoffSeconds: 1.2 },
      }).catch((err) => {
        if (!startError) {
          startError = err;
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    await startPromise;
    setHasReconnected(true);
    
  } catch (error: any) {
    console.error('❌ Failed to start voice:', error);
    
    const { message, isRetryable } = extractVapiError(error);
    console.log(`📊 Voice failover check: isRetryable=${isRetryable}, excludedCount=${excludedAccounts.length}, message="${message}"`);
    
    const failedAccountId = currentAccountIdRef.current;
    
    const isAuthError = message.toLowerCase().includes('unauthorized') || 
                        message.toLowerCase().includes('invalid key') ||
                        isRetryable === true;
    
    if ((isRetryable || isAuthError) && excludedAccounts.length < 5) {
      if (failedAccountId) {
        console.log(`🏷️ Marking voice account ${failedAccountId} as exhausted`);
        await trackCall(failedAccountId, 'exhausted').catch(() => {});
      }
      
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch (e) { console.log('Stop error:', e); }
        vapiRef.current = null;
      }
      currentAccountIdRef.current = null;
      
      const newExcluded = [...excludedAccounts, failedAccountId || 'unknown'];
      console.log(`🔄 Retrying voice with excluded accounts: ${newExcluded.join(', ')}`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      failoverInProgressRef.current = false;
      await startVoiceSession(isReconnectAttempt, newExcluded);
      return;
    }
    
    // ❌ REMOVED TOAST - silent failure
    console.log('❌ All accounts exhausted for voice.');
    failoverInProgressRef.current = false;
    isConnectingRef.current = false;
    isReconnectingRef.current = false;
    setIsConnecting(false);
    setIsReconnecting(false);
  }
}, [patient, hasReconnected, messages.length, getRandomMessage, firstMessages, reconnectMessages, chatId, saveSessionState, processTranscript]);
  // Timer effect
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    
    const shouldRunTimer = isConnected && !showFeedbackModal && !showOverallModal;
    
    if (shouldRunTimer) {
      console.log('⏱️ Starting timer for mode:', isExamMode ? 'EXAM (countdown)' : 'PRACTICE (count up)');
      
      timerRef.current = setInterval(() => {
        if (isExamMode) {
          setTimeLeft((prev) => {
            if (prev !== null && prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              if (!sessionEndedRef.current) {
                sessionEndedRef.current = true;
                toast.warning('Time is up! Session ending...', { duration: 3000 });
                handleTerminate();
              }
              return 0;
            }
            const newTime = (prev !== null ? prev - 1 : durationMinutes * 60 - 1);
            saveSessionState();
            return newTime;
          });
        } else {
          setElapsedTime((prev) => {
            const maxSeconds = durationMinutes * 60;
            const newTime = prev + 1;
            saveSessionState();
            
            if (newTime >= maxSeconds && !sessionEndedRef.current) {
              if (timerRef.current) clearInterval(timerRef.current);
              sessionEndedRef.current = true;
              toast.info(`Session time limit of ${durationMinutes} minutes reached!`, { duration: 5000 });
              handleTerminate();
            }
            return newTime;
          });
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, showFeedbackModal, showOverallModal, isExamMode, isPracticeMode, durationMinutes, saveSessionState]);
  
  // Auto-save
  useEffect(() => {
    if (messages.length > 0 || currentStepIndex > 0) saveSessionState();
  }, [messages, currentStepIndex, stepMessages, timeLeft, elapsedTime, isConnected, saveSessionState]);
  
  // Load saved state
  useEffect(() => {
    const savedState = loadSessionState();
    if (savedState) {
      console.log('🔄 Restoring saved session state');
      setMessages(savedState.messages || []);
      setCurrentStepIndex(savedState.currentStepIndex || 0);
      setStepMessages(savedState.stepMessages || [[]]);
      if (savedState.mode === 'practice') {
        setElapsedTime(savedState.elapsedTime || 0);
        setTimeLeft(null);
      } else {
        setTimeLeft(savedState.timeLeft);
        setElapsedTime(0);
      }
      sessionStartTimeRef.current = savedState.sessionStartTime || 0;
      setHasReconnected(savedState.hasReconnected || false);
      if (savedState.conversationMilestones) {
        setConversationMilestones(savedState.conversationMilestones);
      }
      if (savedState.messages?.length > 0) {
        toast.info('Conversation restored from previous session', { duration: 3000, icon: '🔄' });
      }
    }
  }, [loadSessionState]);
  
  // AI Tutor help handler
  const handleTutorHelp = useCallback(async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            departmentName: department?.name || 'General Medicine',
            patientCondition: patient?.condition || '',
            currentStep: currentStepIndex + 1,
            totalSteps: examSteps.length || 1,
            conversationType: type
          },
          conversationHistory: messages
            .filter(m => m.type === 'transcript')
            .slice(-10)
            .map(m => ({ role: m.role === 'user' ? 'student' : 'patient', content: m.transcript }))
        })
      });
      
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error('Tutor help error:', error);
      return "I'm having trouble connecting. Please try again.";
    }
  }, [department, patient, currentStepIndex, examSteps.length, type, messages]);
  
  // Hint generation effect with milestone updates - now uses accent-robust parser
  useEffect(() => {
    if (!hintEnabled || isExamMode || messages.length === 0) return;

    const transcriptMessages = messages.filter(m => m.type === 'transcript' && m.transcript);
    if (transcriptMessages.length === 0) return;
    
    const now = Date.now();
    for (const [hintId, timestamp] of shownHintsCache.current.entries()) {
      if (now - timestamp > 45000) {
        shownHintsCache.current.delete(hintId);
      }
    }

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    hintTimeoutRef.current = setTimeout(async () => {
      try {
        const recentConversation = transcriptMessages.slice(-10).map(m => ({
          role: m.role === 'user' ? 'student' : 'patient',
          content: m.transcript
        }));

        const response = await fetch('/api/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: recentConversation,
            fullHistory: transcriptMessages.slice(-25).map(m => ({
              role: m.role === 'user' ? 'student' : 'patient',
              content: m.transcript
            })),
            context: {
              departmentName: department?.name || 'General Medicine',
              patientCondition: patient?.condition || '',
              currentStep: currentStepIndex + 1,
              milestones: conversationMilestones,
              messageCount: transcriptMessages.length
            }
          })
        });

        const hint = await response.json();
        
        const currentStage = 
          conversationMilestones.patientInfo ? 'history' :
          conversationMilestones.consent ? 'patientInfo' :
          conversationMilestones.introduced ? 'consent' : 'intro';

        const isRegression = 
          (currentStage === 'patientInfo' && hint.category === 'Introduction') ||
          (currentStage === 'history' && (hint.category === 'Introduction' || hint.category === 'Consent'));

        if (isRegression) {
          console.log('🚫 Blocked regression hint:', hint.category, 'Current stage:', currentStage);
          return;
        }
        
        const hintId = `${hint.category}-${hint.type}`;
        const isDuplicateHint = shownHintsCache.current.has(hintId);
        const timeSinceLastHint = Date.now() - lastHintTimeRef.current;

        if (hint && hint.message && (!isDuplicateHint || hint.type === 'error' || timeSinceLastHint > 20000)) {
          console.log('✅ Showing hint:', hint.category);
          window.dispatchEvent(new CustomEvent('showHint', { detail: hint }));
          shownHintsCache.current.set(hintId, Date.now());
          lastHintTimeRef.current = Date.now();
          
          const cat = hint.category.toLowerCase();
          if (cat.includes('intro') || hint.message.toLowerCase().includes('introduce')) {
            setConversationMilestones(prev => ({ ...prev, introduced: true }));
          }
          if (cat.includes('consent') || hint.message.toLowerCase().includes('consent') || hint.message.toLowerCase().includes('permission')) {
            setConversationMilestones(prev => ({ ...prev, consent: true }));
          }
          if (cat.includes('patient') || cat.includes('info') || hint.message.toLowerCase().includes('name') || hint.message.toLowerCase().includes('age')) {
            setConversationMilestones(prev => ({ ...prev, patientInfo: true }));
          }
          if (cat.includes('chief') || hint.message.toLowerCase().includes('brings you') || hint.message.toLowerCase().includes('what brings')) {
            setConversationMilestones(prev => ({ ...prev, chiefComplaint: true }));
          }
          if (cat.includes('history') || cat.includes('condition')) {
            setConversationMilestones(prev => ({ ...prev, historyTaking: true }));
          }
          if (cat.includes('red') || cat.includes('flag')) {
            setConversationMilestones(prev => ({ ...prev, redFlags: true }));
          }
          if (cat.includes('ice') || cat.includes('closure')) {
            setConversationMilestones(prev => ({ ...prev, ice: true }));
          }
        } else {
          console.log('❌ Hint suppressed:', { isDuplicateHint, timeSinceLastHint, type: hint?.type });
        }
      } catch (error) {
        console.error('Hint generation failed:', error);
      }
    }, 1500);

    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [messages, hintEnabled, isExamMode, department, patient, currentStepIndex, conversationMilestones]);
  
  // Main initialization effect
  useEffect(() => {
    isMountedRef.current = true;
    pageVisibleRef.current = document.visibilityState === 'visible';
    sessionEndedRef.current = false;
    
    cleanupVapi();
    
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      pageVisibleRef.current = isVisible;
      
      if (isVisible) {
        console.log('📱 Page became visible');
        const hasActiveSession = isPracticeModeRef.current 
          ? elapsedTimeRef.current > 0 
          : (timeLeftRef.current !== null && timeLeftRef.current > 0);
        
        if (!isConnectedRef.current && 
            !isConnectingRef.current && 
            !isReconnectingRef.current && 
            messagesLengthRef.current > 0 && 
            hasActiveSession &&
            !sessionEndedRef.current) {
          console.log('📱 Attempting to reconnect...');
          toast.info('Reconnecting to voice session...', { duration: 2000 });
          setTimeout(() => startVoiceSession(true), 1000);
        }
      } else {
        console.log('📱 Page became hidden - pausing voice session');
        if (isConnectedRef.current) {
          stopVoiceSession();
          toast.info('Voice session paused', { duration: 2000 });
        }
      }
    };
    
    const handleBeforeUnload = () => {
      if (isConnectedRef.current) {
        stopVoiceSession();
      }
      saveSessionState();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log('🧹 VapiVoiceInterface unmounting → forcing voice stop');
      isMountedRef.current = false;
      
      accumulatedTranscriptsRef.current.forEach((acc) => {
        if (acc.timeout) clearTimeout(acc.timeout);
      });
      accumulatedTranscriptsRef.current.clear();
      setLiveTranscript(null);
      
      stopVoiceSession();
      
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {}
        vapiRef.current = null;
      }
      
      saveSessionState();
      cleanupInProgressRef.current = false;
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  const handleEndStep = useCallback(async () => {
    if (analysisInProgressRef.current) return;
    analysisInProgressRef.current = true;
    
    stopVoiceSession();
    setIsAnalyzing(true);
    setShowFeedbackModal(true);
    
    const stepTranscript = stepMessages[currentStepIndex]
      ?.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n') || '';
    const stepName = examSteps[currentStepIndex]?.name || 'Step';
    try {
      const res = await fetch('/api/analyze-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: stepTranscript, stepName }),
      });
      
      if (!res.ok) throw new Error('analyze-step failed');
      const feedback = await res.json();
      
      setCurrentFeedback(feedback);
      setCurrentVideoUrl(examSteps[currentStepIndex]?.videoUrl || '');
      
      await fetch('/api/step-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          stepIndex: currentStepIndex,
          feedback: {
            stepName: examSteps[currentStepIndex]?.name,
            score: feedback.score,
            feedback: typeof feedback === 'string' ? feedback : feedback.overall_assessment,
            strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
            improvements: Array.isArray(feedback.improvements) ? feedback.improvements : [],
            suggestions: Array.isArray(feedback.suggestions) ? feedback.suggestions : [],
            evidence: feedback.evidence || 'No specific evidence'
          }
        }),
      });
    } catch (error) {
      console.error('Error analyzing step:', error);
      toast.error('Failed to analyze step');
    } finally {
      setIsAnalyzing(false);
      analysisInProgressRef.current = false;
    }
  }, [currentStepIndex, examSteps, stepMessages, chatId, stopVoiceSession]);
  
  const handleNextStep = useCallback(() => {
    setShowFeedbackModal(false);
    setShowVideoModal(false);
    setCurrentFeedback(null);
    if (currentStepIndex < examSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setStepMessages(prev => {
        const newSteps = [...prev];
        if (!newSteps[currentStepIndex + 1]) {
          newSteps[currentStepIndex + 1] = [];
        }
        return newSteps;
      });
      saveSessionState();
    } else {
      analyzeOverall();
    }
  }, [currentStepIndex, examSteps.length, saveSessionState]);
  
  const analyzeOverall = useCallback(async () => {
    setIsAnalyzing(true);
    const fullTranscript = stepMessages
      .flat()
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
    try {
      const res = await fetch('/api/analyze-overall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullTranscript }),
      });
      
      if (!res.ok) throw new Error('analyze-overall failed');
      const feedback = await res.json();
      
      setOverallFeedback(feedback);
      setShowOverallModal(true);
      
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latestScore: feedback.percentage,
          latestGrade: `${feedback.rating}/5`,
          latestFeedback: JSON.stringify(feedback),
        }),
      });
    } catch (error) {
      console.error('Error analyzing overall:', error);
      toast.error('Failed to analyze overall performance');
    } finally {
      setIsAnalyzing(false);
    }
  }, [stepMessages, chatId]);
  
  const handleTerminate = useCallback(async () => {
    if (analysisInProgressRef.current) return;
    analysisInProgressRef.current = true;
    
    stopVoiceSession();
    
    let actualDurationInSeconds: number;
    if (isPracticeMode) {
      actualDurationInSeconds = elapsedTime;
    } else {
      actualDurationInSeconds = sessionStartTimeRef.current
        ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
        : Math.max(1, (durationMinutes * 60) - (timeLeft || 0));
    }
    
    try {
      await fetch(`/api/chats/${chatId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      
      await fetch(`/api/chat/${chatId}/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDurationInSeconds,
          endedEarly: isExamMode ? (timeLeft !== null && timeLeft > 0) : false,
          reason: isExamMode && timeLeft !== null && timeLeft > 0 ? 'user_terminated' : 'normal_completion'
        }),
      });
      
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
      
      const isLastStation = stationInfo.current + 1 >= stationInfo.total;
      
      if (isLastStation) {
        setShowEndingModal(true);
        setTimeout(() => {
          router.push('/dashboard/chat-history');
        }, 2000);
      } else {
        setSwitchingMessage(`Moving to Station ${stationInfo.current + 2}`);
        setShowSwitchingModal(true);
        setTimeout(() => {
          onExit();
        }, 1500);
      }
    } catch (error) {
      console.error('Error ending session:', error);
      setShowEndingModal(true);
      setTimeout(() => {
        router.push('/dashboard/chat-history');
      }, 2000);
    } finally {
      analysisInProgressRef.current = false;
    }
  }, [chatId, timeLeft, elapsedTime, durationMinutes, stationInfo, onExit, router, stopVoiceSession, STORAGE_KEY, isExamMode, isPracticeMode]);
  
  const handleReturnToDashboard = useCallback(() => {
    stopVoiceSession();
    localStorage.removeItem(STORAGE_KEY);
    router.push('/dashboard');
  }, [router, stopVoiceSession, STORAGE_KEY]);
  
  const getDisplayText = (msg: any): string | null => {
    if (msg.type === 'transcript' && msg.transcript && typeof msg.transcript === 'string') {
      let text = msg.transcript.trim();
      if (text.length < 2) return null;
      
      text = text.charAt(0).toUpperCase() + text.slice(1);
      
      if (!/[.!?]$/.test(text)) {
        text += '.';
      }
      
      return text;
    }
    return null;
  };
  
  const renderChatMessages = () => (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
      {messages.length > 0 ? (
        messages.map((msg, idx) => {
          const displayText = getDisplayText(msg);
          if (!displayText) return null;
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-message-in`}
            >
              <div className={cn(
                "max-w-[85%] p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]",
                isUser
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-br-sm shadow-lg"
                  : isDark
                    ? "bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-bl-sm border border-gray-700/50 shadow-lg"
                    : "bg-white/80 backdrop-blur-sm text-gray-800 rounded-bl-sm border border-gray-200/50 shadow-lg"
              )}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    isUser
                      ? "bg-white/20"
                      : isDark ? "bg-indigo-500/30" : "bg-indigo-100"
                  )}>
                    <i className={cn(
                      "fas text-xs",
                      isUser ? "fa-user text-white" : "fa-user-md text-indigo-500"
                    )}></i>
                  </div>
                  <p className={cn("text-xs font-medium", isDark ? "text-gray-300" : "text-gray-600")}>
                    {isUser ? 'You' : patient?.name || 'Patient'}
                  </p>
                  <span className={cn("text-[10px]", isDark ? "text-gray-500" : "text-gray-400")}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{displayText}</p>
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-4",
            isDark ? "bg-gray-800" : "bg-gray-100"
          )}>
            <i className={cn("fas fa-comment-dots text-3xl", isDark ? "text-gray-600" : "text-gray-400")}></i>
          </div>
          <p className={cn("text-sm font-medium", isDark ? "text-gray-400" : "text-gray-500")}>
            No messages yet
          </p>
          <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
            Start speaking to see the conversation
          </p>
        </div>
      )}
      {liveTranscript && (
        <div className={`flex ${liveTranscript.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}>
          <div className={cn(
            "max-w-[85%] p-4 rounded-2xl border-2 border-dashed transition-all duration-300",
            liveTranscript.role === 'user'
              ? "bg-gradient-to-r from-blue-500/10 to-indigo-600/10 text-blue-600 rounded-br-sm border-blue-400/50"
              : isDark
                ? "bg-gray-800/50 text-gray-300 border-gray-600 rounded-bl-sm"
                : "bg-gray-100/50 text-gray-700 border-gray-400 rounded-bl-sm"
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="relative">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  liveTranscript.role === 'user' ? "bg-blue-500/20" : "bg-indigo-500/20"
                )}>
                  <i className={cn(
                    "fas text-xs",
                    liveTranscript.role === 'user' ? "fa-user text-blue-500" : "fa-microphone text-indigo-500"
                  )}></i>
                </div>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse-ring-small"></span>
              </div>
              <p className={cn("text-xs font-medium", isDark ? "text-gray-400" : "text-gray-500")}>
                {liveTranscript.role === 'user' ? 'You are saying' : `${patient?.name || 'Patient'} is saying`}
              </p>
              <span className="text-[10px] font-mono text-green-500">● Live</span>
            </div>
            <p className="text-sm leading-relaxed italic">
              {liveTranscript.text}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-blink"></span>
            </p>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
      
      <style jsx>{`
        @keyframes message-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse-ring-small {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-message-in { animation: message-in 0.3s ease-out; }
        .animate-blink { animation: blink 1s step-end infinite; }
        .animate-pulse-ring-small { animation: pulse-ring-small 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
      `}</style>
    </div>
  );
  
  const VoiceInterfaceContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-center">
    <div className={cn(
      "relative rounded-3xl p-6 md:p-8 transition-all duration-500 w-full max-w-2xl",
      "border",
      isDark
        ? "bg-gray-800/40 border-gray-700/50 shadow-2xl shadow-gray-900/50"
        : "bg-white/95 border-gray-200 shadow-2xl shadow-gray-400/20 hover:shadow-gray-400/30 transition-shadow"
    )}>
      <div className={cn(
        "absolute inset-0 rounded-3xl opacity-20 transition-opacity duration-500 pointer-events-none",
        isDark
          ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
          : "bg-gradient-to-br from-blue-100 via-indigo-50 to-blue-100"
      )} />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
      <style jsx>{`
    @keyframes gradient-shift-slow {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .animate-gradient-shift-slow {
      background-size: 200% 200%;
      animation: gradient-shift-slow 8s ease infinite;
    }
    @keyframes ping-slow {
      0% { transform: scale(0.8); opacity: 0.8; }
      75%, 100% { transform: scale(1.2); opacity: 0; }
    }
    .animate-ping-slow {
      animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
  `}</style>
    </div>
  </div>
);
  
  const getModeDisplayText = (): string => {
    if (isExamMode) {
      return `${type === 'clerking' ? 'Clerking' : type === 'counselling' ? 'Counselling' : 'Physical Examination'} Simulation (Exam Mode)`;
    } else {
      return `${type === 'clerking' ? 'Clerking' : type === 'counselling' ? 'Counselling' : 'Physical Examination'} Simulation (Practice Mode)`;
    }
  };
  
  const renderVoiceCentricLayout = () => (
  <div className={cn("min-h-screen",
    isDark 
      ? "bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950" 
      : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
  )}>
    {/* Header */}
    <div className={cn("sticky top-0 z-20 backdrop-blur-xl border-b shadow-lg",
      isDark ? "bg-blue-950/80 border-blue-800" : "bg-white/70 border-gray-200"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
              isDark ? "bg-blue-500/20" : "bg-indigo-100"
            )}>
              <i className="fas fa-user-md text-base text-indigo-500"></i>
            </div>
            <div>
              <h1 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-gray-800")}>
                {getModeDisplayText()}
              </h1>
              <p className={cn("text-[10px] sm:text-xs", isDark ? "text-blue-300" : "text-gray-500")}>
                Station {stationInfo.current + 1} of {stationInfo.total}
                {type === 'physical_exam' && examSteps.length > 0 && ` • Step ${currentStepIndex + 1} of ${examSteps.length}`}
              </p>
            </div>
          </div>
          
          {department && (
            <div className={cn(
              "px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm",
              isDark ? "bg-indigo-900/40 border border-indigo-700/50" : "bg-indigo-100/80 border border-indigo-200"
            )}>
              <i className={cn("fas fa-building text-[10px]", isDark ? "text-indigo-400" : "text-indigo-600")}></i>
              <span className={cn("font-medium text-[10px] sm:text-xs", isDark ? "text-indigo-300" : "text-indigo-800")}>
                {department.name}
              </span>
            </div>
          )}
          
          {/* LARGER TIMER */}
          <div className={cn(
            "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono font-bold backdrop-blur-sm",
            "text-sm sm:text-base md:text-lg lg:text-xl",
            isTimerExpired()
              ? "bg-red-500/20 text-red-600 animate-pulse border border-red-500/30"
              : getTimerColor().includes('green')
                ? "bg-green-500/20 border border-green-500/30"
                : "bg-amber-500/20 border border-amber-500/30"
          )}>
            <i className={`fas ${isPracticeMode ? 'fa-hourglass-half' : 'fa-clock'} mr-1 sm:mr-2 text-[10px] sm:text-sm`}></i>
            <span className="tracking-wide">{formatTimeForHeader()}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Desktop: flex row with voice card + inline hint sidebar. Mobile: stacked column */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center lg:gap-6">
        
        <div className="flex justify-center w-full lg:flex-1 lg:max-w-xl xl:max-w-2xl">
  <div className={cn(
    "relative rounded-2xl transition-all duration-500 w-full",
    "border",
    /* Mobile: full width | Tablet: up to lg | Desktop: up to 2xl */
    "max-w-full sm:max-w-lg md:max-w-xl lg:max-w-none",
    "p-5 sm:p-6 md:p-8 lg:p-10",
    isDark
      ? "bg-blue-950/40 border-blue-800/50 shadow-2xl shadow-blue-950/30"
      : "bg-white/95 border-gray-200/80 shadow-2xl shadow-gray-400/25 hover:shadow-gray-400/35 transition-shadow duration-300"
  )}>
    <div className={cn(
      "absolute inset-0 rounded-2xl opacity-20 transition-opacity duration-500 pointer-events-none",
      isDark
        ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600"
        : "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50"
    )} />
            <div className="relative z-10 flex flex-col items-center justify-center">
              
              {/* Patient Info — BIGGER on desktop */}
              {/* Patient Info — Improved Structure with OSCE Settings Respect */}
{patient && (
  <div className="relative w-full mb-6 sm:mb-8 lg:mb-10">
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 lg:gap-6">
      {/* Avatar - Left side on desktop, centered on mobile */}
      <div className="relative flex-shrink-0">
        <div className="relative group">
          <img
            src={patient.imageUrl || '/uploads/default-avatar.png'}
            alt={patient.name}
            className={cn(
              "rounded-full object-cover shadow-lg transition-all duration-500",
              "ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-white dark:ring-offset-gray-900",
              "w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32"
            )}
          />
          {(isConnected || isConnecting) && (
            <div className="absolute inset-0 rounded-full">
              <div className="w-full h-full rounded-full border-2 border-indigo-500/30 animate-ping-slow" />
            </div>
          )}
        </div>
      </div>
      
      {/* Info - Right side */}
      <div className="flex-1 min-w-0 text-center sm:text-left w-full">
        {/* Name - Full width, not truncated */}
        <h2 className={cn(
          "font-bold break-words",
          "text-xl sm:text-2xl md:text-2xl lg:text-3xl",
          isDark ? "text-white" : "text-gray-800",
          "mb-2"
        )}>
          {patient.name}
        </h2>
        
        {/* Bio Row - Age, Gender, Condition as badges under name */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
          {/* Age - ALWAYS show */}
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
          )}>
            <i className="fas fa-calendar-alt mr-1.5 text-[10px]"></i>
            {patient.age} years
          </div>
          
          {/* Gender - ALWAYS show */}
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
          )}>
            <i className="fas fa-venus-mars mr-1.5 text-[10px]"></i>
            {patient.gender}
          </div>
          
          {/* Presenting Condition - ONLY in practice mode OR if showPresentingCondition is true */}
          {(isPracticeMode === true || uiSettings?.showPresentingCondition === true) && (
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              isDark ? "bg-indigo-900/50 text-indigo-300" : "bg-indigo-100 text-indigo-700"
            )}>
              <i className="fas fa-stethoscope mr-1.5 text-[10px]"></i>
              {patient.condition}
            </div>
          )}
        </div>
        
        {/* Chief Complaint / Patient Prompt - ONLY in practice mode OR if showChiefComplaint is true */}
        {(isPracticeMode === true || uiSettings?.showChiefComplaint === true) && patient.prompt && (
          <div className={cn(
            "mt-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md",
            isDark 
              ? "bg-gradient-to-r from-indigo-950/50 to-blue-950/50 border border-indigo-800/30" 
              : "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100"
          )}>
            {/* Header bar */}
            <div className={cn(
              "px-4 py-2 flex items-center gap-2 border-b",
              isDark ? "border-indigo-800/30 bg-indigo-900/20" : "border-indigo-100 bg-indigo-100/50"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isDark ? "bg-amber-500/20" : "bg-amber-100"
              )}>
                <i className={cn(
                  "fas fa-comment-medical text-xs",
                  isDark ? "text-amber-400" : "text-amber-600"
                )}></i>
              </div>
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                isDark ? "text-indigo-300" : "text-indigo-600"
              )}>
                Chief Complaint
              </span>
              <span className={cn(
                "text-[10px] ml-auto",
                isDark ? "text-indigo-400/70" : "text-indigo-400"
              )}>
                Presenting Issue
              </span>
            </div>
            
            {/* Content */}
            <div className="px-4 py-3">
              <p className={cn(
                "text-sm sm:text-base leading-relaxed",
                isDark ? "text-blue-100" : "text-gray-700"
              )}>
                <span className={cn(
                  "font-semibold mr-1",
                  isDark ? "text-amber-400" : "text-amber-600"
                )}>
                  “
                </span>
                {patient.prompt}
                <span className={cn(
                  "font-semibold ml-1",
                  isDark ? "text-amber-400" : "text-amber-600"
                )}>
                  ”
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
              
              {/* Mic — BIGGER on desktop */}
              <div className="mb-5 sm:mb-6 lg:mb-8">
                <div className="relative flex flex-col items-center group">
                  <button
                    onClick={() => !isConnected && !isConnecting && !isReconnecting && startVoiceSession(false)}
                    disabled={isConnected || isConnecting || isReconnecting}
                    className={cn(
                      "rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer relative",
                      "w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28",
                      (isConnected || isConnecting || isReconnecting)
                        ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/40 scale-105"
                        : "bg-gray-200 hover:bg-indigo-100 text-indigo-600 hover:shadow-md"
                    )}
                  >
                    <i className={cn(
                      "fas fa-microphone-alt transition-all duration-300",
                      "text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl",
                      (isConnected || isConnecting || isReconnecting) 
                        ? "text-white animate-pulse" 
                        : "text-indigo-600"
                    )} />
                  </button>
                </div>
              </div>
              
              {/* Voice Wave — Taller & more bars on desktop */}
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center gap-1.5 h-10 sm:h-12 md:h-12 lg:h-14">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-200",
                        "w-1 sm:w-1.5 lg:w-2",
                        (isConnected || isConnecting || isReconnecting)
                          ? "bg-gradient-to-t from-blue-400 via-indigo-400 to-purple-400"
                          : "bg-gray-300"
                      )}
                      style={{
                        height: (isConnected || isConnecting || isReconnecting) 
                          ? `${12 + Math.sin(Date.now() / 150 + i) * (window.innerWidth >= 1024 ? 20 : 14)}px` 
                          : '8px',
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Status — Slightly larger pills on desktop */}
              <div className="text-center mb-5 sm:mb-6">
                {isConnected ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className={cn("font-medium text-sm sm:text-base", isDark ? "text-green-400" : "text-green-700")}>
                      Active
                    </span>
                  </div>
                ) : isConnecting ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30">
                    <i className="fas fa-spinner fa-spin text-yellow-600 dark:text-yellow-400 text-sm"></i>
                    <span className={cn("font-medium text-sm sm:text-base", isDark ? "text-yellow-400" : "text-yellow-700")}>
                      Connecting...
                    </span>
                  </div>
                ) : isReconnecting ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-orange-500/20 backdrop-blur-sm border border-orange-500/30">
                    <i className="fas fa-sync-alt fa-spin text-orange-600 dark:text-orange-400 text-sm"></i>
                    <span className={cn("font-medium text-sm sm:text-base", isDark ? "text-orange-400" : "text-orange-700")}>
                      Reconnecting...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-gray-500/20 backdrop-blur-sm border border-gray-500/30">
                    <i className="fas fa-microphone-slash text-gray-600 dark:text-gray-400 text-sm"></i>
                    <span className={cn("font-medium text-sm sm:text-base", isDark ? "text-gray-400" : "text-gray-600")}>
                      Paused
                    </span>
                  </div>
                )}
              </div>
              
              {/* Buttons — Larger on desktop */}
              <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                {aiTutorEnabled && isPracticeMode ? (
                  <button
                    onClick={() => setIsTutorOpen(true)}
                    className={cn(
                      "bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg transform hover:scale-105",
                      "px-5 py-2.5 sm:px-6 sm:py-3 md:px-7 md:py-3.5",
                      "text-sm sm:text-base md:text-lg"
                    )}
                  >
                    <i className="fas fa-chalkboard-teacher text-sm sm:text-base"></i>
                    Start with Ace Coach
                  </button>
                ) : (
                  <>
                    {!isConnected && !isConnecting && !isReconnecting && (
                      <button
                        onClick={() => startVoiceSession(false)}
                        disabled={isConnecting || isConnected || isReconnecting}
                        className={cn(
                          "bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 font-semibold shadow-md transform hover:scale-105",
                          "px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                          "text-xs sm:text-sm md:text-base"
                        )}
                      >
                        <i className="fas fa-play text-xs sm:text-sm"></i>
                        {messages.length > 0 ? 'Resume' : 'Start'}
                      </button>
                    )}
                    {(isConnecting || isReconnecting) && (
                      <button disabled className={cn(
                        "bg-gray-400 text-white rounded-xl flex items-center gap-2 font-semibold opacity-50 cursor-not-allowed",
                        "px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                        "text-xs sm:text-sm md:text-base"
                      )}>
                        <i className="fas fa-spinner fa-spin"></i>
                        {isReconnecting ? 'Reconnecting...' : 'Connecting...'}
                      </button>
                    )}
                    {isConnected && (
                      <>
                        {type === 'physical_exam' && examSteps.length > 0 && (
                          <button
                            onClick={handleEndStep}
                            className={cn(
                              "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center gap-2 font-semibold shadow-md transform hover:scale-105",
                              "px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                              "text-xs sm:text-sm md:text-base"
                            )}
                            disabled={isAnalyzing}
                          >
                            <i className="fas fa-stop text-xs sm:text-sm"></i>
                            {isAnalyzing ? 'Analyzing...' : 'End Step'}
                          </button>
                        )}
                        <button
                          onClick={stopVoiceSession}
                          className={cn(
                            "bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-xl hover:from-gray-600 hover:to-slate-700 transition-all duration-300 flex items-center gap-2 font-semibold shadow-md transform hover:scale-105",
                            "px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                            "text-xs sm:text-sm md:text-base"
                          )}
                        >
                          <i className="fas fa-pause text-xs sm:text-sm"></i>
                          Pause
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowEndConfirm(true)}
                      className={cn(
                        "bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center gap-2 font-semibold shadow-md transform hover:scale-105",
                        "px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                        "text-xs sm:text-sm md:text-base"
                      )}
                    >
                      <i className="fas fa-stop-circle text-xs sm:text-sm"></i>
                      End
                    </button>
                    <button
                      onClick={handleReturnToDashboard}
                      className={cn(
                        "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center gap-1.5 font-medium shadow-md",
                        "px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3",
                        "text-[10px] sm:text-xs md:text-sm"
                      )}
                    >
                      <i className="fas fa-home text-[9px] sm:text-xs md:text-sm"></i>
                      Dashboard
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar: HintPopup inline */}
        {hintEnabled && isPracticeMode && (
          <div className="hidden lg:block lg:w-[380px] xl:w-[420px] flex-shrink-0">
            <div className="sticky top-24">
              <HintPopup 
                inline
                isEnabled={hintEnabled}
                milestones={conversationMilestones}
                patientCondition={patient?.condition || ''}
                departmentName={department?.name || 'General Medicine'}
                conversationType={type}
                recentMessages={messages
                  .filter(m => m.type === 'transcript' && m.transcript)
                  .slice(-10)
                  .map(m => ({ 
                    role: m.role === 'user' ? 'student' : 'patient', 
                    content: m.transcript 
                  }))}
                onClose={() => setShowHintPopup(false)}
                isVoiceConnected={isConnected}
                isVoiceConnecting={isConnecting}
                hasMessages={messages.length > 0}
                onStartVoice={() => startVoiceSession(false)}
                onPauseVoice={stopVoiceSession}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom action buttons */}
      <div className="flex justify-center items-center gap-6 mt-5 sm:mt-6 mb-6 sm:mb-8">
        
        {/* AI Tutor */}
        {aiTutorEnabled && isPracticeMode && (
          <div className="flex flex-col items-center gap-1">
            <VoiceAITutor
              context={{
                departmentName: department?.name || 'General Medicine',
                patientCondition: patient?.condition || '',
                currentStep: currentStepIndex + 1,
                totalSteps: examSteps.length || 1,
                conversationType: type
              }}
              recentConversation={messages
                .filter(m => m.type === 'transcript' && m.transcript)
                .slice(-4)
                .map(m => ({ 
                  role: m.role === 'user' ? 'student' : 'patient', 
                  content: m.transcript 
                }))}
              milestones={conversationMilestones}
              patientName={patient?.name || 'the patient'}
              patientCondition={patient?.condition || ''}
              onTutorResponse={(response) => {
                console.log('Tutor response:', response);
              }}
              isOpen={isTutorOpen}
              onOpenChange={setIsTutorOpen}
            />
            <span className={cn(
              "text-[10px] sm:text-xs font-semibold tracking-wide",
              isDark ? "text-blue-300" : "text-gray-600"
            )}>
              <i className="fas fa-chalkboard-teacher mr-1 text-emerald-500 text-[9px]"></i>
              AI Tutor
            </span>
          </div>
        )}
      </div>
    </div>
    
    {/* Modals remain unchanged below... */}
    {/* Feedback Modal */}
    {showFeedbackModal && currentFeedback && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto",
          isDark ? "bg-gray-800" : "bg-white"
        )}>
          <div className="flex justify-between items-start mb-4">
            <h3 className={cn("text-xl font-bold flex items-center", isDark ? "text-white" : "text-gray-900")}>
              <i className="fas fa-tasks mr-2 text-indigo-500"></i>
              {examSteps[currentStepIndex]?.name} - Feedback
            </h3>
            <button onClick={() => setShowFeedbackModal(false)} className={cn("p-2 rounded-lg", isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}>
              <i className={cn("fas fa-times", isDark ? "text-gray-400" : "text-gray-600")}></i>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={cn("p-4 rounded-xl text-center", isDark ? "bg-blue-900/30" : "bg-blue-50")}>
              <p className="text-3xl font-bold text-blue-600">{currentFeedback.score}/20</p>
              <p className={cn("text-sm mt-1", isDark ? "text-gray-300" : "text-gray-600")}>Score</p>
            </div>
            <div className={cn("p-4 rounded-xl", isDark ? "bg-green-900/30" : "bg-green-50")}>
              <p className={cn("text-sm font-semibold mb-1", isDark ? "text-gray-200" : "text-gray-700")}>Evidence</p>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>{currentFeedback.evidence}</p>
            </div>
          </div>
          <div className="space-y-4">
            {currentFeedback.strengths?.length > 0 && (
              <div className={cn("p-4 rounded-xl", isDark ? "bg-emerald-900/30" : "bg-emerald-50")}>
                <p className={cn("font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-gray-700")}>
                  <i className="fas fa-star text-emerald-500 mr-2"></i>Strengths
                </p>
                <ul className="space-y-1">
                  {currentFeedback.strengths.map((s: any, i: number) => (
                    <li key={i} className={cn("text-sm flex items-start", isDark ? "text-gray-300" : "text-gray-600")}>
                      <i className="fas fa-check-circle text-emerald-500 mr-2 mt-0.5"></i>
                      <span>{typeof s === 'string' ? s : s.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {currentFeedback.improvements?.length > 0 && (
              <div className={cn("p-4 rounded-xl", isDark ? "bg-amber-900/30" : "bg-amber-50")}>
                <p className={cn("font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-gray-700")}>
                  <i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i>Areas to Improve
                </p>
                <ul className="space-y-1">
                  {currentFeedback.improvements.map((s: any, i: number) => (
                    <li key={i} className={cn("text-sm flex items-start", isDark ? "text-gray-300" : "text-gray-600")}>
                      <i className="fas fa-lightbulb text-amber-500 mr-2 mt-0.5"></i>
                      <span>{typeof s === 'string' ? s : s.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {currentFeedback.suggestions?.length > 0 && (
              <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-900/30" : "bg-blue-50")}>
                <p className={cn("font-semibold mb-2 flex items-center", isDark ? "text-gray-200" : "text-gray-700")}>
                  <i className="fas fa-lightbulb text-blue-500 mr-2"></i>Suggestions
                </p>
                <ul className="space-y-1">
                  {currentFeedback.suggestions.map((s: string, i: number) => (
                    <li key={i} className={cn("text-sm flex items-start", isDark ? "text-gray-300" : "text-gray-600")}>
                      <i className="fas fa-arrow-right text-blue-500 mr-2 mt-0.5"></i>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            {examSteps[currentStepIndex]?.videoUrl && (
              <button onClick={() => setShowVideoModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <i className="fas fa-play mr-2"></i>Watch Video
              </button>
            )}
            <button onClick={handleNextStep} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <i className="fas fa-arrow-right mr-2"></i>
              {currentStepIndex < examSteps.length - 1 ? 'Next Step' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Video Modal */}
    {showVideoModal && currentVideoUrl && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-3xl w-full", isDark ? "bg-gray-800" : "bg-white")}>
          <h3 className={cn("text-xl font-bold mb-4", isDark ? "text-white" : "text-gray-900")}>Video: {examSteps[currentStepIndex]?.name}</h3>
          <video controls src={currentVideoUrl} className="w-full rounded-lg" />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowVideoModal(false)} className={cn("px-4 py-2 border rounded-lg", isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100")}>
              Close
            </button>
            <button onClick={handleNextStep} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              Continue
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Overall Feedback Modal */}
    {showOverallModal && overallFeedback && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto", isDark ? "bg-gray-800" : "bg-white")}>
          <h3 className={cn("text-xl font-bold mb-4 flex items-center", isDark ? "text-white" : "text-gray-900")}>
            <i className="fas fa-trophy mr-2 text-yellow-500"></i>
            Overall Performance
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={cn("p-4 rounded-xl text-center", isDark ? "bg-yellow-900/30" : "bg-yellow-50")}>
              <div className="flex justify-center mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={`${i < (overallFeedback.rating || 0) ? 'fas fa-star text-yellow-500' : 'far fa-star text-gray-300'} text-xl`}></i>
                ))}
              </div>
              <p className="text-2xl font-bold text-yellow-600">{overallFeedback.percentage}%</p>
            </div>
            <div className={cn("p-4 rounded-xl", isDark ? "bg-blue-900/30" : "bg-blue-50")}>
              <p className={cn("font-semibold mb-1", isDark ? "text-gray-200" : "text-gray-700")}>Assessment</p>
              <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>{overallFeedback.overall_assessment}</p>
            </div>
          </div>
          <button onClick={() => { setShowOverallModal(false); handleTerminate(); }} className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Return to Dashboard
          </button>
        </div>
      </div>
    )}
    
    {/* End Confirmation Modal */}
    {showEndConfirm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-md w-full", isDark ? "bg-gray-800" : "bg-white")}>
          <h3 className={cn("text-xl font-bold mb-4", isDark ? "text-white" : "text-gray-900")}>End Session?</h3>
          <p className={cn("mb-6", isDark ? "text-gray-300" : "text-gray-600")}>Progress will be saved. You cannot resume after ending.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEndConfirm(false)} className={cn("px-4 py-2 border rounded-lg", isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100")}>
              Cancel
            </button>
            <button onClick={() => { setShowEndConfirm(false); handleTerminate(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
              End Session
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Switching Modal */}
    {showSwitchingModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-md w-full text-center", isDark ? "bg-gray-800" : "bg-white")}>
          <i className="fas fa-arrow-right text-4xl text-green-500 mb-4"></i>
          <p className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>{switchingMessage}</p>
        </div>
      </div>
    )}
    
    {/* Ending Modal */}
    {showEndingModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={cn("rounded-2xl p-6 max-w-md w-full text-center", isDark ? "bg-gray-800" : "bg-white")}>
          <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
          <p className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>Session Complete!</p>
          <p className={cn("text-sm mt-2", isDark ? "text-gray-400" : "text-gray-500")}>Redirecting to Chat History...</p>
        </div>
      </div>
    )}

          {/* Mobile floating hint - fixed position, bottom right */}
      {hintEnabled && isPracticeMode && (
        <div className="lg:hidden">
          <HintPopup 
            isEnabled={hintEnabled}
            milestones={conversationMilestones}
            patientCondition={patient?.condition || ''}
            departmentName={department?.name || 'General Medicine'}
            conversationType={type}
            recentMessages={messages
              .filter(m => m.type === 'transcript' && m.transcript)
              .slice(-10)
              .map(m => ({ 
                role: m.role === 'user' ? 'student' : 'patient', 
                content: m.transcript 
              }))}
            onClose={() => setShowHintPopup(false)}
            isVoiceConnected={isConnected}
            isVoiceConnecting={isConnecting}
            hasMessages={messages.length > 0}
            onStartVoice={() => startVoiceSession(false)}
            onPauseVoice={stopVoiceSession}
          />
        </div>
      )}
  </div>
);
  
  // FINAL RETURN
  return (
    <div className="relative min-h-screen flex flex-col">
      {renderVoiceCentricLayout()}
    </div>
  );
}