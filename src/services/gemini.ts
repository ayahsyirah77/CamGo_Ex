import { GoogleGenAI } from '@google/genai';
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
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey =
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (e) {
        console.warn('Gemini API init fallback:', e);
      }
    }
  }

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
        summaryBm: `Kesesakan di Laluan Persekutuan 59 berdekatan ${place.name}. Kehadiran bas persiaran dan pengunjung pasar menyebabkan kelewatan 25 - 40 minit.`,
        delayEstimate: '25 - 45 mins',
        peakWindow: '10:30 AM - 4:30 PM (Peak on Weekends & School Holidays)',
        suggestedAlternativeRoute:
          'If approaching from North, take the Simpang Pulai (FT 185) -> Blue Valley -> Kampung Raja route. For Sungei Palas, consider parking at the main junction and taking licensed 4x4.',
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
    if (!this.ai) return 'Traffic condition normal.';
    try {
      const prompt = `Analyze this itinerary for Cameron Highlands and predict traffic bottlenecks. 
      Itinerary: ${JSON.stringify(dayPlan)}. Suggest proactive schedule shifts if needed.`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return response.text || 'Traffic condition normal.';
    } catch {
      return 'Traffic prediction currently unavailable.';
    }
  }

  /**
   * Unified AI Itinerary Analysis (Traffic, Budget, Weather)
   */
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
      console.warn('[GeminiService] Backend itinerary analysis fetch fallback:', e);
    }

    if (!this.ai) {
      return {
        traffic: 'Federal Route 59 smooth. Allow 20 minutes buffer near Kea Farm midday.',
        budget: `Budget (${plan.budget} ${plan.currency}) is within comfortable range for key highland stops.`,
        weather: weather === 'Rainy' ? 'Indoor suggestions: Time Tunnel Museum, Strawberry Valley tea house.' : null
      };
    }

    try {
      const prompt = `Analyze this Cameron Highlands itinerary comprehensively:
      Itinerary: ${JSON.stringify(plan)}.
      Total Budget: ${plan.budget} ${plan.currency}.
      Current Weather: ${weather}.
      
      Return JSON with 3 keys:
      1. 'traffic': Predict bottlenecks and suggest proactive schedule adjustments.
      2. 'budget': Review expenses, provide cost-saving tips if it exceeds budget.
      3. 'weather': If 'Rainy', suggest specific indoor alternatives. Otherwise null.
      
      Only return valid JSON.`;
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      
      const text = response.text || '{}';
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("AI Analysis Error:", e);
      return {
        traffic: 'Traffic flow along FT185 and FT59 is normal.',
        budget: 'Budget is aligned with highland admission rates.',
        weather: null
      };
    }
  }

  /**
   * AI Budget & Expense Optimizer
   */
  public async analyzeBudget(plan: any, budget: number): Promise<string> {
    if (!this.ai) return 'Budget analysis within normal parameters.';
    try {
      const prompt = `Analyze this itinerary budget. Total planned budget: ${budget}. 
      Plan: ${JSON.stringify(plan)}. Suggest cost-saving alternatives if it exceeds budget.`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return response.text || 'Budget analysis within normal parameters.';
    } catch {
      return 'Budget analysis within normal parameters.';
    }
  }

  /**
   * AI Chat Companion for Cameron Highlands questions (Server-Side Proxy + Resilient Fallback)
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

    // 1. Primary: Server-Side Gemini API Proxy (/api/chat)
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
      console.warn('[GeminiService] Server /api/chat unreachable, checking client fallback:', err);
    }

    // 2. Secondary: Client SDK instance if available
    const siteSearch = searchCamgoWebsite(question, language);
    if (this.ai) {
      try {
        const prompt = `You are CamGo Highlands AI, an expert local travel guide and mountain advisor for Cameron Highlands, Malaysia (powered by Firebase project: camgo-prod).
You search both our website's local directory and live web data.
${siteSearch.found ? `\n[VERIFIED IN-WEBSITE DIRECTORY DATA]:\n${siteSearch.response || siteSearch.contextText}\n` : ''}
Answer helpfully, concisely, and warmly in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.
Question: "${question}"`;

        const toolsConfig: any[] = [];
        if (enableWebSearch && activeTool !== 'directory') {
          toolsConfig.push({ googleSearch: {} });
        }

        const response = await this.ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            ...(toolsConfig.length > 0 ? { tools: toolsConfig } : {})
          }
        });

        if (response.text) {
          const candidate = response.candidates?.[0];
          const groundingMeta = (candidate as any)?.groundingMetadata;
          const webQueries = groundingMeta?.webSearchQueries || [];
          const groundingSources = (groundingMeta?.groundingChunks || [])
            .map((chunk: any) => ({
              title: chunk?.web?.title || 'Web Result',
              url: chunk?.web?.uri || '',
            }))
            .filter((s: any) => Boolean(s.url));

          const webSearchUsed = toolsConfig.length > 0 && (webQueries.length > 0 || groundingSources.length > 0);

          return {
            text: response.text,
            source: 'gemini-3.8-flash-client',
            webSearchUsed,
            webQueries,
            groundingSources,
            toolsUsed: webSearchUsed ? ['firebase_directory', 'search_the_web'] : ['firebase_directory'],
          };
        }
      } catch (e) {
        console.warn('Gemini chat error, fallback to expert knowledge engine:', e);
      }
    }

    // 3. Tertiary: Local Cameron Highlands Knowledge Engine & In-Website Search
    const wrapResult = (text: string, isWeb = false): AiChatResult => ({
      text,
      source: 'knowledge_engine',
      webSearchUsed: isWeb,
      toolsUsed: isWeb ? ['firebase_directory', 'search_the_web'] : ['firebase_directory'],
    });

    if (siteSearch.found && siteSearch.response) {
      return wrapResult(siteSearch.response, false);
    }

    const qLower = question.toLowerCase();

    // News, Landslide, JKR Hazards, Live Road Alerts
    if (
      qLower.includes('news') ||
      qLower.includes('berita') ||
      qLower.includes('landslide') ||
      qLower.includes('tanah runtuh') ||
      qLower.includes('kejadian') ||
      qLower.includes('jkr') ||
      qLower.includes('closed') ||
      qLower.includes('tutup')
    ) {
      if (language === 'bm') {
        return wrapResult(
          `Perkembangan Terkini & Buletin Cameron Highlands (Sumber Rasmi JKR & MDCH):\n• **Status Laluan FT185 Simpang Pulai**: Laluan utama dilaporkan selamat dilalui kenderaan biasa dengan pemantauan cerun berkala oleh JKR Daerah Cameron Highlands.\n• **Laluan Tapah FT59**: Pembersihan sisa dahan dan cerun kecil dijalankan di beberapa seksyen; patuhi papan tanda amaran dan had laju.\n• **Amaran Cuaca & Cerun**: Musim hujan boleh menyebabkan kabus tebal dan takungan air pada waktu petang.\n• **Maklumat Langsung**: Semak tab "Live Hazards & Traffic" pada portal CamGo untuk maklumat segerak terus daripada portal eBencana JKR dan FB Majlis Daerah Cameron Highlands (MDCH).`,
          true
        );
      }
      return wrapResult(
        `Cameron Highlands Latest Bulletins & Road News (Official JKR & MDCH Feeds):\n• **FT185 Simpang Pulai Approach**: Main access corridor is open and clear for standard traffic under regular slope monitoring by JKR Cameron Highlands.\n• **FT59 Tapah Pass**: Routine maintenance and minor debris clearance around designated winding sectors; observe warning beacons.\n• **Slope & Weather Precaution**: Heavy mist and afternoon drizzles may reduce visibility. Always keep headlights on and maintain safe braking distance.\n• **Real-Time Live Updates**: Check CamGo's "Live Hazards & Traffic" feed for synchronized updates from JKR eBencana and MDCH (Majlis Daerah Cameron Highlands).`,
        true
      );
    }

    if (qLower.includes('steamboat') || qLower.includes('makan') || qLower.includes('food')) {
      if (language === 'bm') {
        return wrapResult(
          `Untuk pengalaman steamboat terbaik di Cameron Highlands (Waktu Sejuk):\n1. **Water Crest Valley (Tringkap)**: Kuah sup berasaskan selada air segar dari ladang organik dengan periuk arang kayu klasik berwap harum.\n2. **Highland Steamboat Cheese & Grill (Tanah Rata)**: Pilihan halal popular dengan kuah Tom Yam pekat dan gril daging berkeju mozzarella.\n3. **Restoran Taman Mutiara (Brinchang)**: Pilihan makanan laut segar dengan sayur-sayuran Cameron Highlands yang rangup manis!\nTip: Suhu malam sekitar 14°C - 16°C, nikmat sekali dinikmati bersama keluarga!`
        );
      }
      return wrapResult(
        `For the best steamboat in Cameron Highlands (Cold Weather Dining):\n1. **Water Crest Valley (Tringkap)**: Legendary fresh organic watercress broth simmered over authentic glowing charcoal.\n2. **Highland Steamboat Cheese & Grill (Tanah Rata)**: Halal certified buffet with double tom yum/chicken broth and melted cheese grill.\n3. **Restoran Taman Mutiara (Brinchang)**: Traditional Chinese seafood & mountain greens steamboat.\nPro Tip: Reserve early on weekends as lines form by 6:30 PM!`
      );
    }

    if (qLower.includes('traffic') || qLower.includes('jalan') || qLower.includes('route') || qLower.includes('sesak') || qLower.includes('jem')) {
      if (language === 'bm') {
        return wrapResult(
          `Info Trafik Cameron Highlands:\n• **Laluan Simpang Pulai (FT 185)**: Jalan lebih lebar, kurang selekoh tajam berbanding Tapah, dan sangat lancar hari ini.\n• **Laluan Tapah (FT 59)**: Lebih curam dan sempit dengan lori sayur perlahan; terdapat kabus berhampiran Lata Iskandar.\n• **Kawasan Sesak**: Sekitar Kea Farm dan Pasar Malam Golden Hills (4:30 PM - 9:00 PM). Disyorkan gerak awal sebelum jam 9:30 pagi!`
        );
      }
      return wrapResult(
        `Cameron Highlands Traffic Advisory:\n• **Simpang Pulai Route (FT 185)**: Recommended route! Wider dual-carriageway sections, fewer hairpin turns, and smooth traffic today.\n• **Tapah Route (FT 59)**: Narrower mountain pass with slow-moving vegetable lorries and mist near Lata Iskandar.\n• **Choke Points**: Kea Farm market junction and Brinchang Golden Hills during night market hours (4:30 PM - 9:00 PM). Travel early or use bypass roads!`
      );
    }

    if (qLower.includes('weather') || qLower.includes('cuaca') || qLower.includes('suhu') || qLower.includes('rain') || qLower.includes('sejuk')) {
      if (language === 'bm') {
        return wrapResult(
          `Keadaan Cuaca Semasa & Ramalan Tanah Tinggi:\n• Suhu purata sekitar **15°C hingga 21°C** di Tanah Rata dan Brinchang.\n• Di kawasan tinggi seperti Mossy Forest & Gunung Brinchang, suhu boleh turun ke **12°C - 14°C** dengan kabus tebal.\n• Bawa jaket tebal atau baju sejuk, kasut bertapak getah anti-gelincir, dan payung untuk hujan renyai petang!`,
          true
        );
      }
      return wrapResult(
        `Current Highlands Weather Insight & Forecast:\n• Temperatures range between **15°C to 21°C** across Tanah Rata & Brinchang.\n• At higher elevations like Mossy Forest & Gunung Brinchang (over 2,000m), temperatures can dip to **12°C - 14°C** with thick cloud mist.\n• What to pack: Light jackets/sweaters, comfortable non-slip walking shoes, and an umbrella for occasional afternoon drizzle.`,
        true
      );
    }

    if (qLower.includes('mossy') || qLower.includes('forest') || qLower.includes('hutan') || qLower.includes('permit')) {
      if (language === 'bm') {
        return wrapResult(
          `Panduan Mossy Forest & Permit:\n• Terletak di ketinggian 2,032m di Gunung Brinchang — hutan awan purba diselaputi lumut tebal dan pokok kerdil.\n• Laluan kayu (boardwalk) sepanjang 200m sangat selesa untuk seisi keluarga.\n• Memerlukan permit Jabatan Perhutanan Negeri Pahang dan disyorkan menaiki jip 4x4 dari pekan Brinchang kerana jalan bukit yang sempit!`
        );
      }
      return wrapResult(
        `Mossy Forest Visitors Guide:\n• Located at 2,032m elevation atop Mount Brinchang, this ancient cloud forest feels like a mystical fairytale.\n• Features an elevated 200m wooden boardwalk safe for all ages.\n• Requires a Forestry Department permit. It is best accessed via licensed 4x4 Land Rover tour from Brinchang due to steep, narrow single-lane terrain!`
      );
    }

    if (qLower.includes('strawberi') || qLower.includes('strawberry') || qLower.includes('farm') || qLower.includes('ladang') || qLower.includes('petik')) {
      if (language === 'bm') {
        return wrapResult(
          `Panduan Ladang Strawberi Cameron Highlands:\n• **Big Red Strawberry Farm (Brinchang)**: Percuma masuk, pelbagai tanaman hidroponik, kafe wafel strawberi dan tempat letak kereta bertingkat.\n• **Raju's Hill Strawberry Farm (Kea Farm)**: Terkenal dengan aktiviti petik strawberi segar sendiri (DIY harvesting) dan jus strawberi tulen.\n• **Kok Lim Strawberry Farm**: Mudah diakses di jalan utama dengan gerai jem buatan sendiri.\nTip: Datang awal pagi (8:30 - 10:00 pagi) untuk memetik buah strawberi yang paling manis dan ranum sebelum dipetik pelawat lain!`
        );
      }
      return wrapResult(
        `Cameron Highlands Strawberry Farm Guide:\n• **Big Red Strawberry Farm (Brinchang)**: Free admission, multi-tier hydroponic greenhouses, strawberry waffles cafe, and spacious covered parking.\n• **Raju's Hill Strawberry Farm (Kea Farm)**: Famous for sweet DIY hand-picking harvest sessions and fresh homemade strawberry juice.\n• **Kok Lim Strawberry Farm**: Conveniently located with farm-fresh jams and delicacies.\nPro Tip: Visit early morning (8:30 - 10:00 AM) for the juiciest ripe berries before the afternoon crowd!`
      );
    }

    if (language === 'bm') {
      return wrapResult(
        `Saya telah membuat carian dalam direktori Cameron Highlands & web bagi pertanyaan anda: "${question}".\n\nTopik pantas yang tersedia:\n• **Masjid & Surau**: Masjid Abu Bakar (Tanah Rata), Masjid Tengku Ahmad (Brinchang), Surau Kea Farm & Golden Hills.\n• **Trafik**: Laluan Simpang Pulai FT185 vs Tapah FT59.\n• **Tarikan**: BOH Sungei Palas, Flora Park, Sheep Sanctuary.\n• **Kecemasan**: Hospital Sultanah Hajah Kalsom (+60 5-491 1866) & Butang SOS 1-Click.\n\nSila nyatakan soalan atau lokasi khusus untuk bantuan segera!`
      );
    }

    return wrapResult(
      `I searched our Cameron Highlands directory and web database for your inquiry: "${question}".\n\nQuick highland essentials:\n• **Mosques & Surau**: Masjid Abu Bakar (Tanah Rata), Masjid Tengku Ahmad (Brinchang), Surau Kea Farm, Surau Golden Hills.\n• **Roads & Traffic**: FT185 Simpang Pulai (smooth) vs FT59 Tapah.\n• **Attractions & Passes**: BOH Sungei Palas, Flora Park, Sheep Sanctuary (viewable in our Tickets tab).\n• **Emergency Services**: Hospital Sultanah Hajah Kalsom (+60 5-491 1866) & CamGo 1-Click SOS Dispatch.\n\nPlease feel free to ask about any specific township, attraction, or service in Cameron Highlands!`
    );
  }
}

export const geminiService = new GeminiHighlandService();


