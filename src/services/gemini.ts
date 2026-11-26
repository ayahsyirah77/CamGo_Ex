import { Place, ItineraryPlan } from '../types';
import { searchCamgoWebsite } from '../data/websiteDirectory';

export interface TrafficAnalysisResult {
  condition: 'smooth' | 'moderate' | 'heavy';
  summary: string;
  summaryBm: string;
  delayEstimate: string;
  peakWindow: string;
  suggestedAlternativeRoute?: string;
  suggestedAlternativePlace?: string;
  tips: string[];
}

export interface AiChatResult {
  text: string;
  source: string;
  webSearchUsed: boolean;
  webQueries?: string[];
  groundingSources?: Array<{ title: string; url: string }>;
  toolsUsed: string[];
}

class GeminiHighlandService {
  /**
   * AI Traffic & Route Analyzer for Selected Place
   */
  public async analyzePlaceTraffic(place: Place): Promise<TrafficAnalysisResult> {
    const isKeaFarm = place.township === 'Kea Farm' || place.location.toLowerCase().includes('kea farm');
    const isBrinchang = place.township === 'Brinchang';
    const isMossy = place.id.includes('mossy') || place.name.toLowerCase().includes('mossy');
    const isSungeiPalas = place.id.includes('boh') || place.name.toLowerCase().includes('palas');

    // Deterministic highland traffic condition calculation
    if (isKeaFarm || isMossy || isSungeiPalas) {
      return {
        condition: 'heavy',
        summary: `Federal Route 59 bottleneck near ${place.name}. High concentration of market shoppers, vegetable trucks, and tour coaches causing stop-and-go delays.`,
        summaryBm: `Kesesakan di FT59 berdekatan ${place.name}. Kehadiran bas persiaran dan pengunjung pasar menyebabkan kelewatan 25 - 40 minit.`,
        delayEstimate: '25 - 45 mins',
        peakWindow: '10:30 AM - 4:30 PM (Peak on Weekends & School Holidays)',
        suggestedAlternativeRoute:
          'No parallel paved bypass exists between Brinchang and Kea Farm (do NOT use Sungai Palas BOH estate tracks as a through-route). For Tanah Rata ↔ Brinchang only, light vehicles can divert via Jalan Sungai Ruil / Golden Hills. For highland entry from the north, use Simpang Pulai (FT185).',
        suggestedAlternativePlace:
          isSungeiPalas
            ? 'Cameron Valley Tea House 1 or 2 (along Route 59 Tanah Rata) which offers effortless highway parking and lush tea terraces without the single-lane climb.'
            : 'Big Red Strawberry Farm in Brinchang or agro markets in Ringlet/Tringkap with direct parking.',
        tips: [
          'Arrive before 9:00 AM or after 5:00 PM to bypass the main crush.',
          'Use Waze or Google Maps to monitor Simpang Pulai vs Tapah approaches.',
          'Prepare small cash or Touch n Go for parking kiosks.',
        ],
      };
    } else if (isBrinchang) {
      return {
        condition: 'moderate',
        summary: `Moderate traffic along Brinchang town center. Slower movement near Golden Hills during night market hours (Friday - Sunday).`,
        summaryBm: `Trafik sederhana di pekan Brinchang. Pergerakan perlahan berhampiran Golden Hills pada waktu petang pasar malam.`,
        delayEstimate: '10 - 20 mins',
        peakWindow: '4:30 PM - 8:30 PM (Night Market Hours)',
        suggestedAlternativeRoute:
          'Utilize the Sungai Ruil bypass link road between Tanah Rata and Golden Hills to avoid Brinchang town center.',
        suggestedAlternativePlace:
          'Tanah Rata heritage zone cafes or cafes in Ringlet if seeking peaceful dining without crowds.',
        tips: [
          'Park in designated basement multi-storey lots at Golden Hills.',
          'Walkable distances between central Brinchang attractions.',
        ],
      };
    } else {
      return {
        condition: 'smooth',
        summary: `Traffic to ${place.name} in ${place.township} is currently flowing smoothly with normal highland speeds (40 - 60 km/h).`,
        summaryBm: `Perjalanan ke ${place.name} di ${place.township} berjalan lancar pada kelajuan biasa tanah tinggi.`,
        delayEstimate: '0 - 5 mins delay',
        peakWindow: 'Generally clear; mild rush during school run (1:00 PM - 2:00 PM)',
        suggestedAlternativeRoute: 'Main highway route is optimal.',
        suggestedAlternativePlace: 'Enjoy your visit, ample parking is generally available on site.',
        tips: [
          'Winding mountain roads: maintain steady gear and turn on headlights during mist.',
          'Enjoy the scenic roadside vegetable terraces!',
        ],
      };
    }
  }

