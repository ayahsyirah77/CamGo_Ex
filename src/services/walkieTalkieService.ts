/**
 * Walkie-Talkie Audio Service
 * Manages MediaRecorder microphone capture, Firebase Storage audio uploads,
 * Firestore real-time onSnapshot sync, and permission handling for CamGo.
 */

import { db, storage } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  setDoc,
  doc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface WalkieTalkieMessage {
  id: string;
  audioUrl: string;
  senderName: string;
  senderId: string;
  senderAvatar?: string;
  location?: string;
  channel: string;
  duration: number; // in seconds
  createdAt: number;
  mimeType: string;
}

export interface RecordingState {
  isRecording: boolean;
  startTime: number;
  durationMs: number;
}

class WalkieTalkieService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime = 0;
  private recordingInterval: any = null;
  private mimeType = 'audio/webm';
  private currentSenderId = '';
  private currentSenderName = 'Highland Explorer';

  constructor() {
    this.initCurrentUser();
  }

  private initCurrentUser(): void {
    if (typeof window === 'undefined') return;
    try {
      let savedId = localStorage.getItem('camgo_walkie_sender_id');
      if (!savedId) {
        savedId = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('camgo_walkie_sender_id', savedId);
      }
      this.currentSenderId = savedId;

      const savedName = localStorage.getItem('camgo_party_member_name') || localStorage.getItem('camgo_user_name');
      if (savedName) {
        this.currentSenderName = savedName;
      }
    } catch {
      this.currentSenderId = 'user_' + Math.random().toString(36).substring(2, 8);
    }
  }

  public getSenderInfo(): { id: string; name: string } {
    return {
      id: this.currentSenderId,
      name: this.currentSenderName,
    };
  }

  public setSenderName(name: string): void {
    this.currentSenderName = name.trim() || 'Highland Explorer';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('camgo_party_member_name', this.currentSenderName);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Check and verify microphone permissions
   */
  public async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        granted: false,
        error: 'Microphone access is not supported in this browser environment.',
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Release test tracks immediately
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch (err: any) {
      console.warn('[WalkieTalkieService] Microphone permission check notice:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          granted: false,
          error: 'Microphone access was denied. Please allow microphone permissions in your browser or site settings.',
        };
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return {
          granted: false,
          error: 'No audio recording device was found on this system.',
        };
      }
      return {
        granted: false,
        error: err?.message || 'Unable to access microphone.',
      };
    }
  }

  /**
   * Starts capturing microphone audio using MediaRecorder
   */
  public async startRecording(onDurationUpdate?: (durationMs: number) => void): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }

    const perm = await this.requestMicrophonePermission();
    if (!perm.granted) {
      throw new Error(perm.error || 'Microphone permission denied');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.mediaStream = stream;
    this.recordedChunks = [];

    // Select the best supported audio container/codec
    let chosenMime = 'audio/webm;codecs=opus';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        chosenMime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        chosenMime = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        chosenMime = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        chosenMime = 'audio/ogg';
      } else {
        chosenMime = '';
      }
    }
    this.mimeType = chosenMime || 'audio/webm';

    const recorderOptions: MediaRecorderOptions = chosenMime ? { mimeType: chosenMime } : {};
    const recorder = new MediaRecorder(stream, recorderOptions);

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder = recorder;
    this.recordingStartTime = Date.now();
    recorder.start(100); // chunk every 100ms

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
    this.recordingInterval = setInterval(() => {
      if (onDurationUpdate && this.recordingStartTime > 0) {
        onDurationUpdate(Date.now() - this.recordingStartTime);
      }
    }, 100);

    // Audio cue / haptic tick
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Stops recording and returns the compiled audio Blob and recording duration
   */
  public async stopRecording(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    const durationMs = Math.max(300, Date.now() - this.recordingStartTime);
    this.recordingStartTime = 0;

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanupStream();
        reject(new Error('No active recorder found'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const finalBlob = new Blob(this.recordedChunks, {
            type: this.mimeType || 'audio/webm',
          });
          this.recordedChunks = [];
          this.cleanupStream();

          // Haptic feedback
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(20);
            } catch {
              // ignore
            }
          }

          resolve({
            blob: finalBlob,
            durationMs,
            mimeType: this.mimeType || 'audio/webm',
          });
        } catch (err) {
          this.cleanupStream();
          reject(err);
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        this.cleanupStream();
        resolve({
          blob: new Blob(this.recordedChunks, { type: this.mimeType }),
          durationMs,
          mimeType: this.mimeType,
        });
      }
    });
  }

  /**
   * Cancels recording without keeping or sending audio
   */
  public cancelRecording(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    this.recordingStartTime = 0;
    this.recordedChunks = [];

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanupStream();
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Converts Blob to Base64 Data URL (used as zero-failure fallback for browser environments)
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to encode audio blob to Base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Uploads recorded audio to Firebase Storage, then saves metadata to Firestore collection
   */
  public async sendVoiceMessage(
    blob: Blob,
    durationMs: number,
    metadata?: {
      senderName?: string;
      senderId?: string;
      senderAvatar?: string;
      location?: string;
      channel?: string;
    }
  ): Promise<WalkieTalkieMessage> {
    const messageId = 'wt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const durationSec = Math.max(1, Math.round(durationMs / 1000));
    const channel = metadata?.channel || 'highland-broadcast';
    const senderName = metadata?.senderName || this.currentSenderName;
    const senderId = metadata?.senderId || this.currentSenderId;
    const location = metadata?.location || 'Cameron Highlands';
    const senderAvatar =
      metadata?.senderAvatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

    let audioUrl = '';

    // 1. Attempt upload to Firebase Storage
    try {
      const extension = this.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const storagePath = `walkie_talkie/${channel}/${messageId}.${extension}`;
      const audioStorageRef = ref(storage, storagePath);

      const uploadResult = await uploadBytes(audioStorageRef, blob, {
        contentType: this.mimeType || 'audio/webm',
        customMetadata: {
          senderName,
          senderId,
          channel,
          duration: String(durationSec),
        },
      });

      audioUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError) {
      console.warn('[WalkieTalkieService] Firebase Storage notice, using base64 audio fallback:', storageError);
      // Fallback: encode as Base64 data URI so voice dispatch never fails
      audioUrl = await this.blobToBase64(blob);
    }

    const messageDoc: WalkieTalkieMessage = {
      id: messageId,
      audioUrl,
      senderName,
      senderId,
      senderAvatar,
      location,
      channel,
      duration: durationSec,
      createdAt: Date.now(),
      mimeType: this.mimeType,
    };

    // 2. Persist message record to Firestore collection `walkieTalkieMessages`
    if (db) {
      try {
        const docRef = doc(db, 'walkieTalkieMessages', messageId);
        await setDoc(docRef, messageDoc);
      } catch (firestoreError) {
        console.error('[WalkieTalkieService] Firestore persistence error:', firestoreError);
        throw firestoreError;
      }
    }

    return messageDoc;
  }

  /**
   * Subscribes to real-time walkie-talkie audio messages from Firestore
   */
  public subscribeToMessages(
    callback: (messages: WalkieTalkieMessage[]) => void,
    channel = 'highland-broadcast'
  ): () => void {
    if (!db) {
      callback([]);
      return () => {};
    }

    try {
      const colRef = collection(db, 'walkieTalkieMessages');
      // Subscribe to messages ordered by timestamp descending
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(40));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: WalkieTalkieMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as WalkieTalkieMessage;
            if (data && data.audioUrl) {
              // Filter by channel if specified
              if (!channel || data.channel === channel || data.channel === 'all') {
                list.push({
                  ...data,
                  id: docSnap.id,
                });
              }
            }
          });
          callback(list);
        },
        (error) => {
          console.warn('[WalkieTalkieService] Firestore onSnapshot warning:', error);
          // If indexing requires query without where/order or fallback:
          callback([]);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('[WalkieTalkieService] Subscription initialization error:', err);
      return () => {};
    }
  }
}

export const walkieTalkieService = new WalkieTalkieService();
