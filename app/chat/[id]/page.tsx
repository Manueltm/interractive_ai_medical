//C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\chat\[id]\page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VoiceClient from '@/components/VoiceClient';
import Loading from './loading';

function ChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [chatData, setChatData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChatData = async () => {
      try {
        const chatId = params.id as string;
        const station = searchParams.get('station');
        const total = searchParams.get('total');
        
        // Get pre-loaded data from sessionStorage
        const accessToken = sessionStorage.getItem(`voiceToken_${chatId}`);
        
        // Fetch chat data first
        const chatRes = await fetch(`/api/chats/${chatId}`);
        const chat = await chatRes.json();
        
        // Get session data to determine the type
        let sessionType = 'clerking'; // Default fallback
        let examSteps = [];
        
        if (chat.sessionId) {
          const sessionRes = await fetch(`/api/sessions/${chat.sessionId}`);
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            sessionType = sessionData.type || 'clerking';
            
            // For physical exams, get the exam steps from the chat itself first
            if (sessionType === 'physical_exam') {
              // First try to get steps from the chat (they should be stored there)
              if (chat.examSteps && chat.examSteps.length > 0) {
                examSteps = chat.examSteps;
                console.log('Found exam steps in chat:', examSteps);
              } else {
                // Fallback: try to generate steps from the patient case
                if (chat.patientId) {
                  const patientRes = await fetch(`/api/patients/${chat.patientId}`);
                  const patient = await patientRes.json();
                  
                  if (patient.caseId) {
                    const generateRes = await fetch('/api/generate-exam-steps', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        condition: patient.condition,
                        prompt: patient.prompt || '',
                        caseId: patient.caseId
                      }),
                    });
                    
                    if (generateRes.ok) {
                      const stepsData = await generateRes.json();
                      examSteps = stepsData.steps || [];
                      console.log('Generated exam steps:', examSteps);
                      
                      // Store the generated steps in the chat for future use
                      await fetch(`/api/chats/${chatId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ examSteps: examSteps }),
                      });
                    }
                  }
                }
              }
            }
          }
        }
        
        const patientRes = await fetch(`/api/patients/${chat.patientId}`);
        const patient = await patientRes.json();
        
        console.log('Setting up voice client with:', {
          sessionType,
          examStepsLength: examSteps.length,
          hasExamSteps: examSteps.length > 0
        });

        if (accessToken) {
          setChatData({
            accessToken,
            patient: {
              id: patient.id,
              name: patient.name,
              age: patient.age,
              gender: patient.gender || 'other',
              location: patient.location || undefined,
              condition: patient.condition,
              prompt: patient.prompt || undefined,
              imageUrl: patient.imageUrl || undefined
            },
            chatId,
            type: sessionType,
            examSteps: examSteps,
            stationInfo: {
              current: parseInt(station || '0'),
              total: parseInt(total || '1')
            }
          });
        } else {
          // Fallback: load fresh data
          const tokenRes = await fetch('/api/chat/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              voiceId: 'TODO',
              systemPrompt: `${patient.name}, ${patient.age}-yr-old ${patient.gender} from ${patient.location || 'unknown location'}, presents with: ${patient.condition}. ${patient.prompt || ''}`
            }),
          });
          const tokenData = await tokenRes.json();
          
          setChatData({
            accessToken: tokenData.accessToken,
            patient: {
              id: patient.id,
              name: patient.name,
              age: patient.age,
              gender: patient.gender || 'other',
              location: patient.location || undefined,
              condition: patient.condition,
              prompt: patient.prompt || undefined,
              imageUrl: patient.imageUrl || undefined
            },
            chatId,
            type: sessionType,
            examSteps: examSteps,
            stationInfo: {
              current: parseInt(station || '0'),
              total: parseInt(total || '1')
            }
          });
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [params.id, searchParams]);

  if (isLoading) {
    return <Loading />;
  }

  if (!chatData) {
    return <div>Error loading chat</div>;
  }

  return <VoiceClient {...chatData} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatContent />
    </Suspense>
  );
}