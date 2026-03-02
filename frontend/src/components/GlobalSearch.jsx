import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, Users, FolderKanban, ListTodo, FileText } from 'lucide-react';
import api from '../services/api';

const getTypeIcon = (type) => {
    switch (type) {
        case 'lead': return <Users size={16} color="#3b82f6" />;
        case 'client': return <UserCheck size={16} color="#10b981" />;
        case 'project': return <FolderKanban size={16} color="#8b5cf6" />;
        case 'task': return <ListTodo size={16} color="#f59e0b" />;
        case 'invoice': return <FileText size={16} color="#ef4444" />;
        default: return <Search size={16} />;
    }
};

const getNavigatePath = (type, id) => {
    switch (type) {
        case 'lead': return `/leads/${id}`;
        case 'client': return `/clients/${id}`;
        case 'project': return `/projects/${id}`;
        case 'task': return `/tasks`; // Tasks don't usually have a dedicated page in this app
        case 'invoice': return `/invoices/${id}`;
        default: return '/';
    }
};

export default function GlobalSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else if (!isOpen) {
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
                setResults(data);
            } catch (err) {
                console.error("Search failed", err);
            }
            setLoading(false);
        };

        const debounceId = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceId);
    }, [query]);

    // Handle Esc key to close search inside the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="global-search-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh'
        }}>
            <div className="global-search-modal" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-secondary)', width: '90%', maxWidth: '600px',
                borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search Leads, Clients, Projects..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', fontSize: '16px'
                        }}
                    />
                    <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>ESC</button>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
                    {loading && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>}
                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No results found for "{query}"</div>
                    )}
                    {!loading && results.map((result) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            className="search-result-item"
                            onClick={() => {
                                onClose();
                                navigate(getNavigatePath(result.type, result.id));
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                                borderBottom: '1px solid var(--border-color)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                                {getTypeIcon(result.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{result.title}</div>
                                {result.subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.subtitle}</div>}
                            </div>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                                {result.type}
                            </div>
                        </div>
                    ))}
                    {!loading && query.length < 2 && (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Type at least 2 characters to search across the CRM.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
