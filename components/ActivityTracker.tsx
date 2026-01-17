import React, { useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export const ActivityTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const sessionDocRef = useRef<string | null>(null);
    const heartbeatInterval = useRef<number | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Create a new session
                const sessionId = `${user.uid}_${Date.now()}`;
                sessionDocRef.current = sessionId;

                const sessionData = {
                    uid: user.uid,
                    email: user.email,
                    startedAt: serverTimestamp(),
                    lastSeenAt: serverTimestamp(),
                    userAgent: navigator.userAgent,
                    status: 'active'
                };

                try {
                    await setDoc(doc(db, 'user_sessions', sessionId), sessionData);

                    // Start heartbeat
                    if (heartbeatInterval.current) window.clearInterval(heartbeatInterval.current);
                    heartbeatInterval.current = window.setInterval(async () => {
                        if (sessionDocRef.current) {
                            await updateDoc(doc(db, 'user_sessions', sessionDocRef.current), {
                                lastSeenAt: serverTimestamp()
                            });
                        }
                    }, 60000); // 1 minute
                } catch (e) {
                    console.error("Failed to initialize session tracking:", e);
                }
            } else {
                // Clear heartbeat on logout
                if (heartbeatInterval.current) {
                    window.clearInterval(heartbeatInterval.current);
                    heartbeatInterval.current = null;
                }
                sessionDocRef.current = null;
            }
        });

        // Handle closure on tab close
        const handleUnload = async () => {
            if (sessionDocRef.current) {
                // Note: sync XHR or beacon is often needed here, but firestore is async.
                // We'll try a best-effort update, but heartbeat is more reliable for timeouts.
                const ref = doc(db, 'user_sessions', sessionDocRef.current);
                await updateDoc(ref, { status: 'closed', endedAt: serverTimestamp() });
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleUnload);
            if (heartbeatInterval.current) window.clearInterval(heartbeatInterval.current);
        };
    }, []);

    return <>{children}</>;
};
