import { useState, useRef, useEffect } from 'react';

export default function SwipeableItem({ children, leftActions, rightActions, onSwipe, threshold = 60 }) {
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
        startXRef.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        currentXRef.current = e.touches[0].clientX;
        const diff = currentXRef.current - startXRef.current;

        // Prevent swiping if no actions defined for that direction
        if (diff > 0 && !leftActions) return;
        if (diff < 0 && !rightActions) return;

        // Add resistance/friction past the threshold
        const resistance = Math.abs(diff) > threshold * 1.5 ? 0.3 : 1;
        setOffset(diff * resistance);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (offset > threshold && leftActions) {
            setOffset(threshold * 1.2); // Snap open left
            if (onSwipe) onSwipe('left');
        } else if (offset < -threshold && rightActions) {
            setOffset(-threshold * 1.2); // Snap open right
            if (onSwipe) onSwipe('right');
        } else {
            setOffset(0); // Snap back
        }
    };

    // Close logic: if user clicks anywhere outside when it's open
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (offset !== 0 && containerRef.current && !containerRef.current.contains(e.target)) {
                setOffset(0);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [offset]);

    return (
        <div className="swipe-container" ref={containerRef} style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
            {/* Background Actions Layer */}
            <div className="swipe-actions-layer" style={{
                position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between',
                background: 'var(--bg-secondary)', zIndex: 0
            }}>
                {/* Left Actions */}
                <div style={{ display: 'flex', alignItems: 'stretch', opacity: offset > 0 ? 1 : 0, transition: 'opacity 0.2s' }}>
                    {leftActions && leftActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                                setOffset(0); // Close after action
                            }}
                            style={{
                                background: action.color || 'var(--color-primary)',
                                color: 'white', border: 'none', padding: '0 16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '4px', cursor: 'pointer', height: '100%', minWidth: '70px'
                            }}
                        >
                            {action.icon}
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'stretch', opacity: offset < 0 ? 1 : 0, transition: 'opacity 0.2s' }}>
                    {rightActions && rightActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                                setOffset(0); // Close after action
                            }}
                            style={{
                                background: action.color || 'var(--color-danger)',
                                color: 'white', border: 'none', padding: '0 16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '4px', cursor: 'pointer', height: '100%', minWidth: '70px'
                            }}
                        >
                            {action.icon}
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Foreground Content Layer */}
            <div
                className="swipe-content"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${offset}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    position: 'relative',
                    zIndex: 1,
                    background: 'var(--bg-primary)', // Important: needs solid background to hide actions
                    width: '100%'
                }}
            >
                {children}
            </div>
        </div>
    );
}
