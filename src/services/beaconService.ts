/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField, Unsubscribe } from 'firebase/firestore';
import { BeaconSession, BeaconMember } from '../types';

export const LOCAL_STORAGE_KEY_SESSION = 'camgo_party_active_session_code';
export const LOCAL_STORAGE_KEY_CACHED_SESSION = 'camgo_party_cached_session_data';

class BeaconService {
  /**
   * Retrieves an existing session by code from Firestore
   */
  async getSession(rawCode: string): Promise<BeaconSession | null> {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return null;

    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      const snap = await getDoc(sessionRef);
      if (snap.exists()) {
        const data = snap.data() as BeaconSession;
        this.cacheLocalSession(data);
        return data;
      }
      return null;
    } catch (err) {
      console.warn(`[BeaconService] Error fetching session ${code}:`, err);
      return null;
    }
  }

  /**
   * Creates a brand new beacon session with the creating user as the first designated member.
   * No mock users are added.
   */
  async createSession(
    rawCode: string,
    creatorMember: BeaconMember,
    sessionName?: string,
    durationHours: 2 | 8 | 24 = 8
  ): Promise<BeaconSession> {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    const sessionRef = doc(db, 'beacon_sessions', code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();

    const newSession: BeaconSession = {
      id: code,
      code,
      name: sessionName?.trim() || `Cameron Highlands Group (${code})`,
      createdBy: creatorMember.id,
      createdByName: creatorMember.name,
      createdAt: now.toISOString(),
      expiresAt,
      durationHours,
      status: 'active',
      members: {
        [creatorMember.id]: creatorMember,
      },
    };

    try {
      await setDoc(sessionRef, newSession);
    } catch (err) {
      console.warn('[BeaconService] Firestore setDoc note (offline/pending):', err);
    }

    this.cacheLocalSession(newSession);
    return newSession;
  }

  /**
   * Joins an existing beacon session. If the session exists, adds the user as a designated member.
   * If not found, throws a NOT_FOUND error so the UI can prompt the user to create it.
   */
  async joinSession(
    rawCode: string,
    member: BeaconMember
  ): Promise<BeaconSession> {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    const sessionRef = doc(db, 'beacon_sessions', code);

    const snap = await getDoc(sessionRef);
    if (!snap.exists()) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const sessionData = snap.data() as BeaconSession;
    if (new Date(sessionData.expiresAt).getTime() < Date.now() || sessionData.status === 'ended') {
      throw new Error('SESSION_EXPIRED');
    }

    // Add designated member to existing session in Firestore
    await updateDoc(sessionRef, {
      [`members.${member.id}`]: member,
    });

    const updatedSession: BeaconSession = {
      ...sessionData,
      members: {
        ...(sessionData.members || {}),
        [member.id]: member,
      },
    };

    this.cacheLocalSession(updatedSession);
    return updatedSession;
  }

  /**
   * Subscribe to real-time session updates from Firestore.
   * Tracks real members who join or move.
   */
  subscribeToSession(
    rawCode: string,
    memberId: string,
    onSuccess: (session: BeaconSession) => void,
    onExpired: () => void,
    onNotFound: (code: string) => void,
    onError: (err: any) => void
  ): Unsubscribe {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    const sessionRef = doc(db, 'beacon_sessions', code);

    return onSnapshot(
      sessionRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BeaconSession;
          if (new Date(data.expiresAt).getTime() < Date.now() || data.status === 'ended') {
            onExpired();
            return;
          }
          this.cacheLocalSession(data);
          onSuccess(data);
        } else {
          // If Firestore is still committing local writes, skip
          if (docSnap.metadata.hasPendingWrites) {
            return;
          }

          // Document does not exist in Firestore - strictly trigger onNotFound
          this.clearCachedSession();
          onNotFound(code);
        }
      },
      (err) => {
        console.error(`[BeaconService] Listener error for ${code}:`, err);
        onError(err);
      }
    );
  }

  /**
   * Syncs user's real GPS coordinates to Firestore
   */
  async updateMemberLocation(
    code: string,
    memberId: string,
    locationData: Partial<BeaconMember>
  ): Promise<void> {
    if (!code || !memberId) return;
    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      const updatePayload: Record<string, any> = {};
      Object.entries(locationData).forEach(([key, val]) => {
        updatePayload[`members.${memberId}.${key}`] = val;
      });
      updatePayload[`members.${memberId}.updatedAt`] = new Date().toISOString();

      await updateDoc(sessionRef, updatePayload);
    } catch (e) {
      console.warn('[BeaconService] updateMemberLocation fallback:', e);
    }
  }

  /**
   * Remove self from session
   */
  async leaveSession(code: string, memberId: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      await updateDoc(sessionRef, {
        [`members.${memberId}`]: deleteField(),
      });
    } catch (e) {
      console.warn('[BeaconService] leaveSession notice:', e);
    }
    this.clearCachedSession();
  }

  /**
   * End session for all members (host only)
   */
  async endSession(code: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      await updateDoc(sessionRef, {
        status: 'ended',
      });
    } catch (e) {
      console.warn('[BeaconService] endSession notice:', e);
    }
    this.clearCachedSession();
  }

  /**
   * Sends a real-time group chat message tied to the beacon/party code
   */
  async sendBeaconChatMessage(
    rawCode: string,
    message: {
      id: string;
      senderId: string;
      senderName: string;
      senderColor?: string;
      text: string;
      timestamp: string;
    }
  ): Promise<void> {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!code || !message.text.trim()) return;

    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      const snap = await getDoc(sessionRef);
      if (snap.exists()) {
        const sessionData = snap.data() as BeaconSession;
        const currentMessages = sessionData.messages || [];
        const updatedMessages = [...currentMessages, message].slice(-100);

        await updateDoc(sessionRef, {
          messages: updatedMessages,
        });
      }
    } catch (e) {
      console.warn('[BeaconService] sendBeaconChatMessage fallback:', e);
    }
  }

  private cacheLocalSession(session: BeaconSession) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, session.code);
      localStorage.setItem(LOCAL_STORAGE_KEY_CACHED_SESSION, JSON.stringify(session));
    } catch {}
  }

  getCachedLocalSession(): BeaconSession | null {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY_CACHED_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearCachedSession() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
      localStorage.removeItem(LOCAL_STORAGE_KEY_CACHED_SESSION);
    } catch {}
  }
}

export const beaconService = new BeaconService();
