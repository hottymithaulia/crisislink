# 📘 Project Overview: CrisisLink

## The Vision
CrisisLink is a hyperlocal, mesh-aware, AI-driven disaster response system built to replace the single point of failure inherent in traditional 911/emergency hotline systems. 

During natural disasters (earthquakes, floods) or mass casualty events, centralized emergency systems collapse under high call volumes, and official response teams are bottlenecked. Furthermore, in linguistically diverse regions, language barriers prevent vital information from being relayed accurately.

CrisisLink solves this by crowdsourcing emergency operations to the citizens themselves, using AI as the central dispatcher.

## How It Solves the Problem
1. **Frictionless Reporting:** Instead of dialing numbers, navigating IVRs, and waiting on hold, users simply press a "Walkie-Talkie" style button and speak natively. 
2. **AI Dispatcher (Gemini 2.5 Flash):** Google's Gemini instantly intercepts the raw audio transcription, infers the exact context of the situation, extracts the core urgency (Critical, High, Medium, Low), and acts as a hyper-intelligent 911 operator.
3. **Hyperlocal Awareness:** Validated incidents are instantly dropped onto a live map for everyone within a 25km radius to see, complete with exact GPS coordinates.
4. **Community Action:** Rather than waiting hours for an ambulance, neighbors and nearby citizens can click "Going", pull up direct Google Maps routing, and intervene immediately.

## Key Features & Differentiators
- **Voice-First Accessibility:** The UI is designed to be usable by panicked, elderly, or injured individuals who may not be able to type out a coherent text message.
- **Multilingual Support:** Gemini 2.5 Flash translates regional dialects automatically.
- **Intelligent Spam Guard:** By evaluating the semantic meaning of the voice note, the AI actively drops trolls, jokes, and non-emergencies, ensuring the map is only populated by real, actionable data.
- **Reputation-based Verification:** Community members can "Confirm" or "Report Fake" incidents, adjusting the original poster's trust score and removing misinformation.
- **Original Audio Playback:** Responders can listen to the raw audio recording of the incident to hear background noise (explosions, sirens) and assess the emotion in the victim's voice.
