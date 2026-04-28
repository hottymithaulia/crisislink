/**
 * Events Routes
 * Handles all event-related API endpoints
 */

const express = require('express');
const router = express.Router();
const PingEvent = require('../services/PingEvent');
const SpamFilter = require('../services/SpamFilter');
const GeminiService = require('../services/GeminiService');

function createEventsRoutes() {

  // POST /events - Create new incident
  router.post('/', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const {
        type,
        urgency,
        description,
        text,
        lat,
        lon,
        latitude,
        longitude,
        user_id,
        voice_url,
        audio_base64,
        lang,
      } = req.body;

      const eventText = text || description || '';
      let eventLat = parseFloat(lat || latitude);
      let eventLon = parseFloat(lon || longitude);

      if (!eventText || isNaN(eventLat) || isNaN(eventLon)) {
        return res.apiError('Missing required fields: text (or description), lat/latitude, lon/longitude', 400);
      }

      // If phone glitch puts them in the ocean [0,0], default to Bhopal for demo
      if (Math.abs(eventLat) < 1 && Math.abs(eventLon) < 1) {
        eventLat = 23.2599;
        eventLon = 77.4126;
      }

      // ── SPAM FILTER (Basic Geo) ───────────────────────────────────────
      const geoCheck = SpamFilter.checkCoordinates(eventLat, eventLon);
      if (!geoCheck.valid) {
        return res.apiError(`Location rejected: ${geoCheck.reason}`, 422);
      }

      // ── GEMINI ANALYSIS (Type, Urgency, Spam) ─────────────────────────
      let finalType = type;
      let finalUrgency = urgency;
      let summary = eventText;
      let detectedLang = lang || 'en';

      const analysis = await GeminiService.analyzeReport(eventText);

      if (!analysis.is_genuine) {
        console.warn(`🚫 Gemini blocked spam from ${user_id || 'anonymous'}: ${analysis.spam_reason}`);
        return res.status(422).json({
          success: false,
          error: { message: analysis.spam_reason, code: 'SPAM_DETECTED' },
          spam: true,
          reason: analysis.spam_reason,
          confidence: analysis.spam_confidence,
        });
      }

      finalType = finalType || analysis.type || 'incident';
      finalUrgency = finalUrgency || analysis.urgency || 'medium';
      summary = analysis.summary || eventText;
      detectedLang = analysis.lang_detected || detectedLang;

      const event_id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const event = new PingEvent({
        id:           event_id,
        type:         finalType,
        urgency:      finalUrgency,
        text:         eventText, // Store original text
        lat:          eventLat,
        lon:          eventLon,
        user_id:      user_id || 'anonymous',
        voice_url:    voice_url    || null,
        audio_base64: audio_base64 || null,
        lang:         detectedLang,
        user_reputation: 0.5,
      });

      // Store event
      services.eventStore.addEvent(event);

      if (services.meshSimulator && services.meshSimulator.config.enabled) {
        services.meshSimulator.logEventCreation(event);
      }

      // Trust gating: determine badge based on trust score
      const userRep = services.eventStore.getUserReputation(event.user_id);
      const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
      const tier = services.reputationEngine.getDisplayTier(reputation);
      const isUnverified = tier.id === 'bronze' || tier.id === 'untrusted';

      const io = req.app.get('io');
      if (io) {
        io.emit('new_event', {
          event: {
            ...event.toJSON(),
            reputation,
            reputation_tier: tier,
            unverified: isUnverified,
          }
        });
        console.log(`📡 WebSocket: Broadcasted new event ${event.id} [${tier.id}]`);
      }

      console.log(`📨 New event from user: ${user_id || 'anonymous'} (${detectedType}/${detectedUrgency})`);

      res.apiCreated({
        event_id: event.id,
        type: event.type,
        urgency: event.urgency,
        timestamp: event.timestamp,
        location: { lat: event.lat, lon: event.lon },
        text: event.text,
        unverified: isUnverified,
        trust_tier: tier.id,
        event: event.toJSON(),
      }, 'Event created successfully');

    } catch (error) {
      console.error('Error creating event:', error);
      res.apiError('Failed to create event', 500);
    }
  });

  // GET /events/nearby - Get events near location
  // IMPORTANT: This must come before /:id to avoid conflict
  router.get('/nearby', async (req, res) => {
    try {
      const { services } = req.app.locals;
      // Accept both lat/lon and latitude/longitude param names
      const lat = req.query.lat || req.query.latitude;
      const lon = req.query.lon || req.query.longitude;
      const radius = req.query.radius || 5;

      if (!lat || !lon) {
        return res.apiError('Missing required parameters: lat, lon (or latitude, longitude)', 400);
      }

      const events = services.eventStore.getNearbyEvents(
        parseFloat(lat),
        parseFloat(lon),
        parseFloat(radius)
      );

      // Add reputation data to each event
      const eventsWithReputation = events.map(eventData => {
        const userRep = services.eventStore.getUserReputation(eventData.user_id);
        const reputation = services.reputationEngine.calculateScore(
          eventData.user_id,
          userRep
        );
        const tier = services.reputationEngine.getDisplayTier(reputation);

        return {
          ...eventData,
          reputation,
          reputation_tier: tier,
          distance_km: services.eventStore.calculateDistance(
            parseFloat(lat),
            parseFloat(lon),
            eventData.lat,
            eventData.lon
          )
        };
      });

      res.apiSuccess({
        events: eventsWithReputation,
        center: { lat: parseFloat(lat), lon: parseFloat(lon) },
        radius: parseFloat(radius),
        count: eventsWithReputation.length
      }, 'Nearby events retrieved successfully');

    } catch (error) {
      console.error('Error fetching nearby events:', error);
      res.apiError('Failed to fetch nearby events', 500);
    }
  });

  // GET /events/all - Get all events (for debugging/admin)
  router.get('/all', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const events = Array.from(services.eventStore.events.values());
      const eventsData = events.map(event => event.toJSON());

      res.apiSuccess({
        events: eventsData,
        count: eventsData.length,
        total_users: services.eventStore.userReputation.size
      }, 'All events retrieved successfully');

    } catch (error) {
      console.error('Error fetching all events:', error);
      res.apiError('Failed to fetch all events', 500);
    }
  });

  // POST /events/:id/confirm - Confirm event is real
  router.post('/:id/confirm', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { id } = req.params;
      const { user_id } = req.body;

      const event = services.eventStore.getEventById(id);
      if (!event) {
        return res.apiError('Event not found', 404);
      }

      // Add confirmation
      const added = event.addConfirmation(user_id || 'anonymous');
      if (!added) {
        return res.apiError('You have already interacted with this event', 400);
      }
      services.eventStore.updateUserReputation(event.user_id, { confirmed: 1 });

      // Log to mesh network (safe)
      if (services.meshSimulator && services.meshSimulator.config.enabled) {
        services.meshSimulator.logEventConfirmation(event, user_id);
      }

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        const userRep = services.eventStore.getUserReputation(event.user_id);
        const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
        const tier = services.reputationEngine.getDisplayTier(reputation);

        io.emit('event_updated', {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier
        });
      }

      console.log(`✅ Event ${id} confirmed by ${user_id || 'anonymous'}`);

      res.apiSuccess({
        event_id: id,
        confirmations: event.confirmations,
        fakes: event.fakes,
        confirmed_by: user_id || 'anonymous'
      }, 'Event confirmed successfully');

    } catch (error) {
      console.error('Error confirming event:', error);
      res.apiError('Failed to confirm event', 500);
    }
  });

  // POST /events/:id/fake - Report event as fake
  router.post('/:id/fake', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { id } = req.params;
      const { user_id } = req.body;

      const event = services.eventStore.getEventById(id);
      if (!event) {
        return res.apiError('Event not found', 404);
      }

      // Add fake report
      const added = event.addFake(user_id || 'anonymous');
      if (!added) {
        return res.apiError('You have already interacted with this event', 400);
      }
      services.eventStore.updateUserReputation(event.user_id, { fakes: 1 });

      // Log to mesh network (safe)
      if (services.meshSimulator && services.meshSimulator.config.enabled) {
        services.meshSimulator.logEventFakeReport(event, user_id);
      }

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        const userRep = services.eventStore.getUserReputation(event.user_id);
        const reputation = services.reputationEngine.calculateScore(event.user_id, userRep);
        const tier = services.reputationEngine.getDisplayTier(reputation);

        io.emit('event_updated', {
          ...event.toJSON(),
          reputation,
          reputation_tier: tier
        });
      }

      console.log(`🚫 Event ${id} reported as fake by ${user_id || 'anonymous'}`);

      res.apiSuccess({
        event_id: id,
        confirmations: event.confirmations,
        fakes: event.fakes,
        reported_by: user_id || 'anonymous'
      }, 'Event reported as fake successfully');

    } catch (error) {
      console.error('Error reporting fake event:', error);
      res.apiError('Failed to report fake event', 500);
    }
  });

  // GET /events/:id - Get single event by ID
  router.get('/:id', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const event = services.eventStore.getEventById(req.params.id);

      if (!event) {
        return res.apiError('Event not found', 404);
      }

      res.apiSuccess({ event: event.toJSON() }, 'Event retrieved successfully');

    } catch (error) {
      console.error('Error fetching event:', error);
      res.apiError('Failed to fetch event', 500);
    }
  });

  // POST /events/seed - Visual demo: random events + spam filter
  router.post('/seed', async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { getRandomEvents } = require('../data/seedEvents');
      const io = req.app.get('io');

      const picks    = getRandomEvents(10);
      const accepted = [];
      const blocked  = [];
      const log      = [];

      console.log('\n' + '═'.repeat(60));
      console.log('🎬  CRISISLINK DEMO — PROCESSING 10 INCOMING REPORTS');
      console.log('═'.repeat(60));

      for (let i = 0; i < picks.length; i++) {
        const seed = picks[i];
        const idx  = `[${i + 1}/${picks.length}]`;

        // ── Run spam filter ──────────────────────────────────────────
        const spamResult = SpamFilter.analyze(seed.text);
        const geoResult  = SpamFilter.checkCoordinates(seed.lat, seed.lon);

        const isBlocked = spamResult.spam || !geoResult.valid;
        const reason    = spamResult.spam ? spamResult.reason : (!geoResult.valid ? geoResult.reason : null);

        const entry = {
          index:      i + 1,
          text:       seed.text.substring(0, 80) + (seed.text.length > 80 ? '...' : ''),
          type:       seed.type,
          urgency:    seed.urgency,
          genuine:    seed.genuine,
          blocked:    isBlocked,
          reason:     reason,
          confidence: spamResult.confidence,
          user:       seed.user_id,
          trust:      seed.trust || 0.5,
        };

        if (isBlocked) {
          // ── BLOCKED ────────────────────────────────────────────────
          console.log(`${idx} 🚫 BLOCKED  | "${seed.text.substring(0, 50)}..." → ${reason}`);
          blocked.push(entry);

          // Broadcast the block so frontend can show it visually
          if (io) {
            io.emit('seed_event_blocked', {
              index: i + 1,
              total: picks.length,
              text:  seed.text,
              reason,
              confidence: spamResult.confidence,
              user: seed.user_id,
            });
          }
        } else {
          // ── ACCEPTED ───────────────────────────────────────────────
          const event = new PingEvent({
            text:      seed.text,
            type:      seed.type,
            urgency:   seed.urgency,
            lat:       seed.lat,
            lon:       seed.lon,
            user_id:   seed.user_id || 'demo_seed',
            voice_url: null,
            user_reputation: seed.trust || 0.7,
          });

          for (let c = 0; c < (seed.confirmations || 0); c++) event.confirmations++;
          for (let f = 0; f < (seed.fakes || 0); f++) event.fakes++;

          services.eventStore.addEvent(event);
          accepted.push(event.toJSON());
          entry.eventId = event.id;

          console.log(`${idx} ✅ ACCEPTED | "${seed.text.substring(0, 50)}..." [${seed.type}/${seed.urgency}]`);

          if (io) {
            io.emit('new_event', {
              event: event.toJSON(),
              source: 'seed',
              index: i + 1,
              total: picks.length,
            });
          }
        }

        log.push(entry);

        // Add a small delay so judges can see the live processing
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log('─'.repeat(60));
      console.log(`✅ Accepted: ${accepted.length} | 🚫 Blocked: ${blocked.length} | Total: ${picks.length}`);
      console.log('═'.repeat(60) + '\n');

      res.apiSuccess({
        events:  accepted,
        blocked,
        log,
        summary: {
          total:    picks.length,
          accepted: accepted.length,
          blocked:  blocked.length,
        },
      }, `Demo complete: ${accepted.length} accepted, ${blocked.length} spam blocked`);

    } catch (error) {
      console.error('Error seeding events:', error);
      res.apiError('Failed to seed events', 500);
    }
  });

  return router;
}

module.exports = createEventsRoutes;
