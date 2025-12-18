import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface AnalysisRecord {
    claim: string;
    verdict: string;
    category: string;
    sourceCount: number;
    hasImage: boolean;
    timestamp: any;
    model: string;
}

export const saveAnalysis = async (record: Omit<AnalysisRecord, 'timestamp'>) => {
    try {
        await addDoc(collection(db, "analyses"), {
            ...record,
            timestamp: serverTimestamp()
        });
        console.log("Analysis saved to history");
    } catch (e) {
        console.error("Failed to save analysis history:", e);
        // Don't block the UI if metrics fail
    }
};
