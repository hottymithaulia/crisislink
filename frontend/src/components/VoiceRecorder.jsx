import React, { useState, useRef } from 'react';
import apiService from '../api/api';
import '../styles/VoiceRecorder.css';

function VoiceRecorder({ onEventPosted, userLocation, backendStatus }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Check if browser supports recording
  const isRecordingSupported = typeof navigator !== 'undefined' && 
    typeof navigator.mediaDevices !== 'undefined' && 
    typeof window !== 'undefined' && 
    typeof MediaRecorder !== 'undefined';

  // START RECORDING
  const startRecording = async () => {
    if (!isRecordingSupported) {
      alert('Recording not supported in this browser. Please type your report instead.');
      return;
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // For hackathon: Show placeholder transcript
        // Future: Integrate Whisper.cpp or Web Speech API for real transcription
        setTranscript(''); // User will type their description
        setIsProcessing(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('🎤 Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      console.log('⏹️ Recording stopped');
    }
  };

  // POST EVENT
  const handlePost = async () => {
    if (!transcript.trim()) {
      alert('Please enter a description of the incident.');
      return;
    }

    if (backendStatus !== 'online') {
      alert('Backend is offline. Please start the server first.');
      return;
    }

    setIsPosting(true);
    setPostStatus('posting');

    try {
      // Generate unique user ID (stored in localStorage for persistence)
      let userId = localStorage.getItem('crisislink_user_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('crisislink_user_id', userId);
      }

      const eventData = {
        description: transcript.trim(),
        lat: userLocation.lat,
        lon: userLocation.lon,
        voice_url: audioBlob ? URL.createObjectURL(audioBlob) : null
      };

      // First analyze the voice to get incident type and urgency
      let analysis = null;
      try {
        analysis = await apiService.analyzeVoice(transcript.trim());
      } catch (error) {
        console.warn('Voice analysis failed, using defaults:', error);
      }

      // Create event with analysis results
      const eventPayload = {
        ...eventData,
        type: analysis?.data?.analysis?.type || 'medical',
        urgency: analysis?.data?.analysis?.urgency || 'medium'
      };

      const result = await apiService.createEvent(eventPayload);

      if (result.success) {
        setPostStatus('success');
        setTimeout(() => {
          setPostStatus(null);
          setTranscript('');
          setAudioBlob(null);
        }, 3000);
        
        if (onEventPosted) {
          onEventPosted(result.event);
        }
        
        console.log('📤 Event posted:', result.eventId);
      } else {
        throw new Error(result.error || 'Failed to post event');
      }

    } catch (error) {
      console.error('Error posting event:', error);
      setPostStatus('error');
      setTimeout(() => setPostStatus(null), 3000);
    } finally {
      setIsPosting(false);
    }
  };

  
  return (
    <div className="voice-recorder-container">
      <div className="recorder-header">
        <h2>🎤 Report Incident</h2>
        <p>Voice-first. No forms. Just speak or type.</p>
      </div>

      {/* Recording button */}
      <div className="recorder-button-group">
        {!isRecording ? (
          <button 
            className="btn btn-record" 
            onClick={startRecording}
            disabled={backendStatus !== 'online'}
          >
            <span className="btn-icon">🎤</span>
            <span className="btn-text">{isRecordingSupported ? 'Record Incident' : 'Recording Not Available'}</span>
          </button>
        ) : (
          <button className="btn btn-stop" onClick={stopRecording}>
            <span className="btn-icon">⏹️</span>
            <span className="btn-text">Stop Recording</span>
            <span className="recording-indicator"></span>
          </button>
        )}
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="processing">
          <div className="processing-spinner"></div>
          <span>Processing audio...</span>
        </div>
      )}

      {/* Status messages */}
      {postStatus === 'success' && (
        <div className="status-message success">
          ✅ Incident reported successfully!
        </div>
      )}
      {postStatus === 'error' && (
        <div className="status-message error">
          ❌ Failed to report incident. Please try again.
        </div>
      )}

      {/* Manual input section */}
      <div className="manual-input-section">
        <label className="input-label">Or type your report:</label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Describe the incident (e.g., 'Car accident on Main Street blocking traffic')..."
          rows="4"
          className="transcript-textarea"
          disabled={isPosting}
        />
        
        <div className="button-group">
          <button 
            className="btn btn-post" 
            onClick={handlePost}
            disabled={!transcript.trim() || isPosting || backendStatus !== 'online'}
          >
            {isPosting ? (
              <>
                <span className="btn-spinner"></span>
                Posting...
              </>
            ) : (
              <>
                <span className="btn-icon">📤</span>
                Post Incident
              </>
            )}
          </button>
          
          {transcript && (
            <button 
              className="btn btn-cancel" 
              onClick={() => {
                setTranscript('');
                setAudioBlob(null);
              }}
              disabled={isPosting}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div className="quick-tips">
        <p className="tips-title">💡 Tips for better reports:</p>
        <ul>
          <li>Mention location landmarks ("near the hospital", "at the intersection")</li>
          <li>Include urgency words ("urgent", "emergency", "critical")</li>
          <li>Describe the situation briefly but clearly</li>
        </ul>
      </div>
    </div>
  );
}

export default VoiceRecorder;
