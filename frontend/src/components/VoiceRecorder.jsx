/**
 * VoiceRecorder.jsx
 * Multilingual voice recording + live STT via Web Speech API.
 * Stores audio as base64 for playback on other devices.
 * Supports: English, Hindi, Tamil, Telugu, Spanish, French, Arabic, and more.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import apiService from '../api/api';
import { LANGUAGES, getLangCode, translate } from '../services/TranslationService';
import '../styles/VoiceRecorder.css';

const LANG_OPTIONS = LANGUAGES;

function VoiceRecorder({ onEventPosted, userLocation, backendStatus }) {
  const [isRecording, setIsRecording]       = useState(false);
  const [transcript, setTranscript]         = useState('');   // raw STT in original lang
  const [translatedText, setTranslatedText] = useState('');   // translated to English
  const [isTranslating, setIsTranslating]   = useState(false);
  const [interimText, setInterimText]       = useState('');
  const [audioBase64, setAudioBase64]       = useState(null);
  const [isPosting, setIsPosting]           = useState(false);
  const [postStatus, setPostStatus]         = useState(null);
  const [selectedLang, setSelectedLang]     = useState('en-US');
  const [sttSupported, setSttSupported]     = useState(false);
  const [sttActive, setSttActive]           = useState(false);

  const translateTimerRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);
  const recognitionRef   = useRef(null);

  const isMediaSupported = typeof navigator !== 'undefined'
    && typeof navigator.mediaDevices !== 'undefined'
    && typeof MediaRecorder !== 'undefined';

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRec);
  }, []);

  // ── LIVE TRANSLATION: translate raw transcript → English ────────────────────
  useEffect(() => {
    const srcLang = getLangCode(selectedLang); // 'hi', 'en', 'ta', etc.
    const rawText = (transcript + interimText).trim();

    if (!rawText || srcLang === 'en') {
      // No translation needed — just display raw text
      setTranslatedText('');
      return;
    }

    // Debounce: wait 600ms after typing/speaking stops before calling API
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    translateTimerRef.current = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const { translated, success } = await translate(rawText, srcLang, 'en');
        if (success && translated) {
          setTranslatedText(translated);
        }
      } catch (e) {
        console.warn('Live translation failed:', e);
      } finally {
        setIsTranslating(false);
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, interimText, selectedLang]);

  // ── START RECORDING ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!isMediaSupported) {
      alert('Microphone not supported in this browser.');
      return;
    }

    try {
      chunksRef.current = [];
      setInterimText('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MediaRecorder for audio blob
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setAudioBase64(reader.result);
        reader.readAsDataURL(blob);
      };

      recorder.start();

      // Web Speech API for live transcription
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.lang = selectedLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let interim = '';
          let final   = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += t + ' ';
            else interim += t;
          }
          if (final) setTranscript(prev => prev + final);
          setInterimText(interim);
        };

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech') console.warn('STT error:', e.error);
        };

        recognition.start();
        setSttActive(true);
      }

      setIsRecording(true);
      console.log('🎤 Recording started, lang:', selectedLang);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [isMediaSupported, selectedLang]);

  // ── STOP RECORDING ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setSttActive(false);
    }
    setIsRecording(false);
    setInterimText('');
    console.log('⏹️ Recording stopped');
  }, [isRecording]);

  // ── POST EVENT ────────────────────────────────────────────────────────────
  const handlePost = useCallback(async () => {
    const srcLang = getLangCode(selectedLang);
    // Submit translated text if available (so feed shows English), else raw
    const finalText = (srcLang !== 'en' && translatedText
      ? translatedText
      : (transcript + interimText)
    ).trim();

    if (!finalText) {
      alert('Please enter or speak a description of the incident.');
      return;
    }
    if (backendStatus !== 'online') {
      alert('Backend is offline. Please start the server first.');
      return;
    }

    setIsPosting(true);
    setPostStatus('posting');

    try {
      // Analyze text for type & urgency
      let analysis = null;
      try {
        analysis = await apiService.analyzeVoice(finalText);
      } catch (e) {
        console.warn('Voice analysis failed, using defaults');
      }

      const eventPayload = {
        text:        finalText,
        lat:         userLocation.lat,
        lon:         userLocation.lon,
        type:        analysis?.type    || 'incident',
        urgency:     analysis?.urgency || 'medium',
        lang:        getLangCode(selectedLang),
        audio_base64: audioBase64 || null,
        voice_url:   null,
      };

      const result = await apiService.createEvent(eventPayload);

      if (result.success) {
        setPostStatus('success');
        setTimeout(() => {
          setPostStatus(null);
          setTranscript('');
          setTranslatedText('');
          setAudioBase64(null);
        }, 3000);
        if (onEventPosted) onEventPosted(result.data?.event || result.data);
      } else {
        const errMsg = result.error?.message || 'Failed to post event';
        // Show spam block reason clearly
        if (result.spam) {
          alert(`🚫 Report blocked: ${errMsg}\n\nTip: Be specific — include location, what happened, and how many people are affected.`);
        } else {
          throw new Error(errMsg);
        }
        setPostStatus(null);
      }

    } catch (error) {
      console.error('Error posting event:', error);
      setPostStatus('error');
      setTimeout(() => setPostStatus(null), 3000);
    } finally {
      setIsPosting(false);
    }
  }, [transcript, interimText, translatedText, backendStatus, userLocation, selectedLang, audioBase64, onEventPosted]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  const srcLang = getLangCode(selectedLang);
  const isNonEnglish = srcLang !== 'en';
  // Show translated text in textbox if available, else raw
  const displayText = isNonEnglish && translatedText
    ? translatedText
    : transcript + (interimText ? ` ${interimText}` : '');
  const rawTranscriptPreview = isNonEnglish && transcript ? transcript : null;

  return (
    <div className="voice-recorder-container">
      <div className="recorder-header">
        <h2>🎤 Report Incident</h2>
        <p>Voice-first. Speak or type in your language.</p>
      </div>

      {/* Language Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
          🌐 Language / भाषा / மொழி
        </label>
        <select
          value={selectedLang}
          onChange={e => setSelectedLang(e.target.value)}
          disabled={isRecording}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#e2e8f0',
            fontSize: '13px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {LANG_OPTIONS.map(lang => (
            <option key={lang.code} value={lang.code} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
        {!sttSupported && (
          <p style={{ color: '#f59e0b', fontSize: '11px', margin: '4px 0 0' }}>
            ⚠️ Live transcription requires Chrome browser. Recording still works.
          </p>
        )}
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
            <span className="btn-text">
              {isMediaSupported ? 'Record Incident' : 'Recording Not Available'}
            </span>
          </button>
        ) : (
          <button className="btn btn-stop" onClick={stopRecording}>
            <span className="btn-icon">⏹️</span>
            <span className="btn-text">Stop Recording</span>
            {sttActive && (
              <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.8 }}>• Live STT active</span>
            )}
          </button>
        )}
      </div>

      {/* Live transcription / translation display */}
      {isRecording && (interimText || transcript) && (
        <div style={{
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '13px',
          color: '#e2e8f0',
          minHeight: '40px',
        }}>
          {isNonEnglish ? (
            <>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>🎙️ Heard ({selectedLang.split('-')[0].toUpperCase()}):</span>
              <p style={{ margin: '2px 0 6px', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                {transcript}<span style={{ opacity: 0.6 }}>{interimText}</span>
              </p>
              {isTranslating && (
                <p style={{ margin: 0, color: '#6366f1', fontSize: '11px' }}>🌐 Translating...</p>
              )}
              {translatedText && (
                <>
                  <span style={{ color: '#4ade80', fontSize: '11px' }}>✅ English translation:</span>
                  <p style={{ margin: '2px 0 0', color: '#f1f5f9', fontWeight: 500 }}>{translatedText}</p>
                </>
              )}
            </>
          ) : (
            <>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>🎙️ Live transcription:</span>
              <p style={{ margin: '4px 0 0' }}>
                {transcript}
                <span style={{ color: '#94a3b8' }}>{interimText}</span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Audio playback preview */}
      {audioBase64 && !isRecording && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>🔊 Recorded audio:</p>
          <audio controls src={audioBase64} style={{ width: '100%', borderRadius: '8px' }} />
        </div>
      )}

      {/* Text input */}
      <div className="text-input-group">
        <label className="text-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📝 {isNonEnglish ? 'Translated (English)' : 'Description'}</span>
          {isTranslating && <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 400 }}>🌐 Translating...</span>}
        </label>

        {/* Original language preview strip */}
        {rawTranscriptPreview && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '8px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '12px',
            color: '#94a3b8',
            fontStyle: 'italic',
          }}>
            🗣️ Original: {rawTranscriptPreview}
          </div>
        )}

        <textarea
          className="text-input"
          value={displayText}
          onChange={e => {
            setTranslatedText(e.target.value);
            if (!isNonEnglish) setTranscript(e.target.value);
            setInterimText('');
          }}
          placeholder={`Describe the incident in ${LANG_OPTIONS.find(l => l.code === selectedLang)?.label || 'your language'}...

Examples:
• Fire on Main Street, 3rd floor, people evacuating
• Car accident near City Mall, two vehicles, urgent help needed
• Person collapsed near Metro Station, not responding`}
          rows={6}
          disabled={isRecording || isPosting}
        />
      </div>

      {/* Post button */}
      <button
        className={`btn btn-post ${postStatus || ''}`}
        onClick={handlePost}
        disabled={isPosting || isRecording || !transcript.trim()}
      >
        <span className="btn-icon">
          {postStatus === 'posting' ? '⏳' : postStatus === 'success' ? '✅' : postStatus === 'error' ? '❌' : '📤'}
        </span>
        <span className="btn-text">
          {postStatus === 'posting' ? 'Posting...' : postStatus === 'success' ? 'Posted!' : postStatus === 'error' ? 'Error - Retry' : 'Post Incident'}
        </span>
      </button>
    </div>
  );
}

export default VoiceRecorder;