  /**
   * AI Predictive Crowd & Traffic Density Forecaster
   */
  public async predictBottleneck(dayPlan: any): Promise<string> {
    try {
      const response = await fetch('/api/ai/predict-bottleneck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayPlan }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.prediction || 'Traffic condition normal.';
      }
    } catch (e) {
      console.warn('[GeminiService] predictBottleneck fetch error:', e);
    }
    return 'Traffic condition normal.';
  }

  /**
   * AI Incident Traffic Flow & Detour Forecaster
   */
  public async predictIncidentFlow(
    hazard: {
      title: string;
      type: string;
      severity: string;
      location: string;
      description?: string;
      lat: number;
      lng: number;
    },
    algoPrediction: {
      affectedCorridor: string;
      predictedSpeedKmh: number;
      predictedDelayMins: number;
      congestionSpreadKm: number;
      flowTrend: string;
      recommendedBypass: string;
      summary: string;
      summaryBm: string;
    },
    language: 'en' | 'bm' = 'en'
  ): Promise<{ forecast: string; isAiEnhanced: boolean }> {
    const fallback = language === 'bm' ? algoPrediction.summaryBm : algoPrediction.summary;
    try {
      const response = await fetch('/api/ai/predict-bottleneck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPlan: {
            mode: 'incident_traffic_flow_prediction',
            language,
            currentLocalTime: new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
            incident: {
              title: hazard.title,
              type: hazard.type,
              severity: hazard.severity,
              location: hazard.location,
              coordinates: [hazard.lat, hazard.lng],
              description: hazard.description,
            },
            telemetryBaseline: {
              affectedCorridor: algoPrediction.affectedCorridor,
              predictedSpeedKmh: algoPrediction.predictedSpeedKmh,
              predictedDelayMins: algoPrediction.predictedDelayMins,
              congestionSpreadKm: algoPrediction.congestionSpreadKm,
              flowTrend: algoPrediction.flowTrend,
              recommendedBypass: algoPrediction.recommendedBypass,
            },
            networkTopologyRules: {
              spine: 'Single-spine linear bottleneck FT59 (Ringlet <-> Tanah Rata <-> Brinchang <-> Kea Farm)',
              upstreamFeeders: ['Simpang Pulai FT185', 'Gua Musang/Lojing FT185', 'Tapah FT59', 'Sungai Koyan FT102'],
              prohibitedSuggestions: ['Fake parallel highways', 'Agricultural dirt tracks', 'Habu bypass', 'BOH Sungai Palas estate road as through-route'],
            },
            instruction:
              language === 'bm'
                ? 'Berikan ramalan ringkas (maksimum 2-3 ayat) dalam Bahasa Malaysia tentang aliran trafik, tempoh kesesakan dan laluan sah FT59/FT185/FT102 atau Golden Hills (kenderaan ringan sahaja).'
                : 'Provide a concise 2-3 sentence traffic flow prediction, clearance expectation, and real paved detour or town waiting recommendation without inventing fake bypasses.',
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = String(data?.prediction || '').trim();
        if (
          text &&
          text !== 'Traffic condition normal.' &&
          text !== 'Traffic prediction currently unavailable.'
        ) {
          return { forecast: text, isAiEnhanced: true };
        }
      }
    } catch (e) {
      console.warn('[GeminiService] predictIncidentFlow warning:', e);
    }
    return { forecast: fallback, isAiEnhanced: false };
  }

