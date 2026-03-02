import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const pullStartY = useRef(0);
    const lastY = useRef(0);
    const isDragging = useRef(false);
    const containerRef = useRef(null);

    const MAX_PULL = 80;
    const REFRESH_THRESHOLD = 60;

    const handleTouchStart = useCallback((e) => {
        // Only trigger if we're at the very top of the scroll container
        if (containerRef.current && containerRef.current.scrollTop > 0) return;
        if (isRefreshing) return;

        pullStartY.current = e.touches[0].clientY;
        lastY.current = e.touches[0].clientY;
        isDragging.current = true;
        setIsTransitioning(false);
    }, [isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging.current || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        // Check if user is scrolling down vs pulling up
        if (currentY < pullStartY.current) {
            // Let normal scrolling handle this
            isDragging.current = false;
            return;
        }

        // Only prevent default if we're actually pulling down
        const diff = currentY - pullStartY.current;
        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            // Apply a friction curve so it gets harder to pull the further down you go
            const distance = Math.min(diff * 0.4, MAX_PULL);
            setPullDistance(distance);
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        setIsTransitioning(true);

        if (pullDistance >= REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(REFRESH_THRESHOLD); // Keep it open while refreshing

            try {
                if (onRefresh) {
                    await onRefresh();
                }
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Didn't pull far enough, snap back
            setPullDistance(0);
        }
    }, [pullDistance, onRefresh]);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
        <div
            ref={containerRef}
            className="ptr-container"
            style={{
                height: '100%',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                position: 'relative'
            }}
        >
            <div
                className="ptr-indicator"
                style={{
                    height: `${pullDistance}px`,
                    transition: isTransitioning ? 'height 0.3s ease' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
            >
                {(pullDistance > 10 || isRefreshing) && (
                    <div
                        className={`ptr-spinner ${isRefreshing ? 'refreshing' : ''}`}
                        style={{
                            transform: `rotate(${Math.min(pullDistance * 2, 180)}deg) scale(${Math.min(pullDistance / REFRESH_THRESHOLD, 1)})`,
                            opacity: Math.min(pullDistance / REFRESH_THRESHOLD, 1)
                        }}
                    >
                        <RefreshCw size={24} color="var(--color-primary)" />
                    </div>
                )}
            </div>

            <div style={{
                transform: `translateY(${isTransitioning && !isRefreshing ? 0 : 0}px)`, /* Container doesn't move, just indicator grows */
            }}>
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
