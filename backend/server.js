/**
 * server.js
 * Main Express server for CrisisLink backend.
 * Provides REST API endpoints for incident management.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import services
const PingEvent = require('./PingEvent');
const EventStore = require('./EventStore');
const ReputationEngine = require('./ReputationEngine');
const EscalationTimer = require('./EscalationTimer');
const VoiceProcessor = require('./VoiceProcessor');

// Initialize Express app
const app = express();
const PORT = 3001;

// Track server start time for uptime
const serverStartTime = Date.now();

// ============== MIDDLEWARE ==============
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ============== SERVICES ==============
const eventStore = new EventStore();
const reputationEngine = new ReputationEngine();
const escalationTimer = new EscalationTimer();
const voiceProcessor = new VoiceProcessor();

// ============== ESCALATION LOOP ==============
setInterval(() => {
  const updated = escalationTimer.checkAndEscalate(eventStore);
  if (updated > 0) {
    console.log(`⏱️ Escalation check: ${updated} events updated`);
  }
}, 10000); // Check every 10 seconds

// ============== API ENDPOINTS ==============

/**
 * POST /events - Create a new incident event
 * Body: { text, lat, lon, user_id, voice_url (optional), type (optional), urgency (optional) }
 */
app.post('/events', (req, res) => {
  try {
    const { text, lat, lon, user_id, voice_url, type, urgency } = req.body;

    // Validate required fields
    if (!text || !lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: text, lat, lon'
      });
    }

    // Process voice input to detect type/urgency if not provided
    let detectedType = type;
    let detectedUrgency = urgency;
    
    if (!detectedType || !detectedUrgency) {
      const analysis = voiceProcessor.analyzeVoiceInput(text);
      detectedType = detectedType || analysis.type;
      detectedUrgency = detectedUrgency || analysis.urgency;
    }

    // Create the event
    const event = new PingEvent({
      user_id: user_id || undefined,
      type: detectedType,
      urgency: detectedUrgency,
      text: text,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      voice_url: voice_url || null,
      user_reputation: 0.5 // New events start at neutral reputation
    });

    // Add to store
    eventStore.addEvent(event);

    // Run immediate escalation check
    escalationTimer.checkAndEscalate(eventStore);

    console.log(`📨 Received event from user: ${event.user_id}`);
    console.log(`   Type: ${event.type}, Urgency: ${event.urgency}`);
    console.log(`   Text: "${event.text.substring(0, 50)}..."`);

    res.status(201).json({
      success: true,
      eventId: event.id,
      event: event.toJSON()
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

/**
 * GET /events/nearby - Get events near a location
 * Query: lat, lon, radius (optional, default 2.5km)
 */
app.get('/events/nearby', (req, res) => {
  try {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query params: lat, lon'
      });
    }

    const radiusKm = parseFloat(radius) || 2.5;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Get nearby events with escalation info
    const nearbyEvents = eventStore.getNearbyEvents(latitude, longitude, radiusKm);
    
    // Add current escalation display info to each event
    const eventsWithEscalation = nearbyEvents.map(eventData => {
      // Reconstruct event object for escalation methods
      const event = eventStore.getEventById(eventData.id);
      if (event) {
        return {
          ...eventData,
          escalation_label: escalationTimer.getLabel(event),
          escalation_color: escalationTimer.getColor(event),
          minutes_until_next_escalation: escalationTimer.getTimeUntilNextEscalation(event).minutesUntilNext
        };
      }
      return eventData;
    });

    res.json({
      success: true,
      count: eventsWithEscalation.length,
      radius_km: radiusKm,
      events: eventsWithEscalation
    });

  } catch (error) {
    console.error('Error fetching nearby events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

/**
 * POST /events/:id/confirm - Confirm an event as real
 */
app.post('/events/:id/confirm', (req, res) => {
  try {
    const eventId = req.params.id;
    const { user_id } = req.body;

    const event = eventStore.getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Update reputation
    const result = reputationEngine.addConfirmation(eventId, event.user_id, eventStore);
    
    // Also add the user as a responder if provided
    if (user_id) {
      event.addConfirmation(user_id);
    }

    res.json({
      success: true,
      eventId,
      confirmations: result.confirmations,
      authorReputation: result.authorReputationPercent
    });

  } catch (error) {
    console.error('Error confirming event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm event',
      message: error.message
    });
  }
});

/**
 * POST /events/:id/fake - Report an event as fake
 */
app.post('/events/:id/fake', (req, res) => {
  try {
    const eventId = req.params.id;
    const { user_id } = req.body;

    const event = eventStore.getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Update reputation (penalty)
    const result = reputationEngine.addFakeReport(eventId, event.user_id, eventStore);
    
    if (user_id) {
      event.addFake(user_id);
    }

    res.json({
      success: true,
      eventId,
      fakes: result.fakes,
      authorReputation: result.authorReputationPercent
    });

  } catch (error) {
    console.error('Error reporting fake:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report fake',
      message: error.message
    });
  }
});

/**
 * GET /status - Server health check
 */
app.get('/status', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  const networkStats = reputationEngine.getNetworkStats(eventStore);

  res.json({
    status: 'running',
    events_count: eventStore.getEventCount(),
    uptime_seconds: uptime,
    network_stats: networkStats,
    version: '1.0.0'
  });
});

/**
 * GET /events/all - Debug: get all events
 */
app.get('/events/all', (req, res) => {
  const allEvents = eventStore.getAllEvents();
  res.json({
    success: true,
    count: allEvents.length,
    events: allEvents
  });
});

/**
 * GET /events/:id - Get single event by ID
 */
app.get('/events/:id', (req, res) => {
  try {
    const event = eventStore.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      event: event.toJSON()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /voice/analyze - Analyze voice text without creating event
 */
app.post('/voice/analyze', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing text field'
      });
    }

    const analysis = voiceProcessor.analyzeVoiceInput(text);
    
    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============== START SERVER ==============
app.listen(PORT, () => {
  console.log('\n🚀 CrisisLink Server Starting...\n');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ API endpoints ready:`);
  console.log(`   POST   /events                    - Create new incident`);
  console.log(`   GET    /events/nearby?lat=&lon=&radius= - Get nearby incidents`);
  console.log(`   POST   /events/:id/confirm        - Confirm incident`);
  console.log(`   POST   /events/:id/fake           - Report fake`);
  console.log(`   GET    /events/:id                - Get single incident`);
  console.log(`   GET    /events/all                - List all incidents`);
  console.log(`   GET    /status                    - Server health`);
  console.log(`   POST   /voice/analyze             - Analyze voice text`);
  console.log(`\n🎯 Ready for connections...\n`);
});

module.exports = app;