  /**
   * Unified AI Itinerary Analysis (Traffic, Budget, Weather)
   */
  public async analyzeItinerary(plan: ItineraryPlan, weather: 'Clear' | 'Rainy'): Promise<{ traffic: string, budget: string, weather: string | null }> {
    try {
      const response = await fetch('/api/ai/analyze-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, weather }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && (data.traffic || data.budget)) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[GeminiService] analyzeItinerary fetch error:', e);
    }

    return {
      traffic: 'Federal Route 59 smooth. Allow 20 minutes buffer near Kea Farm midday.',
      budget: `Budget (${plan.budget} ${plan.currency}) is within comfortable range for key highland stops.`,
      weather: weather === 'Rainy' ? 'Indoor suggestions: Time Tunnel Museum, Strawberry Valley tea house.' : null
    };
  }

  /**
   * AI Budget & Expense Optimizer
   */
  public async analyzeBudget(plan: any, budget: number): Promise<string> {
    try {
      const response = await fetch('/api/ai/analyze-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, budget }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.analysis || 'Budget analysis within normal parameters.';
      }
    } catch (e) {
      console.warn('[GeminiService] analyzeBudget fetch error:', e);
    }
    return 'Budget analysis within normal parameters.';
  }

  /**
   * AI Chat Companion for Cameron Highlands questions (Server-Side Proxy)
   * Supports both Internal Firebase Directory query and Google Search Grounding for live web queries
   */
  public async askHighlandsAi(
    question: string,
    language: 'en' | 'bm' = 'en',
    history: Array<{ sender: 'ai' | 'user'; text: string }> = [],
    options?: {
      enableWebSearch?: boolean;
      activeTool?: 'all' | 'directory' | 'web';
    }
  ): Promise<AiChatResult> {
    const enableWebSearch = options?.enableWebSearch ?? true;
    const activeTool = options?.activeTool ?? 'all';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          language,
          history: history.slice(-6),
          enableWebSearch,
          activeTool,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          return {
            text: data.reply,
            source: data.source || 'gemini-3.8-flash',
            webSearchUsed: Boolean(data.webSearchUsed),
            webQueries: data.webQueries || [],
            groundingSources: data.groundingSources || [],
            toolsUsed: data.toolsUsed || (data.webSearchUsed ? ['firebase_directory', 'search_the_web'] : ['firebase_directory']),
          };
        }
      }
    } catch (err) {
      console.warn('[GeminiService] Server /api/chat error:', err);
    }

    // Knowledge Engine Fallback handled by UI or local knowledge search
    const siteSearch = searchCamgoWebsite(question, language);
    if (siteSearch.found && siteSearch.response) {
      return {
        text: siteSearch.response,
        source: 'knowledge_engine',
        webSearchUsed: false,
        toolsUsed: ['firebase_directory'],
      };
    }

    return {
      text: language === 'bm' 
        ? 'Maaf, sambungan rangkaian terganggu. Sila cuba lagi sebentar lagi.' 
        : 'Connection interrupted. Please verify your connection or try again.',
      source: 'error_fallback',
      webSearchUsed: false,
      toolsUsed: ['firebase_directory'],
    };
  }

  /**
   * AI Spatial Intent Extraction
   */
  public async parseSpatialIntent(userInput: string) {
    try {
      const response = await fetch('/api/ai/extract-spatial-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[GeminiService] Spatial intent extraction error:', err);
    }
    return null;
  }
}

export const geminiService = new GeminiHighlandService();
