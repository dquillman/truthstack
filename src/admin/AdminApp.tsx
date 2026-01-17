import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { LayoutDashboard, LogOut } from 'lucide-react';

// Data types
interface AnalysisRecord {
    id: string;
    claim: string;
    verdict: string;
    category: string;
    timestamp: any;
}

const AdminApp: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = checking
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalysisRecord[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);

    // Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // Fetch user document to check role
                const snap = await getDoc(doc(db, 'users', u.uid));
                setIsAdmin(snap.exists() && snap.data()?.role === 'admin');
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Data
    useEffect(() => {
        if (user && isAdmin) {
            const fetchData = async () => {
                const qA = query(collection(db, 'analyses'), orderBy('timestamp', 'desc'), limit(100));
                const snapA = await getDocs(qA);
                setData(snapA.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalysisRecord)));

                const qS = query(collection(db, 'user_sessions'), orderBy('lastSeenAt', 'desc'), limit(50));
                const snapS = await getDocs(qS);
                setSessions(snapS.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            };
            fetchData();
        }
    }, [user]);

    const handleLogin = () => {
        signInWithPopup(auth, new GoogleAuthProvider());
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold">TruthStack Admin</h1>
                    <button onClick={handleLogin} className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-500 font-bold">
                        Sign In with Google
                    </button>
                    <p className="text-slate-400 text-sm">Authorized personnel only.</p>
                </div>
            </div>
        );
    }

    // Calculate Stats
    const categoryStats: Record<string, number> = data.reduce((acc: any, curr) => {
        const cat = curr.category || 'Other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    // Sort logic for bars
    const categories = Object.keys(categoryStats)
        .map(k => ({ name: k, value: categoryStats[k] }))
        .sort((a, b) => b.value - a.value);

    // Fallback if no data
    const maxVal = Math.max(...categories.map(c => c.value), 1);

    // Helper to normalize verdict strings (remove trailing periods, trim)
    const normalizeVerdict = (v: string | undefined) => {
        if (!v) return 'Unknown';
        return v.trim().replace(/\.$/, ''); // Remove trailing period
    };

    const verdictStats: Record<string, number> = data.reduce((acc: any, curr) => {
        const v = normalizeVerdict(curr.verdict);
        acc[v] = (acc[v] || 0) + 1;
        return acc;
    }, {});

    const verdicts = Object.keys(verdictStats)
        .map(k => ({ name: k, value: verdictStats[k] }));
    const maxVerdict = Math.max(...verdicts.map(v => v.value), 1);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
            <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LayoutDashboard className="text-blue-500" /> Admin Dashboard
                    </h1>
                    <span className="text-xs font-mono text-slate-500 border border-slate-700/50 px-1.5 py-0.5 rounded opacity-60">v{__APP_VERSION__}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">{user.email}</span>
                    <button onClick={() => auth.signOut()} className="text-slate-400 hover:text-white"><LogOut size={20} /></button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto space-y-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Chart (CSS Bars) */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-lg font-semibold mb-6 text-slate-300">Analysis by Category</h3>
                        <div className="space-y-4">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className="w-24 text-sm text-slate-400 text-right truncate">{cat.name}</div>
                                    <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${(cat.value / maxVal) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="w-8 text-sm font-bold text-slate-200">{cat.value}</div>
                                </div>
                            ))}
                            {categories.length === 0 && <div className="text-slate-500 italic">No data yet</div>}
                        </div>
                    </div>

                    {/* Verdict Chart (Color Blocks) */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-lg font-semibold mb-6 text-slate-300">Verdict Distribution</h3>
                        <div className="flex items-end justify-center gap-4 h-[200px] pb-4">
                            {verdicts.map((v, idx) => {
                                const isTrue = v.name.toUpperCase().includes('TRUE');
                                const isFalse = v.name.toUpperCase().includes('FALSE');
                                const color = isTrue ? 'bg-emerald-500' : isFalse ? 'bg-red-500' : 'bg-amber-500';

                                return (
                                    <div key={idx} className="flex flex-col items-center justify-end h-full">
                                        <div className="text-sm font-bold mb-1">{v.value}</div>
                                        <div
                                            className={`w-12 rounded-t-md opacity-80 hover:opacity-100 transition-opacity ${color}`}
                                            style={{ height: `${(v.value / maxVerdict) * 100}%` }}
                                        ></div>
                                        <div className="mt-2 text-xs text-slate-400 rotate-0 truncate max-w-[60px]">{v.name}</div>
                                    </div>
                                );
                            })}
                            {verdicts.length === 0 && <div className="text-slate-500 italic">No data yet</div>}
                        </div>
                    </div>
                </div>

                {/* Active Sessions Section */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-300">Active Sessions</h3>
                        <span className="text-xs text-slate-500">{sessions.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Last Seen</th>
                                    <th className="px-6 py-4 font-medium">Device</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {sessions.map((s) => {
                                    const lastSeen = s.lastSeenAt?.seconds ? s.lastSeenAt.seconds * 1000 : Date.now();
                                    const isLive = (Date.now() - lastSeen) < (5 * 60 * 1000) && s.status === 'active';

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-800/30">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{s.email || 'Anonymous'}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{s.uid}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                                                    <span className={`text-xs ${isLive ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                                                        {isLive ? 'LIVE' : s.status?.toUpperCase() || 'INACTIVE'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {new Date(lastSeen).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]" title={s.userAgent}>
                                                {s.userAgent?.split(') ')[0]?.split(' (')[1] || 'Unknown Browser'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sessions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No session history found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-300">Recent Investigations</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Claim</th>
                                    <th className="px-6 py-4 font-medium">Category</th>
                                    <th className="px-6 py-4 font-medium">Verdict</th>
                                    <th className="px-6 py-4 font-medium">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {data.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-800/30">
                                        <td className="px-6 py-4 font-medium text-white truncate max-w-md">{row.claim}</td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">{row.category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.verdict?.toUpperCase().includes('TRUE') ? 'bg-emerald-500/20 text-emerald-300' :
                                                row.verdict?.toUpperCase().includes('FALSE') ? 'bg-red-500/20 text-red-300' :
                                                    'bg-amber-500/20 text-amber-300'
                                                }`}>
                                                {normalizeVerdict(row.verdict)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {row.timestamp?.seconds ? new Date(row.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No analysis history found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminApp;
