import React, { useState, useEffect } from 'react';
import type { Schedule, Task, VoiceSettings, Screen } from '../types';
import GlassmorphismCard from '../components/GlassmorphismCard';
import { generateSpeechFromText } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioPlayer';

const mockSchedules: Schedule[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    tasks: [
      { id: 'm1', name: 'Wake Up', details: 'Rise & run 3km.', xp: 10 },
      { id: 'm2', name: 'Pushups', details: 'Do 20 pushups.', reps: 20, xp: 50 },
      { id: 'm3', name: 'Meditation', details: '10 minutes of guided meditation.', duration: 10, xp: 30 },
    ]
  },
  {
    id: 'study',
    name: 'Study Session',
    tasks: [
      { id: 's1', name: 'Pomodoro 1', details: '50 min focus + 10 min break.', duration: 50, xp: 100 },
      { id: 's2', name: 'Review Notes', details: 'Review previous day notes.', duration: 25, xp: 50 },
    ]
  }
];

const coachVoiceSettings: VoiceSettings = {
  character: 'NoxzAI',
  tone: 'Supportive',
  intensity: 1,
  vocalizations: [],
};

interface CoachScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

const CoachScreen: React.FC<CoachScreenProps> = ({ setActiveScreen }) => {
  const [schedules] = useState<Schedule[]>(mockSchedules);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (isTimerActive && timer === 0) {
      setIsTimerActive(false);
      if(activeTask) {
        setXp(prevXp => prevXp + activeTask.xp);
        setActiveTask(null);
        playCompletionSound();
      }
    }
    return () => {
      if(interval) clearInterval(interval);
    };
  }, [isTimerActive, timer, activeTask]);
  
  const playCompletionSound = async () => {
    try {
        const announcement = "Task complete! Well done.";
        const base64Audio = await generateSpeechFromText(announcement, coachVoiceSettings);
        await playBase64Audio(base64Audio);
    } catch (e) {
        console.error("Failed to play completion sound:", e);
    }
  };

  const handleTaskStart = async (task: Task) => {
      setActiveTask(task);
      if(task.duration) {
          setTimer(task.duration * 60);
          setIsTimerActive(true);
      }
      
      try {
          const announcement = `Your next task is: ${task.name}. ${task.details}. Let's begin.`;
          const base64Audio = await generateSpeechFromText(announcement, coachVoiceSettings);
          await playBase64Audio(base64Audio);
      } catch (e) {
          console.error("Failed to generate or play task announcement:", e);
      }
  };

  const handleTaskComplete = (task: Task) => {
    setXp(prevXp => prevXp + task.xp);
    setActiveTask(null);
    playCompletionSound();
  }
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextTask = schedules[0].tasks[0];

  return (
    <div className="p-4 pt-12 pb-28">
      <h1 className="text-4xl font-bold text-center mb-2">Invincible.AI</h1>
      <p className="text-center text-lg text-gray-300 mb-6">Your Personal Voice Coach</p>

      <GlassmorphismCard className="mb-6 text-center cursor-pointer" onClick={() => setActiveScreen('liveCoach')}>
        <h2 className="text-2xl font-bold text-[#1E90FF]">Live Voice Coaching</h2>
        <p className="text-gray-300 mb-4">Start an interactive, real-time session with your AI coach.</p>
        <button className="bg-[#1E90FF] hover:bg-blue-600 px-8 py-3 rounded-full font-bold text-lg">
            Start Live Session
        </button>
      </GlassmorphismCard>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">XP Progress</h2>
        <div className="w-full bg-white/10 rounded-full h-4">
          <div className="bg-[#1E90FF] h-4 rounded-full" style={{ width: `${(xp % 1000) / 10}%` }}></div>
        </div>
        <p className="text-right text-sm text-gray-400 mt-1">{xp} XP</p>
      </div>

      {activeTask ? (
        <GlassmorphismCard className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[#1E90FF]">{activeTask.name}</h2>
          <p className="text-gray-300 mb-4">{activeTask.details}</p>
          {activeTask.duration && (
            <div>
              <p className="text-6xl font-mono mb-4">{formatTime(timer)}</p>
              <button onClick={() => setIsTimerActive(!isTimerActive)} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full">
                {isTimerActive ? 'Pause' : 'Resume'}
              </button>
            </div>
          )}
          {activeTask.reps && (
             <div className="my-4">
               <p className="text-4xl font-bold">{activeTask.reps} Reps</p>
               <button onClick={() => handleTaskComplete(activeTask)} className="bg-[#1E90FF] hover:bg-blue-600 mt-4 px-8 py-3 rounded-full font-bold text-lg">
                 Mark as Done
               </button>
             </div>
          )}
        </GlassmorphismCard>
      ) : (
        <GlassmorphismCard className="mb-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Next Task</h2>
            <p className="text-3xl font-bold text-[#1E90FF] mb-2">{nextTask.name}</p>
            <p className="text-gray-300 mb-4">{nextTask.details}</p>
            <button onClick={() => handleTaskStart(nextTask)} className="bg-[#1E90FF] hover:bg-blue-600 px-8 py-3 rounded-full font-bold text-lg">
                Start Now
            </button>
        </GlassmorphismCard>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Routines</h2>
        <div className="space-y-4">
          {schedules.map(schedule => (
            <GlassmorphismCard key={schedule.id}>
              <h3 className="text-xl font-bold mb-3">{schedule.name}</h3>
              <ul className="space-y-2">
                {schedule.tasks.map(task => (
                  <li key={task.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                    <div>
                      <p className="font-semibold">{task.name}</p>
                      <p className="text-sm text-gray-400">{task.details}</p>
                    </div>
                    <button onClick={() => handleTaskStart(task)} className="text-[#1E90FF] hover:text-blue-400 font-semibold">
                      Start
                    </button>
                  </li>
                ))}
              </ul>
            </GlassmorphismCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoachScreen;