
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    // FIX: Add onClick prop to support clickable cards, resolving the type error in Dashboard.tsx.
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div onClick={onClick} className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
            {children}
        </div>
    );
};
