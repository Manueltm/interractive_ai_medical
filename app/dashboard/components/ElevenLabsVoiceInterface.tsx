// app/dashboard/components/ElevenLabsVoiceInterface.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import { Patient } from "@/lib/db/schema";

interface ElevenLabsVoiceInterfaceProps {
  patient: Patient;
  chatId: string;
  systemPrompt: string;
  sendMessage: (
    chatId: string,
    role: "student" | "patient",
    content: string
  ) => Promise<void>;
  type: "clerking" | "counselling" | "physical_exam" | "flashcards";
  examSteps?: { name: string; videoUrl: string }[];
  stationInfo: { current: number; total: number };
  onExit: () => void;
}

export function ElevenLabsVoiceInterface({
  patient,
  chatId,
  systemPrompt,
  sendMessage,
  type,
  examSteps = [],
  stationInfo,
  onExit,
}: ElevenLabsVoiceInterfaceProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // For playback
  const recorderContextRef = useRef<AudioContext | null>(null); // For mic recording
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // States
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ source: "user" | "agent"; message: string; timestamp: number }>
  >([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // ==============================
  // INIT AUDIO CONTEXT (for playback)
  // ==============================
  useEffect(() => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    return () => {
      audioContext.close();
    };
  }, []);

  // ==============================
  // FETCH SIGNED URL
  // ==============================
  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const res = await fetch("/api/elevenlabs/token");
        const data = await res.json();
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Failed to fetch signed URL:", err);
        toast.error("Failed to connect to voice service");
      }
    };
    fetchSignedUrl();
  }, []);

  // ==============================
  // LOAD DURATION
  // ==============================
  useEffect(() => {
    const saved = localStorage.getItem(`duration_${chatId}`);
    if (saved) setTimeLeft(parseInt(saved) * 60);
    else setTimeLeft(5 * 60);
  }, [chatId]);

  // ==============================
  // TIMER
  // ==============================
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (connected && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            handleEndSession();
            return 0;
          }
          return (prev || 0) - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [connected, timeLeft]);

  // ==============================
  // CONNECT WEBSOCKET
  // ==============================
  useEffect(() => {
    if (!signedUrl) return;

    const ws = new WebSocket(signedUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      toast.success("Voice agent connected");
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data.type, data);

        switch (data.type) {
          case "conversation_initiation_metadata":
            console.log("Agent ready");
            toast("Agent ready");

            // Play agent initial greeting audio automatically if available
            if (data.audio_event?.audio_base_64) {
              playAudio(data.audio_event.audio_base_64);
            }

            // If agent text exists, add to messages and DB
            const initText =
              data.agent_response_event?.agent_response ||
              "I'm ready when you are";
            setMessages((prev) => [
              ...prev,
              { source: "agent", message: initText, timestamp: Date.now() },
            ]);
            await sendMessage(chatId, "patient", initText);
            break;

          case "agent_response": {
            const msg =
              data.agent_response_event?.agent_response ||
              data.agent_response_event?.text ||
              data.text;
            if (msg) {
              setMessages((prev) => [
                ...prev,
                { source: "agent", message: msg, timestamp: Date.now() },
              ]);
              await sendMessage(chatId, "patient", msg);

              // Play audio if sent
              if (data.audio_event?.audio_base_64) {
                playAudio(data.audio_event.audio_base_64);
              }
            }
            break;
          }

          case "user_transcript": {
            const transcript =
              data.user_transcription_event?.user_transcript || data.text;
            if (transcript) {
              setMessages((prev) => [
                ...prev,
                { source: "user", message: transcript, timestamp: Date.now() },
              ]);
              await sendMessage(chatId, "student", transcript);
            }
            break;
          }

          case "audio":
            handleAudio(data.audio_event?.audio_base_64);
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.log("Unhandled event:", data.type);
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onclose = (e) => {
      console.log("WebSocket closed:", e.code);
      setConnected(false);
      stopRecording();
      toast.error("Voice connection closed");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      toast.error("Voice connection error");
    };

    return () => {
      ws.close();
      stopRecording();
    };
  }, [signedUrl, chatId, sendMessage]);

  // ==============================
  // PLAY AGENT AUDIO
  // ==============================
  const handleAudio = (base64Audio?: string) => {
    if (!base64Audio || !audioContextRef.current) return;

    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.error("Playback failed:", err);
        toast.error("Audio playback failed");
      });
    } catch (err) {
      console.error("Audio decode error:", err);
    }
  };

  const playAudio = handleAudio; // alias

  // ==============================
  // START RECORDING
  // ==============================
  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Connection not ready");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      recorderContextRef.current = audioContext;

      if (audioContext.state === "suspended") await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "user_input",
              audio: Array.from(new Uint8Array(pcm)),
            })
          );
        }
      };

      setIsRecording(true);
      toast.success(`Consulting ${patient.name}`);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Microphone access denied");
    }
  };

  // ==============================
  // STOP RECORDING
  // ==============================
  const stopRecording = () => {
    try {
      processorRef.current?.disconnect();
      processorRef.current = null;

      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;

      recorderContextRef.current?.close();
      recorderContextRef.current = null;

      setIsRecording(false);
      toast("Consultation paused");
    } catch (err) {
      console.error("Stop error:", err);
    }
  };

  // ==============================
  // END SESSION
  // ==============================
  const handleEndSession = async () => {
    stopRecording();
    wsRef.current?.close();

    try {
      await fetch(`/api/chats/${chatId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      onExit();
    } catch (err) {
      console.error("End session error:", err);
    }
  };

  // ==============================
  // PCM CONVERSION
  // ==============================
  const floatTo16BitPCM = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  // ==============================
  // UI
  // ==============================
  return (
    <div
      className={cn(
        "min-h-screen relative",
        isDark
          ? "bg-gradient-to-br from-gray-900 to-purple-950/90"
          : "bg-gradient-to-br from-blue-50/90 to-purple-100/90"
      )}
    >
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div
          className={cn(
            "backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-auto border",
            isDark
              ? "bg-gray-800/95 border-gray-700/50"
              : "bg-white/95 border-white/50"
          )}
        >
          <h1
            className={cn(
              "text-2xl md:text-3xl font-bold mb-6 flex items-center",
              isDark ? "text-gray-100" : "text-gray-800"
            )}
          >
            <i className="fas fa-user-md mr-4 text-blue-500"></i>
            Natural Conversation with {patient.name}
          </h1>

          {patient && (
            <div
              className={cn(
                "mb-8 p-6 rounded-2xl border",
                isDark
                  ? "bg-blue-950/50 border-blue-800/50"
                  : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/50"
              )}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <img
                  src={patient.imageUrl || "/uploads/default-avatar.png"}
                  alt={patient.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 shadow-lg"
                />
                <div className="flex-1 text-center md:text-left">
                  <h2
                    className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-gray-100" : "text-gray-800"
                    )}
                  >
                    {patient.name}
                  </h2>
                  <div className="space-y-2">
                    <p
                      className={cn(
                        "flex items-center justify-center md:justify-start",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      <i className="fas fa-user mr-3 text-blue-500 w-5"></i>
                      Age: {patient.age}, Gender: {patient.gender}
                    </p>
                    <p
                      className={cn(
                        "flex items-center justify-center md:justify-start",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      <i className="fas fa-heartbeat mr-3 text-red-500 w-5"></i>
                      Condition: {patient.condition}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {timeLeft !== null && (
            <div
              className={cn(
                "mb-8 p-4 rounded-xl",
                isDark ? "bg-amber-950/50" : "bg-gradient-to-r from-amber-50/80 to-yellow-50/80"
              )}
            >
              <p
                className={cn(
                  "font-semibold text-center",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}
              >
                <i className="fas fa-clock mr-3 text-amber-500"></i>
                Time Left: {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
          )}

          <div className="mb-8 text-center">
            <p className="mb-4">Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>
            <p className="mb-4">Mic: {isRecording ? "🎤 Recording" : "⏹️ Stopped"}</p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startRecording}
                disabled={!connected || isRecording}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center font-semibold shadow-lg disabled:opacity-50"
              >
                <i className="fas fa-microphone-alt mr-2"></i>
                Start Consultation
              </button>

              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 flex items-center font-semibold shadow-lg disabled:opacity-50"
              >
                <i className="fas fa-stop mr-2"></i>
                Pause
              </button>

              <button
                onClick={handleEndSession}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 flex items-center font-semibold shadow-lg"
              >
                <i className="fas fa-stop-circle mr-2"></i>
                End Session
              </button>
            </div>
          </div>

          {/* Conversation transcript */}
          <div
            className={cn(
              "rounded-2xl p-6 max-h-96 overflow-y-auto",
              isDark ? "bg-gray-700/50" : "bg-gradient-to-br from-gray-50/80 to-blue-50/50"
            )}
          >
            {messages.length > 0 ? (
              messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 ${msg.source === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={cn(
                      "inline-block max-w-[80%] p-4 rounded-2xl shadow-lg",
                      msg.source === "user"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none"
                        : isDark
                        ? "bg-gray-800/90 text-gray-200 border border-gray-700/50 rounded-bl-none"
                        : "bg-white/90 text-gray-800 border border-gray-200/50 rounded-bl-none"
                    )}
                  >
                    <p className="text-sm opacity-80 mb-1">{msg.source === "user" ? "You" : patient.name}</p>
                    <p className="text-base leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <i className={cn("fas fa-comments text-4xl mb-4", isDark ? "text-gray-600" : "text-gray-300")}></i>
                <p className={cn("text-lg", isDark ? "text-gray-500" : "text-gray-500")}>
                  Click "Start Consultation" and speak naturally with {patient.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}